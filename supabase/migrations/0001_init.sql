-- Rooms where up to 4 players plan a mission together, plus the futarchy round.
-- Players sign in anonymously (Supabase Auth > Sign In / Providers > Allow anonymous sign-ins).
-- Play tokens only. No real money is stored here.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 12),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid not null default auth.uid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  role text not null check (role in ('lead', 'spacecraft', 'science', 'power-comms')),
  tokens integer not null default 1000 check (tokens >= 0),
  joined_at timestamptz not null default now(),
  primary key (room_id, id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  team_name text not null check (char_length(team_name) between 1 and 60),
  manifest jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  player_id uuid not null default auth.uid(),
  tokens integer not null check (tokens > 0),
  created_at timestamptz not null default now()
);

create table public.results (
  proposal_id uuid primary key references public.proposals (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  seed bigint not null,
  result jsonb not null,
  score numeric not null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.proposals enable row level security;
alter table public.bets enable row level security;
alter table public.results enable row level security;

-- It's a public game with play tokens: anyone signed in can read every room.
create policy "read rooms" on public.rooms for select to authenticated using (true);
create policy "read players" on public.players for select to authenticated using (true);
create policy "read proposals" on public.proposals for select to authenticated using (true);
create policy "read bets" on public.bets for select to authenticated using (true);
create policy "read results" on public.results for select to authenticated using (true);

-- Players write only as themselves.
create policy "create a room" on public.rooms for insert to authenticated with check (created_by = auth.uid());
create policy "join as yourself" on public.players for insert to authenticated with check (id = auth.uid());
create policy "edit yourself" on public.players for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "propose as yourself" on public.proposals for insert to authenticated with check (created_by = auth.uid());
create policy "bet as yourself" on public.bets for insert to authenticated with check (player_id = auth.uid());

-- The room's creator records flight results.
create policy "room creator records results" on public.results for insert to authenticated
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid()));

-- Players may change their name and role, never their tokens.
revoke update on public.players from authenticated;
grant update (name, role) on public.players to authenticated;

-- Live updates for everyone in a room.
alter publication supabase_realtime add table public.players, public.proposals, public.bets, public.results;
