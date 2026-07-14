import type { NotationDraftEvent, NotationDuration } from "./localNotationFragmentDraft";
import { getNotationTargetPitchFrequencyHz } from "./nonScoringNotationTargetPitchFeedback";

const durationSeconds: Record<NotationDuration, number> = {
  half: 1.2,
  quarter: 0.6,
  eighth: 0.3,
};

export type NotationReferenceMelodyPlaybackEvent = {
  eventIndex: number;
  frequencyHz: number | null;
  offsetSeconds: number;
  durationSeconds: number;
};

export function getNotationReferenceMelodyPlaybackPlan(events: NotationDraftEvent[]): NotationReferenceMelodyPlaybackEvent[] {
  let offsetSeconds = 0;

  return events.map((event, eventIndex) => {
    const duration = durationSeconds[event.duration];
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

export function getNotationReferenceMelodyPlaybackDurationSeconds(events: NotationDraftEvent[]): number {
  const plan = getNotationReferenceMelodyPlaybackPlan(events);
  const lastEvent = plan.at(-1);
  return lastEvent ? lastEvent.offsetSeconds + lastEvent.durationSeconds : 0;
}
