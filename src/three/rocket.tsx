import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { NOSE, STAGE1, STAGE2 } from "./flightPath";

/**
 * The launch vehicle, drawn in code (no model files): a two-stage rocket one unit long, origin at the
 * top of the first stage, nose up its local y. White body with Rocky's lilac band, dark metal engine bells.
 */

const R = 0.074; // body radius, in rocket lengths
/** Exit plane of each engine bell, where its plume starts. */
export const BELL1_Y = -STAGE1 - 0.065;
export const BELL2_Y = -0.055;

function lathe(points: [number, number][], segments = 40) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** Tangent ogive from the fairing base to the tip. */
function ogive(base: number, length: number, n = 14): [number, number][] {
  const rho = (R * R + length * length) / (2 * R);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = length * (1 - i / n); // distance from the tip
    const r = Math.max(0.0005, Math.sqrt(Math.max(0, rho * rho - (length - x) * (length - x))) + R - rho);
    pts.push([r, base + length - x]);
  }
  return pts;
}

function useMaterials() {
  return useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: "#f4f6fb", metalness: 0.4, roughness: 0.35 }),
    band: new THREE.MeshStandardMaterial({ color: "#a78bfa", metalness: 0.35, roughness: 0.4, emissive: "#2e1065", emissiveIntensity: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: "#2b2f3c", metalness: 0.6, roughness: 0.45 }),
    bell: new THREE.MeshStandardMaterial({ color: "#3a3f4d", metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide }),
    fin: new THREE.MeshStandardMaterial({ color: "#e7e9f3", metalness: 0.4, roughness: 0.38 }),
  }), []);
}

function useFinGeometry() {
  return useMemo(() => {
    // swept fin in the plane (radial, y): root along the skirt, tip trailing down
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.055, -0.045);
    s.lineTo(0.055, -0.1);
    s.lineTo(0, -0.115);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false });
    g.translate(0, 0, -0.003);
    return g;
  }, []);
}

/** First stage: skirt, four fins and its engine bell. Used on the rocket and as the spent stage. */
export const Stage1Model = forwardRef<THREE.Group, { opacity?: THREE.Material }>(function Stage1Model(_, ref) {
  const mat = useMaterials();
  const fin = useFinGeometry();
  const geo = useMemo(() => ({
    body: lathe([[0.05, -STAGE1], [0.084, -STAGE1 + 0.004], [0.084, -STAGE1 + 0.03], [R, -STAGE1 + 0.05], [R, -0.02]]),
    ring: lathe([[R + 0.002, -0.02], [R + 0.002, 0]], 32),
    bell: lathe([[0.03, -STAGE1 + 0.002], [0.036, -STAGE1 - 0.02], [0.058, BELL1_Y - STAGE1 * 0]], 28),
  }), []);
  return (
    <group ref={ref}>
      <mesh geometry={geo.body} material={mat.body} />
      <mesh geometry={geo.ring} material={mat.dark} />
      <mesh geometry={geo.bell} material={mat.bell} />
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[0, (k * Math.PI) / 2 + Math.PI / 4, 0]}>
          <mesh geometry={fin} material={mat.fin} position={[R - 0.004, -STAGE1 + 0.12, 0]} />
        </group>
      ))}
    </group>
  );
});

/** Upper stage and nose, with the lilac band and its own (smaller) engine bell under the interstage. */
export function UpperStageModel() {
  const mat = useMaterials();
  const geo = useMemo(() => ({
    body: lathe([[R, 0], [R, STAGE2 - 0.004], [R + 0.002, STAGE2]]),
    nose: lathe(ogive(STAGE2, NOSE)),
    band: lathe([[R + 0.0015, STAGE2 * 0.42], [R + 0.0015, STAGE2 * 0.62]], 40),
    bell: lathe([[0.022, 0], [0.026, -0.015], [0.044, BELL2_Y]], 28),
  }), []);
  return (
    <group>
      <mesh geometry={geo.body} material={mat.body} />
      <mesh geometry={geo.nose} material={mat.body} />
      <mesh geometry={geo.band} material={mat.band} />
      <mesh geometry={geo.bell} material={mat.bell} />
    </group>
  );
}

/** Soft round sprite for particles, drawn once. */
export function useSoftDot() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (g) {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.45, "rgba(255,255,255,0.55)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

/** Points with a size and an alpha per particle, sizes in world units. */
export function makeParticleMaterial(map: THREE.Texture, color: string, additive: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, color: { value: new THREE.Color(color) }, scale: { value: 500 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float alpha;
      uniform float scale;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, size * scale / max(0.0001, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(color * t.rgb, t.a * vAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

/** Fade along the plume: bright at the nozzle (top of the texture), gone at the far end. */
export function usePlumeFade() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 128;
    const g = c.getContext("2d");
    if (g) {
      const grd = g.createLinearGradient(0, 0, 0, 128);
      // an alpha map reads the green channel, so the fade is drawn in grey, fully opaque
      grd.addColorStop(0, "rgb(255,255,255)");
      grd.addColorStop(0.18, "rgb(200,200,200)");
      grd.addColorStop(0.5, "rgb(80,80,80)");
      grd.addColorStop(1, "rgb(0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 4, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

/** Exhaust layer: additive, no depth write, faded along its length. */
export function makePlumeMaterial(color: string, fade: THREE.Texture, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, alphaMap: fade, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
}

/** Unit flared tube for the plume: radius 0.5 at the nozzle (top, y=0) to 1 at the far end (y=-1). */
export function makePlumeGeometry() {
  const g = new THREE.CylinderGeometry(0.5, 1, 1, 28, 12, true);
  g.translate(0, -0.5, 0);
  return g;
}
