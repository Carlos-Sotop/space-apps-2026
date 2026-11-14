/** $1.2M, $850,000, -$3.0M */
export function usd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
}

/** 0.42 -> 42% */
export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** One decimal place. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
