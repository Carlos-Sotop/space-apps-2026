import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Earth, prefersCalm } from "@/scene/bodies";
import { NET_COLOR, NET_CYAN, arcPoints, buildNetwork, type NetNode } from "./network";

/**
 * The SpaceDAO network, in 3D: agencies and companies at their real headquarters on a globe
 * built from NASA maps, the open technologies they published floating above them, the missions
 * on an outer shell, and links where the catalog says two of them are connected. Pulses run
 * along the web, and when the player publishes a design a new node joins: it snaps in, its
 * links draw themselves out to the nodes around it, and it flares.
 *
 * One canvas, instanced nodes, one line object for the whole web and one point cloud for all
 * the pulses, so the scene holds 60 fps on a laptop. It stops rendering when it scrolls out
 * of sight or the tab is hidden, and with prefers-reduced-motion nothing moves: the web is
 * simply there, joined.
 *
 * The 2D card in src/screens/debrief/NetworkPublish.tsx is the fallback where there is no WebGL.
 */

interface Props {
  /** true once the design is published: the new node joins, its links draw and it flares */
  highlight?: boolean;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Overshoots a little before settling, so the node lands with some weight. */
const backOut = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

/** A soft round dot, drawn once and reused by every pulse. */
let dot: THREE.CanvasTexture | null = null;
function dotTexture(): THREE.CanvasTexture | null {
  if (dot) return dot;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.65)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dot = new THREE.CanvasTexture(canvas);
  return dot;
}

/** Seconds since `active` turned true, or -1 while it is false. */
function useSince(active: boolean) {
  const t = useRef(active ? 0 : -1);
  useEffect(() => {
    if (active) t.current = 0;
  }, [active]);
  useFrame((_, dt) => {
    if (t.current >= 0 && t.current < 20) t.current += dt;
  });
  return t;
}

