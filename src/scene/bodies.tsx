import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/** NASA public-domain maps, see public/textures/CREDITS.md */
export const TEX = {
  earthDay: "/textures/earth_day_2k.jpg",
  earthNight: "/textures/earth_night_2k.jpg",
  earthClouds: "/textures/earth_clouds_1k.png",
  earthOcean: "/textures/earth_ocean_1k.jpg",
  moonColor: "/textures/moon_lroc_2k.jpg",
  moonHeight: "/textures/moon_ldem_1k.jpg",
};

export const prefersCalm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** lat/lon in degrees → point on a sphere of radius r (y up, lon 0 facing +z) */
export function latLon(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D oceanMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 s = normalize(sunDir);
    vec3 v = normalize(cameraPosition - vPosW);
    float d = dot(n, s);
    float day = smoothstep(-0.18, 0.22, d);
    vec3 dayCol = texture2D(dayMap, vUv).rgb * (0.18 + 1.05 * max(d, 0.0));
    vec3 nightCol = texture2D(nightMap, vUv).rgb * vec3(1.0, 0.78, 0.5) * 2.2;
    vec3 col = mix(nightCol, dayCol, day);
    float ocean = texture2D(oceanMap, vUv).r;
    vec3 h = normalize(s + v);
    col += vec3(0.65, 0.8, 1.0) * pow(max(dot(n, h), 0.0), 90.0) * ocean * day * 0.35;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    col += vec3(0.32, 0.6, 1.0) * fres * (0.12 + 0.85 * smoothstep(-0.3, 0.4, d));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmoFrag = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 color;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - abs(dot(n, v)), 4.5);
    float lit = 0.25 + 0.75 * smoothstep(-0.35, 0.5, dot(n, normalize(sunDir)));
    gl_FragColor = vec4(color * rim * lit * 1.3, rim * lit * 0.8);
    #include <colorspace_fragment>
  }
`;

interface EarthProps {
  radius?: number;
  sunDir?: THREE.Vector3;
  spin?: number;
  children?: React.ReactNode;
}

/** Earth with a day/night terminator, city lights, ocean glint, clouds and an atmosphere rim. */
export function Earth({ radius = 1, sunDir = new THREE.Vector3(-1, 0.25, 0.6), spin = 0.02, children }: EarthProps) {
  const [day, night, clouds, ocean] = useTexture([TEX.earthDay, TEX.earthNight, TEX.earthClouds, TEX.earthOcean]);
  useMemo(() => {
    for (const t of [day, night, clouds]) t.colorSpace = THREE.SRGBColorSpace;
    for (const t of [day, night, clouds, ocean]) t.anisotropy = 8;
  }, [day, night, clouds, ocean]);
  const group = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  const uniforms = useMemo(() => ({ dayMap: { value: day }, nightMap: { value: night }, oceanMap: { value: ocean }, sunDir: { value: sunDir.clone() } }), [day, night, ocean, sunDir]);
  const atmo = useMemo(() => ({ sunDir: { value: sunDir.clone() }, color: { value: new THREE.Color("#5b8cff") } }), [sunDir]);

  useFrame((_, dt) => {
    if (calm) return;
    if (group.current) group.current.rotation.y += dt * spin;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * spin * 0.35;
  });

  return (
    <group>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[radius, 96, 96]} />
          <shaderMaterial vertexShader={earthVert} fragmentShader={earthFrag} uniforms={uniforms} />
        </mesh>
        <mesh ref={cloudRef} scale={1.012}>
          <sphereGeometry args={[radius, 72, 72]} />
          <meshStandardMaterial map={clouds} alphaMap={clouds} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        {children}
      </group>
      <mesh scale={1.045}>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial vertexShader={earthVert} fragmentShader={atmoFrag} uniforms={atmo} side={THREE.BackSide} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** The Moon from LRO color and LOLA elevation (bump). */
export function Moon({ radius = 0.27, spin = 0.01 }: { radius?: number; spin?: number }) {
  const [color, height] = useTexture([TEX.moonColor, TEX.moonHeight]);
  useMemo(() => { color.colorSpace = THREE.SRGBColorSpace; color.anisotropy = 8; }, [color]);
  const ref = useRef<THREE.Mesh>(null);
  const calm = useMemo(prefersCalm, []);
  useFrame((_, dt) => { if (!calm && ref.current) ref.current.rotation.y += dt * spin; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 96, 96]} />
      <meshStandardMaterial map={color} bumpMap={height} bumpScale={2.2} roughness={1} metalness={0} />
    </mesh>
  );
}
