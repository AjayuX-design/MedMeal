-- Gives each login its role. Run once, after the three users exist in Authentication > Users.
-- Change the names later in Table Editor > staff if you want real people's names.
insert into staff (id, name, role)
select id, 'Dietitian', 'dietitian'::staff_role from auth.users where email = 'dietitian@medmeal.in'
union all
select id, 'Kitchen', 'kitchen'::staff_role from auth.users where email = 'kitchen@medmeal.in'
union all
select id, 'Admin', 'admin'::staff_role from auth.users where email = 'admin@medmeal.in';

-- Check: should list three rows.
select name, role from staff order by role;
