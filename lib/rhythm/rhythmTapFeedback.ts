import {
  getBeatDurationSeconds,
  sanitizeMetronomeConfig,
  type MetronomeConfig,
} from "../metronome/metronomeConfig";
import {
  createMetronomeBeatGrid,
  getBeatsPerBar,
  type PracticeBeatMetadata,
} from "../metronome/metronomeGrid";

export type RhythmPracticePhase = "idle" | "count-in" | "practice" | "stopped";
export type RhythmTargetPattern = "quarter-note-pulse" | "eighth-note-pulse" | "sight-reading-question";

export const rhythmTargetPatternLabels: Record<RhythmTargetPattern, string> = {
  "quarter-note-pulse": "Quarter-note pulse",
  "eighth-note-pulse": "Eighth-note pulse",
  "sight-reading-question": "Visible rhythm question",
};

export const rhythmTargetPatternTapGuidance: Record<RhythmTargetPattern, string> = {
  "quarter-note-pulse": "Tap once per beat",
  "eighth-note-pulse": "Tap twice per beat",
  "sight-reading-question": "Tap the visible onset positions",
};

export type RhythmTapFeedbackCategory =
  | "close"
  | "early"
  | "late"
  | "missed"
  | "extra"
  | "not-started"
  | "waiting-for-taps";

export type RhythmTargetEvent = PracticeBeatMetadata & {
  targetTimeMs: number;
  targetIndex: number;
  pattern: RhythmTargetPattern;
  subdivisionIndex: number;
  subdivisionCountPerBeat: number;
};

export type RhythmTapEvent = {
  id: number;
  timestampMs: number;
  phase: RhythmPracticePhase;
};

export type RhythmTapFeedbackEvent = {
  category: RhythmTapFeedbackCategory;
  targetIndex: number | null;
  tapId: number | null;
  targetTimeMs: number | null;
  tapTimeMs: number | null;
  offsetMs: number | null;
  message: string;
};

export type RhythmTapFeedbackSummary = {
  status: RhythmTapFeedbackCategory;
  feedback: RhythmTapFeedbackEvent[];
  matchedTapCount: number;
  targetCount: number;
  tapCount: number;
  closeToleranceMs: number;
  matchWindowMs: number;
  appliedLatencyOffsetMs: number;
  alignmentEngineId: RhythmAlignmentEngineId;
};

export type RhythmAlignmentEngineId = "monotonic-dynamic-programming-v1";

export type RhythmAlignmentPair = {
  targetPosition: number;
  tapPosition: number;
  offsetMs: number;
};

export type RhythmAlignmentResult = {
  engineId: RhythmAlignmentEngineId;
  pairs: RhythmAlignmentPair[];
  unmatchedTargetPositions: number[];
  unmatchedTapPositions: number[];
  totalAbsoluteOffsetMs: number;
};

export const rhythmCloseToleranceMs = 80;
export const rhythmMatchWindowMs = 180;
export const rhythmAlignmentEngineId: RhythmAlignmentEngineId =
  "monotonic-dynamic-programming-v1";

type RhythmAlignmentStep = "match" | "miss" | "extra";

type RhythmAlignmentCell = {
  cost: number;
  matchedCount: number;
  totalAbsoluteOffsetMs: number;
  previousTargetCount: number;
  previousTapCount: number;
  step: RhythmAlignmentStep;
};

const isPreferredAlignmentCell = (
  candidate: RhythmAlignmentCell,
  current: RhythmAlignmentCell | undefined,
) => {
  if (!current) return true;
  const epsilon = 1e-9;
  if (candidate.cost < current.cost - epsilon) return true;
  if (candidate.cost > current.cost + epsilon) return false;
  if (candidate.matchedCount !== current.matchedCount) {
    return candidate.matchedCount > current.matchedCount;
  }
  if (candidate.totalAbsoluteOffsetMs !== current.totalAbsoluteOffsetMs) {
    return candidate.totalAbsoluteOffsetMs < current.totalAbsoluteOffsetMs;
  }
  const priority: Record<RhythmAlignmentStep, number> = {
    match: 0,
    miss: 1,
    extra: 2,
  };
  return priority[candidate.step] < priority[current.step];
};

