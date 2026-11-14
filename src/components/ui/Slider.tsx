import type { CSSProperties, ReactNode } from "react";

interface Props {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  id: string;
}

export function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01, display, id }: Props) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <label htmlFor={id} className="text-fg">{label}</label>
        <span className="num text-violet-bright">{display ?? value.toFixed(2)}</span>
      </div>
      <input id={id} type="range" className="slider" min={min} max={max} step={step} value={value} style={{ "--fill": fill } as CSSProperties} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
