import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { MissionDesign, Module, ModuleCategory, RideshareOffer } from "@/engine/types";
import { CATEGORY_COLOR, getModule } from "@/lib/catalog";
import { prefersCalm } from "@/scene/bodies";
import { CYAN, EngineBell, LandingLegs, SnapIn, SpareVolume, TrackingDish, UnfoldingWing } from "./parts";

/**
 * The spacecraft the player is building, in 3D. It assembles as modules are added: the bus
 * grows, arrays unfold, the antenna swings onto Earth, instruments snap in. The cyan volume
 * on top is the capacity still free on the rocket, which is what rideshare sells.
 *
 * Exported for the Build step, Rideshare, the Debrief and the landing page.
 */

/** Stacked bottom to top. Arrays, dishes, legs and engines are shaped parts, not blocks. */
const STACK_ORDER: ModuleCategory[] = [
  "bus", "battery", "thermal", "computer", "adcs", "habitat", "isru", "rover", "experiment", "instrument",
];

const SHAPED: ModuleCategory[] = ["power", "comms", "lander", "propulsion"];

/** Hull radius by job: the bus is the widest part, instruments ride narrower. */
const RADIUS: Partial<Record<ModuleCategory, number>> = {
  bus: 0.3, battery: 0.28, thermal: 0.29, computer: 0.24, adcs: 0.23,
  habitat: 0.3, isru: 0.26, rover: 0.26, experiment: 0.24, instrument: 0.22,
};
const radiusOf = (c: ModuleCategory) => RADIUS[c] ?? 0.27;

/** kg to a block height, on a square-root scale so a heavy module does not dwarf the rest. */
const blockHeight = (kg: number) => Math.max(0.09, Math.min(0.34, 0.05 + Math.sqrt(kg) * 0.012));

interface Props {
  design: MissionDesign;
  /** draw attention to one module, e.g. the card the pointer is on */
  highlightModuleId?: string;
  /** rideshare payloads that have been accepted: they dock into the spare volume */
  payloads?: RideshareOffer[];
  /** capacity still free on the rocket, kg */
  spareMassKg?: number;
  /** tighter framing for a narrow panel */
  compact?: boolean;
}

