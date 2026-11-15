import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
// angle draws the WebGL globe on the GPU: about 0.16 s a frame on an M-series Mac, against 1.6 s for software "swangle"
Config.setChromiumOpenGlRenderer("angle");
