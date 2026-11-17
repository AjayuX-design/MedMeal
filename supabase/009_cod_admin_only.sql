-- MedMeal Starter: only the Admin decides cash on delivery.
-- Run once in the Supabase SQL editor, after 008. It is safe to run even if you ran an earlier 009.
-- (The server already refuses anyone but the Admin. This makes the database refuse too.)
create or replace function staff_confirm_cod(p_actor uuid, p_order uuid, p_amount int) returns boolean
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
