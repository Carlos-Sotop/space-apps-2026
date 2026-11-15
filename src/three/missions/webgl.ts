let supported: boolean | null = null;

/**
 * Whether this browser can give us a WebGL context at all. Checked once.
 *
 * This lives apart from the scenes so a screen can ask the question without pulling
 * three.js into its bundle: the scenes themselves are loaded on demand.
 */
export function hasWebgl(): boolean {
  if (supported !== null) return supported;
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    supported = !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    supported = false;
  }
  return supported;
}
