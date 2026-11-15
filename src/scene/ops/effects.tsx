import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersCalm } from "../bodies";

/**
 * What a turn looks like. Operations reports what happened as an ordered list of effects
 * (the C4 contract in src/ops/types.ts) and this plays them back on the board, one after
 * the other, so the player sees the storm hit the shield and the data leave the antenna
 * instead of reading it in a log.
 *
 * Every piece animates from its own mount: the board remounts this layer when a new report
 * arrives, so a fresh turn always plays from the start.
 */

export const CYAN = "#22d3ee";
/** Gap between one effect starting and the next, seconds. */
export const STEP = 0.45;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Seconds since this effect mounted. */
function useAge() {
  const t = useRef(0);
  useFrame((_, dt) => {
    if (t.current < 30) t.current += dt;
  });
  return t;
}

/**
 * Progress 0..1 through one effect, or null before it starts and after it ends.
 * With prefers-reduced-motion the effect holds at its midpoint instead of moving.
 */
function useBeat(delay: number, duration: number): { p: number; calm: boolean } | null {
  const t = useAge();
  const calm = useMemo(prefersCalm, []);
  const ref = useRef({ p: 0 });
  useFrame(() => {
    ref.current.p = clamp01((t.current - delay) / duration);
  });
  if (calm) return { p: 0.5, calm };
  const local = t.current - delay;
  if (local < 0 || local > duration + 0.2) return { p: ref.current.p, calm };
  return { p: ref.current.p, calm };
}

/* ------------------------------------------------------------------ */
/* Turn change                                                         */
/* ------------------------------------------------------------------ */

/**
 * A band of light sweeping the site: the turn has advanced and the Sun has moved. At the
 * pole the Sun barely climbs, so a sweep reads better than a sunrise.
 */
