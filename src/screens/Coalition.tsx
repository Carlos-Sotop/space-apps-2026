import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ActorCard } from "@/components/ActorCard";
import { TopBar } from "@/components/hud/TopBar";
import { ActionBar, Badge, Button, Icon, RecommendedButton, StepHeader, type IconName } from "@/components/ui";
import { MonogramBadge } from "@/components/ui/MonogramBadge";
import type { ActorKind } from "@/engine/types";
import { getActor, getMission } from "@/lib/catalog";
import { COVERAGE, coverage, treasury } from "@/lib/coalition";
import { fmtMUsd } from "@/lib/format";
import { useCatalog, useGame } from "@/store/game";

/** Best-fit partners per mission, in order of preference (the lead is skipped when it appears here). */
const RECOMMENDED: Record<string, string[]> = {
  "orbital-lab": ["nasa", "spacex", "axiom", "esa", "jaxa"],
  "earth-guardian": ["esa", "iceye", "isro", "aee", "aeb"],
  "moon-base-zero": ["nasa", "intuitive-machines", "spacex", "firefly", "jaxa"],
};

type Filter = "all" | ActorKind;
const FILTERS: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "agency", label: "Agencies" }, { id: "company", label: "Companies" }];

function Tabs({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div role="tablist" aria-label="Filter members" className="inline-flex rounded-full border border-line bg-glass p-1">
      {FILTERS.map((f) => (
        <button key={f.id} type="button" role="tab" aria-selected={value === f.id} onClick={() => onChange(f.id)} className={`rounded-full px-4 py-1.5 text-sm transition ${value === f.id ? "bg-violet/25 text-fg shadow-glow" : "text-muted hover:text-fg"}`}>{f.label}</button>
      ))}
    </div>
  );
}

function CoveragePanel() {
  const { leadId, partnerIds, missionId } = useGame();
  const members = [leadId, ...partnerIds].map((id) => (id ? getActor(id) : undefined)).filter((a) => !!a);
  const cov = coverage(members as NonNullable<(typeof members)[number]>[]);
  const total = treasury(getMission(missionId ?? ""), members as NonNullable<(typeof members)[number]>[]);
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-widest text-faint">Coverage</div>
      <ul className="space-y-2">
        {COVERAGE.map((c) => (
          <li key={c.key} className="flex items-center gap-3">
            <Icon name={c.key as IconName} size={15} className={cov[c.key] ? "text-violet-bright" : "text-faint"} />
            <span className="w-20 text-xs text-muted">{c.label}</span>
            <span className="flex flex-1 gap-1" role="img" aria-label={`${c.label} ${cov[c.key]} of 3`}>
              {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= cov[c.key] ? "bg-brand" : "bg-white/10"}`} />)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-xs uppercase tracking-widest text-faint">Treasury</span>
        <span className="num text-lg text-fg">{fmtMUsd(total)}</span>
      </div>
    </div>
  );
}

export default function Coalition() {
  const catalog = useCatalog();
  const { leadId, partnerIds, missionId, setLead, togglePartner, setPartners, startControl, go } = useGame();
  const mission = getMission(missionId ?? "");
  const [sub, setSub] = useState<"lead" | "partners">(leadId && partnerIds.length ? "partners" : "lead");
  const [filter, setFilter] = useState<Filter>("all");

  const actors = useMemo(() => catalog.actors.filter((a) => filter === "all" || a.kind === filter), [catalog, filter]);
  const recommended = useMemo(() => (RECOMMENDED[mission?.id ?? ""] ?? []).filter((id) => id !== leadId && catalog.actors.some((a) => a.id === id)).slice(0, 3), [mission, leadId, catalog]);
  const ready = partnerIds.length === 3;
  const members = [leadId, ...partnerIds];

  return (
    <div>
      <TopBar title="Your coalition" onBack={() => (sub === "partners" ? setSub("lead") : go("missions"))} right={mission && <Badge tone="violet">{mission.name}</Badge>} />
      <div data-coach="coalition.main" className="mx-auto max-w-7xl px-4 sm:px-6">
        <StepHeader
          eyebrow={sub === "lead" ? "Step 1 of 2" : "Step 2 of 2"}
          title={sub === "lead" ? "Who do you represent?" : "Choose 3 partners for your mission"}
          subtitle={sub === "lead" ? "Your agency or company leads the council." : "Three partners complete your council of four."}
        />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onChange={setFilter} />
          {sub === "partners" && <RecommendedButton data-coach="coalition.recommended" label="Use recommended coalition" disabled={recommended.length < 3} onClick={() => setPartners(recommended)} />}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={sub} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="order-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:order-none" data-coach="coalition.cards">
              {actors.filter((a) => sub === "lead" || a.id !== leadId).map((a) => (
                <ActorCard
                  key={a.id} actor={a}
                  selected={sub === "lead" ? leadId === a.id : partnerIds.includes(a.id)}
                  disabled={sub === "partners" && !partnerIds.includes(a.id) && partnerIds.length >= 3}
                  onSelect={() => (sub === "lead" ? setLead(a.id) : togglePartner(a.id))}
                />
              ))}
            </div>
            <aside data-coach="coalition.council" className="glass-strong order-1 h-fit space-y-5 p-5 lg:sticky lg:top-4 lg:order-none">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-faint">Your council</div>
                  <ul className="flex gap-3">
                    {members.map((id, i) => (
                      <li key={id ?? `empty-${i}`} className="flex flex-col items-center gap-1">
                        {id ? <MonogramBadge actor={getActor(id)} fallbackName={id} size={40} /> : <span className="h-10 w-10 rounded-full border border-dashed border-line" />}
                        <span className="num text-[10px] text-muted">{id ? (i === 0 ? "You" : getActor(id)?.shortName) : ""}</span>
                      </li>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - members.length) }).map((_, i) => (
                      <li key={`slot-${i}`} className="flex flex-col items-center gap-1"><span className="h-10 w-10 rounded-full border border-dashed border-line" /></li>
                    ))}
                  </ul>
                </div>
                <div className="hidden lg:block"><CoveragePanel /></div>
            </aside>
          </motion.div>
        </AnimatePresence>
      </div>
      <ActionBar
        className="mt-8"
        left={
          <div className="flex min-w-0 items-center gap-2" data-coach="coalition.chosen">
            {leadId ? <MonogramBadge actor={getActor(leadId)} fallbackName={leadId} size={28} showName /> : <span className="text-muted">Pick one</span>}
            {sub === "partners" && <span className="num shrink-0 text-muted">{partnerIds.length} of 3 chosen</span>}
          </div>
        }
      >
        {sub === "lead" ? (
          <Button variant="primary" data-coach="coalition.continue" disabled={!leadId} onClick={() => setSub("partners")}>Continue <Icon name="arrow" size={16} /></Button>
        ) : (
          <Button variant="primary" data-coach="coalition.continue" disabled={!ready} onClick={startControl}>Enter mission control <Icon name="arrow" size={16} /></Button>
        )}
      </ActionBar>
    </div>
  );
}
