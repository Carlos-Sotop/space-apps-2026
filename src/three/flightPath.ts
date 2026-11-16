import * as THREE from "three";
import type { FlightPhaseId } from "@/engine/types";
import { endProgress, type Timeline } from "@/screens/flightTimeline";

/**
 * The flight as pure math: where the rocket is, where it points, whether the engine burns and where
 * the camera stands, for any flight progress p. No React, no clock, no state: the game reads it every
 * frame from a ref, the video reads it from the frame number, and both get the same picture.
 *
 * One rule runs through it (Dayon's brief): everything turns the same way. The rocket climbs east,
 * the way the Earth turns, the orbit and the trip to the Moon keep that sense, and the camera always
 * stays on the same side of the orbit plane, so nothing on screen ever reverses.
 *
 * Units: Earth radius = 1. Distances, sizes and the Moon are NOT to scale (the screen says so).
 */

export const EARTH_R = 1;
export const LEO_R = 1.35;
export const MOON_R = 0.3;
export const EARTH_C = new THREE.Vector3(0, 0, 0);
export const LUNAR_EARTH_C = new THREE.Vector3(-4.3, -0.4, 0);
export const MOON_C = new THREE.Vector3(4.3, 0.5, 0);
/** The game plays the whole flight in this many seconds at 1x (Flight.tsx). */
export const FLIGHT_SECONDS = 24;

/** Rocket model, in rocket lengths. The path follows the top of the first stage, which hangs below it. */
export const STAGE1 = 0.5;
export const STAGE2 = 0.3;
export const NOSE = 0.2;

const DEG = Math.PI / 180;
/** Earth turns this much per unit of flight progress: slow, so it reads as a planet and not a toy. */
const EARTH_SPIN = 0.3;
/** Downrange angle of the climb, liftoff to orbit. */
const CLIMB_ARC = 0.6;
/** Coast in the parking orbit before the burn to the Moon. */
const LUNAR_COAST = 7 * DEG;
/** Rocket length in the close-up on the pad, in Earth radii. */
const PAD_SIZE = 0.05;
const Y = new THREE.Vector3(0, 1, 0);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const between = (x: number, a: number, b: number) => (b > a ? clamp01((x - a) / (b - a)) : x >= b ? 1 : 0);

/** Unit vector at a latitude and an azimuth about +y, measured from +z towards +x. */
function dirAz(lat: number, az: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(lat) * Math.sin(az), Math.sin(lat), Math.cos(lat) * Math.cos(az));
}
/** Azimuth of a longitude on the Earth texture: three.js puts longitude 0 on +x and 90 W on +z. */
const lonAz = (lonDeg: number) => Math.atan2(Math.cos(lonDeg * DEG), -Math.sin(lonDeg * DEG));
/** v rotated by angle a about the unit axis n, for v perpendicular to n. */
const turn = (v: THREE.Vector3, n: THREE.Vector3, a: number, out: THREE.Vector3) => {
  const c = Math.cos(a), s = Math.sin(a);
  return out.crossVectors(n, v).multiplyScalar(s).addScaledVector(v, c);
};

export interface Layout {
  lunar: boolean;
  earth: THREE.Vector3;
  /** unit, towards the Sun (the key light) */
  sun: THREE.Vector3;
  /** pad direction from the Earth's centre at liftoff */
  P: THREE.Vector3;
  /** prograde horizontal at the pad: downrange, east-going */
  T: THREE.Vector3;
  /** orbit normal (right hand: P x T); the camera always stays on its negative side */
  N: THREE.Vector3;
  /** Earth rotation about +y at liftoff, so the pad on the texture sits right under P */
  spinAtLift: number;
  /** lunar: direction from the Earth's centre where the burn to the Moon starts */
  tliDir: THREE.Vector3;
  /** lunar: angle from the pad to that point */
  tliArc: number;
  /** lunar: landing site direction from the Moon's centre (its south pole) */
  landDir: THREE.Vector3;
}

