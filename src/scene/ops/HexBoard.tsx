import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Structure, TerrainSpec, Tile } from "@/ops/types";
import { prefersCalm } from "../bodies";
import { StructureModel } from "./models";

export type BoardTheme = "moon" | "station";

export interface HexBoardProps {
  theme: BoardTheme;
  tiles: Tile[];
  terrains: TerrainSpec[];
  structures: Structure[];
  /** 0..1 Sun height this turn: drives light angle and darkness */
  sunFactor: number;
  /** Earth above the horizon this turn (moon theme) */
  earthUp: boolean;
  /** tiles the current action can target, highlighted */
  validTileIds?: string[];
  selectedTileId?: string | null;
  onTileClick?: (tile: Tile) => void;
}

const HEX = 1; // hex radius in world units
const SQ3 = Math.sqrt(3);

export function hexToWorld(q: number, r: number): [number, number] {
  return [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
}

const MOON_COLORS: Record<string, string> = { ridge: "#b9b4ab", rim: "#a29d95", slope: "#8a867f", plain: "#97938c", psr: "#2a3247" };
const STATION_COLORS: Record<string, string> = { rack: "#8fa0b8", external: "#b8a676", node: "#6b778c", hub: "#9fb4d6" };

function tileHeight(t: Tile, theme: BoardTheme): number {
  if (theme === "station") return t.terrain === "external" ? 0.25 : 0.4;
  return Math.max(0.12, 0.45 + t.elevationM / 140);
}

function HexTile({ tile, theme, color, valid, selected, onClick }: { tile: Tile; theme: BoardTheme; color: string; valid: boolean; selected: boolean; onClick?: (t: Tile) => void }) {
  const [x, z] = hexToWorld(tile.q, tile.r);
  const h = tileHeight(tile, theme);
  const [hover, setHover] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  useFrame(({ clock }) => {
    if (ring.current && valid && !calm) (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.35 * Math.sin(clock.elapsedTime * 3);
  });
  const isPsr = tile.terrain === "psr";
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(tile); };
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onClick={click}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = onClick ? "pointer" : "default"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "default"; }}
      >
        <cylinderGeometry args={[HEX * 0.97, HEX * 1.0, h, 6, 1]} />
        <meshStandardMaterial
          color={color}
          roughness={theme === "station" ? 0.45 : 0.97}
          metalness={theme === "station" ? 0.55 : 0}
          emissive={selected ? "#7c3aed" : hover ? "#3b82f6" : isPsr ? "#1e3a8a" : "#000000"}
          emissiveIntensity={selected ? 0.5 : hover ? 0.25 : isPsr ? 0.25 : 0}
          flatShading={theme === "moon"}
        />
      </mesh>
      {(valid || selected) && (
        <mesh ref={ring} position={[0, h + 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
          <ringGeometry args={[HEX * 0.78, HEX * 0.92, 6]} />
          <meshBasicMaterial color={selected ? "#c4b5fd" : "#22d3ee"} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
      {isPsr && tile.iceKgPerTurn > 0 && theme === "moon" && (
        <Sparkles count={10} scale={[1.4, 0.4, 1.4]} position={[0, h + 0.2, 0]} size={2.2} speed={0.2} color="#9bd5ff" />
      )}
      {tile.liveEvent && (
        <Html position={[0, h + 0.9, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
          <span className="pointer-events-none whitespace-nowrap rounded-full border border-line bg-[rgba(8,10,25,0.75)] px-2 py-0.5 text-[10px] text-tight">● {tile.liveEvent.category}</span>
        </Html>
      )}
    </group>
  );
}

function EarthOnHorizon({ up }: { up: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = up ? 1.6 : -2.6;
    ref.current.position.y += (target - ref.current.position.y) * Math.min(1, dt * 1.5);
  });
  return (
    <mesh ref={ref} position={[-14, up ? 1.6 : -2.6, -26]}>
      <sphereGeometry args={[1.6, 48, 48]} />
      <meshStandardMaterial color="#3b6fd8" emissive="#1d4ed8" emissiveIntensity={0.55} roughness={0.6} />
    </mesh>
  );
}

function Lights({ theme, sunFactor }: { theme: BoardTheme; sunFactor: number }) {
  // South pole: the Sun skims the horizon, so light comes in almost flat and shadows run long.
  const elev = theme === "moon" ? 0.08 + 0.22 * sunFactor : 0.9;
  const pos = new THREE.Vector3(Math.cos(0.6) * 18, Math.max(0.6, elev * 18), Math.sin(0.6) * 18);
  const intensity = theme === "moon" ? 0.4 + 3.2 * sunFactor : 2.2;
  return (
    <>
      <ambientLight intensity={theme === "moon" ? 0.06 + 0.1 * sunFactor : 0.5} color={theme === "moon" ? "#8aa0ff" : "#ffffff"} />
      <hemisphereLight args={["#bcc8ff", "#0b0d18", theme === "moon" ? 0.15 : 0.5]} />
      <directionalLight
        position={pos}
        intensity={intensity}
        color={theme === "moon" ? "#fff4e0" : "#ffffff"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
    </>
  );
}

function Board(props: HexBoardProps) {
  const { theme, tiles, terrains, structures, sunFactor, earthUp, validTileIds = [], selectedTileId, onTileClick } = props;
  const palette = theme === "moon" ? MOON_COLORS : STATION_COLORS;
  const colorOf = (t: Tile) => palette[t.terrain] ?? terrains.find((x) => x.id === t.terrain)?.color ?? "#888";
  const byTile = useMemo(() => {
    const m = new Map<string, Structure[]>();
    for (const s of structures) m.set(s.tileId, [...(m.get(s.tileId) ?? []), s]);
    return m;
  }, [structures]);
  const valid = useMemo(() => new Set(validTileIds), [validTileIds]);
  return (
    <>
      <Lights theme={theme} sunFactor={sunFactor} />
      <Stars radius={80} depth={40} count={2500} factor={3} saturation={0} fade speed={0.2} />
      {theme === "moon" && <EarthOnHorizon up={earthUp} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color={theme === "moon" ? "#3a3936" : "#0d1222"} roughness={1} />
      </mesh>
      {tiles.map((t) => {
        const [x, z] = hexToWorld(t.q, t.r);
        const h = tileHeight(t, theme);
        const here = byTile.get(t.id) ?? [];
        return (
          <group key={t.id}>
            <HexTile tile={t} theme={theme} color={colorOf(t)} valid={valid.has(t.id)} selected={selectedTileId === t.id} onClick={onTileClick} />
            {here.map((s, i) => (
              <group key={s.id} position={[x + (here.length > 1 ? (i - (here.length - 1) / 2) * 0.55 : 0), h, z]}>
                <StructureModel kind={s.kind} on={s.on} health={s.health} />
              </group>
            ))}
          </group>
        );
      })}
      <ContactShadows position={[0, 0.01, 0]} scale={24} blur={2.4} far={6} opacity={0.5} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={7}
        maxDistance={20}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        target={[0, 0.3, 0]}
      />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.7} intensity={0.8} radius={0.6} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

/** 3D hex map for Operations: the Moon's south pole or the station's racks. */
export default function HexBoard(props: HexBoardProps) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [7, 9.5, 10], fov: 40 }} gl={{ antialias: true }}>
      <color attach="background" args={[props.theme === "moon" ? "#020308" : "#05070f"]} />
      <Suspense fallback={null}>
        <Board {...props} />
      </Suspense>
    </Canvas>
  );
}
