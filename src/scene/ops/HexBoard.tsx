import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OpsTurnReport, Structure, TerrainSpec, Tile } from "@/ops/types";
import type { OpsScenario } from "@/ops";
import { prefersCalm } from "../bodies";
import { StructureModel } from "./models";
import { CYAN, DaylightSweep, Downlink, GoalBeacon, HitFlash, Impact, PowerOut, ScienceMotes, ShieldDome, StormParticles, STEP } from "./effects";

export type BoardTheme = "moon" | "station" | "earth";

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
  /**
   * What happened on the last turn (the C4 contract). Its effects are played back on the
   * board in order. Optional: without it the board is simply still.
   */
  report?: OpsTurnReport | null;
  /** the scenario, used to find which structures are shields and how far they reach */
  scenario?: OpsScenario;
  /** the structure about to be placed, previewed on the tile under the pointer */
  ghostKind?: string | null;
}

const HEX = 1; // hex radius in world units
const SQ3 = Math.sqrt(3);
/** width of a structure health bar, world units */
const W_BAR = 0.5;
/** a shield covers its own tile and the ring around it: one hex step plus the tile itself */
const SHIELD_R = HEX * SQ3 + HEX * 0.6;

export function hexToWorld(q: number, r: number): [number, number] {
  return [HEX * SQ3 * (q + r / 2), HEX * 1.5 * r];
}

const MOON_COLORS: Record<string, string> = { ridge: "#b9b4ab", rim: "#a29d95", slope: "#8a867f", plain: "#97938c", psr: "#2a3247" };
const STATION_COLORS: Record<string, string> = { rack: "#8fa0b8", external: "#b8a676", node: "#6b778c", hub: "#9fb4d6" };

function tileHeight(t: Tile, theme: BoardTheme): number {
  if (theme === "station") return t.terrain === "external" ? 0.25 : 0.4;
  if (theme === "earth") return t.terrain === "ocean" ? 0.18 : t.terrain === "coast" ? 0.26 : 0.34 + Math.max(0, t.elevationM) / 400;
  return Math.max(0.06, 0.2 + t.elevationM / 420);
}

/** A pulsing beacon over a tile tied to a live NASA event (EONET, FIRMS). */
function LiveBeacon({ height }: { height: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  useFrame(({ clock }) => {
    if (!ref.current || calm) return;
    const k = 1 + 0.35 * Math.sin(clock.elapsedTime * 4);
    ref.current.scale.set(k, 1, k);
  });
  return (
    <group position={[0, height, 0]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
        <meshBasicMaterial color="#fb923c" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#fdba74" toneMapped={false} />
      </mesh>
      <mesh ref={ref} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
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
        <cylinderGeometry args={[HEX * 0.9, HEX * 0.95, h, 6, 1]} />
        <meshStandardMaterial
          color={color}
          roughness={theme === "station" ? 0.45 : theme === "earth" ? 0.7 : 0.97}
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
      {tile.liveEvent && <LiveBeacon height={h} />}
    </group>
  );
}

/** A bar over a structure showing the damage it is carrying. Always faces the camera. */
function HealthBar({ health, y }: { health: number; y: number }) {
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    group.current?.quaternion.copy(camera.quaternion);
    if (fill.current) {
      const k = Math.max(0, Math.min(1, health / 100));
      fill.current.scale.x = Math.max(0.001, k);
      fill.current.position.x = -(1 - k) * W_BAR * 0.5;
    }
  });
  const k = Math.max(0, Math.min(1, health / 100));
  const colour = k > 0.6 ? "#34d399" : k > 0.3 ? "#fbbf24" : "#f87171";
  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[W_BAR + 0.03, 0.09]} />
        <meshBasicMaterial color="#0b0d18" transparent opacity={0.75} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={fill} position={[0, 0, 0.002]}>
        <planeGeometry args={[W_BAR, 0.06]} />
        <meshBasicMaterial color={colour} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * How far a regolith shield reaches: its own tile and the ring around it. Drawn flat on the
 * ground so the player can see what a storm will and will not touch before it arrives.
 */
function ShieldArea({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[SHIELD_R, 36]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[SHIELD_R - 0.06, SHIELD_R, 36]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The structure you are about to place, shown on the tile under the pointer before you commit. */
function Ghost({ kind, position }: { kind: string; position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2.5) * 0.04;
  });
  return (
    <group
      ref={group}
      position={position}
      onUpdate={(g) => {
        g.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (m && "opacity" in m) {
            m.transparent = true;
            (m as THREE.MeshStandardMaterial).opacity = 0.4;
            m.depthWrite = false;
          }
        });
      }}
    >
      <StructureModel kind={kind} on health={100} />
    </group>
  );
}

