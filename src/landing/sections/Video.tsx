import { Reveal, Section, useVideoAvailable } from "../lib";
import type { videos } from "../content";

type Slot = (typeof videos)[keyof typeof videos];

export function VideoSection({ id, video }: { id: string; video: Slot }) {
  const ok = useVideoAvailable(video.src);
  if (!ok) return null;
  return (
    <Section id={id} narrow className="!py-12 md:!py-16">
      <Reveal>
        <h2 className="mb-6 text-center text-2xl font-semibold text-fg sm:text-3xl">{video.title}</h2>
        <div className="glass overflow-hidden p-2 shadow-[0_0_80px_rgba(139,92,246,0.25)]">
          <video className="aspect-video w-full rounded-[10px] bg-black" controls playsInline preload="none" poster={video.poster}>
            <source src={video.src} type="video/mp4" />
            <track kind="captions" srcLang="en" label="English" src={video.captions} />
          </video>
        </div>
      </Reveal>
    </Section>
  );
}
