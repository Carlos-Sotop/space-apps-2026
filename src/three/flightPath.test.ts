import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { missions as MISSIONS } from "@/data/missions";
import { buildTimeline } from "@/screens/flightTimeline";
import { FlightPath, MOON_C, newPose, newState } from "./flightPath";

const flights = MISSIONS.map((m) => ({
  id: m.id,
  path: new FlightPath(buildTimeline(m.phases), { lunar: m.id === "moon-base-zero", station: m.id === "orbital-lab" }),
}));

const STEPS = 3000;

describe("flight path (Dayon's launch brief, part C)", () => {
  for (const { id, path } of flights) {
    const L = path.layout;
    const m = path.marks;

    it(`${id}: the rocket only ever turns one way around the Earth, never back`, () => {
      const s = newState(), prev = new THREE.Vector3(), r = new THREE.Vector3(), h = new THREE.Vector3();
      const until = L.lunar ? m.land : 1;
      path.sample(m.lift, s);
      prev.copy(s.pos);
      for (let i = 1; i <= STEPS; i++) {
        const p = m.lift + ((until - m.lift) * i) / STEPS;
        path.sample(p, s);
        r.copy(prev).sub(L.earth);
        h.crossVectors(r, s.pos.clone().sub(prev));
        // angular momentum about the Earth along the orbit normal: never negative (no retrograde step)
        expect(h.dot(L.N)).toBeGreaterThanOrEqual(-1e-9);
        prev.copy(s.pos);
      }
    });

    it(`${id}: position and nose move smoothly, frame by frame`, () => {
      const s = newState(), pos = new THREE.Vector3(), nose = new THREE.Vector3();
      path.sample(0, s);
      pos.copy(s.pos); nose.copy(s.nose);
      for (let i = 1; i <= STEPS; i++) {
        path.sample(i / STEPS, s);
        expect(s.pos.distanceTo(pos)).toBeLessThan(0.03);
        // a 60 fps frame at 4x is about 1/360 of the flight; this step is 1/3000
        expect(s.nose.angleTo(nose)).toBeLessThan(0.12);
        pos.copy(s.pos); nose.copy(s.nose);
      }
    });

    it(`${id}: the camera never crosses the orbit plane and never jumps`, () => {
      const s = newState(), cam = newPose(), last = new THREE.Vector3();
      for (const aspect of [2, 4 / 3]) {
        for (let i = 0; i <= STEPS; i++) {
          const p = i / STEPS;
          path.sample(p, s);
          path.camera(p, s, aspect, cam);
          expect(cam.pos.clone().sub(L.earth).dot(L.N)).toBeLessThan(0);
          // a step is small next to how far the camera stands from what it looks at
          if (i > 0) expect(cam.pos.distanceTo(last) / cam.pos.distanceTo(cam.look)).toBeLessThan(0.03);
          last.copy(cam.pos);
        }
      }
    });

    it(`${id}: the engine burns at ignition, stops for staging and relights`, () => {
      const s = newState();
      expect(path.sample(m.lift, s).burn).toBeGreaterThan(0.99);
      expect(path.sample(m.sep + 0.05 / 24, s).burn).toBe(0);
      expect(path.sample(m.relight + 0.6 / 24, s).burn).toBeGreaterThan(0.99);
      expect(path.sample(m.orbit + 0.2 / 24, s).burn).toBe(0);
    });
  }

  it("moon-base-zero: the trip leaves prograde and lands on the Moon without turning back", () => {
    const { path } = flights.find((f) => f.id === "moon-base-zero")!;
    const s = newState();
    path.sample(path.marks.tli - 0.001, s);
    const before = s.vel.clone();
    path.sample(path.marks.tli + 0.001, s);
    expect(s.vel.angleTo(before)).toBeLessThan(0.05);
    path.sample(1, s);
    expect(s.landed).toBe(true);
    expect(s.pos.distanceTo(MOON_C)).toBeCloseTo(0.3, 5);
  });
});