export function buildLayout(lunar: boolean): Layout {
  if (!lunar) {
    // Kennedy Space Center, 28.57 N 80.65 W, launching north-east at about 45 degrees like a station flight
    const lat = 28.57 * DEG, az = -20 * DEG;
    const P = dirAz(lat, az);
    const east = new THREE.Vector3().crossVectors(Y, P).normalize();
    const north = new THREE.Vector3().crossVectors(P, east).normalize();
    const T = north.multiplyScalar(Math.cos(45 * DEG)).addScaledVector(east, Math.sin(45 * DEG)).normalize();
    const N = new THREE.Vector3().crossVectors(P, T).normalize();
    return { lunar, earth: EARTH_C.clone(), sun: new THREE.Vector3(6, 3, 6).normalize(), P, T, N, spinAtLift: az - lonAz(-80.65), tliDir: P.clone(), tliArc: 0, landDir: Y.clone().negate() };
  }
  // The plane holds the Earth and the Moon, so the trip is one flat arc. The burn starts where the
  // prograde direction points a little above the Moon, which makes the arc an even curve.
  const earth = LUNAR_EARTH_C.clone();
  const D = MOON_C.clone().sub(earth).normalize();
  const N = new THREE.Vector3(-0.0576, 0.551, -0.833).projectOnPlane(D).normalize();
  const U = new THREE.Vector3().crossVectors(D, N); // where prograde points straight at the Moon
  // Sriharikota (13.72 N, 80.23 E), one of the council's own spaceports, on the plane: solve for how far
  // back from U along the orbit it sits.
  const lat = 13.72 * DEG;
  const R = Math.hypot(U.y, D.y), phi0 = Math.atan2(D.y, U.y);
  const back = Math.acos(Math.min(1, Math.sin(lat) / R)) - phi0;
  const P = turn(U, N, -back, new THREE.Vector3()).normalize();
  const T = new THREE.Vector3().crossVectors(N, P).normalize();
  const tliArc = CLIMB_ARC + LUNAR_COAST;
  const tliDir = turn(P, N, tliArc, new THREE.Vector3()).normalize();
  const b = 35 * DEG;
  const landDir = D.clone().multiplyScalar(-Math.cos(b)).addScaledVector(U, Math.sin(b)).normalize();
  const az = Math.atan2(P.x, P.z);
  return { lunar, earth, sun: new THREE.Vector3(-0.5, 0.35, 0.8).normalize(), P, T, N, spinAtLift: az - lonAz(80.23), tliDir, tliArc, landDir };
}

/** Progress marks along the flight, from the mission's own timeline. */
export interface Marks {
  lift: number; sep: number; relight: number; orbit: number;
  t0: number; t1: number; r0: number; r1: number; ops: number; end: number;
  /** lunar: burn to the Moon, touchdown */
  tli: number; land: number;
}

function spanOf(t: Timeline, id: FlightPhaseId): [number, number] | null {
  const i = t.phases.findIndex((ph) => ph.id === id);
  return i < 0 ? null : [t.starts[i], t.starts[i] + t.spans[i]];
}

export interface FlightState {
  /** the point the path follows: top of the first stage, base of the upper stage */
  pos: THREE.Vector3;
  /** unit, where the nose points */
  nose: THREE.Vector3;
  /** unit, direction of travel */
  vel: THREE.Vector3;
  /** unit, "up" for a chase camera: in the orbit plane, away from the body */
  out: THREE.Vector3;
  /** world units per second at 1x */
  speed: number;
  /** engine, 0 to 1 */
  burn: number;
  stage1: boolean;
  /** seconds since staging; negative before */
  sepAge: number;
  sepPos: THREE.Vector3;
  sepVel: THREE.Vector3;
  sepOut: THREE.Vector3;
  sepSpeed: number;
  /** Earth rotation about +y */
  spin: number;
  /** climb progress 0 on the pad to 1 in orbit, for the plume */
  climb: number;
  landed: boolean;
  /** seconds from touchdown (negative just before it); -Infinity when there is no dust */
  dustAge: number;
  stationOn: boolean;
  docked: boolean;
  stationPos: THREE.Vector3;
  stationVel: THREE.Vector3;
  stationOut: THREE.Vector3;
  inOps: boolean;
  lost: boolean;
}

