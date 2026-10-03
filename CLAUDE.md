# Birthday Reminder App — Project Brief

## What we're building
A simple iOS app (Android later), published on the App Store, that helps people remember the birthdays of those they care about, set reminders, and keep gift ideas. Built with React Native (Expo), with Supabase as the backend.

**Generative Engine Optimization (GEO) is a core architectural requirement, not an add-on.** The app's own codebase must be written so that its public content is readable, quotable, and linkable by AI assistants (ChatGPT, Claude, Perplexity, Google AI Overviews) and by Apple Intelligence / Siri / Spotlight. See the GEO section — it shapes routing, content storage, and native integrations.

## Repo structure
One Expo project (SDK 57), one codebase, that ships as both the iOS app and a static website:
- `src/app/` — Expo Router routes (SDK 57 default location). Private routes (user's people, reminders, gifts) and public routes (guides, templates, homepage) live in the same router. Route files stay thin and re-export a screen from `src/features/`.
- `content/` — all public content (gift guides, message templates, FAQ, how-tos) as structured, typed data files. Single source of truth for app screens, web pages, structured data, and llms.txt. `content/private-routes.json` lists app-only route prefixes.
- `src/` — `features/` (screens), `ui/` (semantic primitives, tokens), `seo/`, `i18n/`, and later the data layer, sync, notifications.
- `scripts/postexport.mjs` — runs after the web export; removes Expo's `_sitemap.html` and unfilled `[param].html` shells, and fails the build if a page breaks the public/private rules.
- `modules/` — local Expo modules (Swift) for App Intents and Spotlight.
- `supabase/` — migrations, RLS policies.

## Core app features (v1 scope)

1. **People list**
   - Add, edit, and delete a person: name (required), birthday day + month (required), birth year (optional), relation (optional), optional photo, optional short note.
   - **Relation:** pick from presets (Mom, Dad, Sister, Brother, Partner, Spouse, Child, Grandparent, Relative, Friend, Best friend, Colleague, Boss, Client, Neighbor, Other) or type a custom one. Store presets as keys so they can be translated; store custom text as-is. Show the relation under the person's name in the list and detail screen.
   - Home screen shows people sorted by upcoming birthday, with an "in X days" label. Today's birthdays are highlighted at the top.
   - If a birth year is given, show the age they're turning ("turns 30").

2. **Reminders**
   - Each person can have one or more reminders. Presets: on the day, 1 day before, 3 days before, 1 week before, 2 weeks before, 1 month before, plus custom "X days before."
   - A global default reminder set (e.g. "on the day + 1 week before") applies to new people and can be changed per person.
   - Reminder time of day set globally in Settings (default 9:00), with optional per-person override.
   - Notification text examples: "Leyla's birthday is in 1 week 🎂", "Today is Leyla's birthday! She turns 30." If gift ideas exist, add "You have 3 gift ideas saved."
   - Tapping a notification opens that person's detail screen.

3. **Gift ideas**
   - Each person has a gift ideas list: title (required), optional note, optional link, optional price.
   - Each idea can be marked "Bought" and "Given" (with the year) so past gifts aren't repeated.

4. **Settings**
   - Default reminder time and reminder set, notification permission status (with a button to open iOS Settings if denied), account section, Privacy Policy, Terms, About.

## Backend: Supabase

### Auth
- **No sign-up wall.** On first launch, create a Supabase **anonymous session** so the app works immediately.
- Offer optional **Sign in with Apple** in Settings ("Back up and sync your birthdays"). Linking upgrades the anonymous user so no data is lost.
- Make clear in the UI that without signing in, data is lost if the app is deleted.
- **App Store rules:** any account system must include **in-app account deletion** that deletes all the user's data in Supabase (Guideline 5.1.1(v)). If any other login provider is ever added, Sign in with Apple must remain available.

### Database
- Tables: `people`, `reminders`, `gift_ideas`, `user_settings`. Every row has `user_id` referencing `auth.users`.
- **Row Level Security enabled on every table**, policies restricting all operations to `auth.uid() = user_id`. Never ship a table without RLS.
- Photos in a private Supabase Storage bucket with per-user folder policies.
- All schema changes as SQL migrations in `supabase/migrations`.
- Never put the service role key in the app. Only the anon key.

### Offline-first
- Keep a local SQLite cache (`expo-sqlite`) as the source the UI reads from, syncing to Supabase in the background. The app must work fully offline and on a plane.
- Simple conflict rule: last write wins, using `updated_at`. The server enforces it too (`sync_guard` trigger skips older writes), and sets `synced_at`, which is the pull cursor. Deletes are soft (`deleted_at`) so they reach other devices.
- All local writes go through `src/data/writes.ts` (fresh, never-backwards `updated_at`; marks the row dirty). The engine is `src/data/sync.ts`; it's tested end to end against the real local schema and a fake server in `sync.test.ts`. The database rules are tested with `npm run test:db`.
- **First launch can be offline.** Rows get a client-generated UUID and are created locally without a `user_id`. The anonymous Supabase session is created the first time the device is online, and the `user_id` is attached during the first sync. Apple provides no automatic user ID that Supabase accepts as `auth.uid()`; don't try to substitute one.
- Later idea (not v1): StoreKit `AppTransaction.appTransactionID` could restore data after a reinstall without sign-in, but it needs a server-side verifier that mints Supabase sessions.

### Account linking and deletion
- Linking Sign in with Apple can fail because that Apple ID already owns an account (e.g. after a reinstall). Handle it: sign into the existing account and merge local rows into it. The sync engine already does the merge when the signed-in user changes: it gives local rows new ids (the server refuses to move a row id between users), drops tombstones, and pulls the account from scratch. Phase 6 should delete the abandoned anonymous user's server rows (best effort) before switching.
- Account deletion runs in a Supabase Edge Function (it needs the service role, which never ships in the app). It must also revoke the Sign in with Apple token via Apple's REST API.

### Notifications stay local
- Use `expo-notifications` local notifications, scheduled on the device. No push server needed.
- iOS allows only **64 pending local notifications per app**. Schedule one-off notifications for the next occurrence only, sorted by date, capped at the soonest ~60. Reschedule on app foreground, after sync, and whenever a person or reminder changes. Keep this in one pure, unit-tested module.
- **Feb 29 birthdays:** treat as Feb 28 in non-leap years (single helper function: `birthdayInYear` in `src/domain/birthdays.ts`). Birthday math works on calendar dates, never Date instants.
- Use the device's local time zone; recompute on time-zone change.
- Ask for notification permission when the user saves their first reminder, with a short explanation screen first. If denied, the app still works; show a gentle banner.

## Generative Engine Optimization (GEO) — top priority, built into the app code

Reality check that drives the design: ChatGPT and Claude cannot open a native iOS app. They can only read web pages (including the App Store product page). Apple Intelligence and Siri can only use what the app exposes through App Intents and Spotlight. So the app code must expose its content on both surfaces.

### 1. Universal routes: every public app screen is also a crawlable web page
- Use **Expo Router** with web support and **static rendering** (`web.output: "static"` in app config). Public routes are pre-rendered to real HTML at build time, so text is in the HTML, not rendered by JavaScript after load.
- Public routes (in the app AND on the web, same component code):
  - `/` — homepage. First paragraph is a one-sentence definition: "[App name] is a free iPhone app that reminds you of birthdays and keeps gift ideas for each person."
  - `/gifts/[relation]` — gift ideas by relation, one per relation preset: `/gifts/mom`, `/gifts/boss`, `/gifts/colleague`… In the app, these appear as "Need ideas?" on a person's gift list, filtered by that person's relation.
  - `/messages/[relation]` — birthday message templates by relation. In the app, a "Write a message" button on the person screen opens the matching page with copy buttons.
  - `/guides/[slug]` — "How to never forget a birthday", "How far in advance to buy a gift", "Office birthday etiquette", "Feb 29 birthdays".
  - `/faq`, `/privacy`, `/terms`, `/support`.
- Private routes (`/people/...`, `/settings`) are app-only: excluded from sitemap and llms.txt, and marked `noindex`. User data is never rendered publicly. Expo's static export renders every route, so private screens use platform files: `Screen.tsx` (native) and `Screen.web.tsx` (an "Open in the app" placeholder with `noindex`, no canonical). This also keeps native modules (SQLite, notifications) out of the web bundle. `scripts/postexport.mjs` enforces it.
- `/` is the marketing homepage on web (`HomeScreen.web.tsx`) and redirects to the birthday list in the app.
- Dynamic public routes use `generateStaticParams` fed from `content/`.
- Configure **Universal Links** (`associatedDomains` + apple-app-site-association file) so the same URL opens the app if installed, the web page if not. Every public screen has a canonical URL.
- Deploy the static web export free (Cloudflare Pages, Vercel, or Netlify) on the app's domain.

### 2. Content as structured data, one source of truth
- All public content lives in `content/` as typed TypeScript/JSON (e.g. `GiftGuide { relation, title, answerSummary, sections[], faqs[], updatedAt }`). Never hard-code public text inside components.
- Every content item has an `answerSummary`: 1–2 plain sentences that directly answer the page's question. Components render it as the first paragraph.
- From the same data, generate at build time: page HTML, `<head>` metadata (via `expo-router/head`: title, description, canonical, Open Graph, Twitter card, Apple Smart App Banner), JSON-LD, `sitemap.xml`, and `llms.txt` / `llms-full.txt`.
- JSON-LD: `MobileApplication` on `/`, `FAQPage` where FAQs exist, `Article` on guides, `ItemList` on gift guides, `BreadcrumbList` everywhere.
- Relation presets in `content/relations.ts` drive the relation picker in the app AND generate the `/gifts/*` and `/messages/*` routes. Each relation has a `publicPages` flag: the picker shows every relation, but pages exist only for flagged relations that have real content (Spouse, Relative, Best friend and Other are off by default to avoid thin, near-duplicate pages). Tests fail if content exists for an unflagged relation.

### 3. Semantic, accessible components
- Build shared primitives (`Heading level`, `Paragraph`, `List`, `Link`) that render as real `<h1>`–`<h3>`, `<p>`, `<ul>`, `<a href>` on web and native components on iOS. Implemented in `src/ui/primitives.tsx` with react-native-web's `role` mapping; no extra dependency. One H1 per page. Question-style H2s that mirror how people ask AI ("What should I get my boss for their birthday?").
- Every interactive element has an `accessibilityLabel` and `accessibilityRole`. This serves VoiceOver, web semantics, and on-screen AI agents.
- `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot, Applebot-Extended.

### 4. Apple Intelligence, Siri, and Spotlight (on-device GEO)
- **App Intents** (local Expo module in Swift, `modules/app-intents`): expose
  - "When is [person]'s birthday?"
  - "Whose birthday is coming up?"
  - "Add a gift idea for [person]"
  - "Add a birthday"
  Register them as **App Shortcuts** with natural phrases so they work in Siri and Shortcuts without setup.
- **Core Spotlight**: index each person (name, relation, next birthday) on-device so searching a name in Spotlight shows their birthday and opens their screen. Remove from the index when a person is deleted. This stays on the device; nothing is public.
- To let Swift read data without duplicating the database, the JS layer writes a small JSON snapshot (people, next birthdays, relations) to an **App Group** container after every change and sync. App Intents and Spotlight read from that.
- Swift never writes to the SQLite database. Intents that add data ("Add a gift idea", "Add a birthday") append to a pending-actions file in the App Group; JS applies it on launch/foreground.
- App Intents metadata and `AppShortcutsProvider` must end up in the main app target, which Expo modules (built as pods) may not guarantee. Prove one intent works end-to-end before building the rest; fall back to a config plugin that adds the Swift files to the app target.
- Ask me before adding any third-party native library for this; prefer a small local module.

### 5. Shareable public links
- Gift guides and message templates have a Share button that shares the canonical URL (rich Open Graph preview, opens the app via Universal Link if installed). Shared links create the mentions AI assistants rely on.
- Users' private data is never shareable in v1.

### 6. Consistency
- App name, one-line description, feature names, and the site domain are constants in `content/brand.ts`, used by the app UI, web pages, canonical URLs, JSON-LD, llms.txt, and the App Store listing draft. AI assistants trust facts that match across sources.
- The Smart App Banner needs the App Store app ID (`brand.appStoreId`) and stays off until the App Store record exists. Universal Links need the Team ID and the final domain.
- Each page is genuinely distinct; no thin or near-duplicate pages. Show "last updated" on guides.

### App Store listing
- Generate a draft of the App Store name, subtitle, keywords, and description from `content/brand.ts`. Category: Lifestyle or Productivity. The App Store product page is itself read by AI assistants, so it must use the same wording.

## Design
- Warm, calm, minimal. One accent color, generous spacing, large readable type. Support Dynamic Type and Dark Mode.
- Empty state on first launch: friendly illustration + "Add someone you care about."
- i18n-ready from day one (keys, no hard-coded strings). Start with English. Public routes should support per-language URLs later (`/tr/gifts/mom`) with `hreflang` tags.

## Privacy
- No analytics or tracking SDKs in v1.
- Because data is stored in Supabase, the App Store privacy label is **not** "Data Not Collected." Prepare accurate privacy label answers (user content and identifiers, linked to the user, not used for tracking).
- The privacy policy must explain that the app stores names, birthdays, relations, and notes about other people that the user enters, where it's stored (Supabase, region noted), and how to delete it.
- Do not request Contacts access in v1.

## Build order
Work in phases and stop for my review after each one. Deploy the public web pages as early as possible (they don't need App Store approval, and AI visibility takes months to build).

1. ✅ Expo Router project with web static output, `content/` schema and types, `brand.ts`, relation presets, semantic UI primitives, and a public/private route split. Verify static export produces real HTML for one sample public page.
2. ✅ Supabase: schema migrations with RLS and policy tests; anonymous auth, local SQLite cache, sync layer.
3. ✅ App: people list, add/edit/delete person (with relation), upcoming-birthday sorting. (Photo not done yet: it needs `expo-image-picker` plus Storage upload in sync; do it with Phase 4's detail screen.)
4. App: person detail screen and gift ideas, with "Need ideas?" linking to `/gifts/[relation]` and "Write a message" linking to `/messages/[relation]`.
5. App: reminders UI, notification scheduling module (64-limit, Feb 29, rescheduling), permission flow, deep links.
6. App: Settings, Sign in with Apple account linking, in-app account deletion.
7. GEO build pipeline: head metadata, JSON-LD, sitemap, robots.txt, llms.txt, Smart App Banner, Universal Links + apple-app-site-association.
8. Public content: homepage, FAQ, gift guides, message templates, how-to guides (drafts for my review), privacy/terms/support.
9. Native: App Group snapshot, App Intents + App Shortcuts, Core Spotlight indexing.
10. Polish (empty states, Dark Mode, Dynamic Type, i18n), App Store listing draft, EAS Build config, pre-submission checklist.

## Constraints
- Keep dependencies minimal; ask me before adding anything large or unusual.
- No paid APIs. Supabase free tier is fine to start.
- Never commit secrets; use environment variables and `.env.example`.
- Out of scope for v1: Contacts import, widgets, sharing private lists with others, Android release, push notifications.
- Never render, index, or link user data on any public route.
