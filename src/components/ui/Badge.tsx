import type { ReactNode } from "react";

export type Tone = "neutral" | "violet" | "blue" | "ok" | "tight" | "over" | "cyan";

const TONE: Record<Tone, string> = {
  neutral: "bg-white/5 text-muted border-line",
  violet: "bg-violet/15 text-violet-bright border-violet/40",
  blue: "bg-blue/15 text-blue-bright border-blue/40",
  ok: "bg-ok/12 text-ok border-ok/35",
  tight: "bg-tight/12 text-tight border-tight/35",
  over: "bg-over/12 text-over border-over/40",
  cyan: "bg-cyan/10 text-cyan border-cyan/35",
};

export function Badge({ tone = "neutral", children, className = "", title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}
