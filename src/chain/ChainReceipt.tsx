import { Icon } from "@/components/ui";
import type { MissionDesign, Ratification } from "@/engine/types";
import type { AnchorFailure } from "./types";
import { useChainAnchor } from "./useChainAnchor";

const WHY: Record<AnchorFailure, string> = {
  "not-configured": "relayer off",
  "rate-limited": "try again in a minute",
  timeout: "devnet did not answer",
  "rpc-error": "devnet busy",
  rejected: "devnet refused it",
  "bad-request": "record incomplete",
  unreachable: "offline",
};

const shortSig = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;

const CHIP = "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium";

interface Props {
  design: MissionDesign | null;
  ratification: Ratification | null;
  className?: string;
}

/** One line: "Recorded on Solana devnet" with the explorer link. Renders nothing when the council did not sign. */
export function ChainReceipt({ design, ratification, className = "" }: Props) {
  const state = useChainAnchor(design, ratification);
  if (state.status === "unsigned") return null;
  return (
    <span role="status" aria-live="polite" className={`inline-flex max-w-full ${className}`}>
      {state.status === "recording" && (
        <span className={`${CHIP} border-line bg-white/5 text-muted`}>
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-violet-bright" />
          Recording on Solana devnet…
        </span>
      )}
      {state.status === "recorded" && (
        <a href={state.explorerUrl} target="_blank" rel="noreferrer noopener" title="Open the record in Solana Explorer (devnet)" className={`${CHIP} border-ok/35 bg-ok/12 text-ok hover:brightness-125`}>
          <Icon name="check" size={12} />
          Recorded on Solana devnet
          <span className="num hidden text-[10.5px] opacity-80 sm:inline">{shortSig(state.txSignature)}</span>
          <Icon name="external" size={11} />
        </a>
      )}
      {state.status === "not-recorded" && (
        <span title={state.message} className={`${CHIP} border-line bg-white/5 text-muted`}>
          <Icon name="minus" size={12} />
          <span className="truncate">
            Not recorded on Solana devnet<span className="hidden sm:inline"> · {WHY[state.reason]}</span>
          </span>
        </span>
      )}
    </span>
  );
}
