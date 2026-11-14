import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { FlightSceneProps } from "@/screens/FlightSceneSvg";
import { phaseAt } from "@/screens/flightTimeline";
import type { FlightPhaseId } from "@/engine/types";

/** Units: Earth radius = 1. Distances and the Moon are NOT to scale (the screen says so). */
const EARTH_R = 1;
const LEO_R = 1.35;
const TILT = 0.35;
const LEO_END_ANGLE = 1.9;
const EARTH_C = new THREE.Vector3(0, 0, 0);
const LUNAR_EARTH_C = new THREE.Vector3(-4.3, -0.4, 0);
const MOON_C = new THREE.Vector3(4.3, 0.5, 0);
const MOON_R = 0.3;

/** How much of the path each phase covers (visual weight, not mission days). */
const EARTH_W: Partial<Record<FlightPhaseId, number>> = { launch: 0.3, ascent: 0.4, "orbit-insertion": 0.3 };
const LUNAR_W: Partial<Record<FlightPhaseId, number>> = { launch: 0.1, ascent: 0.15, "orbit-insertion": 0.1, transfer: 0.45, arrival: 0.2 };

const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const bez3 = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) => {
  const u = 1 - t;
  return new THREE.Vector3().addScaledVector(a, u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t);
};

/** Point on a circle-ish orbit around `center`, in a plane tilted about the x axis. */
function around(center: THREE.Vector3, r: number, angle: number): THREE.Vector3 {
  const x = r * Math.sin(angle), y = r * Math.cos(angle);
  return new THREE.Vector3(x, y * Math.cos(TILT), y * Math.sin(TILT)).add(center);
}

/** Launch site on top, rising and curving into low Earth orbit. h goes 0..1. */
function ascent(center: THREE.Vector3, h: number): THREE.Vector3 {
  const r = EARTH_R + 0.01 + (LEO_R - EARTH_R - 0.01) * smooth(h / 0.9);
  return around(center, r, LEO_LAST * Math.pow(Math.min(1, Math.max(0, h)), 1.6));
}
const LEO_LAST = LEO_END_ANGLE;

/** Position along the pre-operations path, g goes 0..1. */
function pathAt(g: number, lunar: boolean): THREE.Vector3 {
  const gg = Math.min(1, Math.max(0, g));
  if (!lunar) return ascent(EARTH_C, gg);
  const leo = 0.35, tli = 0.8;
  if (gg <= leo) return ascent(LUNAR_EARTH_C, gg / leo);
  const E = ascent(LUNAR_EARTH_C, 1);
  const A = new THREE.Vector3(3.2, 1.4, 0);
  if (gg <= tli) return bez3(E, new THREE.Vector3(2.64, 3.32, -1.2), A, smooth((gg - leo) / (tli - leo)) * 0.5 + ((gg - leo) / (tli - leo)) * 0.5);
  const S = MOON_C.clone().add(new THREE.Vector3(0.0, -MOON_R - 0.012, 0));
  return bez3(A, new THREE.Vector3(3.55, 0.2, 0.75), S, smooth((gg - tli) / (1 - tli)));
}

function Rocket({ pos, dir, scale, flame, ghost }: { pos: THREE.Vector3; dir: THREE.Vector3; scale: number; flame: boolean; ghost?: boolean }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);
  return (
    <group position={pos} quaternion={q} scale={scale}>
      <mesh><cylinderGeometry args={[0.014, 0.017, 0.085, 12]} /><meshStandardMaterial color="#f1f5f9" emissive="#334155" /></mesh>
      <mesh position={[0, 0.058, 0]}><coneGeometry args={[0.014, 0.036, 12]} /><meshStandardMaterial color="#a78bfa" emissive="#6d28d9" /></mesh>
      <mesh position={[0, 0, 0]} visible={!ghost}><sphereGeometry args={[0.045, 12, 12]} /><meshBasicMaterial color="#a78bfa" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      {flame && <pointLight position={[0, -0.08, 0]} color="#fbbf24" intensity={0.6} distance={1.4} />}
    </group>
  );
}

function Plume({ pos, dir, scale, t }: { pos: THREE.Vector3; dir: THREE.Vector3; scale: number; t: number }) {
  const back = dir.clone().normalize().multiplyScalar(-1);
  return (
    <>
      {Array.from({ length: 14 }, (_, k) => {
        const flick = 1 + 0.25 * Math.sin(t * 40 + k * 1.7);
        const at = pos.clone().addScaledVector(back, (0.05 + k * 0.05) * scale);
        const r = (0.026 + k * 0.004) * scale * flick;
        return (
          <mesh key={k} position={at}>
            <sphereGeometry args={[r, 8, 8]} />
            <meshBasicMaterial color={k < 4 ? "#fde68a" : k < 8 ? "#fb923c" : "#fb7185"} transparent opacity={Math.max(0, 0.85 - k * 0.06)} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        );
      })}
    </>
  );
}

