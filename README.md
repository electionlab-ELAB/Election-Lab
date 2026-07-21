# ElectionLab 2026 Senate CMS

This package is a working static website plus Supabase-backed content-management system.

## What works
- Public, view-only homepage and Senate forecast
- Dynamic race pages (`race.html?id=pa-senate`)
- Approved-admin email/password login
- Add/edit/delete races, candidates, and polls
- Draft/published controls
- Manual race odds, ratings, expected vote share, summaries, and featured races
- Automatic public weighted polling averages using published polls only
- Database Row Level Security, so hiding the Admin link is not the security mechanism

## Setup order
1. Upload all files to GitHub and allow Vercel to redeploy.
2. Create a Supabase project.
3. Open Supabase SQL Editor and run `supabase-schema.sql`.
4. In Supabase Authentication > Users, create your email/password user.
5. Copy that user's UUID.
6. In SQL Editor run:
   `insert into public.admins(user_id) values ('YOUR-USER-UUID');`
7. In Project Settings > API, copy the Project URL and publishable/anon key.
8. Put those two values in `config.js`.
9. Upload the edited `config.js` to GitHub.
10. Visit `https://electionlab.info/login.html`.

Never put a service-role or secret key in this project. Only the browser-safe publishable/anon key belongs in config.js.

## Current scope
The full CMS is implemented for 2026 Senate races first. House and Governors remain polished placeholders and can be connected to the same system next.
