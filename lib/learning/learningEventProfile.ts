import {
  getLocalPracticeReviewTargetKey,
  type LocalPracticeAnswerResult,
  type LocalPracticeReviewTarget,
} from "../practice/localPracticeReviewQueue";

export const LEARNING_EVENT_SCHEMA_VERSION = "learning-event-v1" as const;
export const LEARNING_PROFILE_SCHEMA_VERSION = "learning-profile-v1" as const;
export const LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION = 9 as const;
export const MAX_RECENT_LEARNING_EVENTS = 48;
export const MAX_LEARNING_PROFILE_SERIALIZED_LENGTH = 24 * 1024;

export type LearningSkillKind = LocalPracticeReviewTarget["kind"];
export type LearningEvent = {
  schemaVersion: typeof LEARNING_EVENT_SCHEMA_VERSION;
  eventId: string;
  sequence: number;
  occurredAt: string;
  kind: "result-checked" | "review-started";
  skillKind: LearningSkillKind;
  difficulty: LocalPracticeReviewTarget["difficulty"];
  targetKey: string;
  practiceMode: "random" | "review" | "custom";
  outcome: "correct" | "incorrect" | "not-applicable";
};

export type LearningSkillFact = {
  skillKind: LearningSkillKind;
  checkedCount: number;
  correctCount: number;
  incorrectCount: number;
  reviewStartedCount: number;
  reviewResolvedCount: number;
};

export type LearningProfile = {
  schemaVersion: typeof LEARNING_PROFILE_SCHEMA_VERSION;
  revision: number;
  suggestionsEnabled: boolean;
  checkedCount: number;
  correctCount: number;
  incorrectCount: number;
  reviewStartedCount: number;
  reviewResolvedCount: number;
  skillFacts: LearningSkillFact[];
  updatedAt: string | null;
};

export type LocalLearningHistory = {
  schemaVersion: typeof LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION;
  nextSequence: number;
  profile: LearningProfile;
  recentEvents: LearningEvent[];
};