export function newState(): FlightState {
  const v = () => new THREE.Vector3();
  return {
    pos: v(), nose: v(), vel: v(), out: v(), speed: 0, burn: 0, stage1: true, sepAge: -1, sepPos: v(), sepVel: v(), sepOut: v(), sepSpeed: 0,
    spin: 0, climb: 0, landed: false, dustAge: -Infinity, stationOn: false, docked: false, stationPos: v(), stationVel: v(), stationOut: v(), inOps: false, lost: false,
  };
}

export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  up: THREE.Vector3;
  /** rocket length, Earth radii: drawn bigger when the camera is far (not to scale) */
  size: number;
  /** 0 to 1, how much the shot is a wide view (labels show in wide views) */
  wide: number;
}

export function newPose(): CameraPose {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), size: PAD_SIZE, wide: 0 };
}

type Shot = "pad" | "rise" | "earth" | "chase" | "system" | "moon";
const SIZE: Record<Shot, number> = { pad: PAD_SIZE, rise: 0.055, earth: 0.09, chase: 0.07, system: 0.18, moon: 0.06 };
const WIDE: Record<Shot, number> = { pad: 0, rise: 0, earth: 0.4, chase: 0, system: 1, moon: 0 };

export interface FlightOptions {
  lunar: boolean;
  /** the craft flies to a space station and docks with it */
  station?: boolean;
  lostAt?: FlightPhaseId;
}

export class FlightPath {
  readonly layout: Layout;
  readonly marks: Marks;
  readonly station: boolean;
  /** orbit rate, radians per unit of progress (matches the climb's last speed) */
  private readonly omega: number;
  private readonly omegaStation: number;
  /** angle the craft stops short of the station by when docked */
  private readonly dockGap = 0.075 / LEO_R;
  /** radius of the path's start: the first stage stands on the pad */
  private readonly r0 = EARTH_R + STAGE1 * PAD_SIZE;
  private readonly keys: [number, Shot][];
  /** lunar transfer: Bezier control points and the start slope of its time curve */
  private readonly bz: THREE.Vector3[] = [];
  private readonly m0: number = 0;
  // scratch, so sampling allocates nothing
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly shotA = newPose();
  private readonly shotB = newPose();
  private roomRight = 1;

  constructor(timeline: Timeline, opts: FlightOptions) {
    const lunar = opts.lunar;
    this.layout = buildLayout(lunar);
    this.station = !lunar && !!opts.station;
    const L = spanOf(timeline, "launch") ?? [0, 0.1];
    const A = spanOf(timeline, "ascent") ?? [L[1], L[1] + 0.1];
    const O = spanOf(timeline, "orbit-insertion") ?? [A[1], A[1] + 0.1];
    const Tr = spanOf(timeline, "transfer") ?? [O[1], O[1]];
    const R = spanOf(timeline, "arrival") ?? [Tr[1], Tr[1]];
    const ops = spanOf(timeline, "operations")?.[0] ?? R[1];
    // ignition at the start of the launch phase, liftoff a third of the way in (Dayon: 0.8 s on the pad)
    const lift = L[0] + (L[1] - L[0]) * 0.33;
    const orbit = O[1];
    this.omega = (4 * CLIMB_ARC) / Math.max(1e-6, orbit - lift);
    this.omegaStation = this.omega * 0.8;
    const tli = lunar ? Math.min(R[0], orbit + LUNAR_COAST / this.omega) : orbit;
    const land = lunar ? Math.max(tli + 0.02, R[0] + (R[1] - R[0]) * 0.85) : R[1];
    const sep = A[0] + (A[1] - A[0]) * 0.7;
    this.marks = {
      lift, sep, relight: sep + 0.3 / FLIGHT_SECONDS, orbit,
      t0: Tr[0], t1: Tr[1], r0: R[0], r1: R[1], ops, end: endProgress(timeline, opts.lostAt), tli, land,
    };

    if (lunar) {
      const { earth, N, tliDir, landDir } = this.layout;
      const X0 = earth.clone().addScaledVector(tliDir, LEO_R);
      const V0 = new THREE.Vector3().crossVectors(N, tliDir).normalize();
      const X1 = MOON_C.clone().addScaledVector(landDir, MOON_R);
      const k = X1.distanceTo(X0) / 3;
      this.bz = [X0, X0.clone().addScaledVector(V0, k), X1.clone().addScaledVector(landDir, k), X1];
      // the arc starts at the parking orbit's own speed, so leaving it has no jolt
      this.m0 = Math.min(2.5, ((this.omega * LEO_R) * (land - tli)) / (3 * k));
    }

    const m = this.marks;
    const climbMid = A[0] + (A[1] - A[0]) * 0.6;
    const oMid = O[0] + (O[1] - O[0]) * 0.5;
    const base: [number, Shot][] = [[0, "pad"], [lift, "pad"], [L[1], "rise"], [climbMid, "earth"], [oMid, "earth"], [orbit, "chase"]];
    if (lunar) {
      const span = m.land - m.tli;
      base.push([m.tli, "chase"], [m.tli + span * 0.32, "system"], [m.tli + span * 0.55, "system"], [m.land - span * 0.04, "moon"]);
    }
    this.keys = base;
  }

