import type { ReactNode } from "react";

interface Props {
  /** e.g. "Step 1 of 2" */
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

export function StepHeader({ eyebrow, title, subtitle, className = "" }: Props) {
  return (
    <header className={`mb-5 ${className}`}>
      {eyebrow && <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">{eyebrow}</div>}
      <h1 className="font-display m-0 text-[clamp(1.5rem,3vw,2.25rem)] leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted sm:text-base">{subtitle}</p>}
    </header>
  );
}
