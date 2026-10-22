# Toolbox

Toolbox is a multi-tenant app for tracking physical tools and equipment. A company can see what it owns, where each tool belongs, where it is right now, and who has it.

Bluetooth tags and GPS devices are represented in the database only. The app does not connect to them and does not invent locations, battery levels, or orders.

## Requirements

- Node.js 22
- A Supabase project
- About 1 GB of free disk space for `npm install`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. In the Supabase dashboard, create a project and fill in:

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server. This is the anon or publishable key. |
| `NEXT_PUBLIC_APP_URL` | QR codes, NFC addresses, and invite links |
| `SUPABASE_SERVICE_ROLE_KEY` | Demo seed script only. Never prefix it with `NEXT_PUBLIC_`. |
| `ALLOW_DEMO_SEED` | Must be `true` to run the seed, and only on a development project |

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alias for the anon key.

4. Apply the database migration in `supabase/migrations/20261020020000_initial_schema.sql`.

With the Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the file into the Supabase SQL editor and run it. The migration creates tables, row level security, the private `asset-photos` bucket, and plan limits.

5. In Authentication settings, enable email and password. For local development, turn off email confirmation so a new owner can continue straight into onboarding.

6. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Demo data

Demo data is never created for a normal signup. To load the sample company on a development project:

```bash
ALLOW_DEMO_SEED=true npm run seed:demo
```

The script refuses to run when `ALLOW_DEMO_SEED` is not exactly `true`, and it also refuses `NODE_ENV=production` and `VERCEL_ENV=production`.

Sample company: Example Contracting Ltd.

| Person | Email | Password |
| --- | --- | --- |
| Owner | owner@example-contracting.test | DemoPass123! |
| Manager | manager@example-contracting.test | DemoPass123! |
| Employee | employee@example-contracting.test | DemoPass123! |

## What an owner can do

1. Sign up and create a company.
2. Add locations such as a workshop, warehouse, and job site.
3. Add a tool, including a photo stored in a private bucket.
4. Set the warehouse as its home and keep the current location separate.
5. Print a QR label. The code points at `/tag/TOKEN`.
6. Scan that code. Signed-in employees land on the tool. Anyone else sees a public page without prices, serial numbers, employee names, or history.
7. Check the tool out.
8. Move its current location without changing its home.
9. See it flagged when it is away from home.
10. Return it. Returning it somewhere else keeps the away-from-home flag.
11. Read the movement history on the tool and on Activity.
12. Submit a tool request and approve it as an owner or manager.

The free plan allows 10 active assets. The limit is enforced by a database trigger as well as the app. Paid plans are defined in `plan_definitions`. Stripe columns exist on `subscriptions` and are unused.

## NFC

Every tool has one permanent address, for example `https://your-domain/tag/TOKEN`. Print it as a QR code or write that same URL onto a blank NFC sticker with an NFC writing app. On Android Chrome, the tool page can write the sticker when the browser exposes Web NFC. Other browsers show instructions instead of claiming they can program the sticker.

## Roles

Owners manage the company, team, billing view, locations, assets, and requests. Managers manage locations, assets, and requests. Employees can view tools, scan them, check them in and out, request tools, and report problems. Purchase prices live in `asset_financials`, which employees cannot read. Public tag lookups go through `get_public_tag` and return only the name, code, company, status, and optional return location.

## Tests

```bash
npm test
```

Tests use Node's built-in test runner, so they do not need a browser or a Supabase project. They cover role permissions, plan limits, public-tag redaction, scan parsing, CSV import, row level security coverage in the migration, and the absence of the service-role key from application source.

## Deploying to Vercel

Set the same `NEXT_PUBLIC_` variables in the Vercel project. Do not set `SUPABASE_SERVICE_ROLE_KEY` on the deployment unless you have a separate trusted job that needs it. Do not set `ALLOW_DEMO_SEED`. Apply the migration to the production database before the first signup.