/** The whole web as one line object: 1 draw call for every link, colored per node kind. */
function WebLines({ paths, colors }: { paths: THREE.Vector3[][]; colors: string[] }) {
  const geometry = useMemo(() => {
    const position: number[] = [];
    const color: number[] = [];
    const c = new THREE.Color();
    paths.forEach((points, i) => {
      c.set(colors[i]);
      for (let k = 0; k < points.length - 1; k++) {
        position.push(points[k].x, points[k].y, points[k].z, points[k + 1].x, points[k + 1].y, points[k + 1].z);
        color.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
    return g;
  }, [paths, colors]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/** Every node of the web in one instanced mesh. Two of these draw the core and its glow. */
function NodeField({ nodes, radius, opacity, glow }: { nodes: NetNode[]; radius: number; opacity: number; glow: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    nodes.forEach((n, i) => {
      dummy.position.copy(n.pos);
      // missions read as the biggest members of the web, ground seats as the smallest
      dummy.scale.setScalar(n.kind === "mission" ? 1.5 : n.kind === "tech" ? 1.15 : 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(glow ? NET_COLOR[n.kind] : "#f8fafc"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [nodes, glow]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} frustumCulled={false}>
      <sphereGeometry args={[radius, 10, 10]} />
      <meshBasicMaterial
        transparent
        opacity={opacity}
        toneMapped={false}
        depthWrite={!glow}
        blending={glow ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

/** One point per pulse, all in a single cloud, walked along their paths every frame. */
function Pulses({ paths, color, size = 0.036, speed = 0.16 }: { paths: THREE.Vector3[][]; color?: string; size?: number; speed?: number }) {
  const points = useRef<THREE.Points>(null);
  const texture = useMemo(dotTexture, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(paths.length * 3), 3));
    if (!color) {
      const c = new THREE.Color();
      const rgb: number[] = [];
      paths.forEach((_, i) => {
        c.set(i % 3 === 0 ? NET_COLOR.tech : i % 3 === 1 ? NET_COLOR.company : NET_COLOR.agency);
        rgb.push(c.r, c.g, c.b);
      });
      g.setAttribute("color", new THREE.Float32BufferAttribute(rgb, 3));
    }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    return g;
  }, [paths, color]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const now = clock.elapsedTime;
    paths.forEach((path, i) => {
      // every pulse starts somewhere else along its link, so the web never beats in unison
      const t = (now * (speed + (i % 5) * 0.012) + (i * 0.37) % 1) % 1;
      const p = path[Math.min(path.length - 1, Math.floor(t * path.length))];
      array[i * 3] = p.x;
      array[i * 3 + 1] = p.y;
      array[i * 3 + 2] = p.z;
    });
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={size}
        map={texture}
        color={color}
        vertexColors={!color}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** The links the new node brings, drawn as tubes that grow out of it one after another. */
function JoinLinks({ paths, since, calm }: { paths: THREE.Vector3[][]; since: React.RefObject<number>; calm: boolean }) {
  const tubes = useMemo(
    () =>
      paths.map((points) => {
        const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.009, 6, false);
        const material = new THREE.MeshBasicMaterial({ color: NET_CYAN, transparent: true, opacity: 0.85, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        return mesh;
      }),
    [paths],
  );

  useEffect(
    () => () =>
      tubes.forEach((t) => {
        t.geometry.dispose();
        (t.material as THREE.Material).dispose();
      }),
    [tubes],
  );

  useFrame(() => {
    const t = since.current;
    tubes.forEach((tube, i) => {
      const total = tube.geometry.index?.count ?? 0;
      const grown = t < 0 ? 0 : calm ? 1 : clamp01((t - (0.3 + i * 0.1)) / 0.55);
      tube.visible = grown > 0;
      tube.geometry.setDrawRange(0, Math.round(grown * total));
    });
  });

  return (
    <>
      {tubes.map((tube, i) => (
        <primitive key={i} object={tube} />
      ))}
    </>
  );
}

/** The player's design: a dashed outline while it waits, then a node that snaps in and flares. */
function YouNode({ at, since, calm }: { at: THREE.Vector3; since: React.RefObject<number>; calm: boolean }) {
  const core = useRef<THREE.Group>(null);
  const waiting = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock, camera }) => {
    const t = since.current;
    const joined = t >= 0;
    const age = calm && joined ? 3 : t;

    if (waiting.current) {
      waiting.current.visible = !joined;
      if (waiting.current.visible) {
        const m = waiting.current.material as THREE.MeshBasicMaterial;
        m.opacity = calm ? 0.55 : 0.4 + 0.22 * Math.sin(clock.elapsedTime * 2.2);
        waiting.current.lookAt(camera.position);
      }
    }

    if (core.current) {
      core.current.visible = joined;
      core.current.scale.setScalar(joined ? (calm ? 1 : backOut(clamp01(age / 0.5))) : 0);
    }

    if (flash.current) {
      const life = joined && !calm ? clamp01(age / 0.55) : 1;
      flash.current.visible = joined && life < 1;
      flash.current.scale.setScalar(0.4 + life * 2.6);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = (1 - life) * 0.8;
    }

    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const local = age - (0.1 + i * 0.26);
      const life = joined && !calm && local > 0 ? clamp01(local / 1.5) : 1;
      ring.visible = life < 1;
      if (ring.visible) {
        ring.scale.setScalar(0.2 + life * 3.4);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - life) * 0.55;
        ring.lookAt(camera.position);
      }
    });
  });

  return (
    <group position={at}>
      {/* the empty seat: an outline facing the viewer, the 3D answer to the dashed circle on the 2D card */}
      <mesh ref={waiting}>
        <ringGeometry args={[0.052, 0.064, 40]} />
        <meshBasicMaterial color={NET_CYAN} side={THREE.DoubleSide} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={core}>
        <mesh>
          <sphereGeometry args={[0.055, 18, 14]} />
          <meshBasicMaterial color="#ecfeff" toneMapped={false} />
        </mesh>
        <mesh scale={2.1}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshBasicMaterial color={NET_CYAN} transparent opacity={0.3} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <mesh ref={flash}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshBasicMaterial color={NET_CYAN} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} visible={false}>
          <ringGeometry args={[0.072, 0.082, 48]} />
          <meshBasicMaterial color={NET_CYAN} side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

const SUN = new THREE.Vector3(-0.7, 0.3, 0.65);

function Scene({ highlight = false }: Props) {
  const calm = useMemo(prefersCalm, []);
  const since = useSince(highlight);
  const net = useMemo(buildNetwork, []);

  const paths = useMemo(() => net.links.map((l) => arcPoints(net.nodes[l.a].pos, net.nodes[l.b].pos)), [net]);
  const colors = useMemo(() => net.links.map((l) => l.color), [net]);
  // a pulse on every third link is enough movement to read as traffic, and stays in budget
  const pulsePaths = useMemo(() => paths.filter((_, i) => i % 3 === 0), [paths]);
  const joinPaths = useMemo(() => net.joinsTo.map((i) => arcPoints(net.you, net.nodes[i].pos, 48)), [net]);

  return (
    <>
      <color attach="background" args={["#05060f"]} />
      <PerspectiveCamera makeDefault position={[0, 0.3, 4.2]} fov={42} near={0.1} far={60} rotation={[-0.07, 0, 0]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[-3, 1.5, 3]} intensity={1.4} color="#cbd5ff" />
      <Stars radius={24} depth={12} count={500} factor={1.5} saturation={0} fade speed={calm ? 0 : 0.2} />
      <group rotation={[0.26, 0, 0.07]}>
        {/* barely turning: the pulses carry the motion, and the new node has to stay where it lands */}
        <Earth radius={1} sunDir={SUN} spin={0.01}>
          <WebLines paths={paths} colors={colors} />
          <NodeField nodes={net.nodes} radius={0.019} opacity={1} glow={false} />
          <NodeField nodes={net.nodes} radius={0.05} opacity={0.3} glow />
          {!calm && <Pulses paths={pulsePaths} />}
          <JoinLinks paths={joinPaths} since={since} calm={calm} />
          {highlight && !calm && <Pulses paths={joinPaths} color={NET_CYAN} size={0.05} speed={0.3} />}
          <YouNode at={net.you} since={since} calm={calm} />
        </Earth>
      </group>
    </>
  );
}

/**
 * `<NetworkPulse highlight />` — the network scene, sized by its parent. Lazy-load it and keep
 * the 2D card as the fallback: see NetworkPublish.tsx.
 */
export function NetworkPulse({ highlight = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(true);

  // nothing renders while the card is off-screen or the tab is in the background
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let seen = true;
    const sync = () => setLive(seen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={box} className="h-full w-full">
      <Canvas
        frameloop={live ? "always" : "never"}
        dpr={[1, 1.6]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        aria-label={highlight ? "Your design joined the SpaceDAO network" : "The SpaceDAO network of agencies, companies, open technologies and missions"}
      >
        <Suspense fallback={null}>
          <Scene highlight={highlight} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default NetworkPulse;
