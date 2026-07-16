export const LOCAL_PRACTICE_REVIEW_QUEUE_SCHEMA_VERSION = 1 as const;
export const LOCAL_PRACTICE_CATALOG_VERSION = 1 as const;
export const LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS = 12;
export const LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH = 8 * 1024;

type LocalPracticeDifficulty = "基础" | "进阶";

type LocalPracticeReviewTargetBase = {
  difficulty: LocalPracticeDifficulty;
  seed: number;
  sequence: number;
};

export type LocalPracticeReviewTarget =
  | (LocalPracticeReviewTargetBase & { kind: "single-pitch" })
  | (LocalPracticeReviewTargetBase & {
      kind: "interval";
      direction: "上行" | "下行";
    })
  | (LocalPracticeReviewTargetBase & { kind: "rhythm" })
  | (LocalPracticeReviewTargetBase & { kind: "melody-dictation" });

export type LocalPracticeAnswerResult = {
  target: LocalPracticeReviewTarget;
  isCorrect: boolean;
};

export type LocalPracticeReviewQueue = LocalPracticeReviewTarget[];

type SerializedLocalPracticeReviewQueue = {
  schemaVersion: typeof LOCAL_PRACTICE_REVIEW_QUEUE_SCHEMA_VERSION;
  catalogVersion: typeof LOCAL_PRACTICE_CATALOG_VERSION;
  targets: LocalPracticeReviewQueue;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, expectedKeys: string[]): boolean => {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
};

const isDifficulty = (value: unknown): value is LocalPracticeDifficulty =>
  value === "基础" || value === "进阶";

const isSeed = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= 0xffffffff;

const isSequence = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const parseTarget = (value: unknown): LocalPracticeReviewTarget | null => {
  if (!isRecord(value)) return null;

  if (!isDifficulty(value.difficulty) || !isSeed(value.seed) || !isSequence(value.sequence)) return null;
  const difficulty = value.difficulty;
  const seed = value.seed;
  const sequence = value.sequence;

  if (value.kind === "interval") {
    if (!hasExactKeys(value, ["kind", "difficulty", "direction", "seed", "sequence"])) return null;
    if (value.direction !== "上行" && value.direction !== "下行") return null;
    return {
      kind: "interval",
      difficulty,
      direction: value.direction,
      seed,
      sequence,
    };
  }

  if (!hasExactKeys(value, ["kind", "difficulty", "seed", "sequence"])) return null;
  if (value.kind !== "single-pitch" && value.kind !== "rhythm" && value.kind !== "melody-dictation") {
    return null;
  }
  return {
    kind: value.kind,
    difficulty,
    seed,
    sequence,
  };
};

export const getLocalPracticeReviewTargetKey = (target: LocalPracticeReviewTarget): string =>
  [
    target.kind,
    target.difficulty,
    target.kind === "interval" ? target.direction : "",
    target.seed,
    target.sequence,
  ].join(":");

export const createLocalPracticeReviewQueue = (): LocalPracticeReviewQueue => [];
export const createEmptyLocalPracticeReviewQueue = createLocalPracticeReviewQueue;

/**
 * Wrong answers move the target to the front of the MRU queue. Correct answers
 * remove it. The queue intentionally stores only enough data to recreate a
 * built-in question; it never stores the user's selection or derived result.
 */
export const updateLocalPracticeReviewQueue = ({
  queue,
  target,
  isCorrect,
}: {
  queue: LocalPracticeReviewQueue;
  target: LocalPracticeReviewTarget;
  isCorrect: boolean;
}): LocalPracticeReviewQueue => {
  const targetKey = getLocalPracticeReviewTargetKey(target);
  const remaining = queue.filter((item) => getLocalPracticeReviewTargetKey(item) !== targetKey);
  if (isCorrect) return remaining;
  return [target, ...remaining].slice(0, LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS);
};

const serializeTarget = (target: LocalPracticeReviewTarget): LocalPracticeReviewTarget => {
  if (target.kind === "interval") {
    return {
      kind: "interval",
      difficulty: target.difficulty,
      direction: target.direction,
      seed: target.seed,
      sequence: target.sequence,
    };
  }
  return {
    kind: target.kind,
    difficulty: target.difficulty,
    seed: target.seed,
    sequence: target.sequence,
  };
};

export const serializeLocalPracticeReviewQueue = (queue: LocalPracticeReviewQueue): string =>
  JSON.stringify({
    schemaVersion: LOCAL_PRACTICE_REVIEW_QUEUE_SCHEMA_VERSION,
    catalogVersion: LOCAL_PRACTICE_CATALOG_VERSION,
    targets: queue.slice(0, LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS).map(serializeTarget),
  } satisfies SerializedLocalPracticeReviewQueue);

export const parseLocalPracticeReviewQueue = (input: string): LocalPracticeReviewQueue | null => {
  if (input.length > LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH) return null;
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return null;
  }

  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "catalogVersion", "targets"])) return null;
  if (
    value.schemaVersion !== LOCAL_PRACTICE_REVIEW_QUEUE_SCHEMA_VERSION
    || value.catalogVersion !== LOCAL_PRACTICE_CATALOG_VERSION
    || !Array.isArray(value.targets)
    || value.targets.length > LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS
  ) {
    return null;
  }

  const targets: LocalPracticeReviewQueue = [];
  const targetKeys = new Set<string>();
  for (const item of value.targets) {
    const target = parseTarget(item);
    if (!target) return null;
    const targetKey = getLocalPracticeReviewTargetKey(target);
    if (targetKeys.has(targetKey)) return null;
    targetKeys.add(targetKey);
    targets.push(target);
  }
  return targets;
};
