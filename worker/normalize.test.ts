import { describe, expect, it } from "vitest";
import { normalizeApod, normalizeCme, normalizeEonet, normalizeGst, parseDsn, parseHorizons, parseSsc } from "./normalize";

describe("NASA normalizers", () => {
  it("trims CME notes to 160 characters and keeps the record link", () => {
    const [cme] = normalizeCme([{ activityID: "A-CME-001", startTime: "2026-11-01T00:00Z", note: "x".repeat(300), link: "https://ccmc.gsfc.nasa.gov/x" }]);
    expect(cme.note.length).toBeLessThanOrEqual(160);
    expect(cme.link).toContain("ccmc.gsfc.nasa.gov");
    expect(cme.kind).toBe("CME");
  });

  it("reads the peak Kp of a geomagnetic storm", () => {
    const [g] = normalizeGst([{ gstID: "G1", startTime: "2026-10-04T18:00Z", link: "l", allKpIndex: [{ kpIndex: 4.33 }, { kpIndex: 5.67 }] }]);
    expect(g.magnitude).toBe("Kp 5.7");
  });

  it("uses the latest EONET geometry point and skips events without one", () => {
    const out = normalizeEonet({ events: [
      { id: "E1", title: "Fire", link: "l", categories: [{ id: "wildfires" }], geometry: [{ type: "Point", coordinates: [1, 2] }, { type: "Point", coordinates: [10, 20] }] },
      { id: "E2", title: "None", link: "l", categories: [], geometry: [] },
    ] });
    expect(out).toEqual([{ id: "E1", title: "Fire", category: "wildfires", lat: 20, lon: 10, link: "l" }]);
  });

  it("converts the Horizons delta from AU to km", () => {
    const moon = parseHorizons({ result: "header\n$$SOE\n 2026-Nov-14 00:00     0.00271137476442  -0.0031111\n$$EOE\n" });
    expect(moon?.moonDistanceKm).toBe(405616);
    expect(moon?.lightTimeS).toBeCloseTo(1.353, 2);
    expect(parseHorizons({ result: "nothing" })).toBeNull();
  });

  it("takes the last SSCWeb sample", () => {
    const xml = "<Latitude>1</Latitude><Latitude>27.5</Latitude><Longitude>10</Longitude><Longitude>331.5</Longitude><RadialLength>6790</RadialLength><RadialLength>6796</RadialLength><Time>a</Time><Time>2026-11-14T00:10:00.000Z</Time>";
    expect(parseSsc(xml)).toEqual({ lat: 27.5, lon: -28.5, altitudeKm: 425, time: "2026-11-14T00:10:00.000Z" });
  });

  it("groups DSN dishes under their station", () => {
    const xml = `<dsn><station name="gdscc" friendlyName="Goldstone" timeUTC="1"/>
      <dish name="DSS24" activity="TT&amp;C"><downSignal active="true" spacecraft="M20"/><target name="M20" id="168"/></dish>
      <station name="mdscc" friendlyName="Madrid" timeUTC="1"/><dish name="DSS54" activity="Idle"><target name="DSN" id="99"/></dish></dsn>`;
    const dsn = parseDsn(xml);
    expect(dsn?.stations.map((s) => s.friendlyName)).toEqual(["Goldstone", "Madrid"]);
    expect(dsn?.stations[0].dishes[0]).toMatchObject({ name: "DSS24", targets: ["M20"], downlinkActive: true });
    expect(dsn?.stations[1].dishes[0].targets).toEqual([]);
  });

  it("rejects an APOD that is only the agency logo", () => {
    expect(normalizeApod({ title: "NASA Science", url: "https://x/nasa-logo@2x.png", date: "d" })).toBeNull();
    expect(normalizeApod({ title: "Nebula", url: "https://apod.nasa.gov/n.jpg", media_type: "image", date: "d" })?.title).toBe("Nebula");
  });
});
