import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Engine tests simulate thousands of flights; slower machines and CI run the full suite several times slower
  // than a fast laptop, so no test may fail on the 5 s default.
  test: { include: ["src/**/*.test.ts", "worker/**/*.test.ts"], testTimeout: 60_000 },
});
