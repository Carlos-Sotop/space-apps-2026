import * as THREE from "three";

/**
 * Moon map drawn in code: grey plains, dark maria and craters, plus a matching height map
 * so the craters catch the light as real relief. No image files, nothing to download.
 * The pattern is seeded, so the Moon looks the same in every run and in the demo video.
 */
const W = 1024, H = 512;

/** Small deterministic generator, so craters land in the same places every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

interface Crater { x: number; y: number; r: number }

function craters(): Crater[] {
  const r = rng(20261115);
  const out: Crater[] = [];
  // a few large basins, then many small pits
  for (let i = 0; i < 16; i++) out.push({ x: r() * W, y: 40 + r() * (H - 80), r: 18 + r() * 34 });
  for (let i = 0; i < 180; i++) out.push({ x: r() * W, y: r() * H, r: 3 + r() * 11 });
  return out;
}

function draw(colour: boolean, list: Crater[]): HTMLCanvasElement | null {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  const r = rng(7);

  // base: grey regolith for the colour map, mid grey for the height map
  g.fillStyle = colour ? "#9fa4b4" : "#808080";
  g.fillRect(0, 0, W, H);

  if (colour) {
    // maria: the dark plains
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = 80 + r() * (H - 160), rad = 40 + r() * 90;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, "rgba(96,102,122,0.75)");
      grad.addColorStop(1, "rgba(96,102,122,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    // fine speckle
    for (let i = 0; i < 2600; i++) {
      const v = 140 + Math.floor(r() * 70);
      g.fillStyle = `rgba(${v},${v + 4},${v + 14},0.16)`;
      g.beginPath();
      g.arc(r() * W, r() * H, 1 + r() * 3.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  for (const { x, y, r: rad } of list) {
    if (colour) {
      // floor darker than the plain, rim a little brighter, sun from the left
      const floor = g.createRadialGradient(x, y, 0, x, y, rad);
      floor.addColorStop(0, "rgba(104,109,128,0.9)");
      floor.addColorStop(0.75, "rgba(120,126,146,0.6)");
      floor.addColorStop(1, "rgba(180,186,202,0)");
      g.fillStyle = floor;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(208,214,230,0.5)";
      g.lineWidth = Math.max(1, rad * 0.12);
      g.beginPath();
      g.arc(x, y, rad * 0.94, 0, Math.PI * 2);
      g.stroke();
    } else {
      // height: a dip with a raised rim
      g.strokeStyle = "rgba(255,255,255,0.85)";
      g.lineWidth = Math.max(1.5, rad * 0.22);
      g.beginPath();
      g.arc(x, y, rad * 0.95, 0, Math.PI * 2);
      g.stroke();
      const pit = g.createRadialGradient(x, y, 0, x, y, rad * 0.9);
      pit.addColorStop(0, "rgba(0,0,0,0.9)");
      pit.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = pit;
      g.beginPath();
      g.arc(x, y, rad * 0.9, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

let cached: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;

/** Colour map and height map for the Moon, built once and reused. */
export function moonTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null {
  if (cached) return cached;
  const list = craters();
  const colour = draw(true, list);
  const height = draw(false, list);
  if (!colour || !height) return null;
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(height);
  cached = { map, bump };
  return cached;
}
