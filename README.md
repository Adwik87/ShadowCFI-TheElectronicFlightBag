# Shadow CFI

Shadow CFI is an agentic Electronic Flight Bag (EFB) built as a Progressive Web App for desktop, tablet, and mobile use. It combines deterministic flight-planning logic with AI-assisted briefing to help pilots evaluate routes, weather, altitude choices, fuel assumptions, runway suitability, and operational risk in a more structured way than a simple chatbot or single-page weather checker.

The project is designed around a simple principle: aviation-critical logic should not rely on the language model alone. Hard planning calculations live in deterministic code, while the AI layer is used for translation, explanation, prioritization, and instructor-style feedback.

## Current Capabilities

- Multi-page EFB shell with dedicated workflows for overview, plan review, planner, weather, logs, aircraft, briefing, charts, and settings
- AI-assisted flight plan evaluation using Groq and LangChain
- Live METAR and TAF ingestion from NOAA AviationWeather.gov
- Structured CFI-style go / caution / no-go briefing
- Supabase-backed authentication and flight-log persistence for signed-in users
- Dedicated Weather Desk for airport weather comparison
- Deterministic planning engine for:
  - winds aloft estimation
  - groundspeed calculation
  - runway headwind / crosswind / tailwind analysis
  - VFR / IFR altitude validation
  - fuel, reserve, endurance, and range estimation
  - weighted route risk scoring
  - route-area hazard ingestion
  - route-area PIREP integration path
  - density altitude and basic performance warnings
  - alternate airport scoring
- Aircraft page with an early weight-and-balance workflow
- Briefing page that combines deterministic planning output with AI evaluation
- Charts/Documents pane for airport reference workflows
- Installable PWA setup with manifest, service worker, and app icons

## Product Direction

Shadow CFI is being built as a real operational flight-deck workspace rather than a pure AI demo. The goal is to separate pilot workflows cleanly:

- `Dashboard`: high-level product and operational overview
- `Plan Review`: AI-assisted route and weather evaluation
- `Flight Planner`: deterministic planning engine
- `Weather Desk`: direct airport weather comparison
- `Logs`: saved evaluation history
- `Aircraft`: aircraft profile and loading workflow
- `Briefing`: dispatch-style or training-style summary view
- `Charts`: airport and document reference surface
- `Settings`: auth and system configuration

## Tech Stack

### Frontend

- Next.js App Router
- React
- Tailwind CSS
- `next-pwa`

### AI Layer

- Groq API
- LangChain.js
- structured JSON evaluator responses

### Data Layer

- Supabase Auth
- Supabase Postgres
- Row Level Security (RLS)

### Aviation Data Sources

- NOAA AviationWeather.gov for METAR / TAF
- AviationWeather advisory products for route-area hazards
- route-bounded PIREP ingestion path
- AviationAPI airport/charts references where available

## Architecture Notes

The current architecture intentionally separates:

- deterministic aviation logic
- AI explanation and instruction
- persistence and pilot-owned records
- route-specific operational surfaces

This means the app does not ask the LLM to invent wind math, runway components, altitude legality, or fuel estimates. Those are calculated in code first, then surfaced through AI-assisted briefing where helpful.

## Database Scope

The repository currently includes:

- `supabase_schema.sql`
  - base user profiles and flight logs
- `supabase_schema_efb_expansion.sql`
  - pilot settings
  - aircraft profiles
  - route templates
  - flight plans
  - multi-leg plan structure
  - saved briefings
  - alert rules and alert events

Run both in Supabase SQL Editor if you want the full current schema available.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Add environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

Optional:

```env
GROQ_MODEL=llama-3.1-8b-instant
```

### 3. Set up Supabase

Create a free Supabase project, then run:

- [`supabase_schema.sql`](./supabase_schema.sql)
- [`supabase_schema_efb_expansion.sql`](./supabase_schema_efb_expansion.sql)

from the Supabase SQL Editor.

### 4. Add PWA icons

Place these files in `public/`:

- `icon-192.png`
- `icon-512.png`

### 5. Start the app

```bash
npm run dev
```

Then open:

[http://localhost:3000](http://localhost:3000)

## Verification Status

The current repo has already been exercised through:

- `npm run lint`
- `npm run build`
- live checks against:
  - `/api/evaluate`
  - `/api/weather`
  - `/api/planning`

The app is currently in a working state with live weather, planning, and briefing flows.

## Current Limitations

Shadow CFI is already beyond a prototype, but it is not yet the final end-state EFB. The following items are still planned or partially scaffolded rather than fully complete:

- live NOTAM ingestion
- terrain and obstacle route analysis
- fuller aircraft-specific performance engine
- deeper nav-log generation
- collaborative/shareable dispatch packets
- alerting on changing conditions over time
- richer offline operational references
- voice briefing output
- airspace / TFR / special-use overlays
- planned-vs-actual post-flight debrief

## Why This Project Exists

Most AI aviation demos stop at "paste METAR, get response." Shadow CFI is being built to go further:

- real weather ingestion
- real planning logic
- structured risk outputs
- dedicated flight-deck surfaces
- AI used as a briefing layer, not a substitute for calculations

The goal is to make the product feel closer to a lightweight, explainable, AI-assisted EFB rather than a novelty prompt wrapper.

## Roadmap

Near-term implementation priorities:

1. reliable NOTAM workflow
2. richer alternate-airport logic
3. terrain and obstacle risk layers
4. expanded aircraft performance calculations
5. improved briefing packet generation
6. alerts and evolving-condition monitoring

## License

No license has been added yet. Add one before public distribution if needed.
