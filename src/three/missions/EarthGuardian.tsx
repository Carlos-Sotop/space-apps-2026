import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Earth, latLon, prefersCalm } from "@/scene/bodies";
import { useGame } from "@/store/game";
import { Blip, SatelliteModel } from "./parts";
import { CardCamera, useEased } from "./rig";

const SUN = new THREE.Vector3(-1.7, 0.45, -0.35).normalize();
/** Sun-synchronous orbits are near-polar and slightly retrograde; 98 deg is the usual value. */
const INC = (98 * Math.PI) / 180;
const R_EARTH = 1.5;
const R_ORBIT = 1.92;

/**
 * The strip of ground the instrument sees: a translucent fan with its apex at the
 * spacecraft, opening down to the surface. Local -y is nadir in the satellite's frame.
 */
function Swath() {
  const h = R_ORBIT - R_EARTH * 0.95;
  return (
    <mesh position={[0, -h / 2 - 0.05, 0]}>
      <coneGeometry args={[0.22, h, 28, 1, true]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Satellite({ active }: { active: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const calm = useMemo(prefersCalm, []);
  const speed = useEased(active ? 2.8 : 1);

  useFrame((_, dt) => {
    if (!calm && spin.current) spin.current.rotation.y -= dt * 0.05 * speed.current;
  });

  return (
    <group rotation={[0, 0, INC]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R_ORBIT - 0.005, R_ORBIT + 0.005, 160]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={spin} rotation={[0, -0.15, 0]}>
        {/* the bus rides with its instrument pointing at the planet */}
        <group position={[R_ORBIT, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <SatelliteModel scale={1.0} />
          <Swath />
        </group>
      </group>
    </group>
  );
}

/**
 * Earth Guardian: a sun-synchronous satellite with its scan swath, over the real open
 * hazards the app already loaded from NASA EONET. Wildfires blink where they are burning.
 */
export function EarthGuardianScene({ active }: { active: boolean }) {
  const live = useGame((s) => s.live);
  const calm = useMemo(prefersCalm, []);

  const hazards = useMemo(() => {
    const all = live?.earthEvents ?? [];
    const fires = all.filter((e) => e.category.toLowerCase().includes("wildfire"));
    const pick = (fires.length ? fires : all).slice(0, 14);
    return pick.map((e, i) => ({
      id: e.id,
      pos: latLon(e.lat, e.lon, R_EARTH * 1.004),
      colour: e.category.toLowerCase().includes("wildfire") ? "#fb923c" : "#67e8f9",
      phase: (i * 0.37) % 1,
    }));
  }, [live]);

  return (
    <>
      <color attach="background" args={["#04050e"]} />
      <CardCamera base={[0, 0.2, 3.9]} close={[0, 0.12, 3.15]} target={[0, -0.22, 0]} active={active} fov={42} />
      <ambientLight intensity={0.07} />
      <directionalLight position={SUN.clone().multiplyScalar(12)} intensity={2.5} />
      <Stars radius={70} depth={28} count={700} factor={2.6} saturation={0} fade speed={0.3} />
      <group position={[0, -0.95, 0]}>
        <Earth radius={R_EARTH} sunDir={SUN} spin={0.016}>
          {hazards.map((h) => (
            <Blip key={h.id} position={h.pos} color={h.colour} phase={h.phase} calm={calm} size={0.019} />
          ))}
        </Earth>
        <Satellite active={active} />
      </group>
    </>
  );
}
