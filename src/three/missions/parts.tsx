import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Spacecraft and surface hardware for the mission cards, drawn in code: no models to
 * download, no AI-generated art, no agency or company markings. Shapes are generic
 * (truss, modules, arrays, dish, legs) and read at card size.
 */

/** Shared look: light structure, dark blue cells, a cyan accent for anything active. */
export const MAT = {
  hull: "#d8dcea",
  hullDark: "#9aa1b8",
  cell: "#17224d",
  cellEdge: "#3a4e92",
  gold: "#c9a227",
  accent: "#22d3ee",
};

/** A solar wing: a thin panel with a visible cell grid, on a short boom. */
export function SolarWing({
  length = 0.5,
  width = 0.18,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  length?: number;
  width?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[length / 2 + 0.02, 0, 0]}>
        <boxGeometry args={[length, 0.006, width]} />
        <meshStandardMaterial color={MAT.cell} metalness={0.35} roughness={0.45} />
      </mesh>
      {/* cell separators, so the panel is not a flat slab at close range */}
      {[-0.3, 0, 0.3].map((f) => (
        <mesh key={f} position={[length / 2 + 0.02, 0.004, f * width]}>
          <boxGeometry args={[length * 0.98, 0.002, 0.004]} />
          <meshStandardMaterial color={MAT.cellEdge} />
        </mesh>
      ))}
      <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
        <meshStandardMaterial color={MAT.hullDark} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** A parabolic dish on a short mast. */
export function Dish({ r = 0.1, position = [0, 0, 0], rotation = [0, 0, 0] }: { r?: number; position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        <meshStandardMaterial color={MAT.hull} metalness={0.5} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, r * 0.55, 0]}>
        <cylinderGeometry args={[0.006, 0.006, r * 1.1, 6]} />
        <meshStandardMaterial color={MAT.hullDark} />
      </mesh>
      <mesh position={[0, r * 1.05, 0]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial color={MAT.accent} emissive={MAT.accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * A crewed station: a central truss with pressurised modules across it and four solar
 * wings, the arrangement every large station shares. Generic, not a copy of one station.
 */
export function StationModel({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {/* truss */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 1.0, 8]} />
        <meshStandardMaterial color={MAT.hullDark} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* pressurised modules, across the truss */}
      {[-0.1, 0.12].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.058, 0.26, 4, 12]} />
          <meshStandardMaterial color={MAT.hull} metalness={0.25} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.01, 0, 0]}>
        <capsuleGeometry args={[0.05, 0.2, 4, 12]} />
        <meshStandardMaterial color={MAT.hull} metalness={0.25} roughness={0.5} />
      </mesh>
      {/* four wings, two each side */}
      <SolarWing position={[0.42, 0, 0.1]} rotation={[0.18, 0, 0]} />
      <SolarWing position={[0.42, 0, -0.1]} rotation={[-0.18, 0, 0]} />
      <SolarWing position={[-0.42, 0, 0.1]} rotation={[0.18, Math.PI, 0]} />
      <SolarWing position={[-0.42, 0, -0.1]} rotation={[-0.18, Math.PI, 0]} />
      {/* radiators */}
      <mesh position={[0.26, 0.09, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.16, 0.004, 0.1]} />
        <meshStandardMaterial color="#e8ecf6" metalness={0.2} roughness={0.7} />
      </mesh>
      <Dish r={0.05} position={[-0.2, 0.07, 0.06]} rotation={[0.5, 0, 0]} />
      {/* docked cargo vehicle */}
      <mesh position={[0.01, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.12, 10]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** An Earth-observation satellite: bus, two wings, a nadir instrument and a downlink dish. */
export function SatelliteModel({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.16, 0.2, 0.16]} />
        <meshStandardMaterial color={MAT.hull} metalness={0.4} roughness={0.45} />
      </mesh>
      {/* multilayer insulation band */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.166, 0.06, 0.166]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.75} roughness={0.3} />
      </mesh>
      <SolarWing length={0.42} width={0.16} position={[0.08, 0.02, 0]} />
      <SolarWing length={0.42} width={0.16} position={[-0.08, 0.02, 0]} rotation={[0, Math.PI, 0]} />
      {/* nadir instrument, pointing -y */}
      <mesh position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.045, 0.062, 0.08, 14]} />
        <meshStandardMaterial color="#2a3047" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.172, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.006, 14]} />
        <meshStandardMaterial color="#0b1022" />
      </mesh>
      <Dish r={0.055} position={[0, 0.12, 0.04]} rotation={[-0.35, 0, 0]} />
    </group>
  );
}

/** A polar lander: octagonal deck, four legs, tanks, a dish and a wing. */
export function LanderModel({ scale = 1 }: { scale?: number }) {
  const legs = useMemo(() => [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4), []);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.14, 8]} />
        <meshStandardMaterial color={MAT.hull} metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.05, 8]} />
        <meshStandardMaterial color={MAT.gold} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* propellant tanks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.13, 0.06]}>
          <sphereGeometry args={[0.042, 14, 14]} />
          <meshStandardMaterial color="#b9c0d4" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {/* legs with footpads */}
      {legs.map((a) => {
        const x = Math.cos(a) * 0.16, z = Math.sin(a) * 0.16;
        return (
          <group key={a}>
            <mesh position={[x * 0.62, 0.09, z * 0.62]} rotation={[Math.atan2(z, 0.3) * 0.8, 0, -Math.atan2(x, 0.3) * 0.8]}>
              <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
              <meshStandardMaterial color={MAT.hullDark} metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[x, 0.012, z]}>
              <cylinderGeometry args={[0.035, 0.03, 0.022, 10]} />
              <meshStandardMaterial color={MAT.hullDark} metalness={0.6} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 0.05, 10]} />
        <meshStandardMaterial color="#2a3047" metalness={0.6} roughness={0.35} />
      </mesh>
      <Dish r={0.06} position={[0.02, 0.3, 0]} rotation={[-0.9, 0, 0.2]} />
      <SolarWing length={0.26} width={0.14} position={[0.13, 0.22, 0]} rotation={[0, 0, 0.12]} />
    </group>
  );
}

/** A soft dark patch under a surface vehicle, standing in for a contact shadow. */
export function GroundShadow({ r = 0.2, y = 0.004 }: { r?: number; y?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 24]} />
      <meshBasicMaterial color="#05060d" transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

/** A marker that breathes, for a hazard or a point of interest on a globe. */
export function Blip({
  position,
  color = "#fb923c",
  phase = 0,
  size = 0.022,
  calm = false,
}: {
  position: THREE.Vector3;
  color?: string;
  phase?: number;
  size?: number;
  calm?: boolean;
}) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (calm) return;
    const t = (clock.elapsedTime * 1.3 + phase) % 1;
    const k = 1 + 1.9 * t;
    if (halo.current) {
      halo.current.scale.setScalar(k);
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.5 * (1 - t);
    }
    if (core.current) core.current.scale.setScalar(0.9 + 0.22 * Math.sin((clock.elapsedTime * 3 + phase * 6)));
  });
  const up = position.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
  return (
    <group position={position} quaternion={quat}>
      <mesh ref={core}>
        <sphereGeometry args={[size, 10, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <ringGeometry args={[size * 1.3, size * 1.9, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