export const alignRhythmTargetsAndTaps = ({
  targets,
  taps,
  matchWindowMs,
  latencyOffsetMs = 0,
}: {
  targets: RhythmTargetEvent[];
  taps: RhythmTapEvent[];
  matchWindowMs: number;
  latencyOffsetMs?: number;
}): RhythmAlignmentResult => {
  const safeMatchWindowMs = Math.max(1, Math.abs(matchWindowMs));
  const orderedTargetEntries = targets
    .map((target, originalPosition) => ({ target, originalPosition }))
    .sort(
      (left, right) =>
        left.target.targetTimeMs - right.target.targetTimeMs ||
        left.originalPosition - right.originalPosition,
    );
  const orderedTapEntries = taps
    .map((tap, originalPosition) => ({
      tap,
      originalPosition,
      adjustedTimeMs: tap.timestampMs - latencyOffsetMs,
    }))
    .sort(
      (left, right) =>
        left.adjustedTimeMs - right.adjustedTimeMs ||
        left.originalPosition - right.originalPosition,
    );
  const targetCount = orderedTargetEntries.length;
  const tapCount = orderedTapEntries.length;
  const cells: Array<Array<RhythmAlignmentCell | undefined>> = Array.from(
    { length: targetCount + 1 },
    () => Array<RhythmAlignmentCell | undefined>(tapCount + 1),
  );
  cells[0][0] = {
    cost: 0,
    matchedCount: 0,
    totalAbsoluteOffsetMs: 0,
    previousTargetCount: 0,
    previousTapCount: 0,
    step: "match",
  };

  const updateCell = (
    targetPosition: number,
    tapPosition: number,
    candidate: RhythmAlignmentCell,
  ) => {
    if (isPreferredAlignmentCell(candidate, cells[targetPosition][tapPosition])) {
      cells[targetPosition][tapPosition] = candidate;
    }
  };

  for (let targetPosition = 0; targetPosition <= targetCount; targetPosition += 1) {
    for (let tapPosition = 0; tapPosition <= tapCount; tapPosition += 1) {
      const current = cells[targetPosition][tapPosition];
      if (!current) continue;

      if (targetPosition < targetCount) {
        updateCell(targetPosition + 1, tapPosition, {
          cost: current.cost + 1,
          matchedCount: current.matchedCount,
          totalAbsoluteOffsetMs: current.totalAbsoluteOffsetMs,
          previousTargetCount: targetPosition,
          previousTapCount: tapPosition,
          step: "miss",
        });
      }
      if (tapPosition < tapCount) {
        updateCell(targetPosition, tapPosition + 1, {
          cost: current.cost + 1,
          matchedCount: current.matchedCount,
          totalAbsoluteOffsetMs: current.totalAbsoluteOffsetMs,
          previousTargetCount: targetPosition,
          previousTapCount: tapPosition,
          step: "extra",
        });
      }
      if (targetPosition < targetCount && tapPosition < tapCount) {
        const target = orderedTargetEntries[targetPosition].target;
        const tap = orderedTapEntries[tapPosition];
        const offsetMs = tap.adjustedTimeMs - target.targetTimeMs;
        const absoluteOffsetMs = Math.abs(offsetMs);
        if (absoluteOffsetMs <= safeMatchWindowMs) {
          updateCell(targetPosition + 1, tapPosition + 1, {
            cost: current.cost + absoluteOffsetMs / safeMatchWindowMs,
            matchedCount: current.matchedCount + 1,
            totalAbsoluteOffsetMs:
              current.totalAbsoluteOffsetMs + absoluteOffsetMs,
            previousTargetCount: targetPosition,
            previousTapCount: tapPosition,
            step: "match",
          });
        }
      }
    }
  }

  const pairs: RhythmAlignmentPair[] = [];
  const unmatchedTargetPositions: number[] = [];
  const unmatchedTapPositions: number[] = [];
  let targetPosition = targetCount;
  let tapPosition = tapCount;

  while (targetPosition > 0 || tapPosition > 0) {
    const cell = cells[targetPosition][tapPosition];
    if (!cell) break;
    if (cell.step === "match") {
      const targetEntry = orderedTargetEntries[targetPosition - 1];
      const tapEntry = orderedTapEntries[tapPosition - 1];
      pairs.push({
        targetPosition: targetEntry.originalPosition,
        tapPosition: tapEntry.originalPosition,
        offsetMs: tapEntry.adjustedTimeMs - targetEntry.target.targetTimeMs,
      });
    } else if (cell.step === "miss") {
      unmatchedTargetPositions.push(
        orderedTargetEntries[targetPosition - 1].originalPosition,
      );
    } else {
      unmatchedTapPositions.push(orderedTapEntries[tapPosition - 1].originalPosition);
    }
    targetPosition = cell.previousTargetCount;
    tapPosition = cell.previousTapCount;
  }

  return {
    engineId: rhythmAlignmentEngineId,
    pairs: pairs.reverse(),
    unmatchedTargetPositions: unmatchedTargetPositions.reverse(),
    unmatchedTapPositions: unmatchedTapPositions.reverse(),
    totalAbsoluteOffsetMs:
      cells[targetCount][tapCount]?.totalAbsoluteOffsetMs ?? 0,
  };
};

