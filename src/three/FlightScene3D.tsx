import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Line, Stars } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";
import type { FlightPhaseId } from "@/engine/types";
import type { FlightSceneProps } from "@/screens/FlightSceneSvg";
import type { Timeline } from "@/screens/flightTimeline";
import { Earth, Moon } from "@/scene/bodies";
import { StationModel } from "./missions/parts";
import { EARTH_R, FlightPath, MOON_C, MOON_R, NOSE, STAGE1, STAGE2, newPose, newState } from "./flightPath";

export interface FlightCoreProps {
  timeline: Timeline;
  lunar: boolean;
  /** the craft flies to a space station and docks with it */
  station?: boolean;
  lostAt?: FlightPhaseId;
  /** flight progress 0 to 1, read every frame: the scene never re-renders to move */
  progress: { readonly current: number };
  /**
   * Scene time in seconds. When given (the video), every frame is a pure function of progress and
   * this clock: no damping and no wall clock. Without it (the game) the R3F clock drives the flicker.
   */
  clock?: { readonly current: number };
  /** called once, on the first frame drawn */
  onReady?: () => void;
}

const PATH_N = 240;

/** Unit-height open cone, apex down, base at the top: the plume, scaled each frame. */
function usePlumeGeometry() {
  return useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 20, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, -0.5, 0);
    return g;
  }, []);
}

/** Text label drawn to a canvas texture (drei <Html> re-mounts a React root every frame here). */
function useLabel(text: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    if (g) { g.font = "600 28px Inter, system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.65)"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text.toUpperCase().split("").join(" "), 128, 32); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
}

/**
 * The flight scene without its Canvas: the game puts it in an R3F Canvas, the video in Remotion's
 * ThreeCanvas. Everything moves by mutation inside one useFrame, from preallocated objects.
 */
