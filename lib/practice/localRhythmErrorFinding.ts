import type { LocalEarTrainingRhythmQuestion } from "./localEarTrainingRhythm";
import { getLocalRhythmSightReadingOnsetLabel } from "./localRhythmSightReading";

export type RhythmErrorKind = "missed" | "split" | "merged" | "shifted";

export type RhythmErrorFindingCandidate = {
  id: string;
  kind: RhythmErrorKind;
  label: string;
  explanation: string;
  sourceOnsetBeats: number[];
  performedOnsetBeats: number[];
};

export type LocalRhythmErrorFindingChallenge = {
  challengeId: string;
  correctCandidate: RhythmErrorFindingCandidate;
  options: Array<Pick<RhythmErrorFindingCandidate, "id" | "label">>;
};

const kindLabels: Record<RhythmErrorKind, string> = {
  missed: "漏掉",
  split: "拆分",
  merged: "合并",
  shifted: "位移",
};

const createCandidate = (
  question: LocalEarTrainingRhythmQuestion,
  kind: RhythmErrorKind,
  offset: number,
): RhythmErrorFindingCandidate => {
  const source = [...question.pattern.onsetBeats];
  const index = source.length <= 1 ? 0 : 1 + (offset % (source.length - 1));
  let performed = [...source];
  let location = source[index] ?? 0;
  if (kind === "missed") performed.splice(index, 1);
  if (kind === "split") {
    const base = source[index] ?? 0;
    const delta = Math.min(0.25, Math.max(0.125, ((source[index + 1] ?? 4) - base) / 3));
    performed.splice(index, 1, Math.max(0, base - delta / 2), Math.min(3.875, base + delta / 2));
  }
  if (kind === "merged") {
    let pairIndex = 0;
    let smallestGap = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < source.length - 1; candidate += 1) {
      const gap = source[candidate + 1]! - source[candidate]!;
      if (gap < smallestGap) {
        smallestGap = gap;
        pairIndex = candidate;
      }
    }
    location = source[pairIndex] ?? 0;
    const midpoint = ((source[pairIndex] ?? 0) + (source[pairIndex + 1] ?? 0)) / 2;
    performed.splice(pairIndex, 2, midpoint);
  }
  if (kind === "shifted") {
    const base = source[index] ?? 0;
    const next = base + 0.25 < 4 && !source.some((value) => Math.abs(value - (base + 0.25)) < 0.01)
      ? base + 0.25 : Math.max(0, base - 0.25);
    performed[index] = next;
  }
  performed.sort((a, b) => a - b);
  const label = `${getLocalRhythmSightReadingOnsetLabel(location)}附近：${kindLabels[kind]}`;
  return {
    id: `${kind}:${Math.round(location * 12)}`,
    kind,
    label,
    explanation: `版本化目标在${getLocalRhythmSightReadingOnsetLabel(location)}附近发生“${kindLabels[kind]}”变化。只描述本题的可验证事件差异。`,
    sourceOnsetBeats: source,
    performedOnsetBeats: performed,
  };
};

export const createLocalRhythmErrorFindingChallenge = (
  question: LocalEarTrainingRhythmQuestion,
): LocalRhythmErrorFindingChallenge => {
  const kinds: RhythmErrorKind[] = ["missed", "split", "merged", "shifted"];
  const candidates = kinds.map((kind, index) => createCandidate(question, kind, question.sequence + index));
  const correctCandidate = candidates[question.sequence % candidates.length]!;
  return {
    challengeId: `rhythm-error:${question.variantId}:${correctCandidate.id}`,
    correctCandidate,
    options: candidates.map(({ id, label }) => ({ id, label })),
  };
};

export const hasRhythmErrorFindingAssessmentFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some((field) => field in value);