const rhythmPatternSubdivisionCounts: Record<RhythmTargetPattern, number> = {
  "quarter-note-pulse": 1,
  "eighth-note-pulse": 2,
  "sight-reading-question": 1,
};

export const createRhythmTargetPattern = ({
  config,
  practiceStartTimeMs,
  barCount = 2,
  pattern = "quarter-note-pulse",
}: {
  config: MetronomeConfig;
  practiceStartTimeMs: number;
  barCount?: number;
  pattern?: RhythmTargetPattern;
}): RhythmTargetEvent[] => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const beatsPerBar = getBeatsPerBar(safeConfig.meter);
  const beatCount = Math.max(0, Math.floor(barCount) * beatsPerBar);
  const beatDurationMs = getBeatDurationSeconds(safeConfig.bpm) * 1000;
  const subdivisionCountPerBeat = rhythmPatternSubdivisionCounts[pattern];
  const targetIntervalMs = beatDurationMs / subdivisionCountPerBeat;

  return createMetronomeBeatGrid({
    config: safeConfig,
    startTimeSeconds: practiceStartTimeMs / 1000,
    beatCount,
  }).flatMap((beat) =>
    Array.from({ length: subdivisionCountPerBeat }, (_, subdivisionIndex) => {
      const targetIndex = beat.beatIndex * subdivisionCountPerBeat + subdivisionIndex;
      const targetTimeMs = practiceStartTimeMs + targetIndex * targetIntervalMs;

      return {
        ...beat,
        targetIndex,
        targetTimeMs,
        scheduledTimeSeconds: targetTimeMs / 1000,
        pattern,
        subdivisionIndex,
        subdivisionCountPerBeat,
      };
    }),
  );
};

export const createQuarterPulseTargetPattern = (options: {
  config: MetronomeConfig;
  practiceStartTimeMs: number;
  barCount?: number;
}): RhythmTargetEvent[] =>
  createRhythmTargetPattern({ ...options, pattern: "quarter-note-pulse" });

const formatOffset = (offsetMs: number) =>
  `${Math.round(Math.abs(offsetMs))}ms`;