export function FlightSceneCore({ timeline, lunar, station, lostAt, progress, clock, onReady }: FlightCoreProps) {
  const path = useMemo(() => new FlightPath(timeline, { lunar, station, lostAt }), [timeline, lunar, station, lostAt]);
  const L = path.layout;
  const plan = useMemo(() => path.plannedPath(PATH_N), [path]);
  const ring = useMemo(() => path.ring(), [path]);
  const st = useMemo(newState, []);
  const pose = useMemo(newPose, []);
  const plumeGeo = usePlumeGeometry();
  const earthLabel = useLabel("Earth");
  const moonLabel = useLabel("Moon");
  const moonQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), L.landDir), [L]);

  const spinRef = useRef<THREE.Group>(null);
  const rocket = useRef<THREE.Group>(null);
  const stage1 = useRef<THREE.Group>(null);
  const plume = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const throat = useRef<THREE.Mesh>(null);
  const flameLight = useRef<THREE.PointLight>(null);
  const spent = useRef<THREE.Group>(null);
  const spentMat = useRef<THREE.MeshStandardMaterial>(null);
  const stationRef = useRef<THREE.Group>(null);
  const lostRef = useRef<THREE.Group>(null);
  const trail = useRef<Line2>(null);
  const planLine = useRef<Line2>(null);
  const earthSprite = useRef<THREE.SpriteMaterial>(null);
  const moonSprite = useRef<THREE.SpriteMaterial>(null);
  const dust = useRef<THREE.Points>(null);
  const dustMat = useRef<THREE.PointsMaterial>(null);
  const bloom = useRef<UnrealBloomPass | null>(null);

  // per-frame scratch
  const scratch = useMemo(() => ({
    m: new THREE.Matrix4(), x: new THREE.Vector3(), z: new THREE.Vector3(), v: new THREE.Vector3(),
    offPos: new THREE.Vector3(), offLook: new THREE.Vector3(), lastPos: new THREE.Vector3(), lastLook: new THREE.Vector3(),
    lastP: -1, ready: false,
  }), []);

  // dust thrown up by the landing engine: low straight arcs, no air on the Moon
  const DUST_N = 300;
  const dustSeeds = useMemo(() => Array.from({ length: DUST_N }, (_, i) => {
    const a = (i * 2.399963) % (Math.PI * 2);
    return { ca: Math.cos(a), sa: Math.sin(a), s: 0.25 + (((i * 37) % 100) / 100) * 0.8, lift: 0.16 + (((i * 53) % 100) / 100) * 0.5, delay: (((i * 29) % 100) / 100) * 0.3 };
  }), []);
  const dustPositions = useMemo(() => new Float32Array(DUST_N * 3), []);
  const dustBasis = useMemo(() => {
    const u = L.landDir.clone();
    const e1 = new THREE.Vector3().crossVectors(L.N, u).normalize();
    const e2 = new THREE.Vector3().crossVectors(u, e1).normalize();
    return { u, e1, e2, at: MOON_C.clone().addScaledVector(u, MOON_R) };
  }, [L]);

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    camera.fov = 45; camera.near = 0.004; camera.far = 220;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((state, rawDt) => {
    const dt = Math.min(0.1, Math.max(0, rawDt));
    const p = progress.current;
    const t = clock ? clock.current : state.clock.elapsedTime;
    const s = path.sample(p, st);
    const aspect = state.size.width / Math.max(1, state.size.height);
    path.camera(p, s, aspect, pose);
    const size = pose.size;

    // Skip and replays jump the progress: ease the camera across instead of cutting (game only).
    const S = scratch;
    if (!clock) {
      if (S.lastP >= 0 && Math.abs(p - S.lastP) > 0.03) {
        S.offPos.copy(S.lastPos).sub(pose.pos);
        S.offLook.copy(S.lastLook).sub(pose.look);
      }
      const k = Math.exp(-3.5 * dt);
      S.offPos.multiplyScalar(k);
      S.offLook.multiplyScalar(k);
      pose.pos.add(S.offPos);
      pose.look.add(S.offLook);
    }
    S.lastP = p;
    S.lastPos.copy(pose.pos);
    S.lastLook.copy(pose.look);

    const cam = state.camera;
    cam.position.copy(pose.pos);
    cam.up.copy(pose.up);
    cam.lookAt(pose.look);

    if (spinRef.current) spinRef.current.rotation.y = s.spin;

    // rocket: base on the path, nose along the velocity, the orbit normal as its side (no roll flips)
    const r = rocket.current;
    if (r) {
      r.visible = !s.lost;
      r.position.copy(s.pos);
      S.x.copy(L.N).negate().addScaledVector(s.nose, L.N.dot(s.nose)).normalize();
      S.z.crossVectors(S.x, s.nose);
      S.m.makeBasis(S.x, s.nose, S.z);
      r.quaternion.setFromRotationMatrix(S.m);
      r.scale.setScalar(size);
    }
    if (stage1.current) stage1.current.visible = s.stage1;

    // plume: a child of the rocket, so it can never come loose; it sits on whichever engine is firing
    const burn = s.burn;
    if (plume.current) {
      plume.current.visible = burn > 0.01 && !s.lost;
      plume.current.position.y = s.stage1 ? -STAGE1 : 0;
      const flick = 1 + 0.1 * Math.sin(t * 34) + 0.05 * Math.sin(t * 57 + 1.3);
      const len = (1.1 + 1.6 * s.climb) * burn * flick;
      const wid = 0.2 + 0.08 * s.climb;
      outer.current?.scale.set(wid * flick, len, wid * flick);
      core.current?.scale.set(wid * 0.45 * flick, len * 0.7, wid * 0.45 * flick);
      if (throat.current) throat.current.scale.setScalar(0.11 * (0.6 + 0.4 * burn));
    }
    if (flameLight.current) {
      flameLight.current.intensity = 0.5 * burn;
      flameLight.current.distance = size * 6;
      flameLight.current.position.y = s.stage1 ? -STAGE1 - 0.2 : -0.2;
    }

    // the first stage, once it lets go: it drifts back, falls and tumbles, then fades
    const sp = spent.current;
    if (sp) {
      const age = s.sepAge;
      sp.visible = !s.lost && age >= 0 && age < 2.4;
      if (sp.visible) {
        const travel = s.sepSpeed * age * 0.55;
        sp.position.copy(s.sepPos).addScaledVector(s.sepVel, travel - STAGE1 * size * 0.5).addScaledVector(s.sepOut, -0.004 * age * age);
        S.x.copy(L.N).negate();
        S.m.makeBasis(S.x, s.sepVel, S.z.crossVectors(S.x, s.sepVel));
        sp.quaternion.setFromRotationMatrix(S.m);
        sp.rotateX(age * 0.9);
        sp.rotateZ(age * 0.5);
        sp.scale.setScalar(size);
        if (spentMat.current) spentMat.current.opacity = Math.max(0, 1 - age / 2.4);
      }
    }

    // the station: ahead on the same orbit while the craft catches up, then docked
    const stn = stationRef.current;
    if (stn) {
      stn.visible = s.stationOn && !s.lost;
      if (stn.visible) {
        stn.position.copy(s.stationPos);
        S.x.crossVectors(s.stationOut, s.stationVel);
        S.m.makeBasis(S.x, s.stationOut, s.stationVel);
        stn.quaternion.setFromRotationMatrix(S.m);
        stn.scale.setScalar(size * 1.6);
      }
    }

    // the planned path and the flown trail (the trail is the plan, revealed up to the rocket)
    const idx = Math.floor(path.pathIndex(p, PATH_N));
    if (trail.current) {
      trail.current.geometry.instanceCount = Math.max(0, idx);
      // in Earth orbit the ring is the track; the climb's trail goes once the craft is on it
      trail.current.visible = idx > 0 && (lunar || p < path.marks.t0);
    }
    if (planLine.current) planLine.current.visible = lunar ? !s.landed : p < path.marks.orbit;

    if (lostRef.current) {
      lostRef.current.visible = s.lost;
      if (s.lost) {
        lostRef.current.position.copy(s.pos);
        lostRef.current.scale.setScalar((size / 0.06) * (1 + 0.15 * Math.sin(t * 6)));
      }
    }
    if (earthSprite.current) earthSprite.current.opacity = pose.wide;
    if (moonSprite.current) moonSprite.current.opacity = pose.wide;

    // landing dust
    const d = dust.current;
    if (d && lunar) {
      // seconds from touchdown: the grains start to lift just before it, then settle
      const age = s.dustAge;
      const fade = age < 0 ? Math.max(0, 1 + age / 0.5) * 0.5 : Math.max(0, Math.min(1, 1.6 - age * 0.4));
      d.visible = !s.lost && Number.isFinite(age) && fade > 0.01;
      if (d.visible) {
        const tau0 = Math.max(0, age + 0.5) * 0.55;
        const B = dustBasis;
        for (let i = 0; i < DUST_N; i++) {
          const sd = dustSeeds[i];
          const tau = Math.max(0, tau0 - sd.delay);
          const reach = sd.s * tau * MOON_R * 0.95;
          const h = Math.max(0, sd.lift * tau - 0.34 * tau * tau) * MOON_R * 1.5;
          S.v.copy(B.at).addScaledVector(B.e1, sd.ca * reach).addScaledVector(B.e2, sd.sa * reach).addScaledVector(B.u, h);
          dustPositions[i * 3] = S.v.x; dustPositions[i * 3 + 1] = S.v.y; dustPositions[i * 3 + 2] = S.v.z;
        }
        (d.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        if (dustMat.current) dustMat.current.opacity = 0.6 * fade;
      }
    }

    if (bloom.current) bloom.current.strength = 0.5 + 0.15 * burn;

    if (!S.ready) { S.ready = true; onReady?.(); }
  });

  const earthLabelPos = useMemo(() => L.earth.clone().add(new THREE.Vector3(0, -EARTH_R - 0.3, 0)), [L]);
  const moonLabelPos = useMemo(() => MOON_C.clone().add(new THREE.Vector3(0, MOON_R + 0.3, 0)), []);

  return (
    <>
      <Bloom passRef={bloom} />
      <color attach="background" args={["#04060f"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={L.sun.clone().multiplyScalar(10)} intensity={2.2} />
      <Stars radius={60} depth={30} count={1500} factor={3} fade speed={0} />

      <group position={L.earth}>
        <group ref={spinRef}>
          <Earth radius={EARTH_R} sunDir={L.sun} spin={0} />
        </group>
      </group>
      <Line points={ring} color="#8b5cf6" lineWidth={1} transparent opacity={0.4} dashed dashSize={0.06} gapSize={0.07} />
      <sprite position={earthLabelPos} scale={[0.9, 0.225, 1]}><spriteMaterial ref={earthSprite} map={earthLabel} transparent depthWrite={false} opacity={0} /></sprite>
      {lunar && (
        <>
          <group position={MOON_C} quaternion={moonQ}>
            <Moon radius={MOON_R} spin={0} />
          </group>
          <sprite position={moonLabelPos} scale={[0.9, 0.225, 1]}><spriteMaterial ref={moonSprite} map={moonLabel} transparent depthWrite={false} opacity={0} /></sprite>
          <points ref={dust} visible={false} frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
            </bufferGeometry>
            <pointsMaterial ref={dustMat} size={0.0035} sizeAttenuation color="#e2e6f0" transparent opacity={0.6} depthWrite={false} />
          </points>
        </>
      )}

      {/* where the flight is going, and the part already flown */}
      <Line ref={planLine} points={plan} color="#67e8f9" lineWidth={1} transparent opacity={0.22} dashed dashSize={0.05} gapSize={0.05} />
      <Line ref={trail} points={plan} color="#a78bfa" lineWidth={2} transparent opacity={0.85} />

      {station && (
        <group ref={stationRef} visible={false}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <StationModel scale={1} />
          </group>
        </group>
      )}

      {/* the first stage after it lets go */}
      <group ref={spent} visible={false}>
        <mesh position={[0, -STAGE1 / 2, 0]}>
          <cylinderGeometry args={[0.075, 0.08, STAGE1, 14]} />
          <meshStandardMaterial ref={spentMat} color="#cbd5e1" transparent opacity={1} />
        </mesh>
      </group>

      {/* the rocket: origin at the top of the first stage, nose up its local y */}
      <group ref={rocket}>
        <group ref={stage1}>
          <mesh position={[0, -STAGE1 / 2, 0]}>
            <cylinderGeometry args={[0.075, 0.08, STAGE1, 14]} />
            <meshStandardMaterial color="#e2e8f0" emissive="#334155" />
          </mesh>
        </group>
        <mesh position={[0, STAGE2 / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.075, STAGE2, 14]} />
          <meshStandardMaterial color="#f1f5f9" emissive="#334155" />
        </mesh>
        <mesh position={[0, STAGE2 + NOSE / 2, 0]}>
          <coneGeometry args={[0.07, NOSE, 14]} />
          <meshStandardMaterial color="#a78bfa" emissive="#6d28d9" />
        </mesh>
        <group ref={plume}>
          <mesh ref={outer} geometry={plumeGeo}>
            <meshBasicMaterial color="#fb7185" transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={core} geometry={plumeGeo}>
            <meshBasicMaterial color="#fde68a" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={throat}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#fff7e0" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
        <pointLight ref={flameLight} color="#fbbf24" intensity={0} distance={1} />
      </group>

      <group ref={lostRef} visible={false}>
        <mesh><sphereGeometry args={[0.12, 16, 16]} /><meshBasicMaterial color="#fb7185" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        <mesh><sphereGeometry args={[0.05, 12, 12]} /><meshBasicMaterial color="#fff" /></mesh>
      </group>
    </>
  );
}

/** Bloom, so the plume and the lit limb carry real light. The pass is exposed so its strength can follow the engine. */
function Bloom({ passRef }: { passRef: React.RefObject<UnrealBloomPass | null> }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const pass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.5, 0.7, 0.72);
    c.addPass(pass);
    c.addPass(new OutputPass());
    return { c, pass };
  }, [gl, scene, camera, size.width, size.height]);
  useEffect(() => {
    passRef.current = composer.pass;
    return () => composer.c.dispose();
  }, [composer, passRef]);
  useEffect(() => composer.c.setSize(size.width, size.height), [composer, size]);
  useFrame(() => composer.c.render(), 1);
  return null;
}

/** 3D flight view for the game: the core in a Canvas, driven by the flight's progress ref. */
export default function FlightScene3D(props: FlightSceneProps) {
  const fallback = useRef(props.p);
  fallback.current = props.p;
  const progress = props.pRef ?? fallback;
  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.3, 4.8], fov: 45, near: 0.004, far: 220 }} gl={{ antialias: true }} aria-label={props.lunar ? "Flight from Earth to the Moon" : "Flight into Earth orbit"} role="img">
        <Suspense fallback={null}>
          <FlightSceneCore timeline={props.timeline} lunar={props.lunar} station={props.station} lostAt={props.lostAt} progress={progress} onReady={props.onReady} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute bottom-2.5 right-14 text-[10px] uppercase tracking-wider text-white/40">{props.lunar ? "Not to scale" : "Earth orbit, not to scale"}</div>
    </div>
  );
}

