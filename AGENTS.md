# AGENTS.md

## Project context

This is a user-owned React/Vite application backed by Supabase. Keep changes focused, preserve existing UI conventions, and do not expose service-role credentials.

## Key files

- `src/`: frontend application source.
- `src/utils/supabase.ts`: frontend Supabase client, configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `supabase/migrations/`: database schema, RLS policies, and Storage configuration.
- `supabase/functions/`: trusted server-side actions.
- `.env.local`: local-only values; never commit credentials.

## Development workflow

- Use `npx supabase start` for local Supabase services and `npm run dev` for the frontend.
- Review migrations before applying them to a linked remote project.
- Run the relevant checks from `package.json` before finishing code changes.
- Keep account passwords out of the repository and chat; use Supabase's invite and password-reset flows.
