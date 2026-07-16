import type { LocalVocalExerciseEvent } from "./localVocalExercise";
import type { RealtimePitchCurvePoint } from "./realtimePitchCurve";

export type LocalVocalTargetFeedbackState = "waiting" | "unreliable" | "close" | "high" | "low";

export const getLocalVocalTargetFeedback = (
  points: RealtimePitchCurvePoint[],
  targetEvents: LocalVocalExerciseEvent[],
  targetStartedAtMs: number | null,
): { state: LocalVocalTargetFeedbackState; cents: number | null; targetMidi: number | null } => {
  if (targetStartedAtMs === null || targetEvents.length === 0 || points.length === 0) return { state: "waiting", cents: null, targetMidi: null };
  const point = points.at(-1)!;
  const relativeSeconds = (point.timestampMs - targetStartedAtMs) / 1_000;
  const target = targetEvents.find((event) => relativeSeconds >= event.startSeconds && relativeSeconds <= event.startSeconds + event.durationSeconds);
  if (!target) return { state: "waiting", cents: null, targetMidi: null };
  if (point.state !== "reliable" || point.midi === null) return { state: "unreliable", cents: null, targetMidi: target.midi };
  const cents = (point.midi - target.midi) * 100;
  if (Math.abs(cents) <= 35) return { state: "close", cents, targetMidi: target.midi };
  return { state: cents > 0 ? "high" : "low", cents, targetMidi: target.midi };
};