export function DaylightSweep({ delay = 0, radius = 26 }: { delay?: number; radius?: number }) {
  const bar = useRef<THREE.Mesh>(null);
  const beat = useBeat(delay, 1.5);
  useFrame(() => {
    const m = bar.current;
    if (!m || !beat) return;
    const p = beat.p;
    m.visible = p > 0 && p < 1;
    m.position.x = -radius + p * radius * 2;
    (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * p) * 0.3;
  });
  return (
    <mesh ref={bar} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} visible={false}>
      <planeGeometry args={[5, radius * 2]} />
      <meshBasicMaterial color="#fff2d0" transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Power                                                               */
/* ------------------------------------------------------------------ */

/** A structure that just lost power: it flickers out and a cold ring drops around it. */
export function PowerOut({ position, delay = 0 }: { position: THREE.Vector3; delay?: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const beat = useBeat(delay, 1.1);
  useFrame(() => {
    const m = ring.current;
    if (!m || !beat) return;
    const p = beat.p;
    m.visible = p > 0 && p < 1;
    m.scale.setScalar(0.4 + p * 1.5);
    (m.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.75;
  });
  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.42, 24]} />
        <meshBasicMaterial color="#64748b" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Downlink                                                            */
/* ------------------------------------------------------------------ */

/** Packets of data climbing from the antenna towards Earth. */
export function Downlink({ from, to, delay = 0, count = 5 }: { from: THREE.Vector3; to: THREE.Vector3; delay?: number; count?: number }) {
  const group = useRef<THREE.Group>(null);
  const beat = useBeat(delay, 1.6);
  const dir = useMemo(() => to.clone().sub(from), [from, to]);
  useFrame(() => {
    const g = group.current;
    if (!g || !beat) return;
    const p = beat.p;
    g.visible = p > 0 && p < 1;
    g.children.forEach((child, i) => {
      const local = clamp01(p * 1.5 - i * 0.12);
      child.position.copy(dir).multiplyScalar(local);
      child.position.y += Math.sin(local * Math.PI) * 0.7;
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = local > 0 && local < 1 ? 0.95 : 0;
      child.scale.setScalar(local > 0 && local < 1 ? 1 : 0.001);
    });
  });
  return (
    <group ref={group} position={from} visible={false}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Solar storm                                                         */
/* ------------------------------------------------------------------ */

/** A dome over everything a shield covers, raised while the storm passes. */
export function ShieldDome({ position, radius = 1.6, delay = 0, duration = 2.6 }: { position: THREE.Vector3; radius?: number; delay?: number; duration?: number }) {
  const dome = useRef<THREE.Mesh>(null);
  const beat = useBeat(delay, duration);
  useFrame(({ clock }) => {
    const m = dome.current;
    if (!m || !beat) return;
    const p = beat.p;
    m.visible = p > 0 && p < 1;
    const up = Math.min(1, p * 6);
    const down = Math.min(1, (1 - p) * 6);
    const k = Math.min(up, down);
    m.scale.set(radius * k, radius * 0.75 * k, radius * k);
    (m.material as THREE.MeshBasicMaterial).opacity = k * (0.2 + 0.08 * Math.sin(clock.elapsedTime * 9));
  });
  return (
    <mesh ref={dome} position={position} visible={false}>
      <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color={CYAN} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Charged particles streaking in while a storm is on the site. */
export function StormParticles({ severity, delay = 0, duration = 2.6, radius = 14 }: { severity: 1 | 2 | 3; delay?: number; duration?: number; radius?: number }) {
  const group = useRef<THREE.Group>(null);
  const beat = useBeat(delay, duration);
  const count = 40 * severity;
  const seeds = useMemo(() => {
    let x = 99173;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({ x: (rnd() - 0.5) * radius * 2, z: (rnd() - 0.5) * radius * 2, o: rnd(), s: 0.5 + rnd() }));
  }, [count, radius]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !beat) return;
    const p = beat.p;
    g.visible = p > 0 && p < 1;
    const fade = Math.sin(Math.PI * p);
    g.children.forEach((child, i) => {
      const s = seeds[i];
      const fall = ((clock.elapsedTime * s.s * 0.9 + s.o) % 1);
      child.position.set(s.x, 12 * (1 - fall), s.z);
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = fade * 0.8;
    });
  });
  return (
    <group ref={group} visible={false}>
      {seeds.map((_s, i) => (
        <mesh key={i} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.035, 0.75, 0.035]} />
          <meshBasicMaterial color="#c4b5fd" transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A structure taking the storm head-on: it flashes red. */
export function HitFlash({ position, delay = 0, duration = 1.1, color = "#ef4444" }: { position: THREE.Vector3; delay?: number; duration?: number; color?: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const beat = useBeat(delay, duration);
  useFrame(() => {
    const m = mesh.current;
    if (!m || !beat) return;
    const p = beat.p;
    m.visible = p > 0 && p < 1;
    const flash = Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p);
    m.scale.setScalar(0.5 + flash * 0.5);
    (m.material as THREE.MeshBasicMaterial).opacity = flash * 0.8;
  });
  return (
    <mesh ref={mesh} position={position} visible={false}>
      <sphereGeometry args={[0.55, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Micrometeorite                                                      */
/* ------------------------------------------------------------------ */

/** A streak of light, the strike, and dust thrown up off the regolith. */
export function Impact({ position, delay = 0 }: { position: THREE.Vector3; delay?: number }) {
  const streak = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Group>(null);
  const beat = useBeat(delay, 1.5);
  const from = useMemo(() => new THREE.Vector3(position.x + 7, position.y + 12, position.z - 5), [position]);
  const seeds = useMemo(() => {
    let x = 4242;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 14 }, () => ({ a: rnd() * Math.PI * 2, r: 0.3 + rnd() * 1.1, up: 0.4 + rnd() * 1.1 }));
  }, []);

  useFrame(() => {
    if (!beat) return;
    const p = beat.p;
    const fallP = clamp01(p / 0.35);
    const hitP = clamp01((p - 0.35) / 0.65);
    if (streak.current) {
      streak.current.visible = p > 0 && fallP < 1;
      streak.current.position.lerpVectors(from, position, fallP);
      (streak.current.material as THREE.MeshBasicMaterial).opacity = 1 - fallP * 0.3;
    }
    if (flash.current) {
      flash.current.visible = hitP > 0 && hitP < 1;
      flash.current.scale.setScalar(0.3 + hitP * 2.2);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = (1 - hitP) * 0.9;
    }
    if (dust.current) {
      dust.current.visible = hitP > 0 && hitP < 1;
      dust.current.children.forEach((child, i) => {
        const s = seeds[i];
        child.position.set(Math.cos(s.a) * s.r * hitP * 2.2, Math.sin(hitP * Math.PI) * s.up, Math.sin(s.a) * s.r * hitP * 2.2);
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - hitP) * 0.65;
      });
    }
  });

  return (
    <group>
      <mesh ref={streak} visible={false}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshBasicMaterial color="#fff0c0" transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh ref={flash} position={position} visible={false}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffd38a" transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={dust} position={position} visible={false}>
        {seeds.map((_s, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.09, 6, 6]} />
            <meshBasicMaterial color="#9c968c" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Science, goals and discoveries                                      */
/* ------------------------------------------------------------------ */

/** A beam that stands up on a tile where something was found or finished. */
export function GoalBeacon({ position, delay = 0, color = "#34d399" }: { position: THREE.Vector3; delay?: number; color?: string }) {
  const beam = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const beat = useBeat(delay, 2.2);
  useFrame(() => {
    if (!beat) return;
    const p = beat.p;
    const up = clamp01(p / 0.25);
    const fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    if (beam.current) {
      beam.current.visible = p > 0 && p < 1;
      beam.current.scale.y = up;
      beam.current.position.y = (up * 3) / 2;
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * fade;
    }
    if (ring.current) {
      ring.current.visible = p > 0 && p < 1;
      ring.current.scale.setScalar(0.4 + p * 2.4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.8;
    }
  });
  return (
    <group position={position}>
      <mesh ref={beam} position={[0, 1.5, 0]} visible={false}>
        <cylinderGeometry args={[0.16, 0.22, 3, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} visible={false}>
        <ringGeometry args={[0.32, 0.46, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Science points leaving an instrument: small motes drifting up. */
export function ScienceMotes({ position, delay = 0 }: { position: THREE.Vector3; delay?: number }) {
  const group = useRef<THREE.Group>(null);
  const beat = useBeat(delay, 1.6);
  const seeds = useMemo(() => {
    let x = 777;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 8 }, () => ({ a: rnd() * Math.PI * 2, r: 0.1 + rnd() * 0.35, o: rnd() * 0.4 }));
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g || !beat) return;
    const p = beat.p;
    g.visible = p > 0 && p < 1;
    g.children.forEach((child, i) => {
      const s = seeds[i];
      const local = clamp01(p - s.o);
      child.position.set(Math.cos(s.a) * s.r, local * 1.6, Math.sin(s.a) * s.r);
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * local) * 0.9;
    });
  });
  return (
    <group ref={group} position={position} visible={false}>
      {seeds.map((_s, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#f472b6" transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
