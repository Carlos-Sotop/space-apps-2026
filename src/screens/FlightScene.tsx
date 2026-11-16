import { Component, lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { FlightSceneSvg, type FlightSceneProps } from "./FlightSceneSvg";

const FlightScene3D = lazy(() => import("@/three/FlightScene3D"));

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** 3D flight (react-three-fiber). Falls back to the 2D arc for reduced motion, no WebGL or any 3D error. */
export function FlightScene(props: FlightSceneProps) {
  const use3d = useMemo(() => !prefersReducedMotion() && hasWebGL(), []);
  const { onReady } = props;
  // the 2D arc is drawn at once; the 3D view says so itself on its first frame
  useEffect(() => { if (!use3d) onReady?.(); }, [use3d, onReady]);
  const flat = <FlightSceneSvg {...props} />;
  if (!use3d) return flat;
  return (
    <Boundary fallback={flat}>
      <Suspense fallback={<div className="grid h-full w-full place-items-center text-xs text-muted">Loading flight view...</div>}>
        <FlightScene3D {...props} />
      </Suspense>
    </Boundary>
  );
}
