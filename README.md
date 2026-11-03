# BorneoWatch

**Digital Guardian of Borneo's Forests**  
Protecting Borneo Through Data, Technology, and Community.

BorneoWatch is a responsive environmental awareness workspace focused on Kalimantan, Indonesia. It brings a community observation map, report workflow, cited species directory, educational articles, and clearly labeled demonstration analytics into one application.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```powershell
npm install
npm run dev
```

Open http://localhost:3000. No external credentials are needed to explore demo mode.

```powershell
npm run lint
npm run build
npm start
```

## Application architecture

This repository is a **Next.js 16 App Router** application, not a Vite/React Router project. The supplied workspace was already Next.js, so the implementation preserves its framework and build pipeline.

- `app/page.tsx` contains the interactive dashboard sections and local demo workflows.
- `app/map-view.tsx` isolates the client-only Leaflet map and OpenStreetMap tile layers.
- `app/globals.css` defines the responsive dashboard design system and light/dark themes.
- `lib/supabase/client.ts` creates a browser Supabase client only when public credentials are available.
- `supabase/migrations/202611030001_initial_schema.sql` defines tables, seed references, storage, and RLS policies.

The browser uses only the Supabase project URL and publishable/anon key. Row Level Security protects user data and privileged writes. A service-role key must never be exposed to the client.

## Demo mode

Without Supabase credentials the app remains usable. Sample reports, species, article summaries, and monthly analytics are explicitly identified as demonstration content. New reports and bookmarks are stored in the current browser's local storage; they are not sent to a server, shared with other visitors, or independently verified. Demo photo selections are not uploaded.

The example contributor and location totals are illustrative, not measurements. Monthly charts show application demo records, not forest cover, pollution, or other environmental measurements.

## Configure Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project's public/publishable key.
3. Apply `supabase/migrations/202611030001_initial_schema.sql` in the Supabase SQL Editor, or apply the migration with the Supabase CLI.
4. In Supabase Auth, configure the local and deployed site URLs, email confirmation, and password reset redirect URLs.
5. Restart the Next.js server after changing environment variables.
6. Create an account in BorneoWatch. Authenticated users can submit reports, upload supporting images, and save article bookmarks. Reports start as `Pending Review`.

The migration creates `profiles`, `environmental_reports`, `biodiversity_species`, `educational_articles`, `article_bookmarks`, and `report_images`, plus a private `report-images` Storage bucket. It seeds cited species references and editorial learning entries. Public visitors can read the public reference directory and verified reports; users can read their own reports; administrators can review and moderate reports.

### Grant administrator access

After creating the intended account, use the Supabase SQL Editor as the project owner to grant the role. Replace the email before executing:

```sql
update public.profiles
set role = 'administrator'
where id = (select id from auth.users where email = 'admin@example.org');
```

The UI reads this role to show the review queue. The database RLS policy remains the security boundary and rejects unauthorized moderation writes.

## Map and data provenance

Leaflet displays OpenStreetMap tiles with attribution and a Humanitarian OpenStreetMap Team layer option. Map reports are community observations, not satellite-verified findings. Species profiles link to IUCN Red List records; always open the source record for the current assessment and taxonomy. Learning-center examples are editorial samples and not field protocols.

## Deployment

Deploy as a standard Next.js application (for example, on Vercel or a Node.js host). Configure the same public Supabase URL and publishable/anon key as deployment environment variables, apply the migration, and set Supabase Auth's production redirect URLs. Never add a service-role key to the application or its environment variables prefixed with `NEXT_PUBLIC_`.

## Current boundaries

Supabase-backed authentication, report reads/submissions, image uploads, article bookmarks, profile edits, and role-gated moderation are wired to the included schema. Analytics trend lines and contributor/location summary figures remain explicitly labeled sample data. The learning content is editorial starter material with source references, not a substitute for expert or community guidance.
