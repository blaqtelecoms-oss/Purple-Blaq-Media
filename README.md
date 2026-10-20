# Purple Blaq Media

React application using Supabase for authentication, PostgreSQL data, private file storage, and Edge Functions.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the public Supabase URL and publishable key.
3. Start the Supabase local stack with `npx supabase start` (Docker is required).
4. Apply local migrations and start Vite:

   ```bash
   npx supabase migration up
   npm run dev
   ```

5. Configure authentication redirect URLs in Supabase for the local and deployed site origins. Enable email confirmation. Configure Google OAuth only if social sign-in is required.

## Supabase deployment

Link the CLI to the intended Supabase project, review the pending migrations, then apply them:

```bash
npx supabase link --project-ref <project-ref>
npx supabase migration list
npx supabase db push
```

Deploy the Edge Functions after setting their required secrets:

```bash
npx supabase secrets set APP_URL=https://<site-domain>
npx supabase secrets set RESEND_API_KEY=<resend-key> CONTACT_FROM_EMAIL="<verified-sender>"
npx supabase functions deploy website-contact
npx supabase functions deploy invite-team-member
npx supabase functions deploy migrate-enquiries
```

`CONTACT_NOTIFICATION_EMAIL` is optional and defaults to the site's published contact address. Email delivery is best-effort; submitted enquiries are saved even if the mail provider is unavailable. The service-role key must remain in Supabase Edge Function secrets or a trusted migration environment; never expose it as a `VITE_` variable.

The initial database migration provisions the private `crm-files` Storage bucket for CRM files and the Admin team record for `edusoft.linda@gmail.com`. Project image uploads and company logos use separate private `project-images` and `company-logos` buckets, provisioned by migrations. Apply pending Storage and database changes with `npx supabase db push` after linking the CLI to the intended project. The user must create or accept their Supabase Auth account with that email and verify it before `/admin` access is available. Passwords are set by the user through the Supabase invite or reset flow, not stored in source.

## Data import

The application repository contains the public media files currently referenced by the UI. To import exported records, prepare a JSON object with arrays named `clients`, `enquiries`, `projects`, `support_tickets`, `team_members`, and `transactions`, then run:

```bash
SUPABASE_URL=<project-url> SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  node scripts/import-legacy-data.mjs <export.json>
```

The importer preserves record IDs and original row data for auditing. Referenced media must either be present in `public/assets/media` or be migrated to Supabase Storage before importing; the importer rejects unresolved file references. Auth accounts are not imported, so users must be invited or sign up again and reset their passwords.

## Search and AI discovery

The public sitemap is maintained at `public/sitemap.xml`; update it when public routes change. `public/robots.txt` references the sitemap and excludes private/admin routes. `public/llms.txt` gives search and AI assistants a concise overview of the company and its public pages. Page titles, descriptions, canonical URLs, and social metadata are maintained through `src/hooks/useSeo.js`; organization and website structured data is in `index.html`. Keep published facts consistent across these sources.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
