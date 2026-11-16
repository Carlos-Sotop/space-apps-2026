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
import { EARTH_R, FLIGHT_SECONDS, FlightPath, MOON_C, MOON_R, newPose, newState } from "./flightPath";
import { BELL1_Y, BELL2_Y, Stage1Model, UpperStageModel, makeParticleMaterial, makePlumeGeometry, makePlumeMaterial, usePlumeFade, useSoftDot } from "./rocket";

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
  /** prefers-reduced-motion: no shake, no smoke, only the positions */
  calm?: boolean;
}

const PATH_N = 240;

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
export function FlightSceneCore({ timeline, lunar, station, lostAt, progress, clock, onReady, calm }: FlightCoreProps) {
  const path = useMemo(() => new FlightPath(timeline, { lunar, station, lostAt }), [timeline, lunar, station, lostAt]);
  const L = path.layout;
  const plan = useMemo(() => path.plannedPath(PATH_N), [path]);
  const ring = useMemo(() => path.ring(), [path]);
  const st = useMemo(newState, []);
  const pose = useMemo(newPose, []);
  const dot = useSoftDot();
  const plumeGeo = useMemo(makePlumeGeometry, []);
  const coreGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.5, 0.12, 1, 24, 8, true); g.translate(0, -0.5, 0); return g; }, []);
  const plumeFade = usePlumeFade();
  const outerMat = useMemo(() => makePlumeMaterial("#ff7a3d", plumeFade, 0.55), [plumeFade]);
  const coreMat = useMemo(() => makePlumeMaterial("#fff1c2", plumeFade, 0.95), [plumeFade]);
  const sparkMat = useMemo(() => makeParticleMaterial(dot, "#ffb066", true), [dot]);
  const smokeMat = useMemo(() => makeParticleMaterial(dot, "#d9dde8", false), [dot]);
  const earthLabel = useLabel("Earth");
  const moonLabel = useLabel("Moon");
  const moonQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), L.landDir), [L]);

  const spinRef = useRef<THREE.Group>(null);
  const rocket = useRef<THREE.Group>(null);
  const stage1 = useRef<THREE.Group>(null);
  const plume = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const throat = useRef<THREE.Sprite>(null);
  const throatMat = useRef<THREE.SpriteMaterial>(null);
  const smoke = useRef<THREE.Points>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const rimTarget = useRef<THREE.Object3D>(null);
  const flameLight = useRef<THREE.PointLight>(null);
  const spent = useRef<THREE.Group>(null);
  const stationRef = useRef<THREE.Group>(null);
  const lostRef = useRef<THREE.Group>(null);
  const trail = useRef<Line2>(null);
  const planLine = useRef<Line2>(null);
  const earthSprite = useRef<THREE.SpriteMaterial>(null);
  const moonSprite = useRef<THREE.SpriteMaterial>(null);
  const dust = useRef<THREE.Points>(null);
  const dustMat = useRef<THREE.PointsMaterial>(null);
  const bloom = useRef<UnrealBloomPass | null>(null);

  const scratchFade = useMemo(() => ({ value: 1 }), []);
  // per-frame scratch
  const scratch = useMemo(() => ({
    m: new THREE.Matrix4(), x: new THREE.Vector3(), z: new THREE.Vector3(), v: new THREE.Vector3(),
    offPos: new THREE.Vector3(), offLook: new THREE.Vector3(), lastPos: new THREE.Vector3(), lastLook: new THREE.Vector3(),
    lastP: -1, ready: false,
    fadeMesh: (o: THREE.Object3D) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "opacity" in m) { m.transparent = true; m.opacity = scratchFade.value; }
    },
  }), [scratchFade]);

  // smoke from the pad: the exhaust hits the ground and rolls out sideways, then thins out
  const SMOKE_N = 170;
  const smokeSeeds = useMemo(() => Array.from({ length: SMOKE_N }, (_, i) => {
    const f = (i * 0.6180339887) % 1, g = (i * 0.7548776662) % 1, h = (i * 0.5698402910) % 1;
    const late = i > 110;
    return { a: f * Math.PI * 2, speed: 0.05 + 0.08 * g, rise: 0.004 + 0.012 * h, delay: late ? 0.8 + 1.6 * g : 0.04 + 0.75 * h, grow: 0.7 + 0.6 * f };
  }), []);
  const smokeData = useMemo(() => ({ pos: new Float32Array(SMOKE_N * 3), size: new Float32Array(SMOKE_N), alpha: new Float32Array(SMOKE_N) }), []);
  // hot gas in the plume: grains born at the nozzle that stream back, spread and cool
  const SPARK_N = 56;
  const sparkData = useMemo(() => ({ pos: new Float32Array(SPARK_N * 3), size: new Float32Array(SPARK_N), alpha: new Float32Array(SPARK_N) }), []);
  const sparks = useRef<THREE.Points>(null);

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
  useEffect(() => { if (rim.current && rimTarget.current) rim.current.target = rimTarget.current; }, []);

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

    // ignition rumble: 2 to 3 pixels of shake that dies away as the rocket climbs
    const tIgn = (Math.min(p, path.marks.end) - path.marks.ignite) * FLIGHT_SECONDS;
    if (!calm && tIgn > 0 && s.climb < 0.35) {
      const env = Math.min(1, tIgn / 0.3) * (1 - Math.min(1, s.climb / 0.35)) * s.burn;
      const px = (2 * pose.pos.distanceTo(pose.look) * Math.tan((22.5 * Math.PI) / 180)) / Math.max(1, state.size.height);
      const amp = 2.5 * px * env;
      S.v.subVectors(pose.look, pose.pos).cross(pose.up).normalize();
      const nx = Math.sin(t * 47.3) * 0.6 + Math.sin(t * 83.1 + 1.7) * 0.4;
      const ny = Math.sin(t * 53.9 + 0.5) * 0.6 + Math.sin(t * 91.7 + 2.3) * 0.4;
      pose.pos.addScaledVector(S.v, nx * amp).addScaledVector(pose.up, ny * amp);
      pose.look.addScaledVector(S.v, nx * amp).addScaledVector(pose.up, ny * amp);
    }

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
      plume.current.position.y = s.stage1 ? BELL1_Y : BELL2_Y;
      const nozzle = s.stage1 ? 0.058 : 0.044;
      const flick = 1 + 0.06 * Math.sin(t * 31) + 0.04 * Math.sin(t * 57 + 1.3);
      // short against the pad, longer and wider as the air thins
      const ground = 0.6 + 0.4 * Math.min(1, s.climb * 6);
      const len = (1.0 + 2.6 * s.climb) * ground * Math.min(1, burn * 1.4) * flick;
      const wide = 2 * nozzle * (1 + 0.9 * s.climb);
      outer.current?.scale.set(wide, len, wide);
      core.current?.scale.set(2 * nozzle * 0.85, len * 0.42, 2 * nozzle * 0.85);
      outerMat.opacity = 0.55 * Math.min(1, burn * 1.5);
      coreMat.opacity = 0.95 * Math.min(1, burn * 1.5);
      // the flash at ignition, then the glow at the throat
      const flash = Math.exp(-(((tIgn - 0.12) / 0.12) ** 2)) * 1.3;
      if (throat.current) throat.current.scale.setScalar((0.5 + flash) * Math.max(0.2, burn));
      const sk = sparks.current;
      if (sk) {
        sk.visible = !calm;
        if (sk.visible) {
          const D = sparkData;
          for (let i = 0; i < SPARK_N; i++) {
            const ph = (t * 2.6 + i / SPARK_N + ((i * 0.618) % 1) * 0.3) % 1;
            const a = i * 2.399963, spread = nozzle * (0.4 + 1.6 * ph) * (1 + 0.8 * s.climb);
            D.pos[i * 3] = Math.cos(a) * spread * ((i * 0.37) % 1);
            D.pos[i * 3 + 1] = -ph * len * 1.1;
            D.pos[i * 3 + 2] = Math.sin(a) * spread * ((i * 0.37) % 1);
            D.size[i] = size * (0.05 + 0.12 * ph);
            D.alpha[i] = (1 - ph) * (1 - ph) * 0.8 * Math.min(1, burn * 1.5);
          }
          const g = sk.geometry;
          (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          (g.attributes.size as THREE.BufferAttribute).needsUpdate = true;
          (g.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
          sparkMat.uniforms.scale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((22.5 * Math.PI) / 180));
        }
      }
      if (throatMat.current) throatMat.current.opacity = Math.min(1, 0.7 * burn + flash);
    }
    if (flameLight.current) {
      flameLight.current.intensity = 0.5 * burn;
      flameLight.current.distance = size * 6;
      flameLight.current.position.y = (s.stage1 ? BELL1_Y : BELL2_Y) - 0.15;
    }

    // rim light: cyan, from behind the rocket as the camera sees it, so it stands out from the dark
    if (rim.current && rimTarget.current) {
      rimTarget.current.position.copy(s.pos);
      rim.current.position.copy(s.pos).sub(pose.pos).normalize().addScaledVector(pose.up, 0.5).add(s.pos);
    }

    // smoke rolling out from the pad
    const sm = smoke.current;
    if (sm) {
      sm.visible = !calm && tIgn > 0 && tIgn < 6.5 && !s.lost;
      if (sm.visible) {
        const D = smokeData;
        S.x.copy(L.earth).addScaledVector(L.P, EARTH_R);
        for (let i = 0; i < SMOKE_N; i++) {
          const sd = smokeSeeds[i];
          const tau = tIgn - sd.delay;
          if (tau <= 0) { D.alpha[i] = 0; continue; }
          const dist = sd.speed * 1.6 * (1 - Math.exp(-tau / 1.3));
          const ca = Math.cos(sd.a), sa = Math.sin(sd.a);
          S.v.copy(S.x).addScaledVector(L.T, ca * dist).addScaledVector(L.N, sa * dist).addScaledVector(L.P, 0.003 + sd.rise * Math.pow(tau, 0.8));
          D.pos[i * 3] = S.v.x; D.pos[i * 3 + 1] = S.v.y; D.pos[i * 3 + 2] = S.v.z;
          D.size[i] = (0.012 + 0.03 * Math.min(1, tau / 3)) * sd.grow;
          const inA = Math.min(1, tau / 0.25), outA = 1 - Math.min(1, Math.max(0, (tau - 1.8) / 1.8));
          D.alpha[i] = 0.5 * inA * outA;
        }
        const g = sm.geometry;
        (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (g.attributes.size as THREE.BufferAttribute).needsUpdate = true;
        (g.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
        smokeMat.uniforms.scale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((22.5 * Math.PI) / 180));
      }
    }

    // the first stage, once it lets go: it drifts back, falls and tumbles, then fades
    const sp = spent.current;
    if (sp) {
      const age = s.sepAge;
      sp.visible = !s.lost && age >= 0 && age < 2.4;
      if (sp.visible) {
        const travel = s.sepSpeed * age * 0.55;
        sp.position.copy(s.sepPos).addScaledVector(s.sepVel, travel).addScaledVector(s.sepOut, -0.004 * age * age);
        S.x.copy(L.N).negate();
        S.m.makeBasis(S.x, s.sepVel, S.z.crossVectors(S.x, s.sepVel));
        sp.quaternion.setFromRotationMatrix(S.m);
        sp.rotateX(age * 0.9);
        sp.rotateZ(age * 0.5);
        sp.scale.setScalar(size);
        scratchFade.value = Math.max(0, 1 - age / 2.4);
        sp.traverse(S.fadeMesh);
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
    // body names only once the view is wide
    const label = Math.min(1, Math.max(0, (pose.wide - 0.45) / 0.5));
    if (earthSprite.current) earthSprite.current.opacity = label;
    if (moonSprite.current) moonSprite.current.opacity = label;

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
        <Stage1Model />
      </group>

      {/* the rocket: origin at the top of the first stage, nose up its local y */}
      <group ref={rocket}>
        <Stage1Model ref={stage1} />
        <UpperStageModel />
        <group ref={plume}>
          <mesh ref={outer} geometry={plumeGeo} material={outerMat} frustumCulled={false} />
          <mesh ref={core} geometry={coreGeo} material={coreMat} frustumCulled={false} />
          <points ref={sparks} frustumCulled={false} material={sparkMat}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[sparkData.pos, 3]} />
              <bufferAttribute attach="attributes-size" args={[sparkData.size, 1]} />
              <bufferAttribute attach="attributes-alpha" args={[sparkData.alpha, 1]} />
            </bufferGeometry>
          </points>
          <sprite ref={throat}>
            <spriteMaterial ref={throatMat} map={dot} color="#fff1d0" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
        <pointLight ref={flameLight} color="#fbbf24" intensity={0} distance={1} />
      </group>
      <directionalLight ref={rim} color="#22d3ee" intensity={2.4} />
      <object3D ref={rimTarget} />

      <points ref={smoke} visible={false} frustumCulled={false} material={smokeMat}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smokeData.pos, 3]} />
          <bufferAttribute attach="attributes-size" args={[smokeData.size, 1]} />
          <bufferAttribute attach="attributes-alpha" args={[smokeData.alpha, 1]} />
        </bufferGeometry>
      </points>

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

