// The game's texture map (TEX in src/scene/bodies.tsx) holds absolute URLs such as /textures/earth_day_2k.jpg,
// which Remotion does not serve. Point each one at its copy in video/public/textures, once, at import time.
// FlightClip imports this module above the scene module, so even a scene that reads TEX while loading sees the
// rewritten URLs. Running it twice (a hot reload) gives the same result.
import { staticFile } from "remotion";
import { TEX } from "@/scene/bodies";

for (const key of Object.keys(TEX) as (keyof typeof TEX)[]) {
  TEX[key] = staticFile(`textures/${TEX[key].split("/").pop()}`);
}
