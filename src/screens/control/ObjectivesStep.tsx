import { Badge, GlassCard, Icon, InfoButton } from "@/components/ui";
import { MAX_SECONDARY, type Objective } from "@/engine/types";
import { CATEGORY_LABEL, getModule } from "@/lib/catalog";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";

function needs(o: Objective): string {
  const mods = (o.requires.moduleIds ?? []).map((id) => getModule(id)?.name ?? id);
  const cats = (o.requires.categories ?? []).map((c) => CATEGORY_LABEL[c]);
  return [...cats, ...mods].join(" + ");
}

function ObjectiveInfo({ o }: { o: Objective }) {
  return (
    <>
      <p>{o.summary}</p>
      <p className="text-sm text-muted">Needs: <span className="text-fg">{needs(o) || "nothing special"}</span></p>
      <p className="text-sm text-muted">Worth <span className="num text-violet-bright">{o.scienceValue}</span> science points when achieved and its data returns to Earth.</p>
    </>
  );
}

export function ObjectivesStep() {
  const { design, mission } = useDesign();
  const toggle = useGame((s) => s.toggleSecondary);
  const chosen = design.secondaryObjectiveIds;
  const p = mission.primaryObjective;

  return (
    <div>
      <StepTitle title="Pick your science goals" chip={`${chosen.length} of ${MAX_SECONDARY} extra goals`} />
      <GlassCard className="mb-5 border-violet/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet/20 text-violet-bright"><Icon name="lock" size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest text-faint">Primary objective, fixed</div>
            <h3 className="truncate text-base">{p.title}</h3>
          </div>
          <InfoButton title={p.title} body={<ObjectiveInfo o={p} />} />
        </div>
      </GlassCard>
      <div className="grid gap-4 sm:grid-cols-2">
        {mission.secondaryObjectives.map((o) => {
          const on = chosen.includes(o.id);
          return (
            <GlassCard key={o.id} selected={on} disabled={!on && chosen.length >= MAX_SECONDARY} onSelect={() => toggle(o.id)} label={`${on ? "Remove" : "Add"} ${o.title}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] leading-snug">{o.title}</h3>
                <InfoButton title={o.title} body={<ObjectiveInfo o={o} />} />
              </div>
              <p className="mt-1 truncate text-[13px] text-muted">{o.summary}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="violet"><span className="num">+{o.scienceValue}</span> pts</Badge>
                {on && <span className="flex items-center gap-1 text-xs text-ok"><Icon name="check" size={14} /> Chosen</span>}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
