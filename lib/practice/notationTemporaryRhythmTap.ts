import { getBeatDurationSeconds, sanitizeMetronomeConfig, type MetronomeConfig } from "../metronome/metronomeConfig";
import { getBeatsPerBar } from "../metronome/metronomeGrid";
import type { RhythmTargetEvent } from "../rhythm/rhythmTapFeedback";
import type { NotationDraftEvent, NotationFragmentDraft } from "./localNotationFragmentDraft";

const durationBeats: Record<NotationDraftEvent["duration"], number> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export type NotationTemporaryRhythmTapTarget = RhythmTargetEvent & {
  notationEventId: string;
  notationEventIndex: number;
  notationMeasure: number;
};

export const getNotationEventDurationBeats = (event: NotationDraftEvent): number =>
  durationBeats[event.duration];

export const getNotationTemporaryRhythmTotalBeats = (
  events: NotationDraftEvent[],
): number => events.reduce((total, event) => total + getNotationEventDurationBeats(event), 0);

export const createNotationTemporaryRhythmTapTargets = ({
  draft,
  config,
  practiceStartTimeMs,
}: {
  draft: Pick<NotationFragmentDraft, "timeSignature" | "events">;
  config: MetronomeConfig;
  practiceStartTimeMs: number;
}): NotationTemporaryRhythmTapTarget[] => {
  const safeConfig = sanitizeMetronomeConfig({ ...config, meter: draft.timeSignature });
  const beatDurationMs = getBeatDurationSeconds(safeConfig.bpm) * 1000;
  const beatsPerBar = getBeatsPerBar(safeConfig.meter);
  let elapsedBeats = 0;
  let targetIndex = 0;

  return draft.events.flatMap((event, notationEventIndex) => {
    const startBeats = elapsedBeats;
    elapsedBeats += getNotationEventDurationBeats(event);
    if (event.type === "rest") return [];

    const beatIndex = Math.floor(startBeats);
    const targetTimeMs = practiceStartTimeMs + startBeats * beatDurationMs;
    const target: NotationTemporaryRhythmTapTarget = {
      phase: "practice",
      beatIndex,
      barNumber: Math.floor(startBeats / beatsPerBar) + 1,
      beatNumber: (beatIndex % beatsPerBar) + 1,
      scheduledTimeSeconds: targetTimeMs / 1000,
      isStrongBeat: beatIndex % beatsPerBar === 0,
      meter: safeConfig.meter,
      bpm: safeConfig.bpm,
      subdivisionIndex: Math.round((startBeats - beatIndex) * 2),
      targetTimeMs,
      targetIndex: targetIndex++,
      pattern: "quarter-note-pulse",
      subdivisionCountPerBeat: event.duration === "eighth" ? 2 : 1,
      notationEventId: event.id,
      notationEventIndex,
      notationMeasure: event.measure,
    };
    return [target];
  });
};

export const hasNotationTemporaryRhythmAssessmentFields = (
  target: NotationTemporaryRhythmTapTarget,
): boolean => ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in target);
