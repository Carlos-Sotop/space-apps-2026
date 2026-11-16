import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { prefersCalm } from "@/scene/bodies";

type Vec = [number, number, number];

/** Frame-rate independent easing factor: the share of the remaining distance to close this frame. */
export const ease = (dt: number, rate = 0.0015) => 1 - Math.pow(rate, Math.min(dt, 0.1));

/**
 * A value that eases towards its target every frame. Used for hover: the camera dolly and
 * the animation speed-up both ramp instead of snapping.
 */
export function useEased(target: number, start = target) {
  const ref = useRef(start);
  useFrame((_, dt) => {
    ref.current += (target - ref.current) * ease(dt, 0.02);
  });
  return ref;
}

/**
 * The card camera. It sits at `base` and dollies in to `close` while the card is hovered or
 * focused, then eases back out. With prefers-reduced-motion it stays at `base`.
 */
export function CardCamera({
  base,
  close,
  target = [0, 0, 0],
  active,
  fov = 40,
}: {
  base: Vec;
  close: Vec;
  target?: Vec;
  active: boolean;
  fov?: number;
}) {
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const calm = useMemo(prefersCalm, []);
  /** A phone card is a short, wide box: stand back a little so nothing clips at the edges. */
  const compact = useMemo(() => typeof window !== "undefined" && window.innerWidth < 640, []);
  const pull = compact ? 1.2 : 1;
  const from = useMemo(() => new THREE.Vector3(...base).multiplyScalar(pull), [base, pull]);
  const to = useMemo(() => new THREE.Vector3(...close).multiplyScalar(pull), [close, pull]);
  const at = useMemo(() => new THREE.Vector3(...target), [target]);

  useFrame((_, dt) => {
    const c = cam.current;
    if (!c) return;
    c.position.lerp(calm || !active ? from : to, ease(dt, 0.02));
    c.lookAt(at);
  });

  return <PerspectiveCamera ref={cam} makeDefault position={from} fov={fov} near={0.05} far={200} />;
}