const skillKinds: LearningSkillKind[] = [
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;

const isSkillKind = (value: unknown): value is LearningSkillKind =>
  skillKinds.includes(value as LearningSkillKind);

const emptySkillFacts = (): LearningSkillFact[] => skillKinds.map((skillKind) => ({
  skillKind,
  checkedCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  reviewStartedCount: 0,
  reviewResolvedCount: 0,
}));

export const createEmptyLearningProfile = (
  suggestionsEnabled = true,
): LearningProfile => ({
  schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
  revision: 0,
  suggestionsEnabled,
  checkedCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  reviewStartedCount: 0,
  reviewResolvedCount: 0,
  skillFacts: emptySkillFacts(),
  updatedAt: null,
});

export const createEmptyLocalLearningHistory = (
  suggestionsEnabled = true,
): LocalLearningHistory => ({
  schemaVersion: LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION,
  nextSequence: 1,
  profile: createEmptyLearningProfile(suggestionsEnabled),
  recentEvents: [],
});

const createEvent = ({
  history,
  target,
  kind,
  practiceMode,
  outcome,
  occurredAt,
}: {
  history: LocalLearningHistory;
  target: LocalPracticeReviewTarget;
  kind: LearningEvent["kind"];
  practiceMode: LearningEvent["practiceMode"];
  outcome: LearningEvent["outcome"];
  occurredAt: string;
}): LearningEvent => ({
  schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
  eventId: `local-learning:${history.nextSequence}`,
  sequence: history.nextSequence,
  occurredAt,
  kind,
  skillKind: target.kind,
  difficulty: target.difficulty,
  targetKey: getLocalPracticeReviewTargetKey(target),
  practiceMode,
  outcome,
});

const applyEvent = (
  history: LocalLearningHistory,
  event: LearningEvent,
): LocalLearningHistory => {
  const facts = history.profile.skillFacts.map((fact) => ({ ...fact }));
  const fact = facts.find((item) => item.skillKind === event.skillKind);
  if (!fact) return history;

  const profile = { ...history.profile, skillFacts: facts };
  if (event.kind === "result-checked") {
    profile.checkedCount += 1;
    fact.checkedCount += 1;
    if (event.outcome === "correct") {
      profile.correctCount += 1;
      fact.correctCount += 1;
      if (event.practiceMode === "review") {
        profile.reviewResolvedCount += 1;
        fact.reviewResolvedCount += 1;
      }
    } else {
      profile.incorrectCount += 1;
      fact.incorrectCount += 1;
    }
  } else {
    profile.reviewStartedCount += 1;
    fact.reviewStartedCount += 1;
  }
  profile.revision += 1;
  profile.updatedAt = event.occurredAt;

  return {
    schemaVersion: LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION,
    nextSequence: event.sequence + 1,
    profile,
    recentEvents: [...history.recentEvents, event].slice(-MAX_RECENT_LEARNING_EVENTS),
  };
};

export const recordCheckedAnswerLearningEvent = ({
  history,
  result,
  practiceMode,
  occurredAt = new Date().toISOString(),
}: {
  history: LocalLearningHistory;
  result: LocalPracticeAnswerResult;
  practiceMode: LearningEvent["practiceMode"];
  occurredAt?: string;
}): LocalLearningHistory => applyEvent(history, createEvent({
  history,
  target: result.target,
  kind: "result-checked",
  practiceMode,
  outcome: result.isCorrect ? "correct" : "incorrect",
  occurredAt,
}));

export const recordReviewStartedLearningEvent = ({
  history,
  target,
  occurredAt = new Date().toISOString(),
}: {
  history: LocalLearningHistory;
  target: LocalPracticeReviewTarget;
  occurredAt?: string;
}): LocalLearningHistory => applyEvent(history, createEvent({
  history,
  target,
  kind: "review-started",
  practiceMode: "review",
  outcome: "not-applicable",
  occurredAt,
}));

export const setLearningSuggestionsEnabled = (
  history: LocalLearningHistory,
  suggestionsEnabled: boolean,
): LocalLearningHistory => ({
  ...history,
  profile: {
    ...history.profile,
    revision: history.profile.revision + 1,
    suggestionsEnabled,
  },
});

export const resetLocalLearningHistory = (
  history: LocalLearningHistory,
): LocalLearningHistory => createEmptyLocalLearningHistory(history.profile.suggestionsEnabled);

export type LearningSuggestion = {
  target: LocalPracticeReviewTarget;
  reason: string;
};

export const resolveLocalLearningSuggestion = (
  history: LocalLearningHistory,
  reviewQueue: LocalPracticeReviewTarget[],
): LearningSuggestion | null => {
  if (!history.profile.suggestionsEnabled || reviewQueue.length === 0) return null;
  const target = reviewQueue[0];
  const fact = history.profile.skillFacts.find((item) => item.skillKind === target.kind);
  return {
    target,
    reason: `仅根据本机已核对事实：${fact?.incorrectCount ?? 0} 次该类错误，当前有 ${reviewQueue.length} 题待复练。`,
  };
};

const parseSkillFact = (value: unknown): LearningSkillFact | null => {
  if (!isRecord(value) || !hasExactKeys(value, [
    "skillKind", "checkedCount", "correctCount", "incorrectCount",
    "reviewStartedCount", "reviewResolvedCount",
  ])) return null;
  if (!isSkillKind(value.skillKind)) return null;
  for (const key of ["checkedCount", "correctCount", "incorrectCount", "reviewStartedCount", "reviewResolvedCount"] as const) {
    if (!isCount(value[key])) return null;
  }
  if (value.checkedCount !== (value.correctCount as number) + (value.incorrectCount as number)) return null;
  return value as LearningSkillFact;
};

const parseProfile = (value: unknown): LearningProfile | null => {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "revision", "suggestionsEnabled", "checkedCount", "correctCount",
    "incorrectCount", "reviewStartedCount", "reviewResolvedCount", "skillFacts", "updatedAt",
  ])) return null;
  if (value.schemaVersion !== LEARNING_PROFILE_SCHEMA_VERSION || !isCount(value.revision)) return null;
  if (typeof value.suggestionsEnabled !== "boolean") return null;
  for (const key of ["checkedCount", "correctCount", "incorrectCount", "reviewStartedCount", "reviewResolvedCount"] as const) {
    if (!isCount(value[key])) return null;
  }
  const checkedCount = value.checkedCount as number;
  const correctCount = value.correctCount as number;
  const incorrectCount = value.incorrectCount as number;
  if (value.updatedAt !== null && (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)))) return null;
  if (!Array.isArray(value.skillFacts) || value.skillFacts.length !== skillKinds.length) return null;
  const facts = value.skillFacts.map(parseSkillFact);
  if (facts.some((fact) => fact === null)) return null;
  if (new Set(facts.map((fact) => fact?.skillKind)).size !== skillKinds.length) return null;
  const totals = (facts as LearningSkillFact[]).reduce((result, fact) => ({
    checkedCount: result.checkedCount + fact.checkedCount,
    correctCount: result.correctCount + fact.correctCount,
    incorrectCount: result.incorrectCount + fact.incorrectCount,
    reviewStartedCount: result.reviewStartedCount + fact.reviewStartedCount,
    reviewResolvedCount: result.reviewResolvedCount + fact.reviewResolvedCount,
  }), { checkedCount: 0, correctCount: 0, incorrectCount: 0, reviewStartedCount: 0, reviewResolvedCount: 0 });
  if (checkedCount !== correctCount + incorrectCount) return null;
  for (const key of ["checkedCount", "correctCount", "incorrectCount", "reviewStartedCount", "reviewResolvedCount"] as const) {
    if (value[key] !== totals[key]) return null;
  }
  return { ...value, skillFacts: facts as LearningSkillFact[] } as LearningProfile;
};

