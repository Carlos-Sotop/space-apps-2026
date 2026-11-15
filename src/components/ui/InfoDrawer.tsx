import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import type { Source } from "@/engine/types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

interface InfoContent {
  title: string;
  body: ReactNode;
  sources?: Source[];
  /** show the "not yet verified" note for catalog data */
  verified?: boolean;
}

interface InfoStore {
  content: InfoContent | null;
  open: (c: InfoContent) => void;
  close: () => void;
}

export const useInfo = create<InfoStore>((set) => ({ content: null, open: (content) => set({ content }), close: () => set({ content: null }) }));

/** Small round "i" button; opens the shared info card with the given content. */
export function InfoButton({ title, body, sources, verified, className = "" }: InfoContent & { className?: string }) {
  const open = useInfo((s) => s.open);
  return (
    <button
      type="button"
      aria-label={`More about ${title}`}
      onClick={(e) => { e.stopPropagation(); open({ title, body, sources, verified }); }}
      className={`pointer-events-auto relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/5 text-muted transition hover:border-violet-bright/60 hover:text-violet-bright ${className}`}
    >
      <Icon name="info" size={15} />
    </button>
  );
}

export function InfoDrawerHost() {
  const content = useInfo((s) => s.content);
  const close = useInfo((s) => s.close);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!content) return;
    lastFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (lastFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [content, close]);

  return (
    <AnimatePresence>
      {content && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-[#02030a]/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={close} />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={content.title}
            className="glass-strong relative flex max-h-[80dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-b-none sm:rounded-b-[var(--radius-card)]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
              <h2 className="font-display text-base leading-snug">{content.title}</h2>
              <button ref={closeRef} type="button" aria-label="Close" onClick={close} className="rounded-full border border-line p-1.5 text-muted hover:text-fg">
                <Icon name="x" size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[15px] leading-relaxed text-fg/90">
              {content.body}
              {content.verified === false && <Badge tone="tight">Placeholder data, not yet verified</Badge>}
              {content.sources && content.sources.length > 0 && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-faint">Sources</div>
                  <ul className="space-y-1.5">
                    {content.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm text-blue-bright hover:underline">
                          {s.title} <Icon name="external" size={12} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
