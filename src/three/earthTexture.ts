import * as THREE from "three";

/**
 * Earth map drawn in code: no image files, nothing to download, no licence to track.
 * Coastlines are simplified outlines in degrees [longitude, latitude], traced as one
 * closed loop per landmass, so the planet reads as Earth at the size it is shown.
 */
type Ring = [number, number][];

const AFRICA: Ring = [[-17,21],[-16,14],[-13,9],[-8,5],[-2,5],[3,6],[9,4],[9,2],[13,-5],[12,-16],[15,-22],[18,-29],[20,-35],[25,-34],[32,-26],[35,-20],[40,-15],[41,-10],[40,-3],[42,2],[45,8],[51,12],[48,13],[43,12],[38,16],[36,22],[34,28],[32,31],[25,32],[18,30],[10,34],[3,36],[-2,35],[-6,36],[-9,33],[-13,27]];
const EURASIA: Ring = [[-6,36],[-9,39],[-9,43],[-2,44],[0,48],[-4,48],[-1,50],[3,51],[4,53],[7,54],[9,57],[10,58],[12,56],[18,56],[21,57],[24,58],[28,60],[30,60],[22,65],[25,71],[33,70],[40,67],[45,68],[55,69],[65,71],[72,73],[80,74],[90,76],[100,77],[110,76],[120,73],[130,71],[140,72],[150,70],[160,69],[170,68],[179,66],[172,62],[163,57],[158,52],[155,57],[148,59],[142,54],[135,54],[131,44],[127,39],[122,39],[119,35],[122,31],[118,24],[110,21],[106,19],[108,11],[103,1],[98,8],[94,16],[90,22],[87,21],[81,16],[77,8],[73,16],[70,21],[67,24],[62,25],[57,25],[57,22],[52,17],[48,13],[43,12],[39,20],[35,28],[34,31],[36,36],[30,36],[26,38],[23,37],[19,40],[16,38],[13,38],[12,44],[8,44],[4,43],[0,42],[-2,37]];
const N_AMERICA: Ring = [[-168,66],[-162,70],[-156,71],[-148,70],[-140,70],[-130,70],[-125,72],[-115,69],[-105,68],[-95,68],[-85,67],[-80,73],[-75,78],[-68,70],[-64,61],[-78,62],[-80,55],[-78,52],[-70,48],[-66,44],[-70,43],[-74,40],[-76,35],[-81,31],[-80,25],[-83,28],[-87,30],[-90,29],[-94,29],[-97,26],[-105,22],[-110,24],[-114,31],[-117,33],[-122,37],[-124,42],[-124,48],[-131,54],[-136,58],[-145,60],[-152,59],[-158,56],[-165,60]];
const C_AMERICA: Ring = [[-97,16],[-92,15],[-88,16],[-84,10],[-78,9],[-80,12],[-86,14],[-90,17],[-94,19]];
const S_AMERICA: Ring = [[-78,8],[-72,12],[-66,11],[-60,8],[-52,5],[-50,0],[-44,-2],[-38,-5],[-35,-8],[-39,-13],[-39,-18],[-43,-23],[-48,-25],[-53,-34],[-57,-38],[-62,-39],[-65,-45],[-68,-50],[-70,-55],[-74,-52],[-74,-45],[-73,-37],[-71,-30],[-70,-23],[-70,-18],[-76,-14],[-81,-6],[-80,-2],[-78,1],[-77,5]];
const AUSTRALIA: Ring = [[113,-22],[114,-26],[118,-34],[125,-32],[132,-32],[137,-33],[140,-38],[146,-39],[150,-37],[153,-28],[153,-25],[148,-20],[145,-15],[142,-11],[136,-12],[130,-12],[127,-14],[122,-17],[117,-20]];
const GREENLAND: Ring = [[-45,60],[-50,62],[-53,67],[-55,70],[-60,76],[-65,80],[-55,83],[-35,83],[-22,80],[-20,75],[-25,70],[-35,66],[-42,61]];
const MADAGASCAR: Ring = [[44,-12],[50,-15],[50,-25],[45,-25],[43,-20]];
const JAPAN: Ring = [[130,31],[132,34],[136,35],[140,38],[141,41],[145,44],[142,45],[139,40],[136,37],[133,34]];
const BRITAIN: Ring = [[-5,50],[-2,51],[1,52],[0,54],[-1,56],[-3,58],[-5,57],[-6,55],[-5,53]];
const NEW_ZEALAND: Ring = [[172,-34],[175,-37],[178,-38],[176,-41],[172,-41],[170,-44],[167,-46],[168,-47],[172,-44],[174,-41]];
const BORNEO: Ring = [[109,2],[117,4],[119,0],[116,-4],[110,-3]];
const NEW_GUINEA: Ring = [[131,-1],[141,-3],[147,-6],[150,-10],[141,-9],[134,-8]];

const LAND: Ring[] = [AFRICA, EURASIA, N_AMERICA, C_AMERICA, S_AMERICA, AUSTRALIA, GREENLAND, MADAGASCAR, JAPAN, BRITAIN, NEW_ZEALAND, BORNEO, NEW_GUINEA];

/** Dry regions painted over the land only, as [lon0, lat0, lon1, lat1]. */
const DRY: [number, number, number, number][] = [[-17,14,35,31],[34,12,60,32],[60,20,78,32],[115,-32,146,-19],[-72,-30,-66,-18],[11,-28,25,-17]];

const W = 2048, H = 1024;
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

function ring(g: CanvasRenderingContext2D, r: Ring) {
  g.beginPath();
  r.forEach(([lon, lat], i) => (i ? g.lineTo(px(lon), py(lat)) : g.moveTo(px(lon), py(lat))));
  g.closePath();
  g.fill();
}

/** Equirectangular Earth map on a canvas, built once and reused. */
let cached: THREE.CanvasTexture | null = null;

export function earthTexture(): THREE.CanvasTexture | null {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) return null;

  // 1. land on a transparent canvas
  g.fillStyle = "#2f6b40";
  LAND.forEach((r) => ring(g, r));

  // 2. tint dry regions and ice, over land only
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(150,126,74,0.75)";
  DRY.forEach(([a, b, c, d]) => g.fillRect(px(a), py(d), px(c) - px(a), py(b) - py(d)));
  g.fillStyle = "rgba(226,236,245,0.85)";
  g.fillRect(0, 0, W, py(72));
  g.fillRect(0, py(-62), W, H - py(-62));
  // a little green-to-brown variation so the land is not flat
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = 2 + Math.random() * 9;
    g.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${100 + Math.random() * 50 | 0},60,0.1)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // 3. ocean behind everything
  g.globalCompositeOperation = "destination-over";
  const sea = g.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, "#0a2d63");
  sea.addColorStop(0.5, "#14509b");
  sea.addColorStop(1, "#0a2d63");
  g.fillStyle = sea;
  g.fillRect(0, 0, W, H);

  // 4. polar ice over the sea as well
  g.globalCompositeOperation = "source-over";
  const north = g.createLinearGradient(0, 0, 0, py(66));
  north.addColorStop(0, "rgba(232,241,250,0.95)");
  north.addColorStop(1, "rgba(232,241,250,0)");
  g.fillStyle = north;
  g.fillRect(0, 0, W, py(66));
  const south = g.createLinearGradient(0, H, 0, py(-60));
  south.addColorStop(0, "rgba(240,247,255,0.98)");
  south.addColorStop(1, "rgba(240,247,255,0)");
  g.fillStyle = south;
  g.fillRect(0, py(-60), W, H - py(-60));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cached = tex;
  return tex;
}