const parseEvent = (value: unknown): LearningEvent | null => {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "eventId", "sequence", "occurredAt", "kind", "skillKind",
    "difficulty", "targetKey", "practiceMode", "outcome",
  ])) return null;
  if (value.schemaVersion !== LEARNING_EVENT_SCHEMA_VERSION || !isCount(value.sequence) || value.sequence < 1) return null;
  if (value.eventId !== `local-learning:${value.sequence}`) return null;
  if (typeof value.occurredAt !== "string" || !Number.isFinite(Date.parse(value.occurredAt))) return null;
  if (value.kind !== "result-checked" && value.kind !== "review-started") return null;
  if (!isSkillKind(value.skillKind)) return null;
  if (value.difficulty !== "基础" && value.difficulty !== "进阶" && value.difficulty !== "挑战") return null;
  if (typeof value.targetKey !== "string" || value.targetKey.length < 3 || value.targetKey.length > 200) return null;
  if (value.practiceMode !== "random" && value.practiceMode !== "review" && value.practiceMode !== "custom") return null;
  if (value.outcome !== "correct" && value.outcome !== "incorrect" && value.outcome !== "not-applicable") return null;
  if (value.kind === "review-started" && (value.practiceMode !== "review" || value.outcome !== "not-applicable")) return null;
  if (value.kind === "result-checked" && value.outcome === "not-applicable") return null;
  return value as LearningEvent;
};

export const serializeLocalLearningHistory = (history: LocalLearningHistory): string =>
  JSON.stringify({
    schemaVersion: LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION,
    nextSequence: history.nextSequence,
    profile: {
      schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
      revision: history.profile.revision,
      suggestionsEnabled: history.profile.suggestionsEnabled,
      checkedCount: history.profile.checkedCount,
      correctCount: history.profile.correctCount,
      incorrectCount: history.profile.incorrectCount,
      reviewStartedCount: history.profile.reviewStartedCount,
      reviewResolvedCount: history.profile.reviewResolvedCount,
      skillFacts: history.profile.skillFacts.map((fact) => ({
        skillKind: fact.skillKind,
        checkedCount: fact.checkedCount,
        correctCount: fact.correctCount,
        incorrectCount: fact.incorrectCount,
        reviewStartedCount: fact.reviewStartedCount,
        reviewResolvedCount: fact.reviewResolvedCount,
      })),
      updatedAt: history.profile.updatedAt,
    },
    recentEvents: history.recentEvents.map((event) => ({
      schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
      eventId: event.eventId,
      sequence: event.sequence,
      occurredAt: event.occurredAt,
      kind: event.kind,
      skillKind: event.skillKind,
      difficulty: event.difficulty,
      targetKey: event.targetKey,
      practiceMode: event.practiceMode,
      outcome: event.outcome,
    })),
  } satisfies LocalLearningHistory);

