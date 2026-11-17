-- MedMeal Starter, part 1 (stage C): the call time a patient picks on the website.
-- Run once in the Supabase SQL editor, after 001, 002 and 003.

alter table cases add column slot_at timestamptz;
create index cases_slot_idx on cases (slot_at);

-- The dietitian and the admin see the call time. New columns go at the end of a view.
create or replace view dietitian_cases as
  select * from cases where auth_role() = 'dietitian' and consult_payment = 'paid';

create or replace view admin_cases as
  select id, case_no, patient_name, age, mobile, call_type, consult_amount, consult_payment, call_status, created_at, paid_at, slot_at
  from cases where auth_role() = 'admin';
