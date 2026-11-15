// C8: the ISS stays live in the browser when the Worker can only give the snapshot.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLiveRoute, forgetBrowserIssTrack, snapshots } from "./client";

const T0 = Date.parse("2026-11-15T17:00:00.000Z");
const minute = (i: number) => new Date(T0 + i * 60_000).toISOString();

function track(from: number, to: number): string {
  let xml = "<Coordinates>";
  for (let i = from; i <= to; i++) xml += `<Latitude>${i}</Latitude><Longitude>${i}</Longitude><RadialLength>6791</RadialLength>`;
  xml += "</Coordinates>";
  for (let i = from; i <= to; i++) xml += `<Time>${minute(i)}</Time>`;
  return xml;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

describe("fetchLiveRoute('iss') in the browser", () => {
  let sscCalls: number;
  let workerAnswer: () => Response;
  let sscAnswer: () => Response;

  beforeEach(() => {
    forgetBrowserIssTrack();
    sscCalls = 0;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/live/")) return workerAnswer();
      sscCalls++;
      return sscAnswer();
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("asks SSCWeb itself when the Worker answers the snapshot", async () => {
    workerAnswer = () => json({ ...snapshots.iss, snapshot: true });
    sscAnswer = () => new Response(track(-5, 90));
    const iss = await fetchLiveRoute("iss");
    expect(iss.snapshot).toBe(false);
    expect(iss.time).toBe(minute(0));
    vi.setSystemTime(T0 + 10 * 60_000);
    expect((await fetchLiveRoute("iss")).time).toBe(minute(10));
    expect(sscCalls).toBe(1);
  });

  it("keeps a live Worker answer and never calls SSCWeb", async () => {
    workerAnswer = () => json({ lat: 1, lon: 2, altitudeKm: 420, time: minute(0), snapshot: false, fetchedAt: minute(0) });
    sscAnswer = () => new Response(track(-5, 90));
    expect((await fetchLiveRoute("iss")).lat).toBe(1);
    expect(sscCalls).toBe(0);
  });

  it("falls back to the bundled snapshot when both fail", async () => {
    workerAnswer = () => new Response("down", { status: 503 });
    sscAnswer = () => new Response("down", { status: 503 });
    expect(await fetchLiveRoute("iss")).toEqual(snapshots.iss);
  });
});
