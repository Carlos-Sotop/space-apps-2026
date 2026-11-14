import { lazy, Suspense } from "react";
import { Button } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useGame } from "@/store/game";

const NetworkGlobe = lazy(() => import("@/three/NetworkGlobe"));

export default function Intro() {
  const go = useGame((s) => s.go);
  const fallback = <img src="/brand/spacedao-mark-256.webp" alt="" className="mx-auto h-48 w-48 opacity-80" />;

  return (
    <section className="relative flex h-[100dvh] flex-col items-center overflow-hidden">
      <div className="min-h-0 w-full flex-1">
        <ErrorBoundary fallback={<div className="grid h-full place-items-center">{fallback}</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center">{fallback}</div>}>
            <NetworkGlobe />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className="relative z-10 flex w-full flex-col items-center gap-5 px-4 pb-10 pt-2 text-center sm:pb-14">
        <h1 className="m-0">
          <img src="/brand/spacedao-wordmark.webp" alt="SpaceDAO" width={400} height={52} className="w-[min(80vw,400px)]" />
        </h1>
        <p className="font-display text-[11px] leading-relaxed text-muted sm:text-sm">Space is too big for any one nation.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => go("missions")}>Begin mission</Button>
          <Button size="lg" onClick={() => go("story")}>What is SpaceDAO?</Button>
        </div>
      </div>
    </section>
  );
}
