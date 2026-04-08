begin;

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.flight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  departure_icao text not null check (char_length(trim(departure_icao)) = 4),
  arrival_icao text not null check (char_length(trim(arrival_icao)) = 4),
  planned_altitude integer not null check (planned_altitude > 0),
  raw_weather_data jsonb not null default '{}'::jsonb,
  ai_evaluation_report text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists flight_logs_user_id_idx
  on public.flight_logs (user_id);

create index if not exists flight_logs_created_at_idx
  on public.flight_logs (created_at desc);

create index if not exists flight_logs_weather_gin_idx
  on public.flight_logs using gin (raw_weather_data);

alter table public.flight_logs enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Flight logs are viewable by owner" on public.flight_logs;
create policy "Flight logs are viewable by owner"
on public.flight_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Flight logs are insertable by owner" on public.flight_logs;
create policy "Flight logs are insertable by owner"
on public.flight_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Flight logs are updatable by owner" on public.flight_logs;
create policy "Flight logs are updatable by owner"
on public.flight_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Flight logs are deletable by owner" on public.flight_logs;
create policy "Flight logs are deletable by owner"
on public.flight_logs
for delete
to authenticated
using (auth.uid() = user_id);

commit;
