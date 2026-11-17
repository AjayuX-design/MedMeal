-- MedMeal Starter, part 3: feed orders and the kitchen steps.
-- Run once in the Supabase SQL editor, after 001 to 005.
-- Orders will be created by the feed plan builder. Until it exists, a test order can be added by hand (see the README).

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,                     -- shown on the kitchen card and the sticker
  case_id uuid not null references cases (id),
  quantity text,                                     -- like "1200 ml a day"
  items jsonb not null default '[]'::jsonb,          -- [{ "name": "Ragi porridge", "qty": 200, "unit": "g" }]
  avoid text,                                        -- foods that must NOT be used
  status text not null default 'new' check (status in ('new', 'preparing', 'prepared', 'packed', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at);

alter table orders enable row level security;
revoke all on orders from anon, authenticated;
create trigger log_orders after insert or update or delete on orders for each row execute function log_change();

-- Kitchen: what to cook and pack. Patient name and the case number for the sticker. No age, notes, phone or address.
create view kitchen_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.items, o.avoid, o.status, o.created_at, o.updated_at
  from orders o join cases c on c.id = o.case_id
  where auth_role() = 'kitchen' and o.status <> 'delivered';

-- Admin: where every order is. No ingredients.
create view admin_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.status, o.created_at, o.updated_at
  from orders o join cases c on c.id = o.case_id
  where auth_role() = 'admin';

grant select on kitchen_orders, admin_orders to authenticated;

-- The kitchen moves an order one step forward, or one step back to fix a mistake. Delivered belongs to the Admin.
-- New, Preparing, Prepared, Packed. True if the order was moved.
create function staff_set_order_status(p_actor uuid, p_order uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'kitchen') then
    raise exception 'not allowed';
  end if;
  select status into cur from orders where id = p_order for update;
  if cur is null then return false; end if;
  if not ((cur = 'new' and p_status = 'preparing')
       or (cur = 'preparing' and p_status in ('prepared', 'new'))
       or (cur = 'prepared' and p_status in ('packed', 'preparing'))
       or (cur = 'packed' and p_status = 'prepared')) then
    raise exception 'step not allowed';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  update orders set status = p_status, updated_at = now() where id = p_order;
  return true;
end
$$;
revoke all on function staff_set_order_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function staff_set_order_status(uuid, uuid, text) to service_role;
