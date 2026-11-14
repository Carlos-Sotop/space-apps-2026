import { useMemo, useState } from "react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { Button } from "@/components/ui";
import { signManifest } from "@/crypto";

const hashHex = (s: string) => bytesToHex(sha256(utf8ToBytes(s)));

/** Type into the plan and watch the fingerprint change completely. */
export function HashDemo() {
  const original = "Launch: Falcon 9. Payload: 3 instruments. Budget: $180M.";
  const [text, setText] = useState(original);
  const base = useMemo(() => hashHex(original), []);
  const now = useMemo(() => hashHex(text), [text]);
  const changed = [...now].filter((c, i) => c !== base[i]).length;
  return (
    <div className="space-y-3">
      <label className="block text-xs text-muted" htmlFor="hash-demo">Mission plan (try changing one letter)</label>
      <input
        id="hash-demo"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-[var(--radius-ctl)] border border-line bg-white/5 px-3 py-2 font-mono text-[13px] text-fg outline-none focus:border-violet-bright/60"
      />
      <div className="grid grid-cols-16 gap-[3px]" aria-label="Fingerprint">
        {[...now].map((c, i) => (
          <span
            key={i}
            className="grid h-5 place-items-center rounded-[3px] font-mono text-[10px] transition-colors duration-300"
            style={{ background: c === base[i] ? "rgba(96,165,250,0.14)" : "rgba(251,191,36,0.32)", color: c === base[i] ? "var(--fg-muted)" : "#fde68a" }}
          >
            {c}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">
        {changed === 0 ? "Same plan, same fingerprint." : <><span className="text-tight">{changed} of 64</span> characters changed. Signatures on the old fingerprint no longer match.</>}
      </p>
    </div>
  );
}

/** Sign for real in the browser and compare classic vs quantum-safe sizes. */
export function SignDemo() {
  const [res, setRes] = useState<null | { ed: number; pq: number; edPub: number; pqPub: number; ms: number }>(null);
  const run = () => {
    const t0 = performance.now();
    const sig = signManifest(hashHex(`spacedao demo ${Date.now()}`), "demo-player");
    const ms = performance.now() - t0;
    setRes({
      ed: sig.classical.signature.length / 2,
      edPub: sig.classical.publicKey.length / 2,
      pq: (sig.postQuantum?.signature.length ?? 0) / 2,
      pqPub: (sig.postQuantum?.publicKey.length ?? 0) / 2,
      ms,
    });
  };
  const max = res ? Math.max(res.pq, 1) : 1;
  return (
    <div className="space-y-3">
      <Button variant="primary" onClick={run}>{res ? "Sign again" : "Sign a plan now"}</Button>
      {res && (
        <div className="space-y-2 text-sm">
          {[
            { label: "Classic (ed25519)", bytes: res.ed, color: "var(--blue-bright)" },
            { label: "Quantum-safe (ML-DSA-65)", bytes: res.pq, color: "var(--violet-bright)" },
          ].map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-muted"><span>{r.label}</span><span className="font-mono text-fg">{r.bytes.toLocaleString("en-US")} bytes</span></div>
              <div className="mt-1 h-2 rounded-full bg-white/5"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.max(2, (r.bytes / max) * 100)}%`, background: r.color }} /></div>
            </div>
          ))}
          <p className="text-muted">Both made in your browser in <span className="font-mono text-fg">{res.ms.toFixed(0)} ms</span>. The quantum-safe one is about {Math.round(res.pq / res.ed)}× bigger: that is the price of a lock built for 2050.</p>
        </div>
      )}
    </div>
  );
}