  /** Where everything is at progress p. Writes into `s`, allocates nothing. */
  sample(p: number, s: FlightState): FlightState {
    const m = this.marks, L = this.layout;
    const q = Math.min(p, m.end);
    s.lost = m.end < 1 && p >= m.end - 1e-6;
    s.spin = L.spinAtLift + EARTH_SPIN * (q - m.lift);
    s.inOps = q >= m.ops;
    s.landed = false;
    s.dustAge = -Infinity;
    s.stationOn = false;
    s.docked = false;
    s.stage1 = q < m.sep;
    s.sepAge = q >= m.sep ? (q - m.sep) * FLIGHT_SECONDS : -1;
    s.climb = between(q, m.lift, m.orbit);

    if (q < m.lift) {
      // on the pad, turning with the Earth until liftoff
      const a = EARTH_SPIN * (q - m.lift);
      this.a.copy(L.P).applyAxisAngle(Y, a);
      s.pos.copy(L.earth).addScaledVector(this.a, this.r0);
      s.nose.copy(this.a);
      s.vel.crossVectors(Y, this.a).normalize();
      s.out.copy(this.a);
      s.speed = 0;
    } else if (q < m.orbit) {
      this.climbAt((q - m.lift) / (m.orbit - m.lift), s);
    } else if (L.lunar && q >= m.tli) {
      this.transferAt(q, s);
    } else {
      this.orbitAt(this.craftAngle(q), LEO_R, s);
    }

    if (this.station && q >= m.orbit) {
      s.stationOn = true;
      const a = this.stationAngle(q);
      this.ringAt(a, LEO_R, s.stationPos, s.stationVel, s.stationOut);
      s.docked = q >= m.r1;
    }

    // staging: where the first stage let go, so it can fall away on its own
    if (s.sepAge >= 0) {
      const t = (m.sep - m.lift) / (m.orbit - m.lift);
      this.climbPose(t, s.sepPos, s.sepVel, s.sepOut);
      s.sepSpeed = this.climbSpeed(t);
    }

    s.burn = s.lost ? 0 : this.burnAt(q);
    return s;
  }

  /** The climb: straight up, a gentle pitch east, flattening into orbit. t goes 0 to 1. */
  private climbAt(t: number, s: FlightState) {
    this.climbPose(t, s.pos, s.vel, s.out);
    s.nose.copy(s.vel);
    s.speed = this.climbSpeed(t);
  }

  private climbPose(t: number, pos: THREE.Vector3, vel: THREE.Vector3, out: THREE.Vector3) {
    const L = this.layout;
    const H = LEO_R - this.r0;
    const r = this.r0 + H * (3 * t * t - 2 * t * t * t);
    const phi = CLIMB_ARC * t * t * t * t;
    const dr = 6 * H * t * (1 - t);
    const dphi = 4 * CLIMB_ARC * t * t * t;
    const c = Math.cos(phi), sn = Math.sin(phi);
    out.copy(L.P).multiplyScalar(c).addScaledVector(L.T, sn); // radial
    pos.copy(L.earth).addScaledVector(out, r);
    // the nose follows the velocity, from the analytic derivative: vertical at liftoff, horizontal in orbit
    const pitch = Math.atan2(r * dphi, dr);
    this.b.copy(L.P).multiplyScalar(-sn).addScaledVector(L.T, c); // prograde horizontal
    vel.copy(out).multiplyScalar(Math.cos(pitch)).addScaledVector(this.b, Math.sin(pitch)).normalize();
  }