export const deserializeLocalLearningHistory = (input: string): LocalLearningHistory | null => {
  if (input.length > MAX_LEARNING_PROFILE_SERIALIZED_LENGTH) return null;
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return null;
  }
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "nextSequence", "profile", "recentEvents"])) return null;
  const isCurrent = value.schemaVersion === LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION;
  const isPreviousCustomizer = value.schemaVersion === 8;
  const isPreviousModulation = value.schemaVersion === 7;
  const isPreviousSpacing = value.schemaVersion === 6;
  const isPreviousSeventh = value.schemaVersion === 5;
  const isPreviousScaleMode = value.schemaVersion === 4;
  const isPreviousProgression = value.schemaVersion === 3;
  const isPreviousChord = value.schemaVersion === 2;
  const isPrevious = value.schemaVersion === 1;
  if ((!isCurrent && !isPreviousCustomizer && !isPreviousModulation && !isPreviousSpacing && !isPreviousSeventh && !isPreviousScaleMode && !isPreviousProgression && !isPreviousChord && !isPrevious) || !isCount(value.nextSequence) || value.nextSequence < 1) return null;
  const nextSequence = value.nextSequence;
  const allowedPreviousKinds = isPrevious
    ? new Set<LearningSkillKind>(["single-pitch", "interval", "rhythm", "melody-dictation"])
    : isPreviousChord
      ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "rhythm", "melody-dictation"])
      : isPreviousProgression
        ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "harmony-progression", "rhythm", "melody-dictation"])
        : isPreviousScaleMode
          ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "harmony-progression", "scale-mode", "rhythm", "melody-dictation"])
          : isPreviousSeventh
            ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "harmony-progression", "scale-mode", "seventh-chord", "rhythm", "melody-dictation"])
            : isPreviousSpacing
              ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "harmony-progression", "scale-mode", "seventh-chord", "seventh-chord-spacing", "rhythm", "melody-dictation"])
              : (isPreviousModulation || isPreviousCustomizer)
                ? new Set<LearningSkillKind>(["single-pitch", "interval", "chord-inversion", "harmony-progression", "scale-mode", "seventh-chord", "seventh-chord-spacing", "modulation", "rhythm", "melody-dictation"])
                : null;
  const rawProfile = !isCurrent && isRecord(value.profile) && Array.isArray(value.profile.skillFacts)
    ? { ...value.profile, skillFacts: [
      ...value.profile.skillFacts,
      ...skillKinds.filter((kind) => !allowedPreviousKinds?.has(kind)).map((skillKind) => ({
        skillKind,
        checkedCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        reviewStartedCount: 0,
        reviewResolvedCount: 0,
      })),
    ] }
    : value.profile;
  const profile = parseProfile(rawProfile);
  if (!profile || !Array.isArray(value.recentEvents) || value.recentEvents.length > MAX_RECENT_LEARNING_EVENTS) return null;
  const recentEvents = value.recentEvents.map(parseEvent);
  if (recentEvents.some((event) => event === null)) return null;
  const events = recentEvents as LearningEvent[];
  if (allowedPreviousKinds && events.some((event) => !allowedPreviousKinds.has(event.skillKind))) return null;
  if (!isCurrent && !isPreviousCustomizer && events.some((event) => event.practiceMode === "custom")) return null;
  for (let index = 1; index < events.length; index += 1) {
    if (events[index].sequence <= events[index - 1].sequence) return null;
  }
  if (events.some((event) => event.sequence >= nextSequence)) return null;
  return {
    schemaVersion: LEARNING_PROFILE_ENVELOPE_SCHEMA_VERSION,
    nextSequence,
    profile,
    recentEvents: events,
  };
};
