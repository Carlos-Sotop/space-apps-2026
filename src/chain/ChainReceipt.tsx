import { Icon } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { MissionDesign, Ratification } from "@/engine/types";
import { useChainAnchor } from "./useChainAnchor";

const shortSig = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;

const CHIP = "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium";

interface Props {
  design: MissionDesign | null;
  ratification: Ratification | null;
  className?: string;
}

/**
 * "Recorded on Solana devnet" with the explorer link, shown only once the record is confirmed.
 * While recording, when the record fails for any reason (relayer off or out of devnet SOL, devnet down, offline)
 * and when the council did not sign, it renders nothing: a player never sees the chain fail, and any error inside
 * renders nothing instead of breaking the page.
 */
export function ChainReceipt(props: Props) {
  return (
    <ErrorBoundary fallback={null}>
      <Receipt {...props} />
    </ErrorBoundary>
  );
}

function Receipt({ design, ratification, className = "" }: Props) {
  const state = useChainAnchor(design, ratification);
  if (state.status !== "recorded") return null;
  return (
    <span role="status" aria-live="polite" className={`inline-flex max-w-full ${className}`}>
      <a href={state.explorerUrl} target="_blank" rel="noreferrer noopener" title="Open the record in Solana Explorer (devnet)" className={`${CHIP} border-ok/35 bg-ok/12 text-ok hover:brightness-125`}>
        <Icon name="check" size={12} />
        Recorded on Solana devnet
        <span className="num hidden text-[10.5px] opacity-80 sm:inline">{shortSig(state.txSignature)}</span>
        <Icon name="external" size={11} />
      </a>
    </span>
  );
}
