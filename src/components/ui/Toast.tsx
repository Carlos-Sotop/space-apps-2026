import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";

type ToastTone = "info" | "ok" | "warn";
interface ToastItem { id: number; message: string; tone: ToastTone }

const useToasts = create<{ items: ToastItem[]; push: (m: string, t: ToastTone) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (message, tone) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3600);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = (message: string, tone: ToastTone = "info") => useToasts.getState().push(message, tone);

const DOT: Record<ToastTone, string> = { info: "bg-blue-bright", ok: "bg-ok", warn: "bg-tight" };

export function ToastHost() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} className="glass-strong pointer-events-auto flex items-center gap-2.5 bg-[#0b0d24]/95 px-4 py-2.5 text-sm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
            <span className={`h-2 w-2 rounded-full ${DOT[t.tone]}`} />
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
