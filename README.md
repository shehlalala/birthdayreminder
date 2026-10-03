# Birthday Reminder

iPhone app (Expo / React Native) that reminds you of birthdays and keeps gift ideas. The same codebase also exports a static website of public content (gift guides, message templates, how-tos) so AI assistants and search engines can read it. See `CLAUDE.md` for the full brief.

## Commands

```bash
npm install
npm run ios         # run the app (needs a Mac with Xcode, or Expo Go)
npm run web         # dev server for the website
npm run build:web   # static export to dist/ + public/private checks
npm run typecheck
npm test
```

## Layout

- `content/` — public content as typed data (single source of truth)
- `src/app/` — routes (thin; re-export screens)
- `src/features/` — screens. `*.web.tsx` files replace app-only screens on the web with a noindex placeholder.
- `src/ui/` — semantic primitives that render as real HTML on web
- `scripts/postexport.mjs` — cleans and verifies the web export

## Before the first public deploy

Set the final app name and `siteUrl` in `content/brand.ts`, and the bundle identifier in `app.json`.
