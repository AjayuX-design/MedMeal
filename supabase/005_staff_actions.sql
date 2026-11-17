-- MedMeal Starter, part 2: staff actions.
-- Run once in the Supabase SQL editor, after 001 to 004.
-- Staff change data through the server, which calls the functions below with the server key.
-- The activity log then records the real person ("Dietitian"), not "System".

-- Who is acting: the signed-in user, or the person the server named for this one action.
create function actor_id() returns uuid
language sql stable as $$
  select coalesce(auth.uid(), nullif(current_setting('app.actor', true), '')::uuid)
$$;

create function actor_role_text() returns text
language sql stable security definer set search_path = public as $$
  select role::text from staff where id = actor_id() and active
$$;

-- The log trigger now uses them. Everything else in it is as before.
create or replace function log_change() returns trigger
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
    values (actor_id(), actor_role_text(), tg_table_name, o ->> 'id', 'delete');
    return old;
  end if;
  n := to_jsonb(new);
  if tg_op = 'INSERT' then
    insert into activity_log (actor, actor_role, table_name, row_id, action)
    values (actor_id(), actor_role_text(), tg_table_name, n ->> 'id', 'insert');
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
    values (actor_id(), actor_role_text(), tg_table_name, n ->> 'id', 'update', diff);
  end if;
  return new;
end
$$;

-- The dietitian marks a paid booking's call as new, called or closed. True if a booking was changed.
create function staff_set_call_status(p_actor uuid, p_case uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'dietitian') then
    raise exception 'not allowed';
  end if;
  if p_status not in ('new', 'called', 'closed') then
    raise exception 'bad status';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  update cases set call_status = p_status where id = p_case and consult_payment = 'paid';
  return found;
end
$$;

-- Only the server (service_role) may run these. Nobody signed in on the website can.
revoke all on function actor_id(), actor_role_text() from public, anon, authenticated;
revoke all on function staff_set_call_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function staff_set_call_status(uuid, uuid, text) to service_role;
