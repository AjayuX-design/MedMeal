# Database setup (Supabase, in MedMeal's name)

Do these once. Nothing here goes in chat or in the code except the public address and the public key.

1. Create a project at supabase.com using a MedMeal email. Pick the Mumbai region. Save the database password somewhere safe.
2. Open **SQL Editor**, paste all of `001_foundation.sql`, and run it. It should finish with no error.
3. Open **Authentication > Sign In / Providers**, and turn **off** "Allow new users to sign up". Only the three staff logins should exist.
4. Open **Authentication > Users > Add user**. Create three users with an email and a password, and tick "Auto Confirm User": the dietitian, the kitchen and the admin.
5. Open `002_staff.sql.example`, put each person's user ID and name in, and run it in the SQL Editor.
6. Open **Project Settings > API**. Copy the project URL, the `anon` public key and the `service_role` secret key.
7. In Vercel, open the `med-meal` project, **Settings > Environment Variables**, and add these for Production:
   - `SUPABASE_URL`: the project URL
   - `SUPABASE_ANON_KEY`: the anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role key, marked **Sensitive**. Never paste it in chat.
8. Redeploy, then open `/app` on the site and sign in.

Until step 7 is done, the website works exactly as before and the staff screens say sign in is not set up.
