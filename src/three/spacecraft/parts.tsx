import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersCalm } from "@/scene/bodies";

/**
 * Spacecraft hardware drawn in code. Every part animates itself in when it first appears,
 * so adding a module in the Build step is something you see happen rather than a number
 * changing: it snaps into place and flashes cyan, arrays unfold, the antenna swings round.
 */

export const CYAN = "#22d3ee";

/** Seconds since the part mounted, and whether motion is wanted at all. */
function useAge() {
  const t = useRef(0);
  const calm = useMemo(prefersCalm, []);
  useFrame((_, dt) => {
    if (t.current < 4) t.current += dt;
  });
  return { t, calm };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Overshoots a little before settling, so a part lands with some weight. */
const backOut = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

/**
 * A part that snaps in: it scales up with a small overshoot and flashes cyan as it lands.
 * With prefers-reduced-motion it is simply there.
 */
export function SnapIn({
  children,
  delay = 0,
  flashColor = CYAN,
  highlight = false,
}: {
  children: React.ReactNode;
  delay?: number;
  flashColor?: string;
  highlight?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const { t, calm } = useAge();

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (calm) {
      g.scale.setScalar(1);
      if (halo.current) halo.current.visible = false;
      return;
    }
    const local = t.current - delay;
    g.scale.setScalar(local <= 0 ? 0 : backOut(clamp01(local / 0.45)));
    const flash = Math.max(0, 1 - clamp01(local / 0.7));
    if (halo.current) {
      const pulse = highlight ? 0.35 + 0.25 * Math.sin(clock.elapsedTime * 4) : 0;
      const show = Math.max(flash, pulse);
      halo.current.visible = show > 0.02;
      halo.current.scale.setScalar(1.08 + 0.5 * flash);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = show * 0.55;
    }
  });

  return (
    <group ref={group}>
      {children}
      <mesh ref={halo} visible={false}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={flashColor} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/**
 * A solar wing that unfolds. It starts folded flat against the bus and swings out over
 * about a second, the way a real array deploys once the spacecraft is clear of the rocket.
 */
export function UnfoldingWing({
  side = 1,
  length = 0.95,
  width = 0.3,
  y = 0,
  delay = 0,
}: {
  side?: 1 | -1;
  length?: number;
  width?: number;
  y?: number;
  delay?: number;
}) {
  const hinge = useRef<THREE.Group>(null);
  const { t, calm } = useAge();

  useFrame(() => {
    const h = hinge.current;
    if (!h) return;
    const local = calm ? 1 : clamp01((t.current - delay - 0.25) / 1.1);
    // folded (-80 deg, tucked along the body) to deployed (flat)
    const eased = 1 - Math.pow(1 - local, 3);
    h.rotation.z = (-80 * (1 - eased) * Math.PI) / 180;
  });

  return (
    <group position={[side * 0.3, y, 0]} rotation={[0, 0, side === 1 ? 0 : Math.PI]}>
      <group ref={hinge}>
        <mesh position={[length / 2, 0, 0]}>
          <boxGeometry args={[length, 0.012, width]} />
          <meshStandardMaterial color="#24346f" metalness={0.4} roughness={0.4} emissive="#16204a" emissiveIntensity={0.55} />
        </mesh>
        {[-0.28, 0, 0.28].map((f) => (
          <mesh key={f} position={[length / 2, 0.008, f * width]}>
            <boxGeometry args={[length * 0.96, 0.003, 0.008]} />
            <meshStandardMaterial color="#3a4e92" />
          </mesh>
        ))}
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.08, 8]} />
          <meshStandardMaterial color="#9aa1b8" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A dish that turns to face Earth. It arrives stowed and swings onto the link, which is
 * what a real high-gain antenna does once the spacecraft is pointing.
 */
export function TrackingDish({ r = 0.17, y = 0, delay = 0 }: { r?: number; y?: number; delay?: number }) {
  const arm = useRef<THREE.Group>(null);
  const { t, calm } = useAge();

  useFrame(({ clock }) => {
    const a = arm.current;
    if (!a) return;
    const local = calm ? 1 : clamp01((t.current - delay - 0.3) / 1.2);
    const eased = 1 - Math.pow(1 - local, 3);
    // from stowed (face up) to pointing at Earth, off to one side and a little down
    a.rotation.x = THREE.MathUtils.lerp(0, -1.05, eased);
    a.rotation.y = THREE.MathUtils.lerp(0, 0.55, eased);
    if (!calm && local >= 1) a.rotation.y += Math.sin(clock.elapsedTime * 0.5) * 0.05;
  });

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.14, 8]} />
        <meshStandardMaterial color="#9aa1b8" metalness={0.7} roughness={0.4} />
      </mesh>
      <group ref={arm} position={[0, 0.15, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[r, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
          <meshStandardMaterial color="#d8dcea" metalness={0.5} roughness={0.33} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, r * 0.5, 0]}>
          <cylinderGeometry args={[0.008, 0.008, r, 6]} />
          <meshStandardMaterial color="#9aa1b8" />
        </mesh>
        <mesh position={[0, r * 0.95, 0]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Landing legs, for anything that has to touch down. */
export function LandingLegs({ y = 0, spread = 0.52, delay = 0 }: { y?: number; spread?: number; delay?: number }) {
  const angles = useMemo(() => [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4), []);
  return (
    <SnapIn delay={delay}>
      <group position={[0, y, 0]}>
        {angles.map((a) => {
          // work in a frame turned to face outwards, then the leg is a 2D problem
          const from = { x: 0.28, y: 0.1 };
          const to = { x: spread, y: -0.12 };
          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.hypot(dx, dy);
          return (
            <group key={a} rotation={[0, -a, 0]}>
              <mesh position={[(from.x + to.x) / 2, (from.y + to.y) / 2, 0]} rotation={[0, 0, Math.atan2(dx, -dy) + Math.PI]}>
                <cylinderGeometry args={[0.019, 0.019, len, 6]} />
                <meshStandardMaterial color="#9aa1b8" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[to.x, to.y - 0.012, 0]}>
                <cylinderGeometry args={[0.07, 0.055, 0.035, 12]} />
                <meshStandardMaterial color="#9aa1b8" metalness={0.6} roughness={0.5} />
              </mesh>
            </group>
          );
        })}
      </group>
    </SnapIn>
  );
}

/** An engine bell under the stack. */
export function EngineBell({ y = 0, delay = 0 }: { y?: number; delay?: number }) {
  return (
    <SnapIn delay={delay}>
      <mesh position={[0, y, 0]}>
        <coneGeometry args={[0.17, 0.3, 18, 1, true]} />
        <meshStandardMaterial color="#5d6478" metalness={0.85} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
    </SnapIn>
  );
}

/**
 * The spare capacity left on the rocket, as a volume you can see. This is the hook for
 * rideshare: the emptier it looks, the more of someone else's science could fly with you.
 */
export function SpareVolume({
  y,
  height,
  radius = 0.42,
  children,
}: {
  y: number;
  height: number;
  radius?: number;
  children?: React.ReactNode;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  useFrame(({ clock }) => {
    if (!calm && ring.current) ring.current.rotation.y = clock.elapsedTime * 0.25;
  });
  if (height <= 0.01) return null;
  return (
    <group position={[0, y + height / 2, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, 24, 1, true]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* a ring at the top and bottom, so the empty volume still reads as a shape */}
      {[-height / 2, height / 2].map((dy) => (
        <mesh key={dy} position={[0, dy, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.012, radius, 32]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* uprights at the corners, so an empty bay still reads as a volume */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <boxGeometry args={[0.012, height, 0.012]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.03, radius - 0.016, 32, 1, 0, Math.PI / 1.6]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {children}
    </group>
  );
}
