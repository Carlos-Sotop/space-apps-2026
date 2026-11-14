import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { actorHq, catalog } from "@/data";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function toVec(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

function arcPoints(a: THREE.Vector3, b: THREE.Vector3, steps = 56): THREE.Vector3[] {
  const an = a.clone().normalize(), bn = b.clone().normalize();
  const angle = an.angleTo(bn);
  const lift = 0.1 + 0.32 * (angle / Math.PI);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const p = new THREE.Vector3().copy(an).multiplyScalar(Math.sin((1 - t) * angle)).addScaledVector(bn, Math.sin(t * angle)).divideScalar(Math.sin(angle) || 1);
    return p.normalize().multiplyScalar(1.005 + lift * Math.sin(Math.PI * t));
  });
}

function Pulse({ points, offset, speed, color }: { points: THREE.Vector3[]; offset: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * speed + offset) % 1;
    const p = points[Math.min(points.length - 1, Math.floor(t * points.length))];
    ref.current?.position.copy(p);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.014, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Globe() {
  const group = useRef<THREE.Group>(null);
  const sat = useRef<THREE.Mesh>(null);
  const still = useMemo(reduced, []);

  const nodes = useMemo(
    () => catalog.actors.filter((a) => actorHq[a.id]).map((a, i) => ({ id: a.id, pos: toVec(actorHq[a.id][0], actorHq[a.id][1]), color: i % 2 ? "#60a5fa" : "#a78bfa" })),
    [],
  );

  const arcs = useMemo(() => {
    const out: { id: string; points: THREE.Vector3[]; color: string; offset: number; speed: number }[] = [];
    nodes.forEach((n, i) => {
      [1, 3].forEach((hop, k) => {
        const m = nodes[(i + hop + k) % nodes.length];
        if (m.id !== n.id) out.push({ id: `${n.id}-${m.id}-${k}`, points: arcPoints(n.pos, m.pos), color: k ? "#60a5fa" : "#a78bfa", offset: (i * 0.37 + k * 0.5) % 1, speed: 0.12 + 0.05 * k });
      });
    });
    return out;
  }, [nodes]);

  useFrame((state, dt) => {
    if (group.current && !still) group.current.rotation.y += dt * 0.09;
    if (sat.current) {
      const a = state.clock.elapsedTime * 0.35;
      sat.current.position.set(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55);
    }
  });

  return (
    <group rotation={[0.35, -0.6, 0]}>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color="#070a1f" roughness={0.9} metalness={0.1} emissive="#1a1650" emissiveIntensity={0.35} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.002, 28, 18]} />
          <meshBasicMaterial color="#6d5cf0" wireframe transparent opacity={0.16} />
        </mesh>
        {arcs.map((a) => (
          <group key={a.id}>
            <Line points={a.points} color={a.color} lineWidth={1} transparent opacity={0.38} />
            <Pulse points={a.points} offset={a.offset} speed={a.speed} color={a.color} />
          </group>
        ))}
        {nodes.map((n) => (
          <group key={n.id} position={n.pos}>
            <mesh>
              <sphereGeometry args={[0.024, 14, 14]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.055, 14, 14]} />
              <meshBasicMaterial color={n.color} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#7c5cff" transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group rotation={[-1.0, 0, 0.3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.006, 8, 160]} />
          <meshBasicMaterial color="#8b6cff" transparent opacity={0.85} />
        </mesh>
        <mesh ref={sat}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#e0e7ff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Network globe: dark sphere, nodes at agency headquarters, animated arcs and an orbit ring like the logo. */
export default function NetworkGlobe() {
  return (
    <Canvas camera={{ position: [0, 0, 3.6], fov: 42 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} aria-label="Globe linking space agencies and companies">
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 2, 4]} intensity={1.2} color="#a5b4fc" />
      <Globe />
    </Canvas>
  );
}
