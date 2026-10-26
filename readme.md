# CalmPlan

**A student task manager that acts on burnout instead of just reporting it.**

CalmPlan tracks sleep, energy and workload, and when the load becomes unsustainable it
changes the schedule: it halves daily study capacity and postpones demanding tasks until
recovery improves. A second module tests whether a student's own confidence ratings actually
predict whether they finish their tasks.

**Live demo:** <https://calmplan.akhilesh-samantaray.workers.dev/>

> CalmPlan is a scheduling tool, not a medical or clinical product. "Burnout" means a
> heuristic fatigue-and-overload index. See [Methodology and validation status](docs/METHODOLOGY.md).

## What it does

- **Burnout index.** A formula over trailing study hours, sleep, current energy and planned
  workload produces a 0–100 score and one of three tiers: sustainable, amber, red.
- **The Governor.** In the red tier, daily capacity is multiplied by 0.5. In the red tier, or
  when sleep is under 5 h or energy is 3 or lower, demanding tasks are removed from today's
  schedule and shown as postponed with a stated reason. Work is split into 25 / 50-minute
  blocks with recovery breaks.
- **Confidence vs. completion.** Students rate confidence (1–5) when creating a task. Once
  there are at least 10 logged outcomes, a from-scratch logistic regression and a correlation
  test, both run in the browser on that student's own data, check whether confidence (and
  burnout level at creation) predicts completion. Below 10 observations the app says it does
  not know yet.
- **Also included:** a calendar view, syllabus / whiteboard OCR import (Gemini), an offline
  mutation queue that syncs when back online, and a no-signup 60-second sandbox where you drag
  sleep and energy sliders and watch the Governor rebuild the schedule.

## Why confidence?

Of the signals I could track, self-reported confidence is the one available *before* a task
starts. I chose it because I had seen the gap between "I'm fine" and what actually happens
once the work begins, and wanted to test whether a model could notice that gap for real.

## How it works

| Piece | File | Nature |
|---|---|---|
| Burnout index | `src/lib/burnoutEngine.ts` | Hand-set formula and thresholds |
| Governor | `src/lib/governorEngine.ts` | Rule-based scheduling |
| Correlation + logistic regression + k-fold CV | `src/lib/predictiveAnalytics.ts` | Statistics written from scratch, no ML library |
| Per-user personalisation | `src/lib/personalizationEngine.ts` | Applies the above once n ≥ 10 |
| Data model + analysis view | `supabase/migrations/` | Postgres on Supabase (see the schema note under Honest status) |

**Stack:** React 19, TypeScript, TanStack Start / Router / Query, Tailwind v4, Supabase
(auth + Postgres), Nitro on Cloudflare Workers, Vitest.

## Honest status

- The burnout weights and thresholds are my own judgement and **have not been validated
  against outcome data**.
- The confidence model is implemented and unit-tested, but **has not yet been evaluated on a
  multi-user dataset**, so this repo makes no claim that confidence predicts completion. The
  [planned validation protocol](docs/METHODOLOGY.md#4-planned-validation-protocol) describes how
  I intend to test it.
- Postponing a task removes it from today's schedule; it does not change the stored deadline.
- Thresholds are the same for every user; there is no per-user baseline yet.
- No push notifications, and no long-term burnout trend view yet.
- **Schema gap:** `supabase/migrations/` holds only the migration that added the prediction
  tables and view. The base tables (`tasks`, `profiles`, `daily_calibrations`) were created in
  the Supabase dashboard and are not yet exported here, so a fresh database cannot be fully
  reproduced from this repo alone. Exporting them (`supabase db dump --schema public`) is the
  next cleanup.

## Run it locally

Requires Node 20+ and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/geek-not-geeks/CalmPlan.git
cd CalmPlan
npm install
cp .env.example .env      # add your Supabase URL and anon key
# schema: see the schema gap noted under "Honest status"
npm run dev               # http://localhost:8080
npm test                  # 27 unit tests
```

`GEMINI_API_KEY` is only needed for OCR import and is read on the server.

## Deploying to Cloudflare Workers

1. Connect the repo in Workers & Pages and name the Worker `calmplan`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **build** variables (Vite inlines
   them at build time) and `GEMINI_API_KEY` as a Worker secret.
4. In Supabase, add the Worker URL under Authentication → URL Configuration.

## Project layout

```
src/lib/        burnout, governor and statistics engines (+ __tests__)
src/routes/   m  file-based routes (dashboard, calendar, sandbox, auth, ...)
src/components/ UI components
supabase/       database migrations
docs/           methodology and validation status
```
