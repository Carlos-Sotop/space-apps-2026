import React from "react";
import { Composition } from "remotion";
import { SpaceDAO30 } from "./Main";
import { SpaceDAO180 } from "./Main180";
import { FPS, TOTAL, TOTAL180 } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SpaceDAO30" component={SpaceDAO30} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="SpaceDAO180" component={SpaceDAO180} durationInFrames={TOTAL180} fps={FPS} width={1920} height={1080} />
  </>
);
