import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  /** room for a row of cards instead of a paragraph */
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, actions, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
            className={`glass-strong relative max-h-[92dvh] w-full overflow-y-auto bg-[#0b0d24]/95 p-6 outline-none ${wide ? "max-w-5xl" : "max-w-lg"}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22 }}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="font-display text-lg">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="rounded-full border border-line p-1.5 text-muted hover:text-fg"><Icon name="x" size={16} /></button>
            </div>
            <div className="text-[15px] text-fg/90">{children}</div>
            {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
