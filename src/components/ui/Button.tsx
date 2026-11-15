import type { ButtonHTMLAttributes } from "react";
import { sfx } from "@/components/audio";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-[#0b0b1e] font-semibold shadow-glow hover:brightness-110 disabled:shadow-none disabled:brightness-75 disabled:saturate-50",
  ghost: "bg-glass border border-line text-fg hover:bg-glass-strong hover:border-white/25 disabled:opacity-45",
  danger: "bg-over/15 border border-over/50 text-over hover:bg-over/25 disabled:opacity-45",
};
const SIZE: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-7 text-base" };

export function Button({ variant = "ghost", size = "md", className = "", type = "button", onClick, ...rest }: Props) {
  return (
    <button
      type={type}
      {...rest}
      onClick={(e) => { sfx(variant === "primary" ? "confirm" : "click"); onClick?.(e); }}
      className={`inline-flex items-center justify-center gap-2 rounded-ctl whitespace-nowrap transition duration-200 active:scale-[0.98] ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    />
  );
}
