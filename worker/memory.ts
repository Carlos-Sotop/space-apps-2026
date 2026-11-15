// Per-isolate memory for the live answers. The Workers Cache API does nothing on *.workers.dev (Cloudflare docs:
// "any *.workers.dev deployments will have no impact"), and production runs on spacedao.dayon-x.workers.dev, so
// without this every page load called NASA. Keyed by path only, so query strings cannot grow it.
const entries = new Map<string, { until: number; body: string }>();

export function recall(path: string, now: number): { body: string; ttlLeftS: number } | null {
  const hit = entries.get(path);
  if (!hit) return null;
  if (hit.until <= now) {
    entries.delete(path);
    return null;
  }
  return { body: hit.body, ttlLeftS: Math.max(1, Math.round((hit.until - now) / 1000)) };
}

export function remember(path: string, body: string, ttlS: number, now: number): void {
  entries.set(path, { until: now + ttlS * 1000, body });
}

/** Tests start from an empty memory. */
export function forgetAll(): void {
  entries.clear();
}
