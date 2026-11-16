import { describe, expect, it } from "vitest";
import { serveVideo } from "./index";

const body = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
const assets = { fetch: async () => new Response(body, { headers: { "content-type": "video/mp4" } }) } as unknown as Fetcher;
const get = (range?: string) => new Request("https://x.test/video/a.mp4", { headers: range ? { range } : {} });

describe("serveVideo", () => {
  it("serves the whole file and advertises byte ranges", async () => {
    const res = await serveVideo(get(), assets);
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect((await res.arrayBuffer()).byteLength).toBe(100);
  });
  it("answers a Range with 206 and the exact bytes", async () => {
    const res = await serveVideo(get("bytes=10-19"), assets);
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 10-19/100");
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });
  it("handles open and suffix ranges, and rejects out of range", async () => {
    expect((await serveVideo(get("bytes=90-"), assets)).headers.get("content-range")).toBe("bytes 90-99/100");
    expect((await serveVideo(get("bytes=-5"), assets)).headers.get("content-range")).toBe("bytes 95-99/100");
    expect((await serveVideo(get("bytes=200-"), assets)).status).toBe(416);
  });
});
