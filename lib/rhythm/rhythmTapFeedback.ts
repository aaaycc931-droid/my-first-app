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
export type RhythmTargetPattern = "quarter-note-pulse" | "eighth-note-pulse";

export const rhythmTargetPatternLabels: Record<RhythmTargetPattern, string> = {
  "quarter-note-pulse": "Quarter-note pulse",
  "eighth-note-pulse": "Eighth-note pulse",
};

export const rhythmTargetPatternTapGuidance: Record<RhythmTargetPattern, string> = {
  "quarter-note-pulse": "Tap once per beat",
  "eighth-note-pulse": "Tap twice per beat",
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
};

export const rhythmCloseToleranceMs = 80;
export const rhythmMatchWindowMs = 180;

const rhythmPatternSubdivisionCounts: Record<RhythmTargetPattern, number> = {
  "quarter-note-pulse": 1,
  "eighth-note-pulse": 2,
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
}: {
  targets: RhythmTargetEvent[];
  taps: RhythmTapEvent[];
  phase: RhythmPracticePhase;
  nowMs: number;
  closeToleranceMs?: number;
  matchWindowMs?: number;
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
    };
  }

  const usedTapIds = new Set<number>();
  const feedback: RhythmTapFeedbackEvent[] = [];

  targets.forEach((target) => {
    let bestTapIndex = -1;
    let bestAbsOffset = Number.POSITIVE_INFINITY;

    practiceTaps.forEach((tap, tapIndex) => {
      if (usedTapIds.has(tap.id)) {
        return;
      }
      const absOffset = Math.abs(tap.timestampMs - target.targetTimeMs);
      if (absOffset <= matchWindowMs && absOffset < bestAbsOffset) {
        bestTapIndex = tapIndex;
        bestAbsOffset = absOffset;
      }
    });

    const bestTap = practiceTaps[bestTapIndex];

    if (bestTap) {
      usedTapIds.add(bestTap.id);
      const offsetMs = bestTap.timestampMs - target.targetTimeMs;
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
        tapTimeMs: bestTap.timestampMs,
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

  practiceTaps.forEach((tap) => {
    if (usedTapIds.has(tap.id)) {
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
    matchedTapCount: usedTapIds.size,
    targetCount: targets.length,
    tapCount: practiceTaps.length,
    closeToleranceMs,
    matchWindowMs,
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
