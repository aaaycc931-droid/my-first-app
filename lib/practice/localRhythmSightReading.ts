import type { LocalEarTrainingRhythmQuestion } from "./localEarTrainingRhythm";
import type { RhythmTargetEvent } from "../rhythm/rhythmTapFeedback";

export const LOCAL_RHYTHM_SIGHT_READING_COUNT_IN_BEATS = 4;

export const createLocalRhythmSightReadingTargets = ({
  question,
  practiceStartTimeMs,
}: {
  question: LocalEarTrainingRhythmQuestion;
  practiceStartTimeMs: number;
}): RhythmTargetEvent[] => {
  const beatDurationMs = 60_000 / question.bpm;
  return question.pattern.onsetBeats.map((onsetBeat, targetIndex) => {
    const beatIndex = Math.floor(onsetBeat);
    const targetTimeMs = practiceStartTimeMs + onsetBeat * beatDurationMs;
    return {
      phase: "practice",
      beatIndex,
      barNumber: 1,
      beatNumber: beatIndex + 1,
      scheduledTimeSeconds: targetTimeMs / 1000,
      isStrongBeat: beatIndex === 0,
      meter: "4/4",
      bpm: question.bpm,
      targetTimeMs,
      targetIndex,
      pattern: "sight-reading-question",
      subdivisionIndex: Math.round((onsetBeat - beatIndex) * 12),
      subdivisionCountPerBeat: 12,
    };
  });
};

export const getLocalRhythmSightReadingDurationMs = (
  question: LocalEarTrainingRhythmQuestion,
) => Math.ceil((question.beatsPerMeasure * 60_000) / question.bpm);

export const getLocalRhythmSightReadingOnsetLabel = (onsetBeat: number) => {
  const beat = Math.floor(onsetBeat) + 1;
  const fraction = onsetBeat - Math.floor(onsetBeat);
  if (Math.abs(fraction) < 0.001) return `第 ${beat} 拍`;
  if (Math.abs(fraction - 0.25) < 0.001) return `第 ${beat} 拍 + 1/4`;
  if (Math.abs(fraction - 1 / 3) < 0.001) return `第 ${beat} 拍 + 1/3`;
  if (Math.abs(fraction - 0.5) < 0.001) return `第 ${beat} 拍 + 1/2`;
  if (Math.abs(fraction - 2 / 3) < 0.001) return `第 ${beat} 拍 + 2/3`;
  if (Math.abs(fraction - 0.75) < 0.001) return `第 ${beat} 拍 + 3/4`;
  return `第 ${beat} 拍内`;
};

export const hasLocalRhythmSightReadingAssessmentFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (field) => field in value,
  );
