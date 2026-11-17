-- MedMeal Starter, part 5: payment status, cash on delivery, and Delivered.
-- Run once in the Supabase SQL editor, after 001 to 007.
-- An order reaches the kitchen once it is paid online, or the Admin has confirmed cash on delivery.
-- The Admin marks an order Delivered after the kitchen packs it. For cash on delivery that also records the cash received.

alter table orders
  add column pay_status text not null default 'pending' check (pay_status in ('pending', 'paid', 'cod')),
  add column payment_method text not null default 'online' check (payment_method in ('online', 'cod')),
  add column amount int check (amount > 0),                       -- order total in rupees
  add column delivered_at timestamptz,
  add column delivered_by uuid references staff (id),
  add column cash_collected_at timestamptz;

-- Orders added by hand while testing, before this step, count as paid so they stay on the kitchen board.
update orders set pay_status = 'paid';

-- Kitchen: only orders that are paid or cash on delivery. No money columns.
create or replace view kitchen_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.items, o.avoid, o.status, o.created_at, o.updated_at
  from orders o join cases c on c.id = o.case_id
  where auth_role() = 'kitchen' and o.status <> 'delivered' and o.pay_status in ('paid', 'cod');

-- Dietitian and Admin see the payment, the amount and the delivery. New columns go at the end of a view.
create or replace view dietitian_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.status, o.created_at, o.updated_at,
    case when a.id is null then 'none' when a.confirmed_at is null then 'submitted' else 'confirmed' end as addr_status,
    a.name as addr_name, a.mobile as addr_mobile, a.line1 as addr_line1, a.area as addr_area, a.city as addr_city,
    a.pincode as addr_pincode, a.landmark as addr_landmark, a.notes as addr_notes, a.confirmed_at as addr_confirmed_at,
    o.pay_status, o.payment_method, o.amount, o.delivered_at, o.cash_collected_at
  from orders o join cases c on c.id = o.case_id left join delivery_addresses a on a.order_id = o.id
  where auth_role() = 'dietitian';

create or replace view admin_orders as
  select o.id, o.order_no, c.patient_name, c.case_no, o.quantity, o.status, o.created_at, o.updated_at,
    case when a.id is null then 'none' when a.confirmed_at is null then 'submitted' else 'confirmed' end as addr_status,
    a.name as addr_name, a.mobile as addr_mobile, a.line1 as addr_line1, a.area as addr_area, a.city as addr_city,
    a.pincode as addr_pincode, a.landmark as addr_landmark, a.notes as addr_notes, a.confirmed_at as addr_confirmed_at,
    o.pay_status, o.payment_method, o.amount, o.delivered_at, o.cash_collected_at
  from orders o join cases c on c.id = o.case_id left join delivery_addresses a on a.order_id = o.id
  where auth_role() = 'admin';

-- The kitchen function now also refuses an order that is not paid or cash on delivery, not only hides it.
create or replace function staff_set_order_status(p_actor uuid, p_order uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare cur text; pay text;
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'kitchen') then
    raise exception 'not allowed';
  end if;
  select status, pay_status into cur, pay from orders where id = p_order for update;
  if cur is null or pay not in ('paid', 'cod') then return false; end if;
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

-- The Admin confirms the family will pay cash on delivery, and the amount to collect. Only for an order not yet paid.
create function staff_confirm_cod(p_actor uuid, p_order uuid, p_amount int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'admin') then
    raise exception 'not allowed';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then
    raise exception 'bad amount';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  update orders set payment_method = 'cod', pay_status = 'cod', amount = p_amount, updated_at = now()
    where id = p_order and pay_status = 'pending';
  return found;
end
$$;

-- The Admin marks a packed order Delivered (and for cash on delivery, the cash received), or undoes it to fix a mistake.
create function staff_set_delivered(p_actor uuid, p_order uuid, p_delivered boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff where id = p_actor and active and role = 'admin') then
    raise exception 'not allowed';
  end if;
  perform set_config('app.actor', p_actor::text, true);
  if p_delivered then
    update orders set status = 'delivered', delivered_at = now(), delivered_by = p_actor,
      cash_collected_at = case when payment_method = 'cod' then now() else null end, updated_at = now()
      where id = p_order and status = 'packed' and pay_status in ('paid', 'cod');
  else
    update orders set status = 'packed', delivered_at = null, delivered_by = null, cash_collected_at = null, updated_at = now()
      where id = p_order and status = 'delivered';
  end if;
  return found;
end
$$;

revoke all on function staff_confirm_cod(uuid, uuid, int) from public, anon, authenticated;
revoke all on function staff_set_delivered(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function staff_confirm_cod(uuid, uuid, int), staff_set_delivered(uuid, uuid, boolean) to service_role;
