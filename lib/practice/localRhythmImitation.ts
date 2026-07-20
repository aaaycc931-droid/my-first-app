import type { LocalEarTrainingRhythmQuestion } from "./localEarTrainingRhythm";
import type { RhythmTargetEvent } from "../rhythm/rhythmTapFeedback";

export const LOCAL_RHYTHM_IMITATION_COUNT_IN_BEATS = 4;

export const createLocalRhythmImitationTargets = ({
  question,
  practiceStartTimeMs,
}: {
  question: LocalEarTrainingRhythmQuestion;
  practiceStartTimeMs: number;
}): RhythmTargetEvent[] => {
  const beatDurationMs = 60_000 / question.bpm;
  return question.pattern.onsetBeats.map((onsetBeat, targetIndex) => {
    const beatIndex = Math.floor(onsetBeat);
    return {
      phase: "practice",
      beatIndex,
      barNumber: 1,
      beatNumber: beatIndex + 1,
      scheduledTimeSeconds: (practiceStartTimeMs + onsetBeat * beatDurationMs) / 1000,
      isStrongBeat: beatIndex === 0,
      meter: "4/4",
      bpm: question.bpm,
      targetTimeMs: practiceStartTimeMs + onsetBeat * beatDurationMs,
      targetIndex,
      pattern: "sight-reading-question",
      subdivisionIndex: Math.round((onsetBeat - beatIndex) * 12),
      subdivisionCountPerBeat: 12,
    };
  });
};

export const getLocalRhythmImitationDurationMs = (
  question: LocalEarTrainingRhythmQuestion,
) => Math.ceil((question.beatsPerMeasure * 60_000) / question.bpm);

export const hasLocalRhythmImitationAssessmentFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (field) => field in value,
  );
