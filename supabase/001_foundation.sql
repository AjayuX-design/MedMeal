-- MedMeal Starter, part 1: Foundation.
-- Run once in the Supabase SQL editor of the project that is in MedMeal's name.
-- Reading is allowed only through the views at the bottom. Writing is done by the server (service role) only.

create extension if not exists pgcrypto;

-- Staff and roles --------------------------------------------------------------------------------
create type staff_role as enum ('dietitian', 'kitchen', 'admin');

create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The role of the signed-in person, or null. Used inside the views.
create function auth_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff where id = auth.uid() and active
$$;

-- Cases: one per booking ------------------------------------------------------------------------
create table cases (
  id uuid primary key default gen_random_uuid(),
  case_no text not null unique,                       -- like MM-261104-4F7K, shown to the patient
  patient_name text not null,
  age int check (age between 0 and 120),
  feeding_route text,
  contact_name text,
  mobile text not null,                               -- stored as +91XXXXXXXXXX
  notes text,                                         -- health notes: never shown to Admin or Kitchen
  report_names text,
  call_type text not null check (call_type in ('video', 'phone')),
  consult_amount int not null,                        -- rupees
  consult_payment text not null default 'not_completed' check (consult_payment in ('not_completed', 'paid')),
  call_status text not null default 'new' check (call_status in ('new', 'called', 'closed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index cases_paid_idx on cases (consult_payment, created_at desc);

-- Payments: every attempt, for the consultation now and for the feed in part 3 -----------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id),
  kind text not null default 'consultation' check (kind in ('consultation', 'feed')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount int not null,                                -- rupees
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_case_idx on payments (case_id);

-- Enquiries: Contact form, hospital form and the Not sure yet booking option ---------------------
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kind text not null check (kind in ('contact', 'hospital', 'not_sure')),
  name text not null,
  org text,
  org_type text,
  mobile text not null,
  message text,
  details jsonb,                                      -- the patient details of a Not sure yet request: never shown to Admin
  progress text not null default 'new' check (progress in ('new', 'contacted', 'sent_to_dietitian')),
  created_at timestamptz not null default now()
);
create index enquiries_created_idx on enquiries (created_at desc);

-- Reports the patient uploads (files sit in the private storage bucket "reports") ----------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id),
  path text not null unique,
  file_name text not null,
  size_bytes int,
  created_at timestamptz not null default now()
);
create index reports_case_idx on reports (case_id);

-- Activity log: who changed what, and when -------------------------------------------------------
create table activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                                         -- null means the server itself (a payment check, a form)
  actor_role text,
  table_name text not null,
  row_id text,
  action text not null,
  changed jsonb                                       -- column names that changed; status columns show from and to
);

-- Every change is recorded. Values are not copied, so patient details never leak into the log.
create function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  o jsonb;
  n jsonb;
begin
  if tg_op = 'DELETE' then
    o := to_jsonb(old);
    insert into activity_log (actor, actor_role, table_name, row_id, action)
    values (auth.uid(), auth_role()::text, tg_table_name, o ->> 'id', 'delete');
    return old;
  end if;
  n := to_jsonb(new);
  if tg_op = 'INSERT' then
    insert into activity_log (actor, actor_role, table_name, row_id, action)
    values (auth.uid(), auth_role()::text, tg_table_name, n ->> 'id', 'insert');
    return new;
  end if;
  o := to_jsonb(old);
  for k in select jsonb_object_keys(n) loop
    if n -> k is distinct from o -> k then
      if k like '%status%' or k = 'progress' or k = 'consult_payment' then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', o -> k, 'to', n -> k));
      else
        diff := diff || jsonb_build_object(k, true);
      end if;
    end if;
  end loop;
  if diff <> '{}'::jsonb then
    insert into activity_log (actor, actor_role, table_name, row_id, action, changed)
    values (auth.uid(), auth_role()::text, tg_table_name, n ->> 'id', 'update', diff);
  end if;
  return new;
end
$$;

create trigger log_staff after insert or update or delete on staff for each row execute function log_change();
create trigger log_cases after insert or update or delete on cases for each row execute function log_change();
create trigger log_payments after insert or update or delete on payments for each row execute function log_change();
create trigger log_enquiries after insert or update or delete on enquiries for each row execute function log_change();
create trigger log_reports after insert or update or delete on reports for each row execute function log_change();

-- Lock the tables. No policies means nobody but the server (service role) can touch them directly. ---
alter table staff enable row level security;
alter table cases enable row level security;
alter table payments enable row level security;
alter table enquiries enable row level security;
alter table reports enable row level security;
alter table activity_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
revoke all on function auth_role() from public, anon;
grant execute on function auth_role() to authenticated;

-- Views: the only way a signed-in person reads data. Each one checks the role. ------------------
create view my_profile as
  select id, name, role from staff where id = auth.uid() and active;

-- Dietitian: paid cases, with health notes and the report names
create view dietitian_cases as
  select * from cases where auth_role() = 'dietitian' and consult_payment = 'paid';

-- Admin: no health notes, no feeding route, no report names
create view admin_cases as
  select id, case_no, patient_name, age, mobile, call_type, consult_amount, consult_payment, call_status, created_at, paid_at
  from cases where auth_role() = 'admin';

create view admin_enquiries as
  select id, ref, kind, name, org, org_type, mobile, message, progress, created_at
  from enquiries where auth_role() = 'admin';

create view admin_payments as
  select id, case_id, kind, amount, status, created_at, paid_at
  from payments where auth_role() = 'admin';

create view admin_activity as
  select * from activity_log where auth_role() = 'admin';

grant select on my_profile, dietitian_cases, admin_cases, admin_enquiries, admin_payments, admin_activity to authenticated;

-- Private storage for reports. Files are uploaded by the server with a signed link. Only the dietitian reads them.
insert into storage.buckets (id, name, public) values ('reports', 'reports', false) on conflict (id) do nothing;

create policy "dietitian reads reports" on storage.objects
  for select to authenticated
  using (bucket_id = 'reports' and auth_role() = 'dietitian');
