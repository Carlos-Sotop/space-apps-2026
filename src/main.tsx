import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/michroma/400.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./styles/globals.css";

const App = lazy(() => import("./App"));
const Landing = lazy(() => import("./landing/Landing"));

const GAME_PARAMS = ["screen", "mission", "step", "mode", "onboarding"];
const { pathname, search } = window.location;
const isPlay = pathname === "/play" || pathname === "/play/";
const hasGameParams = GAME_PARAMS.some((k) => new URLSearchParams(search).has(k));

if (!isPlay && hasGameParams) window.location.replace(`/play${search}${window.location.hash}`);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>{isPlay ? <App /> : hasGameParams ? null : <Landing />}</Suspense>
  </StrictMode>,
);
