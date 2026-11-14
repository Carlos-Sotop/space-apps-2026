import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { actorHq, catalog } from "@/data";
import { fetchLiveRoute, snapshots } from "@/live/client";
import { Earth, Moon, latLon, prefersCalm } from "./bodies";

const SUN = new THREE.Vector3(-1.2, 0.35, 0.9).normalize();

function arc(a: THREE.Vector3, b: THREE.Vector3, steps = 64): THREE.Vector3[] {
  const an = a.clone().normalize(), bn = b.clone().normalize();
  const ang = an.angleTo(bn) || 1e-3;
  const lift = 0.06 + 0.3 * (ang / Math.PI);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const p = an.clone().multiplyScalar(Math.sin((1 - t) * ang)).addScaledVector(bn, Math.sin(t * ang)).divideScalar(Math.sin(ang));
    return p.normalize().multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
  });
}

function Pulse({ points, offset, speed, color }: { points: THREE.Vector3[]; offset: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * speed + offset) % 1;
    const f = t * (points.length - 1), i = Math.floor(f);
    ref.current?.position.lerpVectors(points[i], points[Math.min(points.length - 1, i + 1)], f - i);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.011, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Agencies and companies as glowing nodes, linked like a council: the "DAO" made visible. */
function Network() {
  const calm = useMemo(prefersCalm, []);
  const nodes = useMemo(
    () => catalog.actors.filter((a) => actorHq[a.id]).map((a, i) => ({ id: a.id, pos: latLon(actorHq[a.id][0], actorHq[a.id][1], 1.003), color: i % 2 ? "#7cc4ff" : "#c4b5fd" })),
    [],
  );
  const arcs = useMemo(() => {
    const out: { id: string; points: THREE.Vector3[]; color: string; offset: number; speed: number }[] = [];
    nodes.forEach((n, i) => {
      if (i % 2) return;
      const m = nodes[(i + 5) % nodes.length];
      for (const [j, o] of [m].entries()) {
        if (o.id !== n.id) out.push({ id: `${n.id}-${o.id}`, points: arc(n.pos, o.pos), color: j ? "#60a5fa" : "#a78bfa", offset: (i * 0.29 + j * 0.5) % 1, speed: 0.09 + 0.04 * j });
      }
    });
    return out;
  }, [nodes]);
  return (
    <group>
      {nodes.map((n) => (
        <mesh key={n.id} position={n.pos}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshBasicMaterial color={n.color} toneMapped={false} />
        </mesh>
      ))}
      {arcs.map((a) => (
        <group key={a.id}>
          <Line points={a.points} color={a.color} lineWidth={1} transparent opacity={0.22} />
          {!calm && <Pulse points={a.points} offset={a.offset} speed={a.speed} color="#e0e7ff" />}
        </group>
      ))}
    </group>
  );
}

/** The real ISS position from NASA SSCWeb (live through the Worker, snapshot offline), orbiting at scale. */
function Iss() {
  const [pos, setPos] = useState(() => ({ lat: snapshots.iss.lat, lon: snapshots.iss.lon }));
  useEffect(() => { fetchLiveRoute("iss").then((d) => setPos({ lat: d.lat, lon: d.lon })).catch(() => {}); }, []);
  const ref = useRef<THREE.Group>(null);
  const calm = useMemo(prefersCalm, []);
  const ring = useMemo(() => Array.from({ length: 129 }, (_, i) => latLon(51.6 * Math.sin((i / 128) * Math.PI * 2), (i / 128) * 360 - 180, 1.065)), []);
  useFrame((_, dt) => { if (!calm && ref.current) ref.current.rotation.y += dt * 0.06; });
  return (
    <group>
      <Line points={ring} color="#22d3ee" lineWidth={0.6} transparent opacity={0.18} />
      <group ref={ref}>
        <mesh position={latLon(pos.lat, pos.lon, 1.065)}>
          <sphereGeometry args={[0.016, 12, 12]} />
          <meshBasicMaterial color="#a5f3fc" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Rig() {
  const calm = useMemo(prefersCalm, []);
  useFrame(({ camera, pointer, clock }) => {
    if (calm) return;
    const t = clock.elapsedTime;
    camera.position.x += (pointer.x * 0.25 + Math.sin(t * 0.05) * 0.1 - camera.position.x) * 0.03;
    camera.position.y += (pointer.y * 0.15 + 0.25 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.2, 0);
  });
  return null;
}

function World({ compact }: { compact: boolean }) {
  return (
    <>
      <ambientLight intensity={0.05} />
      <directionalLight position={SUN.clone().multiplyScalar(10)} intensity={2.4} />
      <Stars radius={60} depth={30} count={compact ? 1800 : 4000} factor={3} saturation={0} fade speed={0.4} />
      <group position={[0, compact ? 0.5 : 0.36, 0]} rotation={[0.3, -1.25, 0.08]}>
        <Earth sunDir={SUN}>
          <Network />
          <Iss />
        </Earth>
      </group>
      <group position={compact ? [1.15, 2.75, -4.2] : [3.3, 1.5, -3.6]}>
        <Moon />
      </group>
      <Rig />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

/** Intro hero: NASA Blue Marble Earth with the coalition network, live ISS and the LRO Moon. */
export default function HeroScene() {
  const compact = typeof window !== "undefined" && window.innerWidth < 640;
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.25, compact ? 5.3 : 3.75], fov: 42, near: 0.05, far: 200 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="Earth with the coalition network and the Moon"
    >
      <Suspense fallback={null}>
        <World compact={compact} />
      </Suspense>
    </Canvas>
  );
}
