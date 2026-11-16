import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { FlightPhaseId } from "@/engine/types";
import { Earth, Moon } from "@/scene/bodies";
import type { Timeline } from "@/screens/flightTimeline";

/** The props of the game's FlightSceneCore in src/three/FlightScene3D.tsx (being written in the game worktree). */
export type FlightSceneCoreProps = {
  timeline: Timeline;
  lunar: boolean;
  lostAt?: FlightPhaseId;
  /** flight progress 0..1, read every frame */
  progress: { current: number };
  /** scene time in seconds */
  clock?: { current: number };
  calm?: boolean;
};

/**
 * STAND-IN, never meant to ship: a dot that crosses from a small Earth to a small Moon with the flight progress, so
 * FlightClip can be wired and checked before the real scene exists. Earth and Moon are the game's own components,
 * used only to prove the textures load from video/public/textures. FlightClip.tsx swaps this out in one line.
 */
export function StubFlightScene({ progress, clock }: FlightSceneCoreProps) {
  const dot = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 45;
    cam.near = 0.1;
    cam.far = 100;
    cam.position.set(0, 0, 10);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    const p = progress.current;
    dot.current?.position.set(-3.6 + 7.2 * p, -0.4 + 1.1 * p + 1.6 * Math.sin(Math.PI * p), 0.5);
    dot.current?.scale.setScalar(1 + 0.2 * Math.sin((clock?.current ?? 0) * 6));
  });
  return (
    <>
      <color attach="background" args={["#04060f"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 3, 6]} intensity={2.2} />
      <group position={[-4.3, -0.4, 0]} scale={0.7}>
        <Earth />
      </group>
      <group position={[4.3, 0.7, 0]}>
        <Moon radius={0.3} />
      </group>
      <mesh ref={dot}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>
    </>
  );
}
