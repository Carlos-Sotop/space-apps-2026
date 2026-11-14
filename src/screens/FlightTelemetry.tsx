interface Props {
  label: string;
  values: number[];
  /** shows the latest value next to the label */
  now: string;
  color?: string;
  /** draw as an up/down bar strip instead of a line */
  binary?: boolean;
}

/** Tiny chart: a line over the samples seen so far, or an up/down strip for link state. */
export function Sparkline({ label, values, now, color = "var(--violet-bright)", binary }: Props) {
  const w = 160, h = 40, n = Math.max(1, values.length - 1);
  const max = Math.max(1, ...values), min = binary ? 0 : Math.min(0, ...values);
  const x = (i: number) => (i / n) * w;
  const y = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="glass p-3">
      <div className="mb-1 flex items-baseline justify-between"><span className="text-[11px] uppercase tracking-wider text-muted">{label}</span><span className="num text-xs">{now}</span></div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none" role="img" aria-label={`${label} over the flight`}>
        {binary
          ? values.map((v, i) => <rect key={i} x={x(i)} y={v ? 6 : 24} width={w / (n + 1) + 0.5} height={v ? 28 : 10} fill={v ? "var(--ok)" : "var(--over)"} opacity="0.75" />)
          : values.length > 0 && <>
              <path d={`${d} L${x(values.length - 1)} ${h} L0 ${h} Z`} fill={color} opacity="0.12" />
              <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>}
      </svg>
    </div>
  );
}
