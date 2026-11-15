import type { HTMLAttributes, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./Icon";

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Makes the card a selectable control. The overlay button keeps the card keyboard accessible. */
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Accessible name of the select button */
  label?: string;
  children: ReactNode;
}

/**
 * Glass surface. When selectable, a real <button> covers the card and children sit above it with
 * pointer-events off, so nested controls (info buttons) opt back in with `pointer-events-auto`.
 */
export function GlassCard({ onSelect, selected, disabled, label, className = "", children, ...rest }: Props) {
  const selectable = !!onSelect;
  return (
    <div
      {...rest}
      className={`glass relative min-w-0 transition-[box-shadow,border-color,background-color,transform] duration-200 ${
        selectable && !disabled ? "hover:bg-glass-strong hover:border-white/20" : ""
      } ${selected ? "border-cyan bg-glass-strong shadow-select" : ""} ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            key="check" aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-2 z-[2] grid h-6 w-6 place-items-center rounded-full bg-cyan text-[#04050d] shadow-select"
            initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} exit={{ scale: 0 }} transition={{ duration: 0.28 }}
          >
            <Icon name="check" size={14} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
      {selectable && (
        <button type="button" aria-pressed={selected} aria-label={label} disabled={disabled} onClick={onSelect} className="absolute inset-0 z-0 rounded-[inherit] bg-transparent" />
      )}
      <div className={selectable ? "pointer-events-none relative z-[1] h-full" : "h-full"}>{children}</div>
    </div>
  );
}
