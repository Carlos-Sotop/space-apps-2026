import { Badge, GlassCard, Icon, InfoButton, MonogramBadge } from "@/components/ui";
import type { Blueprint } from "@/engine/types";
import { actorName, getActor } from "@/lib/catalog";
import { describeModifiers } from "@/lib/modifiers";
import { useGame } from "@/store/game";
import { LineageTree } from "./LineageTree";
import { StepTitle, useDesign } from "./useDesign";

function BlueprintInfo({ b, parent }: { b: Blueprint; parent?: Blueprint }) {
  return (
    <>
      <p>{b.summary}</p>
      <p className="text-sm text-muted">By <span className="text-fg">{getActor(b.authorId)?.name ?? b.authorId}</span>{parent && <>, forked from <span className="text-fg">{parent.name}</span></>}.</p>
      <p className="num text-sm text-violet-bright">{describeModifiers(b.modifiers)}</p>
      <p className="text-sm text-muted">Adopting credits the author and raises your collaboration score. Open designs are free to use for everyone.</p>
      {b.contentHash && <p className="num break-all text-xs text-faint">Content hash {b.contentHash}</p>}
    </>
  );
}

export function OpenTechStep() {
  const { design, mission, catalog } = useDesign();
  const toggle = useGame((s) => s.toggleIn);
  const modCats = new Set(mission.moduleIds.map((id) => catalog.modules.find((m) => m.id === id)?.category));
  const list = catalog.blueprints.filter((b) => modCats.has(b.category));
  const byId = new Map(catalog.blueprints.map((b) => [b.id, b]));

  return (
    <div>
      <StepTitle title="Open Tech Registry" chip="Share designs, credit authors" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((b) => {
            const on = design.blueprintIds.includes(b.id);
            const parent = b.parentId ? byId.get(b.parentId) : undefined;
            return (
              <GlassCard key={b.id} selected={on} onSelect={() => toggle("blueprintIds", b.id)} label={`${on ? "Remove" : "Adopt"} ${b.name}`} className="p-4">
                <div className="flex items-start gap-3">
                  <MonogramBadge actor={getActor(b.authorId)} fallbackName={b.authorId} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[15px]">{b.name}</h3>
                      <InfoButton title={b.name} body={<BlueprintInfo b={b} parent={parent} />} />
                    </div>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      {parent ? <><Icon name="fork" size={12} /> forked from {actorName(parent.authorId)}</> : `by ${actorName(b.authorId)}`}
                    </p>
                  </div>
                </div>
                <p className="num mt-3 truncate text-[13px] text-violet-bright">{describeModifiers(b.modifiers)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge>{b.adoptions + (on ? 1 : 0)} adoptions</Badge>
                  <span className={`flex items-center gap-1 text-xs ${on ? "text-ok" : "text-faint"}`}>{on ? <><Icon name="check" size={14} /> Adopted</> : "Adopt"}</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
        <aside className="glass h-fit p-4">
          <div className="mb-3 text-xs uppercase tracking-widest text-faint">Lineage</div>
          <LineageTree blueprints={list} adopted={design.blueprintIds} onToggle={(id) => toggle("blueprintIds", id)} />
        </aside>
      </div>
    </div>
  );
}
