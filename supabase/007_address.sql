-- MedMeal Starter, part 4: the delivery address.
-- Run once in the Supabase SQL editor, after 001 to 006.
-- After a family pays for the feed, they add the address on the website (a private link). The dietitian confirms it.
-- The dietitian and Admin see it. The kitchen never does.

create table delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id) on delete cascade,
  name text not null,                                -- who receives the delivery
  mobile text not null,                              -- +91XXXXXXXXXX
  line1 text not null,                               -- house or flat number, street
  area text not null,
  city text not null,
  pincode text not null,
  landmark text,
  notes text,                                        -- delivery notes, such as the best time
  confirmed_at timestamptz,
  confirmed_by uuid references staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table delivery_addresses enable row level security;
revoke all on delivery_addresses from anon, authenticated;
create trigger log_delivery_addresses after insert or update or delete on delivery_addresses for each row execute function log_change();

-- Dietitian: orders with the address and whether it is waiting to be confirmed.
create view dietitian_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.status, o.created_at, o.updated_at,
    case when a.id is null then 'none' when a.confirmed_at is null then 'submitted' else 'confirmed' end as addr_status,
    a.name as addr_name, a.mobile as addr_mobile, a.line1 as addr_line1, a.area as addr_area, a.city as addr_city,
    a.pincode as addr_pincode, a.landmark as addr_landmark, a.notes as addr_notes, a.confirmed_at as addr_confirmed_at
  from orders o join cases c on c.id = o.case_id left join delivery_addresses a on a.order_id = o.id
  where auth_role() = 'dietitian';

-- Admin: the same, for delivery. New columns go at the end of the view.
create or replace view admin_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.status, o.created_at, o.updated_at,
    case when a.id is null then 'none' when a.confirmed_at is null then 'submitted' else 'confirmed' end as addr_status,
    a.name as addr_name, a.mobile as addr_mobile, a.line1 as addr_line1, a.area as addr_area, a.city as addr_city,
    a.pincode as addr_pincode, a.landmark as addr_landmark, a.notes as addr_notes, a.confirmed_at as addr_confirmed_at
  from orders o join cases c on c.id = o.case_id left join delivery_addresses a on a.order_id = o.id
  where auth_role() = 'admin';

grant select on dietitian_orders, admin_orders to authenticated;

-- What the family sees on the address page: the patient and any address already sent. Only the server may ask.
create function address_info(p_order uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'patient', c.patient_name, 'order_no', o.order_no, 'confirmed', coalesce(a.confirmed_at is not null, false),
    'address', case when a.id is null then null else jsonb_build_object('name', a.name, 'mobile', a.mobile, 'line1', a.line1,
      'area', a.area, 'city', a.city, 'pincode', a.pincode, 'landmark', a.landmark, 'notes', a.notes) end)
  from orders o join cases c on c.id = o.case_id left join delivery_addresses a on a.order_id = o.id
  where o.id = p_order
$$;

-- The family sends or corrects the address until the dietitian confirms it. Returns ok, confirmed or missing.
create function submit_address(p_order uuid, p_name text, p_mobile text, p_line1 text, p_area text, p_city text, p_pincode text, p_landmark text, p_notes text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from orders where id = p_order) then return 'missing'; end if;
  if exists (select 1 from delivery_addresses where order_id = p_order and confirmed_at is not null) then return 'confirmed'; end if;
  insert into delivery_addresses (order_id, name, mobile, line1, area, city, pincode, landmark, notes)
  values (p_order, p_name, p_mobile, p_line1, p_area, p_city, p_pincode, p_landmark, p_notes)
  on conflict (order_id) do update set name = excluded.name, mobile = excluded.mobile, line1 = excluded.line1, area = excluded.area,
    city = excluded.city, pincode = excluded.pincode, landmark = excluded.landmark, notes = excluded.notes, updated_at = now();
  return 'ok';
end
$$;

-- The dietitian confirms the address. True if an address exists (also if it was already confirmed).
create function staff_confirm_address(p_actor uuid, p_order uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'dietitian') then
    raise exception 'not allowed';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  update delivery_addresses set confirmed_at = now(), confirmed_by = p_actor where order_id = p_order and confirmed_at is null;
  return exists (select 1 from delivery_addresses where order_id = p_order);
end
$$;

revoke all on function address_info(uuid) from public, anon, authenticated;
revoke all on function submit_address(uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function staff_confirm_address(uuid, uuid) from public, anon, authenticated;
grant execute on function address_info(uuid), submit_address(uuid, text, text, text, text, text, text, text, text), staff_confirm_address(uuid, uuid) to service_role;
