import { describe, expect, it } from "vitest";
import { arcPoints, buildNetwork, onSphere } from "./network";

describe("buildNetwork", () => {
  const net = buildNetwork();

  it("places every kind of member on the web", () => {
    for (const kind of ["agency", "company", "tech", "mission"] as const) {
      expect(net.nodes.filter((n) => n.kind === kind).length).toBeGreaterThan(0);
    }
  });

  it("gives every node a position outside the globe", () => {
    for (const n of net.nodes) expect(n.pos.length()).toBeGreaterThan(1);
  });

  it("links only existing nodes, never a node to itself, and never twice", () => {
    const keys = new Set<string>();
    for (const l of net.links) {
      expect(net.nodes[l.a]).toBeDefined();
      expect(net.nodes[l.b]).toBeDefined();
      expect(l.a).not.toBe(l.b);
      const key = l.a < l.b ? `${l.a}-${l.b}` : `${l.b}-${l.a}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    expect(net.links.length).toBeGreaterThan(30);
  });

  it("connects every agency and company to the web", () => {
    const linked = new Set(net.links.flatMap((l) => [l.a, l.b]));
    net.nodes.forEach((n, i) => {
      if (n.kind === "agency" || n.kind === "company") expect(linked.has(i)).toBe(true);
    });
  });

  it("joins the player's design to several nodes, all reachable by a short arc", () => {
    expect(net.joinsTo.length).toBeGreaterThanOrEqual(5);
    expect(new Set(net.joinsTo).size).toBe(net.joinsTo.length);
    for (const i of net.joinsTo) expect(net.nodes[i].pos.angleTo(net.you)).toBeLessThan(2.7);
  });

  it("is the same graph every time, so the scene never shuffles between renders", () => {
    const again = buildNetwork();
    expect(again.nodes.map((n) => n.id)).toEqual(net.nodes.map((n) => n.id));
    expect(again.links).toEqual(net.links);
  });
});

describe("arcPoints", () => {
  it("runs from one end to the other", () => {
    const a = onSphere(0, 0, 1);
    const b = onSphere(40, 60, 1.6);
    const points = arcPoints(a, b, 24);
    expect(points).toHaveLength(25);
    expect(points[0].distanceTo(a)).toBeLessThan(1e-6);
    expect(points[24].distanceTo(b)).toBeLessThan(1e-6);
  });

  it("never cuts through the planet", () => {
    const a = onSphere(-30, 150, 1.01);
    const b = onSphere(50, -70, 1.3);
    for (const p of arcPoints(a, b)) expect(p.length()).toBeGreaterThan(1.009);
  });

  it("holds up when both ends are the same point", () => {
    const a = onSphere(10, 10, 1.2);
    for (const p of arcPoints(a, a.clone(), 8)) expect(Number.isFinite(p.length())).toBe(true);
  });
});
