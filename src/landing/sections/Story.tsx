import { Icon, type IconName } from "@/components/ui";
import { challenge, howToPlay, idea, missionsCopy, problem } from "../content";
import { NetworkVisual } from "../NetworkVisual";
import { ExtLink, Reveal, Section } from "../lib";

export function Problem() {
  return (
    <Section id="problem" kicker={problem.kicker} title={problem.title}>
      <ul className="grid gap-5 md:grid-cols-3">
        {problem.facts.map((f, i) => (
          <Reveal as="li" key={f.big} delay={i * 0.12} className="list-none">
            <div className="glass flex h-full flex-col p-7">
              <p className="font-display text-2xl leading-snug text-gradient sm:text-3xl">{f.big}</p>
              <p className="mt-4 text-lg leading-snug text-fg">{f.label}</p>
              <ExtLink href={f.source.url} className="mt-auto pt-6 text-sm">
                <span className="line-clamp-2">{f.source.title}</span>
              </ExtLink>
            </div>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-12"><p className="max-w-3xl text-lg leading-relaxed text-muted">{problem.outro}</p></Reveal>
    </Section>
  );
}

export function Idea() {
  return (
    <Section id="idea" kicker={idea.kicker} title={idea.title}>
      <Reveal><p className="max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">{idea.body}</p></Reveal>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {idea.pillars.map((p, i) => (
          <Reveal as="li" key={p.title} delay={i * 0.1} className="list-none">
            <div className="glass h-full p-6">
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-full border border-cyan/40 text-cyan-bright shadow-[0_0_20px_rgba(34,211,238,0.25)]"><Icon name={p.icon as IconName} size={22} /></span>
              <h3 className="text-lg font-semibold text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-16">
        <div className="glass p-4 sm:p-8">
          <NetworkVisual />
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-muted sm:text-lg">{idea.network}</p>
        </div>
      </Reveal>
    </Section>
  );
}

export function HowToPlay() {
  return (
    <Section id="how-to-play" kicker={howToPlay.kicker} title={howToPlay.title}>
      <ol className="relative grid gap-8 border-l border-line pl-8 xl:grid-cols-7 xl:gap-5 xl:border-l-0 xl:pl-0">
        <span aria-hidden="true" className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-violet via-cyan to-violet-bright opacity-60 xl:block" />
        {howToPlay.steps.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 0.08} className="relative list-none">
            <span className="num absolute -left-[3.2rem] top-0 grid h-10 w-10 place-items-center rounded-full border border-cyan bg-bg text-sm text-cyan-bright shadow-[0_0_18px_rgba(34,211,238,0.35)] xl:static xl:mb-5">{s.n}</span>
            <h3 className="text-lg font-semibold text-fg">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
          </Reveal>
        ))}
      </ol>
      <Reveal className="mt-14"><p className="glass inline-block max-w-3xl px-6 py-4 text-base text-fg">{howToPlay.modes}</p></Reveal>
    </Section>
  );
}

const MISSION_ICON: Record<string, IconName> = { "orbital-lab": "science", "earth-guardian": "earth-observation", "moon-base-zero": "moon" };
const LEVEL_DOTS: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

function MissionArt({ id }: { id: string }) {
  if (id === "orbital-lab")
    return (
      <svg viewBox="0 0 240 120" className="h-full w-full" aria-hidden="true">
        <circle cx="120" cy="60" r="34" fill="none" stroke="#a78bfa" strokeOpacity="0.5" />
        <ellipse cx="120" cy="60" rx="100" ry="30" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeDasharray="3 7" />
        <rect x="112" y="52" width="16" height="16" rx="2" fill="#eef0ff" /><path d="M86 60h26M128 60h26" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  if (id === "earth-guardian")
    return (
      <svg viewBox="0 0 240 120" className="h-full w-full" aria-hidden="true">
        <circle cx="120" cy="150" r="100" fill="#14163f" stroke="#22d3ee" strokeOpacity="0.6" />
        <path d="M120 22v-6M92 32 82 22m66 10 10-10" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        <path d="M120 22 96 54h48z" fill="#22d3ee" opacity="0.15" /><circle cx="120" cy="22" r="5" fill="#eef0ff" />
        <circle cx="120" cy="58" r="3" fill="#fb7185" />
      </svg>
    );
  return (
    <svg viewBox="0 0 240 120" className="h-full w-full" aria-hidden="true">
      <path d="M0 120V92Q60 70 120 84T240 76V120Z" fill="#1c1f4d" stroke="#a78bfa" strokeOpacity="0.6" />
      <circle cx="190" cy="30" r="16" fill="#3b82f6" opacity="0.85" />
      <path d="M96 84V66h16v18M104 66V56" stroke="#eef0ff" strokeWidth="2" fill="none" />
      <circle cx="104" cy="54" r="3" fill="#22d3ee" />
    </svg>
  );
}

export function Missions() {
  return (
    <Section id="missions" kicker={missionsCopy.kicker}>
      <ul className="grid gap-5 md:grid-cols-3">
        {missionsCopy.items.map((m, i) => (
          <Reveal as="li" key={m.id} delay={i * 0.12} className="list-none">
            <article className="glass flex h-full flex-col overflow-hidden">
              <div className="h-36 border-b border-line bg-[radial-gradient(ellipse_at_50%_100%,rgba(139,92,246,0.25),transparent_70%)] p-3"><MissionArt id={m.id} /></div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base text-fg">{m.name}</h3>
                  <span className="num inline-flex items-center gap-2 text-xs text-muted">
                    {m.level}
                    <span className="flex gap-1" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= LEVEL_DOTS[m.level] ? "bg-cyan" : "bg-white/15"}`} />)}</span>
                  </span>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{m.text}</p>
                <span className="mt-5 text-cyan-bright"><Icon name={MISSION_ICON[m.id]} size={20} /></span>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

export function Challenge() {
  return (
    <Section id="challenge" kicker={challenge.kicker} title={challenge.title}>
      <Reveal>
        <div className="glass overflow-hidden">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Challenge 13 requirements and how SpaceDAO answers each</caption>
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-line text-xs uppercase tracking-[0.18em] text-muted">
                <th scope="col" className="w-[38%] px-6 py-4 font-medium">The challenge asks</th>
                <th scope="col" className="px-6 py-4 font-medium">SpaceDAO answers</th>
              </tr>
            </thead>
            <tbody>
              {challenge.rows.map((r) => (
                <tr key={r.asks} className="block border-b border-line px-5 py-4 last:border-0 md:table-row md:px-0 md:py-0">
                  <th scope="row" className="block text-base font-medium text-fg md:table-cell md:px-6 md:py-4">
                    <Icon name="check" size={16} className="mr-2 inline text-ok" />{r.asks}
                  </th>
                  <td className="block pt-1 text-sm leading-relaxed text-muted md:table-cell md:px-6 md:py-4 md:text-base">{r.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
      <Reveal className="mt-8"><ExtLink href={challenge.url} className="text-base">Read the official challenge</ExtLink></Reveal>
    </Section>
  );
}
