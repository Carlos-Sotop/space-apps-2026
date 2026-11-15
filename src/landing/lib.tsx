import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui";
import { PLAY_URL } from "./content";

export function Reveal({ children, delay = 0, className = "", as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const M = as === "li" ? motion.li : motion.div;
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

export function Section({ id, kicker, title, children, className = "", narrow = false }: { id: string; kicker?: string; title?: string; children: ReactNode; className?: string; narrow?: boolean }) {
  return (
    <section id={id} className={`relative scroll-mt-20 px-4 py-20 sm:px-6 md:py-28 ${className}`} aria-labelledby={title ? `${id}-h` : undefined}>
      <div className={`mx-auto ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {(kicker || title) && (
          <Reveal className="mb-12 md:mb-16">
            {kicker && <p className="num mb-4 text-xs uppercase tracking-[0.22em] text-cyan-bright">{kicker}</p>}
            {title && <h2 id={`${id}-h`} className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl md:text-5xl">{title}</h2>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

export function PlayButton({ children, big = false, className = "" }: { children: ReactNode; big?: boolean; className?: string }) {
  return (
    <a
      href={PLAY_URL}
      className={`group relative inline-flex items-center justify-center gap-3 rounded-full bg-brand font-semibold text-[#0b0b1e] transition duration-200 hover:brightness-110 active:scale-[0.98] ${
        big ? "h-16 px-12 text-lg shadow-[0_0_60px_rgba(139,92,246,0.6),0_0_120px_rgba(34,211,238,0.3)]" : "h-12 px-8 text-base shadow-[0_0_32px_rgba(139,92,246,0.45)]"
      } ${className}`}
    >
      <Icon name="play" size={big ? 22 : 18} />
      {children}
    </a>
  );
}

export function GhostLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-glass px-7 text-base text-fg backdrop-blur transition hover:border-white/30 hover:bg-glass-strong ${className}`}>
      {children}
    </a>
  );
}

export function ExtLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-cyan-bright underline-offset-4 hover:underline ${className}`}>
      {children}
      <Icon name="external" size={14} />
    </a>
  );
}

export function useVideoAvailable(src: string): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(src, { method: "HEAD" })
      .then((r) => { if (alive) setOk(r.ok && (r.headers.get("content-type") ?? "").startsWith("video")); })
      .catch(() => { if (alive) setOk(false); });
    return () => { alive = false; };
  }, [src]);
  return ok;
}