/** One stacked module: a drum in its category colour, with a nameplate band. */
function StackBlock({ m, y, h, highlight, delay }: { m: Module; y: number; h: number; highlight: boolean; delay: number }) {
  const colour = CATEGORY_COLOR[m.category];
  const r = radiusOf(m.category);
  return (
    <SnapIn delay={delay} highlight={highlight}>
      <group position={[0, y + h / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[r, r, h, 20]} />
          <meshStandardMaterial
            color="#c3c9dd"
            metalness={0.55}
            roughness={0.42}
            emissive={highlight ? CYAN : "#000000"}
            emissiveIntensity={highlight ? 0.55 : 0}
          />
        </mesh>
        {/* the category colour as a painted band, which is how you tell modules apart */}
        <mesh position={[0, -h / 2 + Math.min(0.05, h * 0.3), 0]}>
          <cylinderGeometry args={[r + 0.006, r + 0.006, Math.min(0.05, h * 0.3), 20]} />
          <meshStandardMaterial color={colour} metalness={0.3} roughness={0.55} emissive={colour} emissiveIntensity={0.22} />
        </mesh>
        {/* a dark seam so stacked modules read as separate pieces */}
        <mesh position={[0, h / 2 - 0.005, 0]}>
          <cylinderGeometry args={[r + 0.008, r + 0.008, 0.01, 20]} />
          <meshStandardMaterial color="#0d1026" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
    </SnapIn>
  );
}

/** An accepted rideshare payload, docked inside the spare volume. */
function Payload({ offer, index, count }: { offer: RideshareOffer; index: number; count: number }) {
  const a = (index / Math.max(1, count)) * Math.PI * 2;
  const r = count > 1 ? 0.17 : 0;
  const s = Math.max(0.09, Math.min(0.2, 0.05 + Math.sqrt(offer.massKg) * 0.012));
  return (
    <SnapIn delay={0.1 + index * 0.08}>
      <mesh position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color="#67e8f9" metalness={0.3} roughness={0.5} emissive={CYAN} emissiveIntensity={0.3} />
      </mesh>
    </SnapIn>
  );
}

function Ship({ design, highlightModuleId, payloads = [], spareMassKg = 0 }: Omit<Props, "compact">) {
  const spin = useRef<THREE.Group>(null);
  const calm = useMemo(prefersCalm, []);
  const viewport = useThree((s) => s.viewport);

  const modules = useMemo(
    () => design.moduleIds.map(getModule).filter((m): m is Module => !!m),
    [design.moduleIds],
  );

  const { blocks, wings, dishes, hasLander, hasEngine, top } = useMemo(() => {
    const stacked = STACK_ORDER.flatMap((c) => modules.filter((m) => m.category === c));
    const other = modules.filter((m) => !STACK_ORDER.includes(m.category) && !SHAPED.includes(m.category));
    const all = [...stacked, ...other];
    let y = 0;
    const out = all.map((m, i) => {
      const h = blockHeight(m.massKg);
      const block = { m, y, h, delay: i * 0.06 };
      y += h + 0.012;
      return block;
    });
    return {
      blocks: out,
      wings: modules.filter((m) => m.category === "power"),
      dishes: modules.filter((m) => m.category === "comms"),
      hasLander: modules.some((m) => m.category === "lander"),
      hasEngine: modules.some((m) => m.category === "propulsion"),
      top: y,
    };
  }, [modules]);

  // the volume still free on the rocket, on the same square-root scale as the modules
  const stackTop = blocks.length ? blocks[blocks.length - 1].y + blocks[blocks.length - 1].h : 0.3;
  const spareHeight = spareMassKg > 20
    ? Math.max(0.16, Math.min(Math.max(0.34, stackTop * 1.15), Math.sqrt(spareMassKg) * 0.012))
    : 0;

  useFrame(({ clock }) => {
    if (!calm && spin.current) spin.current.rotation.y = Math.sin(clock.elapsedTime * 0.32) * 0.62;
  });

  // Centre the assembly and scale it to the panel, so a bare bus and a full stack are both
  // worth looking at and neither is clipped. The viewport gives the world size actually on
  // screen, so this holds for a wide desktop aside and a short phone panel alike.
  const bottom = hasLander ? -0.14 : hasEngine ? -0.33 : 0;
  const vTop = top + (spareHeight > 0.01 ? spareHeight + 0.1 : 0.04);
  const vExtent = Math.max(0.5, vTop - bottom);
  // the widest thing on the ship: deployed arrays reach furthest, then landing legs
  const hExtent = 2 * Math.max(0.34, hasLander ? 0.62 : 0, wings.length ? 1.28 : 0, dishes.length ? 0.46 : 0);
  const fit = Math.max(0.45, Math.min(2.4, Math.min((viewport.height * 0.84) / vExtent, (viewport.width * 0.9) / hExtent)));
  const centre = -(bottom + vExtent / 2);

  return (
    <group scale={fit}>
      <group ref={spin} position={[0, centre, 0]}>
        {hasEngine && <EngineBell y={-0.16} delay={0} />}
        {hasLander && <LandingLegs y={0} delay={0.1} />}

        {blocks.map(({ m, y, h, delay }) => (
          <StackBlock key={m.id} m={m} y={y} h={h} delay={delay} highlight={m.id === highlightModuleId} />
        ))}

        {wings.map((m, i) => {
          const y = Math.min(top - 0.1, 0.22 + i * 0.26);
          return (
            <group key={m.id}>
              <UnfoldingWing side={1} y={y} delay={0.15 + i * 0.1} />
              <UnfoldingWing side={-1} y={y} delay={0.15 + i * 0.1} />
            </group>
          );
        })}

        {dishes.slice(0, 3).map((m, i) => (
          <group key={m.id} position={[0.31, Math.max(0.08, top - 0.16 - i * 0.15), 0]} rotation={[0, 0, -0.62]}>
            <TrackingDish r={0.13 - i * 0.022} delay={0.2 + i * 0.12} />
          </group>
        ))}

        <SpareVolume y={top + 0.05} height={spareHeight} radius={0.34}>
          {payloads.map((o, i) => (
            <Payload key={o.id} offer={o} index={i} count={payloads.length} />
          ))}
        </SpareVolume>
      </group>
    </group>
  );
}

function Scene({ compact, ...rest }: Props) {
  return (
    <>
      <color attach="background" args={["#070817"]} />
      <PerspectiveCamera makeDefault position={[0, 0.44, compact ? 3.1 : 2.75]} fov={38} near={0.05} far={60} rotation={[-0.142, 0, 0]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 3]} intensity={2.2} />
      <directionalLight position={[-3, 1, -2]} intensity={0.7} color="#8ab4ff" />
      <Stars radius={30} depth={16} count={compact ? 240 : 420} factor={1.6} saturation={0} fade speed={0.2} />
      <Ship {...rest} />
    </>
  );
}

export function Spacecraft3D(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="Your spacecraft, in 3D"
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}

export default Spacecraft3D;
