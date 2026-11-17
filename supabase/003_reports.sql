-- MedMeal Starter, part 1 (stage B): report uploads.
-- Run once in the Supabase SQL editor, after 001 and 002.

-- The dietitian reads the list of a booking's reports through this view. Nobody else can.
create view dietitian_reports as
  select id, case_id, file_name, path, size_bytes, created_at from reports where auth_role() = 'dietitian';
grant select on dietitian_reports to authenticated;

-- The private bucket accepts only PDF, JPG and PNG files up to 10 MB, whatever the browser sends.
update storage.buckets
  set file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
  where id = 'reports';
