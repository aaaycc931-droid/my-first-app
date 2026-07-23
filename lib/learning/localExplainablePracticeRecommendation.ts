import {
  getLocalPracticeReviewTargetKey,
  type LocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../practice/localPracticeReviewQueue";
import { buildLocalWeakPointReviewQueue } from "./localWeakPointReviewQueue";

export const LOCAL_EXPLAINABLE_RECOMMENDATION_RULE =
  "review-queue-mru-v1" as const;

export type LocalExplainablePracticeRecommendation =
  | { status: "disabled" }
  | { status: "empty" }
  | { status: "unavailable" }
  | {
      status: "available";
      target: LocalPracticeReviewTarget;
      source: {
        rule: typeof LOCAL_EXPLAINABLE_RECOMMENDATION_RULE;
        queuePosition: 1;
        sameKindPendingCount: number;
        pendingTargetCount: number;
      };
    };

/**
 * Selects the first target from the existing MRU review queue. This derives no
 * score, rate, grade, diagnosis, or second ranking and never reads an outcome.
 */
export const buildLocalExplainablePracticeRecommendation = ({
  suggestionsEnabled,
  queue,
}: {
  suggestionsEnabled: boolean;
  queue: LocalPracticeReviewQueue;
}): LocalExplainablePracticeRecommendation => {
  if (!suggestionsEnabled) return { status: "disabled" };

  const reviewQueue = buildLocalWeakPointReviewQueue(queue);
  if (reviewQueue.status === "unavailable") return { status: "unavailable" };
  if (reviewQueue.pendingTargetCount === 0) return { status: "empty" };

  const target = queue[0];
  const group = reviewQueue.groups.find((candidate) => candidate.kind === target.kind);
  if (
    !group
    || !group.targets.some(
      (candidate) =>
        getLocalPracticeReviewTargetKey(candidate)
        === getLocalPracticeReviewTargetKey(target),
    )
  ) {
    return { status: "unavailable" };
  }

  return {
    status: "available",
    target,
    source: {
      rule: LOCAL_EXPLAINABLE_RECOMMENDATION_RULE,
      queuePosition: 1,
      sameKindPendingCount: group.targets.length,
      pendingTargetCount: reviewQueue.pendingTargetCount,
    },
  };
};
