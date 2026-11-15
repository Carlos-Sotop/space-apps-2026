import React from "react";
import { Composition } from "remotion";
import { SpaceDAO30 } from "./Main";
import { FPS, TOTAL } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="SpaceDAO30" component={SpaceDAO30} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
