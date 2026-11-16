import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
// angle draws the WebGL globe on the GPU: about 0.16 s a frame on an M-series Mac, against 1.6 s for software "swangle"
Config.setChromiumOpenGlRenderer("angle");

// The flight clip renders the game's own 3D scene, unchanged: `@/...` is the game's src in this checkout (../src),
// and every bare import inside those files (react, three, @react-three/*, motion, zustand...) resolves from
// video/node_modules only, so there is one React and one three.js even if the checkout root gets a node_modules.
// Remotion runs this file with video/ as the working directory; the override below runs later, so resolve now.
const VIDEO = process.cwd();
const GAME_SRC = path.resolve(VIDEO, "../src");
const VIDEO_MODULES = path.resolve(VIDEO, "node_modules");

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias as Record<string, string>), "@": GAME_SRC },
  },
  module: {
    ...config.module,
    rules: [...(config.module?.rules ?? []), { include: GAME_SRC, resolve: { modules: [VIDEO_MODULES] } }],
  },
}));
