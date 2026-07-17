export const PIANO_NOTE_EVENT_PROTOCOL_VERSION = "piano-note-events-v1";
export const DEFAULT_PIANO_POLYPHONY = 32;

export type PianoNoteEvent =
  | { type: "note-on"; note: number; velocity: number; channel: number; atMs: number }
  | { type: "note-off"; note: number; channel: number; atMs: number }
  | { type: "pedal"; down: boolean; channel: number; atMs: number }
  | { type: "all-notes-off"; atMs: number };

export type PianoAllocatedVoice = {
  id: string;
  note: number;
  channel: number;
  velocity: number;
  held: boolean;
  sustained: boolean;
  startedAtMs: number;
};

export type PianoVoiceAllocatorState = {
  pedalByChannel: Readonly<Record<number, boolean>>;
  voices: readonly PianoAllocatedVoice[];
  nextVoiceId: number;
};

export const createPianoVoiceAllocatorState = (): PianoVoiceAllocatorState => ({
  pedalByChannel: {},
  voices: [],
  nextVoiceId: 1,
});

const clampMidi = (note: number) => Math.max(0, Math.min(127, Math.round(note)));
const clampChannel = (channel: number) => Math.max(0, Math.min(15, Math.round(channel)));
const clampVelocity = (velocity: number) => Number.isFinite(velocity)
  ? Math.max(0, Math.min(1, velocity))
  : 0.75;

export const normalizePianoNoteEvent = (event: PianoNoteEvent): PianoNoteEvent => {
  const atMs = Number.isFinite(event.atMs) ? Math.max(0, event.atMs) : 0;
  if (event.type === "all-notes-off") return { ...event, atMs };
  const channel = clampChannel(event.channel);
  if (event.type === "pedal") return { ...event, channel, atMs };
  const note = clampMidi(event.note);
  if (event.type === "note-off") return { ...event, note, channel, atMs };
  return { ...event, note, channel, velocity: clampVelocity(event.velocity), atMs };
};

const chooseVoiceToSteal = (voices: readonly PianoAllocatedVoice[]) =>
  [...voices].sort((left, right) => {
    const leftPriority = left.held ? 1 : 0;
    const rightPriority = right.held ? 1 : 0;
    return leftPriority - rightPriority || left.startedAtMs - right.startedAtMs;
  })[0];

export const reducePianoNoteEvent = (
  state: PianoVoiceAllocatorState,
  rawEvent: PianoNoteEvent,
  maxPolyphony = DEFAULT_PIANO_POLYPHONY,
): PianoVoiceAllocatorState => {
  const event = normalizePianoNoteEvent(rawEvent);
  if (event.type === "all-notes-off") {
    return { ...state, pedalByChannel: {}, voices: [] };
  }
  if (event.type === "pedal") {
    const pedalByChannel = { ...state.pedalByChannel, [event.channel]: event.down };
    return {
      ...state,
      pedalByChannel,
      voices: event.down
        ? state.voices
        : state.voices.filter((voice) => voice.channel !== event.channel || voice.held),
    };
  }
  if (event.type === "note-off") {
    const pedalDown = state.pedalByChannel[event.channel] === true;
    return {
      ...state,
      voices: state.voices.flatMap((voice) => {
        if (voice.note !== event.note || voice.channel !== event.channel || !voice.held) return [voice];
        return pedalDown ? [{ ...voice, held: false, sustained: true }] : [];
      }),
    };
  }

  const withoutRetriggered = state.voices.filter(
    (voice) => voice.note !== event.note || voice.channel !== event.channel,
  );
  const limit = Math.max(1, Math.floor(maxPolyphony));
  let available = withoutRetriggered;
  if (available.length >= limit) {
    const stolen = chooseVoiceToSteal(available);
    available = available.filter((voice) => voice.id !== stolen?.id);
  }
  return {
    ...state,
    nextVoiceId: state.nextVoiceId + 1,
    voices: [...available, {
      id: `voice-${state.nextVoiceId}`,
      note: event.note,
      channel: event.channel,
      velocity: event.velocity,
      held: true,
      sustained: false,
      startedAtMs: event.atMs,
    }],
  };
};
