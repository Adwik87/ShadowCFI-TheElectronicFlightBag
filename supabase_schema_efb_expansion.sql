begin;

create table if not exists public.pilot_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  certificate_level text,
  preferred_units jsonb not null default '{"distance":"nm","fuel":"gal","weight":"lb"}'::jsonb,
  home_airport text check (home_airport is null or char_length(trim(home_airport)) = 4),
  default_aircraft_id uuid,
  risk_tolerance text not null default 'standard',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.aircraft_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tail_number text,
  display_name text not null,
  aircraft_type text not null,
  engine_type text,
  is_complex boolean not null default false,
  is_high_performance boolean not null default false,
  fuel_capacity_usable numeric(8,2),
  fuel_burn_gph numeric(8,2),
  cruise_speed_kts numeric(8,2),
  endurance_hours numeric(8,2),
  reserve_minutes integer default 45,
  empty_weight_lb numeric(8,2),
  max_gross_weight_lb numeric(8,2),
  station_data jsonb not null default '[]'::jsonb,
  performance_data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.route_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  aircraft_profile_id uuid references public.aircraft_profiles (id) on delete set null,
  name text not null,
  departure_icao text not null check (char_length(trim(departure_icao)) = 4),
  arrival_icao text not null check (char_length(trim(arrival_icao)) = 4),
  preferred_altitude integer,
  route_notes text,
  template_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flight_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  aircraft_profile_id uuid references public.aircraft_profiles (id) on delete set null,
  route_template_id uuid references public.route_templates (id) on delete set null,
  plan_name text not null,
  mode text not null default 'dispatch',
  departure_time timestamptz,
  arrival_time timestamptz,
  route_summary text,
  departure_icao text not null check (char_length(trim(departure_icao)) = 4),
  arrival_icao text not null check (char_length(trim(arrival_icao)) = 4),
  planned_altitude integer,
  filing_rules text default 'VFR',
  status text not null default 'draft',
  risk_score numeric(5,2),
  route_geometry jsonb not null default '{}'::jsonb,
  planning_snapshot jsonb not null default '{}'::jsonb,
  ai_briefing jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flight_plan_legs (
  id uuid primary key default gen_random_uuid(),
  flight_plan_id uuid not null references public.flight_plans (id) on delete cascade,
  leg_index integer not null,
  departure_icao text not null check (char_length(trim(departure_icao)) = 4),
  arrival_icao text not null check (char_length(trim(arrival_icao)) = 4),
  airway_route text,
  planned_altitude integer,
  estimated_time_minutes integer,
  winds_aloft jsonb not null default '{}'::jsonb,
  route_analysis jsonb not null default '{}'::jsonb,
  unique (flight_plan_id, leg_index)
);

create table if not exists public.flight_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  flight_plan_id uuid references public.flight_plans (id) on delete cascade,
  title text not null,
  briefing_mode text not null default 'dispatch',
  content jsonb not null default '{}'::jsonb,
  share_token text unique,
  printable_markdown text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  flight_plan_id uuid references public.flight_plans (id) on delete cascade,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  flight_plan_id uuid references public.flight_plans (id) on delete cascade,
  severity text not null,
  category text not null,
  title text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists aircraft_profiles_user_id_idx
  on public.aircraft_profiles (user_id);

create index if not exists route_templates_user_id_idx
  on public.route_templates (user_id);

create index if not exists flight_plans_user_id_idx
  on public.flight_plans (user_id);

create index if not exists flight_plan_legs_flight_plan_id_idx
  on public.flight_plan_legs (flight_plan_id, leg_index);

create index if not exists flight_briefings_user_id_idx
  on public.flight_briefings (user_id);

create index if not exists alert_rules_user_id_idx
  on public.alert_rules (user_id);

create index if not exists alert_events_user_id_idx
  on public.alert_events (user_id, created_at desc);

alter table public.pilot_settings enable row level security;
alter table public.aircraft_profiles enable row level security;
alter table public.route_templates enable row level security;
alter table public.flight_plans enable row level security;
alter table public.flight_plan_legs enable row level security;
alter table public.flight_briefings enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;

drop policy if exists "Pilot settings owner select" on public.pilot_settings;
create policy "Pilot settings owner select"
on public.pilot_settings for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Pilot settings owner insert" on public.pilot_settings;
create policy "Pilot settings owner insert"
on public.pilot_settings for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Pilot settings owner update" on public.pilot_settings;
create policy "Pilot settings owner update"
on public.pilot_settings for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Aircraft profiles owner all" on public.aircraft_profiles;
create policy "Aircraft profiles owner all"
on public.aircraft_profiles for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Route templates owner all" on public.route_templates;
create policy "Route templates owner all"
on public.route_templates for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Flight plans owner all" on public.flight_plans;
create policy "Flight plans owner all"
on public.flight_plans for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Flight briefings owner all" on public.flight_briefings;
create policy "Flight briefings owner all"
on public.flight_briefings for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Alert rules owner all" on public.alert_rules;
create policy "Alert rules owner all"
on public.alert_rules for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Alert events owner all" on public.alert_events;
create policy "Alert events owner all"
on public.alert_events for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Flight plan legs via plan ownership" on public.flight_plan_legs;
create policy "Flight plan legs via plan ownership"
on public.flight_plan_legs for all to authenticated
using (
  exists (
    select 1
    from public.flight_plans fp
    where fp.id = flight_plan_id
      and fp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.flight_plans fp
    where fp.id = flight_plan_id
      and fp.user_id = auth.uid()
  )
);

commit;
