import type { NotationDraftEvent, NotationDuration } from "./localNotationFragmentDraft";
import { getNotationTargetPitchFrequencyHz } from "./nonScoringNotationTargetPitchFeedback";

const durationSeconds: Record<NotationDuration, number> = {
  half: 1.2,
  quarter: 0.6,
  eighth: 0.3,
};

export const notationReferenceMelodyPlaybackRates = [0.75, 1] as const;
export type NotationReferenceMelodyPlaybackRate = (typeof notationReferenceMelodyPlaybackRates)[number];

export type NotationReferenceMelodyPlaybackEvent = {
  eventIndex: number;
  frequencyHz: number | null;
  offsetSeconds: number;
  durationSeconds: number;
};

export function getNotationReferenceMelodyPlaybackPlan(events: NotationDraftEvent[], rate: NotationReferenceMelodyPlaybackRate = 1): NotationReferenceMelodyPlaybackEvent[] {
  let offsetSeconds = 0;

  return events.map((event, eventIndex) => {
    const duration = durationSeconds[event.duration] / rate;
    const playbackEvent = {
      eventIndex,
      frequencyHz: event.type === "note" ? getNotationTargetPitchFrequencyHz(event.pitch) : null,
      offsetSeconds,
      durationSeconds: duration,
    };
    offsetSeconds += duration;
    return playbackEvent;
  });
}

export function getNotationReferenceMelodyPlaybackDurationSeconds(events: NotationDraftEvent[], rate: NotationReferenceMelodyPlaybackRate = 1): number {
  const plan = getNotationReferenceMelodyPlaybackPlan(events, rate);
  const lastEvent = plan.at(-1);
  return lastEvent ? lastEvent.offsetSeconds + lastEvent.durationSeconds : 0;
}
