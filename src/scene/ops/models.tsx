import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersCalm } from "../bodies";

/** Low-poly procedural models, so every structure reads at a glance from the map. */

const METAL = { color: "#d7dbe4", metalness: 0.7, roughness: 0.35 };
const GOLD = { color: "#c9a24a", metalness: 0.9, roughness: 0.3 };
const DARK = { color: "#2b3040", metalness: 0.4, roughness: 0.6 };

function Glow({ color, on, position = [0, 0, 0] as [number, number, number], size = 0.06 }: { color: string; on: boolean; position?: [number, number, number]; size?: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshBasicMaterial color={on ? color : "#3b3f52"} toneMapped={false} />
    </mesh>
  );
}

function Lander({ on }: { on: boolean }) {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.38, 0.18, Math.sin(a) * 0.38]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.42, 6]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.34, 8]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.36, 0.18, 0.36]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.32, 0.62, 0]} rotation={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[0.02, 0.36, 0.5]} />
        <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.25} emissive="#1e40af" emissiveIntensity={on ? 0.25 : 0} />
      </mesh>
      <Glow color="#a78bfa" on={on} position={[0, 0.86, 0]} />
    </group>
  );
}

function Solar({ on }: { on: boolean }) {
  // Vertical array: tall mast, panels facing a horizon Sun (polar sites)
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.4, 6]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[0.55, 0.95, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0.06]} castShadow>
          <boxGeometry args={[0.62, 0.34, 0.02]} />
          <meshStandardMaterial color="#1d3b9a" metalness={0.5} roughness={0.2} emissive="#2563eb" emissiveIntensity={on ? 0.35 : 0.02} />
        </mesh>
      ))}
    </group>
  );
}

function Dish({ on, relay }: { on: boolean; relay?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.6, 6]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[-0.9, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.2]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <Glow color={relay ? "#22d3ee" : "#60a5fa"} on={on} position={[0, 0.82, 0.12]} size={0.05} />
    </group>
  );
}

function Drill({ on }: { on: boolean }) {
  const bit = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  useFrame((_, dt) => { if (on && !calm && bit.current) bit.current.rotation.y += dt * 6; });
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.65, 5]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
        );
      })}
      <mesh ref={bit} position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.01, 0.7, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <Glow color="#7dd3fc" on={on} position={[0, 0.66, 0]} />
    </group>
  );
}

function Rover({ on }: { on: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.5, 0.16, 0.34]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[-0.18, 0.18].flatMap((x) => [-0.2, 0.2].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 12]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
      )))}
      <mesh position={[0.12, 0.42, 0]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.06]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <Glow color="#fbbf24" on={on} position={[0.16, 0.56, 0]} size={0.045} />
    </group>
  );
}

function Dome({ color, on, glass }: { color: string; on: boolean; glass?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.44, 0.12, 20]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} transparent={glass} opacity={glass ? 0.55 : 1} roughness={0.2} metalness={0.1} emissive={color} emissiveIntensity={on ? 0.45 : 0.03} />
      </mesh>
    </group>
  );
}

function Box({ color, on, w = 0.36, h = 0.28 }: { color: string; on: boolean; w?: number; h?: number }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color="#cfd5e3" metalness={0.5} roughness={0.4} />
      </mesh>
      <Glow color={color} on={on} position={[0, h + 0.06, 0]} />
    </group>
  );
}

function Berm() {
  return (
    <mesh position={[0, 0.12, 0]} scale={[1, 0.35, 0.55]} castShadow receiveShadow>
      <sphereGeometry args={[0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#8a857c" roughness={1} flatShading />
    </mesh>
  );
}

function Mast({ on }: { on: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.06, 1.8, 5]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <Glow color="#f472b6" on={on} position={[0, 1.84, 0]} size={0.05} />
    </group>
  );
}

function Campaign({ on }: { on: boolean }) {
  // An imaging campaign: a beam from orbit onto the region
  return (
    <group>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.5, 2.4, 24, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={on ? 0.16 : 0.05} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <Glow color="#22d3ee" on={on} position={[0, 2.45, 0]} size={0.09} />
    </group>
  );
}

export function StructureModel({ kind, on, health }: { kind: string; on: boolean; health: number }) {
  const broken = health <= 0;
  const live = on && !broken;
  const model = (() => {
    switch (kind) {
      case "lander": case "satellite": return <Lander on={live} />;
      case "solar": case "power": return <Solar on={live} />;
      case "antenna-dte": case "comms": return <Dish on={live} />;
      case "relay-terminal": return <Dish on={live} relay />;
      case "drill": case "isru": return <Drill on={live} />;
      case "rover": return <Rover on={live} />;
      case "greenhouse": return <Dome color="#4ade80" on={live} glass />;
      case "habitat": return <Dome color="#e2e8f0" on={live} />;
      case "wadi": return <Dome color="#fb923c" on={live} />;
      case "berm": return <Berm />;
      case "mast": return <Mast on={live} />;
      case "battery": return <Box color="#34d399" on={live} w={0.32} h={0.22} />;
      case "lab": case "experiment": return <Box color="#a78bfa" on={live} />;
      case "mesh": return <Mast on={live} />;
      case "campaign": return <Campaign on={live} />;
      default: return <Box color="#60a5fa" on={live} w={0.26} h={0.2} />;
    }
  })();
  return <group scale={broken ? [1, 0.6, 1] : 1} rotation={broken ? [0.3, 0, 0.2] : [0, 0, 0]}>{model}</group>;
}