function Planet({ center, radius, kind, t }: { center: THREE.Vector3; radius: number; kind: "earth" | "moon"; t: number }) {
  const craters = useMemo(() => [[0.5, 0.7, 0.07], [-0.4, 0.3, 0.05], [0.1, -0.6, 0.09], [0.8, -0.2, 0.04], [-0.7, -0.5, 0.06], [0.3, 0.2, 0.05]], []);
  if (kind === "earth") {
    return (
      <group position={center}>
        <mesh rotation={[0, t * 0.05, 0]}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshStandardMaterial color="#1e4fa0" emissive="#0b1d4a" roughness={0.85} />
        </mesh>
        <mesh rotation={[0, t * 0.05, 0]}>
          <sphereGeometry args={[radius * 1.003, 36, 18]} />
          <meshBasicMaterial color="#60a5fa" wireframe transparent opacity={0.1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[radius * 1.1, 48, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={center}>
      <mesh>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial color="#aab0c4" roughness={1} />
      </mesh>
      {craters.map(([x, y, s], i) => {
        const n = new THREE.Vector3(x, y, Math.sqrt(Math.max(0.05, 1 - x * x - y * y))).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        return (
          <mesh key={i} position={n.clone().multiplyScalar(radius * 1.002)} quaternion={q}>
            <circleGeometry args={[s * radius * 3, 20]} />
            <meshBasicMaterial color="#6b7390" transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function Ring({ center, r }: { center: THREE.Vector3; r: number }) {
  const pts = useMemo(() => Array.from({ length: 121 }, (_, i) => around(center, r, (i / 120) * Math.PI * 2)), [center, r]);
  return <Line points={pts} color="#8b5cf6" lineWidth={1} transparent opacity={0.4} dashed dashSize={0.06} gapSize={0.07} />;
}

/** Text label drawn to a canvas texture (drei <Html> re-mounts a React root every frame here). */
function Label({ text, position }: { text: string; position: THREE.Vector3 }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    if (g) { g.font = "600 28px Inter, system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.65)"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text.toUpperCase().split("").join(" "), 128, 32); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  return <sprite position={position} scale={[0.9, 0.225, 1]}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>;
}

function Rig({ pos, look }: { pos: THREE.Vector3; look: THREE.Vector3 }) {
  const cur = useRef(new THREE.Vector3(0, 1.3, 4.8));
  const aim = useRef(new THREE.Vector3());
  useFrame(({ camera }, dt) => {
    const k = 1 - Math.exp(-3 * Math.min(dt, 0.1));
    cur.current.lerp(pos, k);
    aim.current.lerp(look, k);
    camera.position.copy(cur.current);
    camera.lookAt(aim.current);
  });
  return null;
}

function Scene({ timeline, p, lunar, lostAt, ended }: FlightSceneProps) {
  const t = performance.now() / 1000;
  const { index, frac } = phaseAt(timeline, p);
  const phaseId = timeline.phases[index].id;
  const opsIndex = timeline.phases.findIndex((ph) => ph.id === "operations");
  const inOps = opsIndex >= 0 && index >= opsIndex;
  const earthC = lunar ? LUNAR_EARTH_C : EARTH_C;
  const earthLabel = useMemo(() => earthC.clone().add(new THREE.Vector3(0, -EARTH_R - 0.3, 0)), [earthC]);
  const moonLabel = useMemo(() => MOON_C.clone().add(new THREE.Vector3(0, MOON_R + 0.3, 0)), []);

  // visual progress along the pre-operations path
  const weights = lunar ? LUNAR_W : EARTH_W;
  const pre = timeline.phases.slice(0, opsIndex < 0 ? undefined : opsIndex);
  const total = pre.reduce((a, ph) => a + (weights[ph.id] ?? 0), 0) || 1;
  let acc = 0;
  for (let i = 0; i < Math.min(index, pre.length); i++) acc += weights[pre[i].id] ?? 0;
  const g = inOps ? 1 : Math.min(1, (acc + (weights[phaseId] ?? 0) * frac) / total);

  const opsFrac = inOps ? Math.min(1, Math.max(0, (p - timeline.starts[opsIndex]) / (1 - timeline.starts[opsIndex] || 1))) : 0;
  const orbitAngle = LEO_END_ANGLE + opsFrac * Math.PI * 5;

  let pos: THREE.Vector3, dir: THREE.Vector3;
  if (inOps && !lunar) {
    pos = around(earthC, LEO_R, orbitAngle);
    dir = around(earthC, LEO_R, orbitAngle + 0.02).sub(pos);
  } else if (inOps && lunar) {
    pos = pathAt(1, true);
    dir = new THREE.Vector3(0, -1, 0);
  } else {
    pos = pathAt(g, lunar);
    dir = pathAt(g + 0.004, lunar).sub(pathAt(g - 0.004, lunar));
    if (dir.lengthSq() < 1e-9) dir = new THREE.Vector3(0, 1, 0);
  }

  const lost = ended && !!lostAt;
  const burning = !ended && !inOps && (phaseId === "launch" || phaseId === "ascent" || phaseId === "orbit-insertion" || (phaseId === "transfer" && frac < 0.12) || (lunar && phaseId === "arrival" && frac > 0.4));
  // narrow screens (phones): back the camera off so the whole scene fits across, and draw the rocket bigger
  const { width, height } = useThree((st) => st.size);
  const aspect = width / Math.max(1, height);
  const fit = (need: number, base: number) => Math.max(base, need / (Math.tan((22.5 * Math.PI) / 180) * aspect));
  const rocketScale = (lunar ? 1.7 : 1.2) * Math.max(1, Math.min(2, 1.6 / aspect));

  const trail = useMemo(() => {
    if (inOps && !lunar) return [] as THREE.Vector3[];
    const n = 80, top = inOps ? 1 : g;
    return Array.from({ length: n + 1 }, (_, i) => pathAt((top * i) / n, lunar));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(g * 400), lunar, inOps]);

  // camera: wide by default, close during launch and the Moon landing
  const dist = lunar ? fit(6.2, 10.8) : fit(2.0, 4.8);
  const wide = lunar ? new THREE.Vector3(0, dist * 0.2, dist) : new THREE.Vector3(0, dist * 0.27, dist);
  const wideLook = lunar ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0.1, 0);
  const atMoon = lunar && (phaseId === "arrival" || inOps);
  const near = pos.clone().add(atMoon ? new THREE.Vector3(-0.4, -0.1, 2.6) : new THREE.Vector3(0.7, 0.35, 1.3));
  const nearLook = atMoon ? pos.clone().lerp(MOON_C, 0.5) : pos;
  let w = 0;
  if (!ended || inOps) {
    if (phaseId === "launch") w = 1;
    else if (phaseId === "ascent") w = 1 - frac;
    else if (lunar && phaseId === "arrival") w = smooth(frac * 2);
    else if (lunar && inOps) w = 1;
  }
  const camPos = wide.clone().lerp(near, w);
  const camLook = wideLook.clone().lerp(nearLook, w);

  return (
    <>
      <Rig pos={camPos} look={camLook} />
      <color attach="background" args={["#04060f"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 3, 6]} intensity={2.2} />
      <Stars radius={60} depth={30} count={1500} factor={3} fade speed={0.4} />

      <Planet center={earthC} radius={EARTH_R} kind="earth" t={t} />
      <Ring center={earthC} r={LEO_R} />
      <Label text="Earth" position={earthLabel} />
      {lunar && (
        <>
          <Planet center={MOON_C} radius={MOON_R} kind="moon" t={t} />
          <Label text="Moon" position={moonLabel} />
        </>
      )}

      {trail.length > 1 && <Line points={trail} color="#a78bfa" lineWidth={2} transparent opacity={0.85} />}

      {lost ? (
        <group position={pos}>
          <mesh scale={1 + 0.15 * Math.sin(t * 6)}><sphereGeometry args={[0.12, 16, 16]} /><meshBasicMaterial color="#fb7185" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
          <mesh><sphereGeometry args={[0.05, 12, 12]} /><meshBasicMaterial color="#fff" /></mesh>
        </group>
      ) : (
        <>
          <Rocket pos={pos} dir={dir} scale={rocketScale} flame={burning} />
          {burning && <Plume pos={pos} dir={dir} scale={rocketScale} t={t} />}
          {inOps && (
            <mesh position={pos} scale={1 + 0.35 * Math.abs(Math.sin(t * 2))}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          )}
        </>
      )}
    </>
  );
}

/** 3D flight view: rocket, plume, transfer arc, orbit or Moon landing, driven by the flight timeline progress `p`. */
export default function FlightScene3D(props: FlightSceneProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.3, 4.8], fov: 45 }} gl={{ antialias: true }} aria-label={props.lunar ? "Flight from Earth to the Moon" : "Flight into Earth orbit"} role="img">
        <Scene {...props} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-white/40">{props.lunar ? "Not to scale" : "Earth orbit, not to scale"}</div>
    </div>
  );
}
