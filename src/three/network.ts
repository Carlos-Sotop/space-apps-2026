import * as THREE from "three";
import { actorHq, catalog } from "@/data";

/**
 * The SpaceDAO network as a graph, built from the catalog so every link means something:
 * agencies and companies sit at their real headquarters on the globe, the open technologies
 * they published float above them, and the missions ride an outer shell linked to the
 * launch providers that fly them and to the technologies they carry.
 *
 * Pure geometry and lookups: no three.js scene, no React, so it can be tested on its own.
 */

export type NetKind = "agency" | "company" | "tech" | "mission";

/** Node colors mirror the tokens in src/styles/tokens.css, which the 2D card uses too. */
export const NET_COLOR: Record<NetKind, string> = {
  agency: "#a78bfa", // --violet-bright
  company: "#60a5fa", // --blue-bright
  tech: "#34d399", // --ok
  mission: "#fbbf24",
};
/** --cyan: the player's own node and the links it brings, per the design system. */
export const NET_CYAN = "#22d3ee";

/** Shell each kind of node lives on, in globe radii. */
const SHELL = { ground: 1.022, tech: 1.3, mission: 1.62, you: 1.68 };

export interface NetNode {
  id: string;
  kind: NetKind;
  /** short name, read out by the canvas label */
  label: string;
  pos: THREE.Vector3;
}

export interface NetLink {
  a: number;
  b: number;
  /** the node whose color the link takes */
  color: string;
}

export interface Network {
  nodes: NetNode[];
  links: NetLink[];
  /** where the player's design joins, outside every shell */
  you: THREE.Vector3;
  /** nodes the player's design links to when it is published */
  joinsTo: number[];
}

/** lat/lon in degrees to a point on a sphere of radius r, y up, lon 0 facing +z. */
export function onSphere(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lam));
}

/**
 * Points along a link: the direction turns the short way round the globe while the radius
 * rises to meet the far shell, with a bow in the middle so no link ever cuts through the
 * planet. Antipodal pairs have no short way round and are filtered out before we get here.
 */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, steps = 40): THREE.Vector3[] {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const angle = an.angleTo(bn);
  const sin = Math.sin(angle);
  const ra = a.length();
  const rb = b.length();
  const bow = 0.06 + 0.3 * (angle / Math.PI);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const dir =
      sin < 1e-4
        ? an.clone()
        : an.clone().multiplyScalar(Math.sin((1 - t) * angle) / sin).addScaledVector(bn, Math.sin(t * angle) / sin).normalize();
    return dir.multiplyScalar(ra + (rb - ra) * t + bow * Math.sin(Math.PI * t));
  });
}

/** Links longer than this (radians between the two directions) have no readable short arc. */
const MAX_ANGLE = 2.7;

/** A deterministic spread so several technologies by the same author do not stack up. */
const spread = (i: number) => [(i % 3) * 9 - 9, (((i * 7) % 5) - 2) * 11] as const;

export function buildNetwork(): Network {
  const nodes: NetNode[] = [];
  const index = new Map<string, number>();
  const add = (n: NetNode) => {
    index.set(n.id, nodes.length);
    nodes.push(n);
    return nodes.length - 1;
  };

  // 1. agencies and companies, at their real headquarters
  const hq = new Map<string, [number, number]>();
  for (const actor of catalog.actors) {
    const at = actorHq[actor.id];
    if (!at) continue;
    hq.set(actor.id, at);
    add({ id: actor.id, kind: actor.kind, label: actor.shortName, pos: onSphere(at[0], at[1], SHELL.ground) });
  }

  // 2. open technologies, floating above the agency or company that published them
  catalog.blueprints.forEach((bp, i) => {
    const at = hq.get(bp.authorId);
    if (!at) return;
    const [dLat, dLon] = spread(i);
    add({ id: bp.id, kind: "tech", label: bp.name, pos: onSphere(at[0] + dLat, at[1] + dLon, SHELL.tech) });
  });

  // 3. missions, on an outer shell above the providers that launch them
  const providersOf = (ids: string[]) => [
    ...new Set(ids.map((id) => catalog.launchVehicles.find((v) => v.id === id)?.providerId).filter((p): p is string => !!p && hq.has(p))),
  ];
  catalog.missions.forEach((mission, i) => {
    const providers = providersOf(mission.launchVehicleIds);
    const seats = providers.map((p) => hq.get(p)!);
    const lat = seats.length ? seats.reduce((s, [la]) => s + la, 0) / seats.length : 10;
    const lon = seats.length ? seats.reduce((s, [, lo]) => s + lo, 0) / seats.length : i * 120 - 120;
    add({ id: mission.id, kind: "mission", label: mission.name, pos: onSphere(lat + 14, lon + i * 10 - 10, SHELL.mission) });
  });

  // links, each one a relationship that exists in the catalog
  const links: NetLink[] = [];
  const seen = new Set<string>();
  const link = (a: number, b: number, color: string) => {
    if (a < 0 || b < 0 || a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    if (nodes[a].pos.angleTo(nodes[b].pos) > MAX_ANGLE) return;
    seen.add(key);
    links.push({ a, b, color });
  };

  // a technology to its author, and to every mission that offers a module it fits
  catalog.blueprints.forEach((bp) => {
    const tech = index.get(bp.id);
    if (tech === undefined) return;
    link(tech, index.get(bp.authorId) ?? -1, NET_COLOR.tech);
    const hosts = bp.hostIds ?? [];
    if (!hosts.length) return;
    catalog.missions.forEach((mission) => {
      if (hosts.some((h) => mission.moduleIds.includes(h))) link(tech, index.get(mission.id) ?? -1, NET_COLOR.tech);
    });
  });

  // a mission to the providers that can launch it
  catalog.missions.forEach((mission) => {
    const m = index.get(mission.id);
    if (m === undefined) return;
    providersOf(mission.launchVehicleIds).slice(0, 4).forEach((p) => link(m, index.get(p) ?? -1, NET_COLOR.mission));
  });

  // the ground mesh: every seat reaches its two nearest neighbours, so the web reads as a web
  const ground = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.kind === "agency" || n.kind === "company");
  ground.forEach(({ n, i }) => {
    ground
      .filter((o) => o.i !== i)
      .map((o) => ({ o, d: n.pos.angleTo(o.n.pos) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)
      .forEach(({ o }) => link(i, o.i, NET_COLOR[n.kind]));
  });

  // The player's design joins from outside the web. It sits high enough that the globe's slow
  // turn never carries it behind the planet: it is the one node that has to stay in view.
  const you = onSphere(44, 12, SHELL.you);
  const nearest = (kind: NetKind, count: number) =>
    nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.kind === kind && n.pos.angleTo(you) < MAX_ANGLE)
      .sort((x, y) => x.n.pos.angleTo(you) - y.n.pos.angleTo(you))
      .slice(0, count)
      .map(({ i }) => i);
  const joinsTo = [...nearest("mission", 2), ...nearest("tech", 2), ...nearest("agency", 2), ...nearest("company", 1)];

  return { nodes, links, you, joinsTo };
}
