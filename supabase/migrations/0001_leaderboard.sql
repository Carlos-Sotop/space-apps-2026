-- Global leaderboard. Rows are written only by the Cloudflare Worker after it
-- re-runs the game engine on the submitted design, seed and operations log.
-- The browser reads through the Worker; anyone may read, nobody may write directly.

create table if not exists public.scores (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  mission_id    text not null check (mission_id in ('orbital-lab', 'earth-guardian', 'moon-base-zero')),
  player_name   text not null check (char_length(player_name) between 1 and 24),
  country       text check (country is null or country ~ '^[A-Z]{2}$' or country = 'INT'),
  mode          text not null default 'solo' check (mode in ('solo', 'crew')),
  crew_size     smallint not null default 1 check (crew_size between 1 and 4),
  total         smallint not null check (total between 0 and 100),
  flight_score  smallint not null check (flight_score between 0 and 100),
  ops_score     smallint check (ops_score between 0 and 100),
  grade         text not null check (char_length(grade) <= 3),
  success       boolean not null,
  data_gb       real not null default 0,
  coalition     jsonb not null,          -- { leadId, partnerIds[] }
  summary       jsonb not null,          -- { vehicle, destination, modules[], objectives[] }
  manifest_hash text not null check (char_length(manifest_hash) = 64),
  seed          bigint not null,
  custom_tech   boolean not null default false
);

create index if not exists scores_mission_total on public.scores (mission_id, total desc, created_at);
create index if not exists scores_total on public.scores (total desc, created_at);

alter table public.scores enable row level security;

drop policy if exists "scores are public" on public.scores;
create policy "scores are public" on public.scores for select using (true);
-- No insert/update/delete policy: only the secret key (Worker) can write.
