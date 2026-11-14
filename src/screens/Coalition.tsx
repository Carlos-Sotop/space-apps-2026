import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ActorCard } from "@/components/ActorCard";
import { TopBar } from "@/components/hud/TopBar";
import { Badge, Button, Icon, type IconName } from "@/components/ui";
import { MonogramBadge } from "@/components/ui/MonogramBadge";
import type { ActorKind } from "@/engine/types";
import { getActor, getMission } from "@/lib/catalog";
import { COVERAGE, coverage, recommendedCoalitions, treasury } from "@/lib/coalition";
import { fmtMUsd } from "@/lib/format";
import { useCatalog, useGame } from "@/store/game";

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
  const recs = useMemo(() => (leadId ? recommendedCoalitions(mission, leadId) : []), [mission, leadId]);
  const ready = partnerIds.length === 3;
  const members = [leadId, ...partnerIds];

  return (
    <div className="pb-28 lg:pb-10">
      <TopBar title={sub === "lead" ? "Who do you represent?" : "Choose 3 partners"} onBack={() => (sub === "partners" ? setSub("lead") : go("missions"))} right={mission && <Badge tone="violet">{mission.name}</Badge>} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onChange={setFilter} />
          <span className="num text-sm text-muted">Step {sub === "lead" ? "A" : "B"} of 2</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={sub} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className={sub === "partners" ? "grid gap-6 lg:grid-cols-[1fr_320px]" : ""}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {actors.filter((a) => sub === "lead" || a.id !== leadId).map((a) => (
                <ActorCard
                  key={a.id} actor={a}
                  selected={sub === "lead" ? leadId === a.id : partnerIds.includes(a.id)}
                  disabled={sub === "partners" && !partnerIds.includes(a.id) && partnerIds.length >= 3}
                  onSelect={() => (sub === "lead" ? setLead(a.id) : togglePartner(a.id))}
                />
              ))}
            </div>
            {sub === "partners" && (
              <aside className="glass-strong h-fit space-y-5 p-5 lg:sticky lg:top-4">
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
                <CoveragePanel />
                {recs.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-widest text-faint">Recommended coalitions</div>
                    <div className="flex flex-wrap gap-2">
                      {recs.map((r) => (
                        <button key={r.id} type="button" onClick={() => setPartners(r.partnerIds)} className="rounded-full border border-violet/40 bg-violet/10 px-3 py-1 text-xs text-violet-bright transition hover:bg-violet/20">{r.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/85 px-4 py-3 backdrop-blur-xl lg:static lg:mx-auto lg:mt-8 lg:max-w-7xl lg:border-0 lg:bg-transparent lg:px-6 lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="num text-sm text-muted lg:mr-4">{sub === "lead" ? (leadId ? getActor(leadId)?.shortName : "Pick one") : `${partnerIds.length} of 3 chosen`}</span>
          {sub === "lead" ? (
            <Button variant="primary" disabled={!leadId} onClick={() => setSub("partners")}>Continue <Icon name="arrow" size={16} /></Button>
          ) : (
            <Button variant="primary" disabled={!ready} onClick={startControl}>Enter mission control <Icon name="arrow" size={16} /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
