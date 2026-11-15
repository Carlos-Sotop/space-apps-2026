import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label?: string;
}

export function RecommendedButton({ label = "Use recommended", className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-ctl border border-cyan/70 bg-cyan/10 px-4 text-sm text-cyan-bright whitespace-nowrap transition duration-200 hover:bg-cyan/20 hover:shadow-select active:scale-[0.98] disabled:opacity-45 ${className}`}
    >
      <Icon name="sparkle" size={16} /> {label}
    </button>
  );
}
