import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { TEX, prefersCalm } from "@/scene/bodies";
import { GroundShadow, LanderModel } from "./parts";
import { CardCamera, useEased } from "./rig";

/**
 * At the poles the Sun stays within a few degrees of the horizon, so the light rakes across
 * the ground and every rock throws a long shadow. That grazing angle is the whole look.
 */
const SUN = new THREE.Vector3(-1, 0.075, -0.25).normalize();

/**
 * The surface, from the LRO colour mosaic and LOLA elevation in public/textures. The maps
 * are cloned before their uv transform is set: the originals are shared with the Moon in
 * the intro scene, and mutating them there would move its texture too.
 */
function Surface() {
  const [colour, height] = useTexture([TEX.moonColor, TEX.moonHeight]);
  const maps = useMemo(() => {
    const c = colour.clone(), h = height.clone();
    for (const t of [c, h]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(0.2, 0.12);
      t.offset.set(0.44, 0.07);
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    c.colorSpace = THREE.SRGBColorSpace;
    return { c, h };
  }, [colour, height]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[9, 9, 180, 180]} />
      {/* displacement moves the geometry; the same map as a bump gives it its shading */}
      <meshStandardMaterial
        map={maps.c}
        displacementMap={maps.h}
        displacementScale={0.5}
        bumpMap={maps.h}
        bumpScale={1.6}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/** Earth from the lunar south pole: small, pale and low over the horizon. */
function EarthOnHorizon() {
  const day = useTexture(TEX.earthDay);
  const maps = useMemo(() => {
    const d = day.clone();
    d.colorSpace = THREE.SRGBColorSpace;
    d.needsUpdate = true;
    return d;
  }, [day]);
  return (
    <group position={[1.75, 0.62, -5.2]}>
      <mesh>
        <sphereGeometry args={[0.34, 36, 36]} />
        {/* lit by the same low Sun, with a little of its own light so it reads as Earth */}
        <meshStandardMaterial map={maps} emissive="#2d4f91" emissiveIntensity={0.42} roughness={1} metalness={0} />
      </mesh>
      {/* a faint air glow so it does not read as a flat disc */}
      <mesh scale={1.1}>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshBasicMaterial color="#5b8cff" transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Lander({ active }: { active: boolean }) {
  const g = useRef<THREE.Group>(null);
  const calm = useMemo(prefersCalm, []);
  const speed = useEased(active ? 2.6 : 1);
  useFrame(({ clock }) => {
    if (!calm && g.current) {
      // the dish keeps hunting for Earth; a slow sway is enough to show the base is alive
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.12 * speed.current) * 0.22;
    }
  });
  return (
    <group position={[-0.1, 0.33, 0.1]}>
      <GroundShadow r={0.28} y={-0.31} />
      <group ref={g}>
        <LanderModel scale={1.25} />
      </group>
    </group>
  );
}

/**
 * Moon Base Zero: the lunar south pole under a grazing Sun, with a lander on the ridge and
 * Earth low on the horizon. Terrain from the NASA LRO maps credited in public/textures.
 */
export function MoonBaseScene({ active }: { active: boolean }) {
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <CardCamera base={[0, 0.9, 3.7]} close={[0, 0.74, 2.95]} target={[-0.05, 0.3, -0.7]} active={active} fov={44} />
      {/* almost no fill light: on the Moon there is no air to scatter it */}
      <ambientLight intensity={0.035} />
      <directionalLight position={SUN.clone().multiplyScalar(14)} intensity={3.1} />
      <Stars radius={80} depth={30} count={900} factor={2.8} saturation={0} fade speed={0.25} />
      <Surface />
      <Lander active={active} />
      <EarthOnHorizon />
    </>
  );
}
