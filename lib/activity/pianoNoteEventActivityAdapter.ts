import { midiToScientificNoteName } from "../piano/pianoInteraction";
import {
  normalizeNoteEventV1,
  type NoteEventProducerV1,
  type NoteEventV1,
} from "../music/noteEvent";

export type ScreenPianoActivityProducer = Extract<
  NoteEventProducerV1,
  "screen-piano" | "computer-keyboard"
>;

export const createScreenPianoActivityNoteOn = ({
  originId,
  sequence,
  producer,
  note,
  velocity,
  atMs,
}: {
  originId: string;
  sequence: number;
  producer: ScreenPianoActivityProducer;
  note: number;
  velocity: number;
  atMs: number;
}): NoteEventV1 => normalizeNoteEventV1({
  schemaVersion: "note-event-v1",
  eventId: `${originId}:event-${sequence}`,
  sequence,
  type: "note-on",
  note,
  velocity,
  channel: 0,
  time: {
    schemaVersion: "musical-time-v1",
    timebase: "monotonic-ms",
    originId,
    positionMs: atMs,
  },
  source: {
    producer,
    transport: "none",
    verification: "not-applicable",
    deviceSessionId: null,
  },
});

export const adaptScreenPianoNoteEventsToNoteIds = (
  events: readonly NoteEventV1[],
): string[] => events.flatMap((event) => (
  event.type === "note-on"
  && (event.source.producer === "screen-piano" || event.source.producer === "computer-keyboard")
  && event.source.transport === "none"
    ? [midiToScientificNoteName(event.note)]
    : []
));