export const getRhythmTapFeedback = ({
  targets,
  taps,
  phase,
  nowMs,
  closeToleranceMs = rhythmCloseToleranceMs,
  matchWindowMs = rhythmMatchWindowMs,
  latencyOffsetMs = 0,
}: {
  targets: RhythmTargetEvent[];
  taps: RhythmTapEvent[];
  phase: RhythmPracticePhase;
  nowMs: number;
  closeToleranceMs?: number;
  matchWindowMs?: number;
  latencyOffsetMs?: number;
}): RhythmTapFeedbackSummary => {
  if (phase === "idle" || phase === "count-in") {
    return {
      status: "not-started",
      feedback: [],
      matchedTapCount: 0,
      targetCount: targets.length,
      tapCount: 0,
      closeToleranceMs,
      matchWindowMs,
      appliedLatencyOffsetMs: latencyOffsetMs,
      alignmentEngineId: rhythmAlignmentEngineId,
    };
  }

  const practiceTaps = taps.filter((tap) => tap.phase === "practice");

  if (practiceTaps.length === 0) {
    return {
      status: "waiting-for-taps",
      feedback: [],
      matchedTapCount: 0,
      targetCount: targets.length,
      tapCount: 0,
      closeToleranceMs,
      matchWindowMs,
      appliedLatencyOffsetMs: latencyOffsetMs,
      alignmentEngineId: rhythmAlignmentEngineId,
    };
  }

  const alignment = alignRhythmTargetsAndTaps({
    targets,
    taps: practiceTaps,
    matchWindowMs,
    latencyOffsetMs,
  });
  const alignmentPairByTargetPosition = new Map(
    alignment.pairs.map((pair) => [pair.targetPosition, pair]),
  );
  const matchedTapPositions = new Set(
    alignment.pairs.map((pair) => pair.tapPosition),
  );
  const feedback: RhythmTapFeedbackEvent[] = [];

  targets.forEach((target, targetPosition) => {
    const pair = alignmentPairByTargetPosition.get(targetPosition);
    const bestTap = pair ? practiceTaps[pair.tapPosition] : undefined;

    if (bestTap && pair) {
      const adjustedTapTimeMs = bestTap.timestampMs - latencyOffsetMs;
      const offsetMs = pair.offsetMs;
      const category =
        Math.abs(offsetMs) <= closeToleranceMs
          ? "close"
          : offsetMs < 0
            ? "early"
            : "late";
      feedback.push({
        category,
        targetIndex: target.targetIndex,
        tapId: bestTap.id,
        targetTimeMs: target.targetTimeMs,
        tapTimeMs: adjustedTapTimeMs,
        offsetMs,
        message:
          category === "close"
            ? "接近目标拍"
            : category === "early"
              ? `偏早 ${formatOffset(offsetMs)}`
              : `偏晚 ${formatOffset(offsetMs)}`,
      });
      return;
    }

    if (nowMs >= target.targetTimeMs + matchWindowMs) {
      feedback.push({
        category: "missed",
        targetIndex: target.targetIndex,
        tapId: null,
        targetTimeMs: target.targetTimeMs,
        tapTimeMs: null,
        offsetMs: null,
        message: "这一拍没有检测到 tap",
      });
    }
  });

  practiceTaps.forEach((tap, tapPosition) => {
    if (matchedTapPositions.has(tapPosition)) {
      return;
    }
    feedback.push({
      category: "extra",
      targetIndex: null,
      tapId: tap.id,
      targetTimeMs: null,
      tapTimeMs: tap.timestampMs,
      offsetMs: null,
      message: "额外 tap：没有对应到当前目标拍",
    });
  });

  return {
    status: feedback[feedback.length - 1]?.category ?? "waiting-for-taps",
    feedback: feedback.sort(
      (a, b) =>
        (a.tapTimeMs ?? a.targetTimeMs ?? 0) -
        (b.tapTimeMs ?? b.targetTimeMs ?? 0),
    ),
    matchedTapCount: alignment.pairs.length,
    targetCount: targets.length,
    tapCount: practiceTaps.length,
    closeToleranceMs,
    matchWindowMs,
    appliedLatencyOffsetMs: latencyOffsetMs,
    alignmentEngineId: alignment.engineId,
  };
};

export const hasRhythmScoringFields = (value: object) =>
  [
    "score",
    "grade",
    "pass",
    "fail",
    "accuracyPercentage",
    "finalResult",
    "assessment",
  ].some((fieldName) => fieldName in value);
