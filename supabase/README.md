# Supabase (shared registry and leaderboard)

Two tables, both public to read, insert-only from the browser:

| Table | What it holds | Written by |
|---|---|---|
| `blueprints` | Designs published from the Debrief (Open Tech Registry) | the browser, publishable key |
| `missions` | One row per flight a player chose to post (leaderboard) | the browser, publishable key |

Row level security does the guarding: checks on every column, no update, no delete, new blueprints start at 0 adoptions, and the
leaderboard name is a generated callsign (e.g. `ESA-7K2Q`), never typed, so no personal data is stored.
The browser cannot prove a score was earned: this leaderboard is for fun, not prizes.

## Apply (once, by whoever owns the Supabase project)

Supabase dashboard > SQL editor > paste `migrations/0001_registry_and_leaderboard.sql` > Run. It is safe to run again.

Or from a terminal with the database URL (do not commit it):

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_registry_and_leaderboard.sql
```

## Game side

`.env.local` (public values, protected by RLS):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Set the same two variables as build variables in Cloudflare. Without them the game works the same: publishing stays on the device and the
leaderboard says "offline". Client code is in `src/registry/` (plain `fetch`, no SDK, never throws).
