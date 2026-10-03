# Birthday Reminder

iPhone app (Expo / React Native) that reminds you of birthdays and keeps gift ideas. The same codebase also exports a static website of public content (gift guides, message templates, how-tos) so AI assistants and search engines can read it. See `CLAUDE.md` for the full brief.

## Commands

```bash
npm install
npm run ios         # run the app (needs a Mac with Xcode, or Expo Go)
npm run web         # dev server for the website
npm run build:web   # static export to dist/ + public/private checks
npm run typecheck
npm test            # unit tests, incl. the sync engine against the real local schema
npm run test:db     # applies supabase/migrations to a throwaway Postgres and checks RLS (non-root user)
```

## Layout

- `content/` — public content as typed data (single source of truth)
- `src/app/` — routes (thin; re-export screens)
- `src/features/` — screens. `*.web.tsx` files replace app-only screens on the web with a noindex placeholder.
- `src/ui/` — semantic primitives that render as real HTML on web
- `src/data/` — local SQLite, writes, sync engine, Supabase client (app only; `*.web.tsx` keeps it out of the website)
- `supabase/` — migrations, config, and policy tests
- `scripts/postexport.mjs` — cleans and verifies the web export

## Connecting Supabase

The app runs fully local without Supabase; sync starts once these are set.

1. Create a project at supabase.com (free tier).
2. Authentication → Sign In / Providers: turn on **Allow anonymous sign-ins**.
3. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. Copy `.env.example` to `.env` and fill in the project URL and **anon** key (never the service role key).

## Before the first public deploy

Set the final app name and `siteUrl` in `content/brand.ts`, and the bundle identifier in `app.json`.
