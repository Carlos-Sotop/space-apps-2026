import { MotionConfig } from "motion/react";
import { Starfield } from "@/components/ui";
import { videos } from "./content";
import { Footer, FinalCta, NasaData, References, Rules, Team, Tech } from "./sections/More";
import { Hero } from "./sections/Hero";
import { Nav } from "./sections/Nav";
import { Challenge, HowToPlay, Idea, Missions, Problem } from "./sections/Story";
import { VideoSection } from "./sections/Video";

export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <Starfield />
      <div className="relative z-10 overflow-x-clip">
        <Nav />
        <main>
          <Hero />
          <VideoSection id="teaser" video={videos.teaser} />
          <Problem />
          <Idea />
          <HowToPlay />
          <Missions />
          <NasaData />
          <Challenge />
          <Tech />
          <Rules />
          <VideoSection id="deep-dive" video={videos.deepDive} />
          <Team />
          <References />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
