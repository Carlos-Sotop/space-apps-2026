import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useLoader } from "@react-three/fiber";
import { staticFile, useCurrentFrame } from "remotion";
import { keys, ramp } from "./components";

type Site = { name: string; lat: number; lon: number; kind: "launch" | "dsn" };
export const SITES: Site[] = [
  { name: "Kennedy", lat: 28.57, lon: -80.65, kind: "launch" },
  { name: "Vandenberg", lat: 34.63, lon: -120.61, kind: "launch" },
  { name: "Kourou", lat: 5.24, lon: -52.77, kind: "launch" },
  { name: "Sriharikota", lat: 13.72, lon: 80.23, kind: "launch" },
  { name: "Tanegashima", lat: 30.4, lon: 130.97, kind: "launch" },
  { name: "Naro", lat: 34.43, lon: 127.53, kind: "launch" },
  { name: "Alcantara", lat: -2.37, lon: -44.4, kind: "launch" },
  { name: "Mahia", lat: -39.26, lon: 177.86, kind: "launch" },
  { name: "Andoya", lat: 69.29, lon: 16.02, kind: "launch" },
  { name: "Goldstone", lat: 35.43, lon: -116.89, kind: "dsn" },
  { name: "Madrid", lat: 40.43, lon: -4.25, kind: "dsn" },
  { name: "Canberra", lat: -35.4, lon: 148.98, kind: "dsn" },
];

const idx = (n: string) => SITES.findIndex((s) => s.name === n);
// launch site rises to a deep space network complex
const RISE: [string, string][] = [
  ["Kennedy", "Madrid"], ["Sriharikota", "Canberra"], ["Tanegashima", "Goldstone"], ["Kourou", "Goldstone"],
  ["Vandenberg", "Canberra"], ["Andoya", "Madrid"], ["Alcantara", "Madrid"], ["Naro", "Canberra"], ["Mahia", "Goldstone"],
];
const KEEP = new Set([0, 1, 2]); // isolated pairs that survive into the treaty scene

const toVec = (lat: number, lon: number, r = 1) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
};

const arcCurve = (a: THREE.Vector3, b: THREE.Vector3, lift: number) => {
  const w = Math.acos(Math.min(1, a.clone().normalize().dot(b.clone().normalize())));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const p = a.clone().multiplyScalar(Math.sin((1 - t) * w)).add(b.clone().multiplyScalar(Math.sin(t * w))).divideScalar(Math.sin(w));
    p.normalize().multiplyScalar(1.006 + Math.pow(Math.sin(Math.PI * t), 0.85) * lift * (0.12 + (0.45 * w) / Math.PI));
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
};

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------------- materials ----------------
const arcMaterial = (a: [number, number, number], b: [number, number, number]) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uHead: { value: 0 }, uTail: { value: 0 }, uAlpha: { value: 1 }, uPulse: { value: -1 }, uPulseAmt: { value: 0 },
      uColA: { value: new THREE.Vector3(...a) }, uColB: { value: new THREE.Vector3(...b) },
    },
    vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying float vU; uniform float uHead,uTail,uAlpha,uPulse,uPulseAmt; uniform vec3 uColA,uColB;
      void main(){
        if (vU > uHead || vU < uTail) discard;
        float headGlow = exp(-(uHead - vU) * 14.0);
        float tailFade = smoothstep(uTail, uTail + 0.12, vU);
        float p = exp(-pow((vU - uPulse) * 20.0, 2.0)) * uPulseAmt;
        vec3 col = mix(uColA, uColB, vU);
        float a = uAlpha * tailFade * (0.5 + 0.6 * headGlow + p * 1.6);
        gl_FragColor = vec4(col * (1.0 + p * 2.2 + headGlow * 1.2), a);
      }`,
  });

const earthMaterial = (day: THREE.Texture, night: THREE.Texture) =>
  new THREE.ShaderMaterial({
    uniforms: { uDay: { value: day }, uNight: { value: night }, uDim: { value: 1 }, uSun: { value: new THREE.Vector3(-0.55, 0.3, 0.8).normalize() } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vVN;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vVN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D uDay, uNight; uniform float uDim; uniform vec3 uSun;
      varying vec2 vUv; varying vec3 vN; varying vec3 vVN;
      void main(){
        vec3 day = texture2D(uDay, vUv).rgb; vec3 night = texture2D(uNight, vUv).rgb;
        float l = dot(normalize(vN), uSun);
        float k = smoothstep(-0.18, 0.28, l);
        day = pow(day, vec3(1.15)) * vec3(0.78, 0.92, 1.12) * (0.25 + 0.95 * max(l, 0.0));
        vec3 nl = night * vec3(1.25, 0.95, 0.7) * 1.7;
        vec3 deep = vec3(0.012, 0.018, 0.05);
        vec3 col = mix(deep + nl, day + deep, k);
        float rim = pow(1.0 - max(dot(normalize(vVN), vec3(0.0,0.0,1.0)), 0.0), 2.6);
        col += vec3(0.30, 0.45, 1.0) * rim * 0.4;
        gl_FragColor = vec4(col * uDim, 1.0);
      }`,
  });

