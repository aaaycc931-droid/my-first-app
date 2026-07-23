import {
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS,
  getLocalPracticeReviewTargetKey,
  isLocalPracticeReviewTarget,
  type LocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../practice/localPracticeReviewQueue";

export type LocalWeakPointReviewGroup = {
  kind: LocalPracticeReviewTarget["kind"];
  targets: LocalPracticeReviewTarget[];
};

export type LocalWeakPointReviewQueue = {
  status: "available" | "unavailable";
  pendingTargetCount: number;
  groups: LocalWeakPointReviewGroup[];
};

const knownKinds: LocalPracticeReviewTarget["kind"][] = [
  "single-pitch",
  "interval",
  "interval-comparison",
  "chord-inversion",
  "harmony-progression",
  "scale-mode",
  "seventh-chord",
  "seventh-chord-spacing",
  "modulation",
  "rhythm",
  "melody-dictation",
];

const unavailableQueue = (): LocalWeakPointReviewQueue => ({
  status: "unavailable",
  pendingTargetCount: 0,
  groups: [],
});

/**
 * Groups the existing unresolved review targets without deriving a score,
 * severity, or ability judgment. Both groups and targets retain the queue's
 * MRU order so the view never invents a second prioritization protocol.
 */
export const buildLocalWeakPointReviewQueue = (
  queue: LocalPracticeReviewQueue,
): LocalWeakPointReviewQueue => {
  if (queue.length > LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS) return unavailableQueue();

  const groups: LocalWeakPointReviewGroup[] = [];
  const groupsByKind = new Map<LocalPracticeReviewTarget["kind"], LocalWeakPointReviewGroup>();
  const targetKeys = new Set<string>();

  for (const target of queue) {
    if (!isLocalPracticeReviewTarget(target) || !knownKinds.includes(target.kind)) {
      return unavailableQueue();
    }
    const targetKey = getLocalPracticeReviewTargetKey(target);
    if (targetKeys.has(targetKey)) return unavailableQueue();
    targetKeys.add(targetKey);

    let group = groupsByKind.get(target.kind);
    if (!group) {
      group = { kind: target.kind, targets: [] };
      groupsByKind.set(target.kind, group);
      groups.push(group);
    }
    group.targets.push(target);
  }

  return {
    status: "available",
    pendingTargetCount: queue.length,
    groups,
  };
};
