import { useCallback, useMemo, useState } from "react";
import { computeResources, councilReview, validateDesign } from "@/engine";
import { useGame } from "@/store/game";
import { StepTitle, useDesign } from "./useDesign";
import { MarketPanel } from "./MarketPanel";
import { ReviewFeed } from "./ReviewFeed";
import { SignPanel } from "./SignPanel";

export function CouncilStep() {
  const { design, catalog } = useDesign();
  const reviews = useMemo(() => councilReview(design, catalog), [design, catalog]);
  const issues = useMemo(() => validateDesign(design, catalog), [design, catalog]);
  const report = useMemo(() => computeResources(design, catalog), [design, catalog]);
  const [feedDone, setFeedDone] = useState(false);
  const [settled, setSettled] = useState(() => !!useGame.getState().ratification);
  const onDone = useCallback(() => setFeedDone(true), []);
  const onSettled = useCallback(() => setSettled(true), []);

  return (
    <div className="space-y-6">
      <StepTitle title="Council review" chip="Review, bet, sign" />
      <ReviewFeed reviews={reviews} issues={issues} report={report} onDone={onDone} />
      {feedDone && <MarketPanel onSettled={onSettled} />}
      {feedDone && settled && <SignPanel />}
    </div>
  );
}