const atmoMaterial = (scale: number) =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 1 }, uScale: { value: scale } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vN; uniform float uK;
      void main(){ float i = pow(max(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 3.2) * 0.7 * uK;
        vec3 c = mix(vec3(0.5,0.42,1.0), vec3(0.42,0.62,1.0), clamp(i * 1.5, 0.0, 1.0));
        gl_FragColor = vec4(c * i, i); }`,
  });

// ---------------- pieces ----------------
const LILAC: [number, number, number] = [0.65, 0.54, 0.98];
const CYAN: [number, number, number] = [0.13, 0.83, 0.93];
const WHITE: [number, number, number] = [0.9, 0.92, 1.0];

type ArcState = { head: number; tail: number; alpha: number; pulse?: number; pulseAmt?: number };
const Arc: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial; s: ArcState }> = ({ geo, mat, s }) => {
  const u = mat.uniforms;
  u.uHead.value = s.head;
  u.uTail.value = s.tail;
  u.uAlpha.value = s.alpha;
  u.uPulse.value = s.pulse ?? -1;
  u.uPulseAmt.value = s.pulseAmt ?? 0;
  return <mesh geometry={geo} material={mat} visible={s.alpha > 0.001 && s.head > s.tail} />;
};

const Marker: React.FC<{ pos: THREE.Vector3; color: string; appear: number; ring?: boolean; size?: number }> = ({ pos, color, appear, size = 1 }) => {
  const f = useCurrentFrame();
  const s = ramp(f, appear, appear + 14, 0, 1);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  const ph = ((f - appear) % 54) / 54;
  return (
    <group position={pos.clone().multiplyScalar(1.004)} quaternion={q} visible={s > 0.001}>
      <mesh scale={s * size}>
        <circleGeometry args={[0.012, 20]} />
        <meshBasicMaterial color={"#ffffff"} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={s * size * 2.6}>
        <circleGeometry args={[0.012, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {f > appear + 8 && (
        <mesh scale={size * (1 + ph * 4.5)}>
          <ringGeometry args={[0.0125, 0.015, 32]} />
          <meshBasicMaterial color={color} transparent opacity={(1 - ph) * 0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

const Stars: React.FC = () => {
  const f = useCurrentFrame();
  const geo = useMemo(() => {
    const n = 1400;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = hash(i) * 2 - 1, t = hash(i + 999) * Math.PI * 2, r = Math.sqrt(1 - u * u);
      p.set([r * Math.cos(t) * 40, u * 40, r * Math.sin(t) * 40], i * 3);
      const b = 0.35 + hash(i + 55) * 0.65, tint = hash(i + 7);
      c.set([b * (0.8 + tint * 0.2), b * 0.85, b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} rotation={[0, f * 0.0004, 0]}>
      <pointsMaterial size={2.2} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  );
};

// ---------------- scene ----------------
const Scene: React.FC<{ tl?: (f: number) => number }> = ({ tl }) => {
  const raw = useCurrentFrame();
  const f = tl ? tl(raw) : raw;
  const [dayTex, nightTex] = useLoader(THREE.TextureLoader, [staticFile("textures/earth_day_2k.jpg"), staticFile("textures/earth_night_2k.jpg")]);
  const earth = useMemo(() => {
    for (const t of [dayTex, nightTex]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 8;
    }
    return earthMaterial(dayTex, nightTex);
  }, [dayTex, nightTex]);
  const atmo = useMemo(() => atmoMaterial(1.14), []);
  const atmoWide = useMemo(() => atmoMaterial(1.3), []);

  const sites = useMemo(() => SITES.map((s) => toVec(s.lat, s.lon)), []);

  const rise = useMemo(
    () =>
      RISE.map(([a, b]) => {
        const geo = new THREE.TubeGeometry(arcCurve(sites[idx(a)], sites[idx(b)], 1.25), 96, 0.0034, 4, false);
        return { geo, mat: arcMaterial(CYAN, LILAC) };
      }),
    [sites],
  );

  const links = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial; order: number; seed: number }[] = [];
    let n = 0;
    for (let i = 0; i < SITES.length; i++)
      for (let j = i + 1; j < SITES.length; j++) {
        out.push({
          geo: new THREE.TubeGeometry(arcCurve(sites[i], sites[j], 0.55), 80, 0.0028, 4, false),
          mat: arcMaterial(n % 3 === 0 ? CYAN : LILAC, n % 3 === 1 ? WHITE : n % 2 ? CYAN : LILAC),
          order: hash(n * 3.3), seed: hash(n + 17),
        });
        n++;
      }
    return out;
  }, [sites]);

  const ring = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return { curve, geo: new THREE.TubeGeometry(curve, 200, 0.0042, 4, false), mat: arcMaterial(LILAC, CYAN) };
  }, []);

  // --- timeline ---
  const rot = -1.2 + raw * 0.0036;
  const scale = keys(f, [[0, 0.8], [300, 0.96], [450, 0.9], [494, 2.15], [830, 2.15], [866, 2.15]]);
  const posY = keys(f, [[0, 0], [450, 0], [494, -2.62], [830, -2.62], [866, -3.35]]);
  const dim = keys(f, [[0, 1], [200, 1], [226, 0.5], [296, 0.5], [310, 1.1], [340, 1]]);
  earth.uniforms.uDim.value = dim;
  const burst = 1 + ramp(f, 300, 304, 0, 1.6) * ramp(f, 304, 360, 1, 0) + ramp(f, 840, 844, 0, 0.7) * ramp(f, 844, 900, 1, 0);
  const atmoK = keys(f, [[0, 0.5], [60, 1], [210, 1], [226, 0.5], [296, 0.5], [310, 1]]) * burst;
  atmo.uniforms.uK.value = atmoK;
  atmoWide.uniforms.uK.value = atmoK * 0.25;

  const netAlpha = keys(f, [[450, 1], [494, 0.4], [830, 0.35], [866, 0.45]]);
  const markerVis = f < 450 ? 1 : 1;

  return (
    <>
      <Stars />
      <group position={[0, posY, 0]} scale={scale} rotation={[0.36, 0, 0.16]}>
        <group rotation={[0, rot, 0]}>
          <mesh material={earth}>
            <sphereGeometry args={[1, 96, 64]} />
          </mesh>
          {SITES.map((s, i) => (
            <Marker key={s.name} pos={sites[i]} color={s.kind === "dsn" ? "#a78bfa" : "#22d3ee"} appear={s.kind === "dsn" ? 146 + (i - 9) * 7 : 126 + i * 8} size={markerVis} />
          ))}
          {rise.map((r, i) => {
            const start = 128 + i * 8;
            const head = ramp(f, start, start + 38);
            const kept = KEEP.has(i);
            const tail = kept ? ramp(f, 268, 296) : ramp(f, 214 + i * 3, 238 + i * 3);
            const flick = kept && f >= 214 && f < 296 ? (hash(Math.floor(f / 2) + i * 13) > 0.38 ? 1 : 0.18) : 1;
            const alpha = f >= 300 ? 0 : 0.9 * flick;
            return <Arc key={i} geo={r.geo} mat={r.mat} s={{ head, tail, alpha }} />;
          })}
          {links.map((l, i) => {
            const start = 304 + l.order * 46;
            const head = ramp(f, start, start + 34);
            const grow = f < 450 ? 0.85 : 1;
            const pulse = (((f - 350) * 0.012 + l.seed) % 1 + 1) % 1;
            return <Arc key={i} geo={l.geo} mat={l.mat} s={{ head, tail: 0, alpha: grow * netAlpha, pulse, pulseAmt: ramp(f, 350, 372) }} />;
          })}
        </group>
      </group>
      <group position={[0, posY, 0]} scale={scale} rotation={[0.36, 0, 0.16]}>
        <mesh material={atmo} scale={1.07}>
          <sphereGeometry args={[1, 64, 48]} />
        </mesh>
        <mesh material={atmoWide} scale={1.16}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
      </group>
      <group position={[0, posY, 0]} scale={scale} rotation={[1.1, 0, 0.42]}>
        <Arc geo={ring.geo} mat={ring.mat} s={{ head: ramp(f, 372, 420), tail: 0, alpha: 0.85 * keys(f, [[450, 1], [494, 0.5], [830, 0.4], [866, 0.5]]), pulse: (((f - 400) * 0.006) % 1 + 1) % 1, pulseAmt: ramp(f, 410, 430) }} />
        {f > 400 && (
          <mesh position={ring.curve.getPoint((((f - 400) * 0.0035) % 1 + 1) % 1)}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )}
      </group>
    </>
  );
};

// tl maps the composition frame to the timeline frame (used by longer cuts to hold a state)
export const Globe: React.FC<{ tl?: (f: number) => number }> = ({ tl }) => (
  <ThreeCanvas width={1920} height={1080} camera={{ fov: 35, position: [0, 0, 4.2], near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
    <Scene tl={tl} />
  </ThreeCanvas>
);