  private climbSpeed(t: number) {
    const H = LEO_R - this.r0;
    const r = this.r0 + H * (3 * t * t - 2 * t * t * t);
    const dr = 6 * H * t * (1 - t), dphi = 4 * CLIMB_ARC * t * t * t;
    return Math.hypot(dr, r * dphi) / ((this.marks.orbit - this.marks.lift) * FLIGHT_SECONDS);
  }

  /** Craft angle along the orbit after insertion; a station flight slows to the station's pace and docks. */
  private craftAngle(q: number): number {
    const m = this.marks, w = this.omega;
    if (!this.station) return CLIMB_ARC + w * (q - m.orbit);
    const ws = this.omegaStation, dR = m.r1 - m.r0;
    if (q < m.r0) return CLIMB_ARC + w * (q - m.orbit);
    const atR0 = CLIMB_ARC + w * (m.r0 - m.orbit);
    if (q < m.r1 && dR > 0) {
      const x = (q - m.r0) / dR;
      return atR0 + dR * (w * x - (w - ws) * (x * x * x - (x * x * x * x) / 2));
    }
    const atR1 = atR0 + (dR * (w + ws)) / 2;
    return atR1 + ws * (q - m.r1);
  }

  private stationAngle(q: number): number {
    const m = this.marks;
    return this.craftAngle(m.r1) + this.dockGap + this.omegaStation * (q - m.r1);
  }

  private ringAt(angle: number, r: number, pos: THREE.Vector3, vel: THREE.Vector3, out: THREE.Vector3) {
    const L = this.layout;
    const c = Math.cos(angle), sn = Math.sin(angle);
    out.copy(L.P).multiplyScalar(c).addScaledVector(L.T, sn);
    pos.copy(L.earth).addScaledVector(out, r);
    vel.copy(L.P).multiplyScalar(-sn).addScaledVector(L.T, c);
  }

  private orbitAt(angle: number, r: number, s: FlightState) {
    this.ringAt(angle, r, s.pos, s.vel, s.out);
    s.nose.copy(s.vel);
    s.speed = (this.omega * r) / FLIGHT_SECONDS;
  }

  /** The trip to the Moon: one even arc from the parking orbit to the landing site, then the touchdown. */
  private transferAt(q: number, s: FlightState) {
    const m = this.marks, L = this.layout;
    const span = Math.max(1e-6, m.land - m.tli);
    const x = clamp01((q - m.tli) / span);
    const m0 = this.m0;
    // Hermite in time: leaves at orbit speed, coasts, brakes to zero at touchdown
    const u = 3 * x * x - 2 * x * x * x + m0 * (x * x * x - 2 * x * x + x);
    const du = 6 * x - 6 * x * x + m0 * (3 * x * x - 4 * x + 1);
    const [P0, P1, P2, P3] = this.bz;
    const v = 1 - u;
    s.pos.set(0, 0, 0).addScaledVector(P0, v * v * v).addScaledVector(P1, 3 * v * v * u).addScaledVector(P2, 3 * v * u * u).addScaledVector(P3, u * u * u);
    this.a.set(0, 0, 0).addScaledVector(P0, -3 * v * v).addScaledVector(P1, 3 * v * v - 6 * v * u).addScaledVector(P2, 6 * v * u - 3 * u * u).addScaledVector(P3, 3 * u * u);
    const tangentLen = this.a.length();
    if (x >= 1 || tangentLen < 1e-6) s.vel.copy(L.landDir).negate();
    else s.vel.copy(this.a).divideScalar(tangentLen);
    s.out.crossVectors(s.vel, L.N).normalize();
    s.speed = (tangentLen * du) / (span * FLIGHT_SECONDS);
    // nose: prograde, then a slow pitch-up so the engine faces the Moon for the braking burn
    const flip = smooth((x - 0.5) / 0.2);
    turn(s.vel, L.N, -Math.PI * flip, s.nose).normalize();
    if (q >= m.land) {
      s.landed = true;
      s.pos.copy(P3);
      s.nose.copy(L.landDir);
      s.vel.copy(L.landDir).negate();
      s.out.copy(L.landDir);
      s.speed = 0;
      s.dustAge = (q - m.land) * FLIGHT_SECONDS;
    } else {
      // dust starts to lift in the last moments of the descent
      const before = (m.land - q) * FLIGHT_SECONDS;
      if (before < 0.5) s.dustAge = -before;
    }
  }

