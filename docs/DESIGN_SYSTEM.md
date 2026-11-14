# Design system

Owner: Dayon. Tokens live in `src/styles/tokens.css`; primitives in `src/components/ui/`. Use them; don't hand-roll new colors or shadows.

## Mood

Elegant, calm, high-tech mission control. Deep space, glass panels, restrained neon. Never cluttered, never a wall of text. The SpaceDAO logo (violet/blue network globe with an orbit ring) sets the palette.

## Principles

1. **Visual first.** Gauges, icons, motion and the globe carry the meaning; text confirms it.
2. **One line per card.** Depth goes behind the info button (right-side drawer, with sources).
3. **Consequence is visible.** Any choice animates the gauges it touches.
4. **Calm by default, glow for focus.** Neon only on the primary action, the selected card and the active step.
5. **Accessible.** AA contrast, keyboard everywhere, visible violet focus ring, `prefers-reduced-motion` respected.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#04050d` → `#0a0b1e` gradient | App background, with a subtle starfield |
| `--glass` / `--glass-strong` | `rgba(255,255,255,.04)` / `.07` | Cards, panels (`backdrop-filter: blur(16px) saturate(140%)`) |
| `--glass-border` | `rgba(255,255,255,.09)` | 1px borders |
| `--fg` / `--fg-muted` / `--fg-faint` | `#eef0ff` / `#9aa0c3` / `#5d6390` | Text levels |
| `--violet` / `--violet-bright` | `#8b5cf6` / `#a78bfa` | Brand, primary actions, focus |
| `--blue` / `--blue-bright` | `#3b82f6` / `#60a5fa` | Brand gradient partner, links |
| `--cyan` | `#22d3ee` | Live NASA data only |
| `--ok` / `--tight` / `--over` | `#34d399` / `#fbbf24` / `#fb7185` | Gauge status |
| Brand gradient | `linear-gradient(90deg,#a78bfa,#60a5fa)` | "DAO" wordmark, primary button, big numbers |
| Glow | `0 0 24px rgba(139,92,246,.35)` | Focus elements only |
| Radius | 16px cards, 10px controls, 999px chips | |

## Type

- **Michroma** (display): uppercase, letter-spacing .08em; titles, grades, big numbers only.
- **Inter** (UI): everything else.
- **JetBrains Mono** (data): numbers, units, hashes, telemetry, tabular figures.
All self-hosted via Fontsource (SIL Open Font License).

## Primitives

`GlassCard` (selectable with glow), `Button` (primary gradient / ghost / danger), `InfoButton` + `InfoDrawer`, `Badge`, `LiveBadge` ("LIVE · NASA DONKI" in cyan, or "SNAPSHOT · date"), `Gauge` (used/capacity, status color, breakdown tooltip), `MonogramBadge` (initials in the actor's color + flag emoji: **our replacement for logos**), `Slider`, `StepRail`, `Modal`, `Toast`, `Starfield`.

## Motion

180-320 ms, ease-out. Screens: fade + 12px slide. Cards: scale 1.02 on hover, glow on select. Gauges: spring to new value. Council chat: typing dots before each message. Signatures: each slot fills with a short scan line. Launch: plume particles + camera shake under 300 ms (off with reduced motion).

## Layout

Desktop first (judges on laptops 1280-1536 px). Must not break at 390 px: columns stack, HUD gauges wrap into two rows, no horizontal scroll.

## Copy

Bare verbs and nouns for controls ("Fly", "Adopt", "Sign"). Numbers with units ("1,240 kg", "3.2 kW", "$84M", "12 Gb/day"). Errors say what and how to fix ("Too heavy for Falcon 9 by 120 kg. Drop the drill or pick Falcon Heavy."). No exclamation marks except on success.

## Assets

Logo: `public/brand/`. No NASA, agency or company logos or mission patches. NASA imagery from images.nasa.gov is public domain but check it shows no logos. AI-generated images must carry a visible "AI-generated" watermark.