/** The Sun, low over the site. At the pole it never climbs far, which is the whole problem. */
function SunInSky({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.1, 24, 24]} />
        <meshBasicMaterial color="#fff6df" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.4, 20, 20]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.16} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** Seeded boulders and crater rims around the site, for scale and texture. */
function Rocks() {
  const rocks = useMemo(() => {
    let x = 1234567;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 90 }, () => {
      const a = rnd() * Math.PI * 2, d = 5.8 + rnd() * 16;
      return { p: [Math.cos(a) * d, 0, Math.sin(a) * d] as [number, number, number], s: 0.08 + rnd() * rnd() * 0.7, r: rnd() * 3 };
    });
  }, []);
  const craters = useMemo(() => [[-9, -6, 2.4], [10, 4, 1.6], [3, -12, 3.2], [-12, 8, 2], [14, -9, 2.8]] as [number, number, number][], []);
  return (
    <group>
      {rocks.map((k, i) => (
        <mesh key={i} position={[k.p[0], k.s * 0.35, k.p[2]]} rotation={[k.r, k.r * 2, 0]} scale={[k.s, k.s * 0.7, k.s]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6f6b64" roughness={1} flatShading />
        </mesh>
      ))}
      {craters.map(([cx, cz, cr], i) => (
        <mesh key={`c${i}`} position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <torusGeometry args={[cr, cr * 0.12, 6, 28]} />
          <meshStandardMaterial color="#55524d" roughness={1} flatShading />
        </mesh>
      ))}
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
  const intensity = theme === "moon" ? 0.3 + 2.6 * sunFactor : 2.2;
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

/**
 * The turn, played back. Effects arrive in the order they happened and are started one
 * after another, so a storm is seen to hit the shield before the data leaves the antenna.
 * The whole layer remounts when a new report arrives, so every turn plays from the start.
 */
function TurnEffects({
  report,
  places,
}: {
  report?: OpsTurnReport | null;
  places: { tilePos: Map<string, THREE.Vector3>; structPos: Map<string, THREE.Vector3>; home: THREE.Vector3 };
}) {
  if (!report) return null;
  const { tilePos, structPos } = places;
  const centre = places.home;
  /** where Earth sits for a downlink: the globe on the horizon, or straight up off-Moon */
  const earth = new THREE.Vector3(-14, 6, -26);
  const nodes: React.ReactNode[] = [];

  report.effects.forEach((fx, i) => {
    const at = i * STEP;
    const k = `${fx.kind}-${i}`;
    switch (fx.kind) {
      case "daylight":
        nodes.push(<DaylightSweep key={k} delay={at} />);
        break;
      case "power-out":
        fx.structureIds.forEach((id, j) => {
          const p = structPos.get(id);
          if (p) nodes.push(<PowerOut key={`${k}-${j}`} position={p} delay={at + j * 0.08} />);
        });
        break;
      case "storm":
        nodes.push(<StormParticles key={`${k}-p`} severity={fx.severity} delay={at} />);
        fx.shieldedIds.forEach((id, j) => {
          const p = structPos.get(id);
          if (p) nodes.push(<ShieldDome key={`${k}-s${j}`} position={p} delay={at} />);
        });
        fx.hitIds.forEach((id, j) => {
          const p = structPos.get(id);
          if (p) nodes.push(<HitFlash key={`${k}-h${j}`} position={p.clone().setY(p.y + 0.4)} delay={at + 0.5 + j * 0.1} />);
        });
        break;
      case "impact": {
        const p = tilePos.get(fx.tileId);
        if (p) nodes.push(<Impact key={k} position={p} delay={at} />);
        fx.hitIds.forEach((id, j) => {
          const q = structPos.get(id);
          if (q) nodes.push(<HitFlash key={`${k}-h${j}`} position={q.clone().setY(q.y + 0.4)} delay={at + 0.55} />);
        });
        break;
      }
      case "downlink": {
        const p = structPos.get(fx.fromId);
        if (p) nodes.push(<Downlink key={k} from={p.clone().setY(p.y + 0.6)} to={earth} delay={at} />);
        break;
      }
      case "science": {
        const sources = fx.fromIds.map((id) => structPos.get(id)).filter((p): p is THREE.Vector3 => !!p);
        // science can be credited to the mission rather than to one instrument: show it at the site
        (sources.length ? sources : [centre]).forEach((p, j) => {
          nodes.push(<ScienceMotes key={`${k}-${j}`} position={p.clone().setY(p.y + 0.3)} delay={at + j * 0.1} />);
        });
        break;
      }
      case "goal-done":
        nodes.push(<GoalBeacon key={k} position={centre} delay={at} color="#34d399" />);
        break;
      case "discovery": {
        const p = tilePos.get(fx.tileId);
        if (p) nodes.push(<GoalBeacon key={k} position={p} delay={at} color={CYAN} />);
        break;
      }
    }
  });

  return <group key={report.turn}>{nodes}</group>;
}

function Board(props: HexBoardProps) {
  const { theme, tiles, terrains, structures, sunFactor, earthUp, validTileIds = [], selectedTileId, onTileClick, report, scenario, ghostKind } = props;
  const palette: Record<string, string> = theme === "moon" ? MOON_COLORS : theme === "station" ? STATION_COLORS : {};
  const colorOf = (t: Tile) => palette[t.terrain] ?? terrains.find((x) => x.id === t.terrain)?.color ?? "#888";
  const byTile = useMemo(() => {
    const m = new Map<string, Structure[]>();
    for (const s of structures) m.set(s.tileId, [...(m.get(s.tileId) ?? []), s]);
    return m;
  }, [structures]);
  const valid = useMemo(() => new Set(validTileIds), [validTileIds]);

  /** Where every tile and every structure actually sits, so effects can be aimed at them. */
  const places = useMemo(() => {
    const tilePos = new Map<string, THREE.Vector3>();
    const structPos = new Map<string, THREE.Vector3>();
    for (const t of tiles) {
      const [x, z] = hexToWorld(t.q, t.r);
      const h = tileHeight(t, theme);
      tilePos.set(t.id, new THREE.Vector3(x, h, z));
      const here = byTile.get(t.id) ?? [];
      here.forEach((st, i) => {
        const dx = here.length > 1 ? (i - (here.length - 1) / 2) * 0.55 : 0;
        structPos.set(st.id, new THREE.Vector3(x + dx, h, z));
      });
    }
    const landing = tiles.find((t) => t.q === 0 && t.r === 0) ?? tiles[0];
    const home = (landing && tilePos.get(landing.id)) ?? new THREE.Vector3();
    return { tilePos, structPos, home };
  }, [tiles, theme, byTile]);

  /** A shield is a structure whose scenario definition carries the "shield" trait. */
  const shieldTiles = useMemo(() => {
    if (!scenario) return [];
    const defs = new Map(scenario.structures.map((d) => [d.kind, d]));
    return structures
      .filter((st) => st.health > 0 && (defs.get(st.kind)?.traits as string[] | undefined)?.includes("shield"))
      .map((st) => places.structPos.get(st.id))
      .filter((v): v is THREE.Vector3 => !!v);
  }, [scenario, structures, places]);

  // The Sun sits where the key light comes from, so what you see matches what lights the site.
  const sunDir = useMemo(() => {
    const elev = theme === "moon" ? 0.08 + 0.22 * sunFactor : 0.9;
    return new THREE.Vector3(Math.cos(0.6) * 30, Math.max(0.6, elev * 30), Math.sin(0.6) * 30);
  }, [theme, sunFactor]);

  const ghostTile = selectedTileId && valid.has(selectedTileId) ? places.tilePos.get(selectedTileId) : undefined;

  return (
    <>
      <Lights theme={theme} sunFactor={sunFactor} />
      <Stars radius={80} depth={40} count={2500} factor={3} saturation={0} fade speed={0.2} />
      {sunFactor > 0.02 && <SunInSky position={sunDir} />}
      {theme === "moon" && <EarthOnHorizon up={earthUp} />}
      <fog attach="fog" args={[theme === "moon" ? "#05060c" : "#030a18", 16, 42]} />
      {theme === "moon" && <Rocks />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color={theme === "moon" ? "#3a3936" : theme === "earth" ? "#0b1f3a" : "#0d1222"} roughness={1} />
      </mesh>

      {shieldTiles.map((p, i) => (
        <ShieldArea key={`shield-${i}`} position={[p.x, 0, p.z]} />
      ))}

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
                {s.health < 100 && <HealthBar health={s.health} y={0.95} />}
              </group>
            ))}
          </group>
        );
      })}

      {ghostKind && ghostTile && <Ghost kind={ghostKind} position={[ghostTile.x, ghostTile.y, ghostTile.z]} />}

      <TurnEffects report={report} places={places} />

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
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [6, 8, 9], fov: 42 }} gl={{ antialias: true }}>
      <color attach="background" args={[props.theme === "moon" ? "#020308" : props.theme === "earth" ? "#030a18" : "#05070f"]} />
      <Suspense fallback={null}>
        <Board {...props} />
      </Suspense>
    </Canvas>
  );
}