  /** Engine schedule: first stage, staging gap, upper stage to orbit, and the later burns. */
  private burnAt(q: number): number {
    const m = this.marks, sec = 1 / FLIGHT_SECONDS;
    const on = (a: number, b: number, rise = 0.25 * sec, fall = 0.12 * sec) => Math.min(between(q, a, a + rise), 1 - between(q, b - fall, b));
    let burn = Math.max(on(0, m.sep, 0.5 * sec), on(m.relight, m.orbit));
    if (this.layout.lunar) {
      const span = m.land - m.tli;
      burn = Math.max(burn, on(m.tli, m.tli + span * 0.16), on(m.tli + span * 0.74, m.land, 0.25 * sec, 0.3 * sec));
    } else if (this.station) {
      // a short phasing burn to start the chase
      burn = Math.max(burn, on(m.t0 + 0.4 * sec, m.t0 + 1.0 * sec));
    }
    return burn;
  }

  /** Camera for progress p, from shots blended with eased weights. Pure: same p, same frame. */
  camera(p: number, s: FlightState, aspect: number, out: CameraPose): CameraPose {
    const q = Math.min(p, this.marks.end);
    const keys = this.keys;
    let i = 0;
    while (i < keys.length - 1 && q >= keys[i + 1][0]) i++;
    const [p0, s0] = keys[i];
    const next = keys[i + 1];
    const fit = Math.min(2.2, Math.max(1, 1.75 / Math.max(0.3, aspect)));
    this.roomRight = clamp01((aspect - 1.3) / 0.6);
    this.shot(s0, s, fit, this.shotA);
    if (!next || next[1] === s0) copyPose(this.shotA, out);
    else {
      const w = smooth((q - p0) / Math.max(1e-6, next[0] - p0));
      this.shot(next[1], s, fit, this.shotB);
      this.blend(this.shotA, this.shotB, w, out);
    }
    // never inside a body
    keepOut(out.pos, this.layout.earth, EARTH_R * 1.03);
    if (this.layout.lunar) keepOut(out.pos, MOON_C, MOON_R * 1.05);
    return out;
  }

  /**
   * Blend two shots like a dolly: the distance changes on a log scale and the aim stays with the
   * closer shot's subject until the camera is far enough out, so the rocket never slides off screen.
   */
  private blend(A: CameraPose, B: CameraPose, w: number, out: CameraPose) {
    const da = this.a.subVectors(A.pos, A.look).length();
    const db = this.b.subVectors(B.pos, B.look).length();
    this.a.divideScalar(Math.max(1e-6, da));
    this.b.divideScalar(Math.max(1e-6, db));
    const wl = da <= db ? w * w * w : 1 - (1 - w) * (1 - w) * (1 - w);
    out.look.lerpVectors(A.look, B.look, wl);
    this.c.lerpVectors(this.a, this.b, w);
    if (this.c.lengthSq() < 0.09) this.c.addScaledVector(this.layout.N, -0.5);
    this.c.normalize();
    const dist = Math.exp(Math.log(Math.max(1e-6, da)) * (1 - w) + Math.log(Math.max(1e-6, db)) * w);
    out.pos.copy(out.look).addScaledVector(this.c, dist);
    out.up.lerpVectors(A.up, B.up, w).normalize();
    out.size = A.size + (B.size - A.size) * w;
    out.wide = A.wide + (B.wide - A.wide) * w;
  }

