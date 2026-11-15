import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { OrbitalLabScene } from "./OrbitalLab";
import { EarthGuardianScene } from "./EarthGuardian";
import { MoonBaseScene } from "./MoonBase";

/**
 * The mission cards share one WebGL context: a single fixed <Canvas> paints into the card
 * art boxes through drei's <View>, which scissors each scene to the box it tracks. One
 * context for the screen keeps us inside the performance budget, and a view whose box has
 * scrolled out of sight stops rendering on its own.
 */

export function missionScene(id: string, active: boolean) {
  if (id === "orbital-lab") return <OrbitalLabScene active={active} />;
  if (id === "earth-guardian") return <EarthGuardianScene active={active} />;
  if (id === "moon-base-zero") return <MoonBaseScene active={active} />;
  return null;
}

/** The box a mission scene is drawn into. Sits inside a positioned parent. */
export function MissionSceneView({ id, active, index }: { id: string; active: boolean; index: number }) {
  return (
    <View className="absolute inset-0 h-full w-full" index={index}>
      {missionScene(id, active)}
    </View>
  );
}

/**
 * The shared context. Fixed over the viewport and never clickable, so the cards keep their
 * own pointer and keyboard handling; it is below the info drawer (z-50) and toasts (z-60),
 * and paints only inside the boxes the views track.
 */
export function MissionSceneCanvas() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <Canvas
      style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" }}
      frameloop={hidden ? "never" : "always"}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <View.Port />
      </Suspense>
    </Canvas>
  );
}
