import { Icon, type IconName } from "@/components/ui";
import { LogoMark } from "@/components/brand/Logo";
import { finalCta, nasaData, references, rules, tech, team, useOfAi } from "../content";
import { ExtLink, PlayButton, Reveal, Section } from "../lib";

export function NasaData() {
  return (
    <Section id="nasa-data" kicker={nasaData.kicker} title={nasaData.title}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {nasaData.live.map((d, i) => (
          <Reveal as="li" key={d.name} delay={(i % 3) * 0.1} className="list-none">
            <div className="glass flex h-full flex-col p-6">
              <p className="num flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-bright">
                <span className="pulse-dot h-2 w-2 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" aria-hidden="true" />Live
              </p>
              <h3 className="mt-3 text-lg font-semibold text-fg">{d.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{d.use}</p>
              <ExtLink href={d.url} className="mt-5 text-sm">Open source</ExtLink>
            </div>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-12"><p className="max-w-3xl text-lg leading-relaxed text-muted">{nasaData.reference}</p></Reveal>
      <Reveal className="mt-8">
        <ul className="flex flex-wrap gap-3">
          {nasaData.resources.map((r) => <li key={r} className="rounded-full border border-line bg-glass px-4 py-2 text-sm text-fg">{r}</li>)}
        </ul>
      </Reveal>
    </Section>
  );
}

const TECH_ICON: IconName[] = ["science", "lock", "link", "data", "trophy", "globe"];

export function Tech() {
  return (
    <Section id="tech" kicker={tech.kicker} title={tech.title}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tech.items.map((t, i) => (
          <Reveal as="li" key={t.title} delay={(i % 3) * 0.1} className="list-none">
            <div className="glass h-full p-6">
              <span className="text-violet-bright"><Icon name={TECH_ICON[i]} size={24} /></span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
            </div>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-10"><p className="num text-sm leading-relaxed text-muted">{tech.stack}</p></Reveal>
    </Section>
  );
}

export function Rules() {
  return (
    <Section id="rules" kicker={rules.kicker}>
      <ul className="grid gap-4 md:grid-cols-2">
        {rules.items.map((r, i) => (
          <Reveal as="li" key={r} delay={(i % 2) * 0.1} className="list-none">
            <div className="glass flex h-full items-start gap-3 p-5">
              <span className="mt-0.5 text-ok"><Icon name="check" size={18} /></span>
              <p className="text-base text-fg">{r}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

export function Team() {
  return (
    <Section id="team" kicker={team.kicker} title={team.place}>
      <ul className="grid gap-5 md:grid-cols-3">
        {team.members.map((m, i) => (
          <Reveal as="li" key={m.name} delay={i * 0.1} className="list-none">
            <div className="glass h-full p-6">
              <h3 className="text-xl font-semibold text-fg">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.role}</p>
              <ExtLink href={`https://github.com/${m.github}`} className="num mt-4 text-sm">@{m.github}</ExtLink>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

export function References() {
  return (
    <>
      <Section id="references" kicker={references.kicker} className="!pb-10">
        <div className="grid gap-5 md:grid-cols-3">
          {references.groups.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.1}>
              <div className="glass h-full p-6">
                <h3 className="text-base font-semibold text-fg">{g.title}</h3>
                <ul className="mt-4 space-y-3">
                  {g.items.map((it) => <li key={it} className="text-sm leading-relaxed text-muted">{it}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8"><ExtLink href={references.repo} className="text-base">Source code on GitHub</ExtLink></Reveal>
      </Section>
      <Section id="ai" kicker={useOfAi.kicker} narrow className="!py-10">
        <Reveal><p className="text-base leading-relaxed text-muted">{useOfAi.text}</p></Reveal>
      </Section>
    </>
  );
}

export function FinalCta() {
  return (
    <Section id="play" className="overflow-hidden text-center">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.35),rgba(34,211,238,0.1)_50%,transparent_70%)]" />
      <Reveal className="relative">
        <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-fg sm:text-5xl">{finalCta.title}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">{finalCta.sub}</p>
        <div className="mt-10"><PlayButton big>{finalCta.play}</PlayButton></div>
        <p className="font-display mt-16 text-sm text-gradient sm:text-base">{finalCta.closing}</p>
      </Reveal>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-2"><LogoMark size={22} />SpaceDAO · NASA Space Apps Challenge 2026</span>
        <span>Not endorsed by NASA or any agency.</span>
      </div>
    </footer>
  );
}