  private shot(kind: Shot, s: FlightState, fit: number, o: CameraPose) {
    const L = this.layout;
    const size = SIZE[kind];
    o.size = size;
    o.wide = WIDE[kind];
    const Nm = this.c.copy(L.N).negate(); // the camera's side of the orbit plane
    switch (kind) {
      case "pad": {
        // low, beside the pad, looking up at the rocket against the horizon
        o.pos.copy(L.earth).addScaledVector(L.P, EARTH_R + 0.028).addScaledVector(Nm, 0.3 * fit).addScaledVector(L.T, -0.07 * fit);
        // on wide screens the rocket stands left of centre, with room on the right where it will go
        o.look.copy(s.pos).addScaledVector(L.P, size * 0.9).addScaledVector(L.T, size * 0.9 * this.roomRight);
        o.up.copy(L.P);
        break;
      }
      case "rise": {
        o.pos.copy(L.earth).addScaledVector(L.P, EARTH_R + 0.12).addScaledVector(Nm, 0.55 * fit).addScaledVector(L.T, -0.2 * fit);
        o.look.copy(s.pos);
        o.up.copy(L.P);
        break;
      }
      case "earth": {
        // high over the launch site, south of the track: the rocket lies down along the Earth's curve
        this.a.copy(L.P).multiplyScalar(0.7).addScaledVector(L.T, -0.05).addScaledVector(Nm, 0.72).normalize();
        this.b.copy(L.P).addScaledVector(L.T, 0.55).normalize();
        o.look.copy(L.earth).addScaledVector(this.b, EARTH_R * 1.12);
        o.pos.copy(L.earth).addScaledVector(this.a, 2.25 + 0.55 * (fit - 1));
        o.up.copy(L.P);
        break;
      }
      case "chase": {
        // behind and above the rocket, a little to the camera's side, looking where it is going
        const k = (size / 0.07) * fit;
        o.pos.copy(s.pos).addScaledVector(s.vel, -0.42 * k).addScaledVector(s.out, 0.2 * k).addScaledVector(Nm, 0.16 * k);
        o.look.copy(s.pos).addScaledVector(s.vel, 0.5 * k).addScaledVector(s.out, -0.3 * k);
        o.up.copy(s.out);
        break;
      }
      case "system": {
        const d = 12.4 * Math.max(1, fit * 0.8);
        o.pos.set(0, d * 0.2, d);
        o.look.set(0, 0.2, 0);
        o.up.copy(Y);
        break;
      }
      case "moon": {
        // beside the landing site, the local vertical up on screen: the lander comes down from the top
        const site = this.bz[3];
        o.pos.copy(site).addScaledVector(L.landDir, 0.2).addScaledVector(Nm, 0.5 * fit);
        o.look.copy(site).addScaledVector(L.landDir, 0.1);
        o.up.copy(L.landDir);
        break;
      }
    }
  }

  /** Points along the planned path up to the end of the climb (Earth) or the touchdown (Moon). */
  plannedPath(n = 240): THREE.Vector3[] {
    const m = this.marks;
    const to = this.layout.lunar ? m.land : m.orbit;
    const s = newState();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const q = m.lift + ((to - m.lift) * i) / n;
      this.sampleRaw(q, s);
      pts.push(s.pos.clone());
    }
    return pts;
  }

  /** Progress at which the planned path's index i is reached (inverse of plannedPath). */
  pathIndex(p: number, n = 240): number {
    const m = this.marks;
    const to = this.layout.lunar ? m.land : m.orbit;
    return Math.max(0, Math.min(n, ((Math.min(p, m.end) - m.lift) / Math.max(1e-6, to - m.lift)) * n));
  }

  private sampleRaw(q: number, s: FlightState) {
    const m = this.marks;
    if (q < m.orbit) this.climbAt(clamp01((q - m.lift) / (m.orbit - m.lift)), s);
    else if (this.layout.lunar && q >= m.tli) this.transferAt(q, s);
    else this.orbitAt(this.craftAngle(q), LEO_R, s);
  }

  /** The parking or station orbit, as a closed ring. */
  ring(n = 160): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const pos = new THREE.Vector3(), vel = new THREE.Vector3(), out = new THREE.Vector3();
    for (let i = 0; i <= n; i++) { this.ringAt((i / n) * Math.PI * 2, LEO_R, pos, vel, out); pts.push(pos.clone()); }
    return pts;
  }
}

function copyPose(a: CameraPose, b: CameraPose) {
  b.pos.copy(a.pos); b.look.copy(a.look); b.up.copy(a.up); b.size = a.size; b.wide = a.wide;
}

function keepOut(p: THREE.Vector3, c: THREE.Vector3, r: number) {
  const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < r && d > 1e-6) { const k = r / d; p.set(c.x + dx * k, c.y + dy * k, c.z + dz * k); }
}
