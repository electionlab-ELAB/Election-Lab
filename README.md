# ElectionLab Cloud

A static, deploy-ready election forecasting site with Supabase authentication and database security.

Start with `setup.html`.

## Files
- `index.html`: public read-only forecast
- `admin.html`: protected editor
- `preview.html`: local private preview
- `local-model.html`: original full forecasting studio
- `config.js`: Supabase public project configuration
- `supabase/schema.sql`: tables and Row Level Security policies
- `vercel.json`: Vercel static deployment and security headers

## Security
Only the Supabase project URL and publishable/anon key belong in `config.js`. Never put a `service_role` or secret key in front-end code.
