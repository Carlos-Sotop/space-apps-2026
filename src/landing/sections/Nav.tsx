import { useState } from "react";
import { Icon } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { PLAY_URL } from "../content";

const LINKS = [
  ["Problem", "#problem"], ["Idea", "#idea"], ["How to play", "#how-to-play"], ["NASA data", "#nasa-data"],
  ["Challenge", "#challenge"], ["Tech", "#tech"], ["Team", "#team"],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="glass fixed inset-x-0 top-0 z-50 !rounded-none border-x-0 border-t-0">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5" aria-label="SpaceDAO home">
          <LogoMark size={30} />
          <Wordmark className="text-sm" />
        </a>
        <ul className="hidden items-center gap-6 lg:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}><a href={href} className="text-sm text-muted transition hover:text-fg">{label}</a></li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a href={PLAY_URL} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-[#0b0b1e] shadow-[0_0_20px_rgba(139,92,246,0.45)] transition hover:brightness-110">
            <Icon name="play" size={14} /> Play
          </a>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "x" : "menu"} size={18} />
          </button>
        </div>
      </nav>
      {open && (
        <ul id="mobile-menu" className="border-t border-line px-4 pb-4 pt-2 lg:hidden">
          {LINKS.map(([label, href]) => (
            <li key={href}><a href={href} onClick={() => setOpen(false)} className="block py-3 text-base text-fg">{label}</a></li>
          ))}
        </ul>
      )}
    </header>
  );
}
