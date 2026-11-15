import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { Earth, prefersCalm } from "@/scene/bodies";
import { StationModel } from "./parts";
import { CardCamera, useEased } from "./rig";

/** Sun from the left, so the terminator and the city lights both fall inside the card. */
const SUN = new THREE.Vector3(-1.7, 0.5, -0.35).normalize();
/** Station orbit inclination; the 51.6 deg figure is sourced on the mission card. */
const INC = (51.6 * Math.PI) / 180;
const R_ORBIT = 1.92;

function Station({ active }: { active: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const calm = useMemo(prefersCalm, []);
  const speed = useEased(active ? 2.8 : 1);

  useFrame((_, dt) => {
    if (!calm && spin.current) spin.current.rotation.y -= dt * 0.05 * speed.current;
  });

  return (
    <group rotation={[0, 0, INC]}>
      {/* the orbit track, drawn as a thin ring in the orbital plane */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R_ORBIT - 0.006, R_ORBIT + 0.006, 160]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={spin} rotation={[0, -0.3, 0]}>
        {/* truss across the direction of travel, modules facing the planet */}
        <group position={[R_ORBIT, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <StationModel scale={0.75} />
        </group>
      </group>
    </group>
  );
}

/**
 * Orbital Lab: a station on an inclined low orbit above Earth's limb, with the day/night
 * terminator and the city lights of the night side from the NASA maps in public/textures.
 */
export function OrbitalLabScene({ active }: { active: boolean }) {
  return (
    <>
      <color attach="background" args={["#04050e"]} />
      <CardCamera base={[0, 0.2, 3.9]} close={[0, 0.12, 3.15]} target={[0, -0.38, 0]} active={active} fov={42} />
      <ambientLight intensity={0.06} />
      <directionalLight position={SUN.clone().multiplyScalar(12)} intensity={2.6} />
      <Stars radius={70} depth={28} count={700} factor={2.6} saturation={0} fade speed={0.3} />
      <group position={[0, -0.95, 0]}>
        <Earth radius={1.5} sunDir={SUN} spin={0.014} />
        <Station active={active} />
      </group>
    </>
  );
}
