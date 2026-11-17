# Database setup (Supabase, in MedMeal's name)

Do these once. Nothing here goes in chat or in the code except the public address and the public key.

1. Create a project at supabase.com using a MedMeal email. Pick the Mumbai region. Save the database password somewhere safe.
2. Open **SQL Editor**, paste all of `001_foundation.sql`, and run it. It should finish with no error.
3. Open **Authentication > Sign In / Providers**, and turn **off** "Allow new users to sign up". Only the three staff logins should exist.
4. Open **Authentication > Users > Add user**. Create three users with an email and a password, and tick "Auto Confirm User": the dietitian, the kitchen and the admin.
5. Run `002_staff.sql` in the SQL Editor. It finds each user by email and gives it its role. Check the emails in it match the users you made.
6. Open **Project Settings > API**. Copy the project URL, the `anon` public key and the `service_role` secret key.
7. In Vercel, open the `med-meal` project, **Settings > Environment Variables**, and add these for Production:
   - `SUPABASE_URL`: the project URL
   - `SUPABASE_ANON_KEY`: the anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role key, marked **Sensitive**. Never paste it in chat.
8. Run `003_reports.sql` in the SQL Editor. It lets the dietitian open uploaded reports, and limits the private reports bucket to PDF, JPG and PNG files up to 10 MB.
9. Run `004_slots.sql`. It adds the call time a patient picks on the website, and shows it to the Dietitian and Admin.
10. Run `005_staff_actions.sql`. It lets the dietitian mark a call as New, Called or Closed through the server, and makes the Activity page show who made each change.
11. Run `006_orders.sql`. It adds feed orders and the kitchen steps (New, Preparing, Prepared, Packed). The feed plan builder will create real orders later. To try the kitchen screen before that, add a test order by hand in the SQL Editor:

```sql
insert into orders (case_id, order_no, quantity, items, avoid)
select id, 'FO-TEST-001', '1200 ml a day',
  '[{"name":"Ragi porridge","qty":200,"unit":"g"},{"name":"Egg white","qty":3,"unit":"nos"}]'::jsonb, 'Milk, nuts'
from cases where consult_payment = 'paid' order by paid_at desc limit 1;
```

12. Run `007_address.sql`. It adds the delivery address: the family sends it on a private page after the feed payment, the dietitian confirms it, and the dietitian and Admin see it. The kitchen never does. Until the feed payment flow exists, the dietitian or Admin makes the private link in the Orders panel (**Copy address link**) and sends it to the family on WhatsApp once the feed is paid.
13. Run `008_delivery.sql`. It adds the payment status of an order, cash on delivery, and Delivered. An order reaches the kitchen once it is paid online or the Admin has confirmed cash on delivery. The Admin marks a packed order Delivered, and for cash on delivery that records the cash received. Orders you added by hand before this step are counted as paid, so they stay on the kitchen board. A new test order starts as not paid. To try cash on delivery, add one and confirm it as Admin:

```sql
insert into orders (case_id, order_no, quantity, items, avoid)
select id, 'FO-TEST-002', '1000 ml a day', '[{"name":"Rice gruel","qty":250,"unit":"g"}]'::jsonb, 'Potato'
from cases where consult_payment = 'paid' order by paid_at desc limit 1;
```

14. Redeploy, then open `/app` on the site and sign in.

Until step 7 is done, the website works exactly as before and the staff screens say sign in is not set up.
