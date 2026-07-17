import {
  midiToFrequencyHz,
  noteNameToMidi,
} from "../audio/noteFrequency";

export const LOCAL_PIANO_RANGE_IDS = ["C3-C4", "C4-C5", "C5-C6"] as const;
export type LocalPianoRangeId = (typeof LOCAL_PIANO_RANGE_IDS)[number];

export const DEFAULT_LOCAL_PIANO_RANGE_ID: LocalPianoRangeId = "C4-C5";
export const MAX_LOCAL_PIANO_ACTIVE_KEYS = 32;

export type LocalPianoKey = {
  id: string;
  noteName: string;
  soundingNoteName?: string;
  midi: number;
  frequencyHz: number;
  keyType: "white" | "black";
  /** White-key slot, or the white key immediately before a black key. */
  whiteKeyIndex: number;
  accessibleLabel: string;
};

const chromaticNotes = [
  { name: "C", keyType: "white", whiteKeyIndex: 0 },
  { name: "C#", keyType: "black", whiteKeyIndex: 0 },
  { name: "D", keyType: "white", whiteKeyIndex: 1 },
  { name: "D#", keyType: "black", whiteKeyIndex: 1 },
  { name: "E", keyType: "white", whiteKeyIndex: 2 },
  { name: "F", keyType: "white", whiteKeyIndex: 3 },
  { name: "F#", keyType: "black", whiteKeyIndex: 3 },
  { name: "G", keyType: "white", whiteKeyIndex: 4 },
  { name: "G#", keyType: "black", whiteKeyIndex: 4 },
  { name: "A", keyType: "white", whiteKeyIndex: 5 },
  { name: "A#", keyType: "black", whiteKeyIndex: 5 },
  { name: "B", keyType: "white", whiteKeyIndex: 6 },
] as const;

const octaveForRange = (rangeId: LocalPianoRangeId): number =>
  Number(rangeId.slice(1, 2));

const createAccessibleLabel = ({
  noteName,
  midi,
  keyType,
}: Pick<LocalPianoKey, "noteName" | "midi" | "keyType">): string => {
  const chineseNoteName = noteName.includes("#")
    ? `升 ${noteName.replace("#", "")}`
    : noteName;
  const centralCLabel = midi === 60 ? "中央 C，" : "";
  return `${centralCLabel}${chineseNoteName}，${keyType === "white" ? "白键" : "黑键"}`;
};

export const getLocalPianoKeys = (rangeId: LocalPianoRangeId): LocalPianoKey[] => {
  const octave = octaveForRange(rangeId);
  const noteSpecs = [
    ...chromaticNotes.map((note) => ({ ...note, octave })),
    { name: "C", keyType: "white" as const, whiteKeyIndex: 7, octave: octave + 1 },
  ];

  return noteSpecs.map(({ name, octave: noteOctave, keyType, whiteKeyIndex }) => {
    const noteName = `${name}${noteOctave}`;
    const midi = noteNameToMidi(noteName);
    if (midi === null) {
      throw new Error("本地钢琴音名无效");
    }
    return {
      id: noteName.toLowerCase().replace("#", "-sharp-"),
      noteName,
      midi,
      frequencyHz: midiToFrequencyHz(midi),
      keyType,
      whiteKeyIndex,
      accessibleLabel: createAccessibleLabel({ noteName, midi, keyType }),
    };
  });
};

export const getFullPianoKeys = (): LocalPianoKey[] => {
  const keys: LocalPianoKey[] = [];
  let whiteKeyIndex = 0;
  for (let midi = 21; midi <= 108; midi += 1) {
    const pitchClass = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const name = names[pitchClass];
    const keyType = name.includes("#") ? "black" as const : "white" as const;
    const noteName = `${name}${octave}`;
    keys.push({
      id: noteName.toLowerCase().replace("#", "-sharp-"),
      noteName,
      midi,
      frequencyHz: midiToFrequencyHz(midi),
      keyType,
      whiteKeyIndex: keyType === "white" ? whiteKeyIndex : Math.max(0, whiteKeyIndex - 1),
      accessibleLabel: createAccessibleLabel({ noteName, midi, keyType }),
    });
    if (keyType === "white") whiteKeyIndex += 1;
  }
  return keys;
};

export type LocalPianoPointerId = number | string;

export type LocalPianoKeyboardState = {
  volume: number;
  sustainEnabled: boolean;
  pointers: Readonly<Record<string, string>>;
  /** Oldest active key first, for deterministic voice handling. */
  activeKeyIds: readonly string[];
  latchedKeyIds: readonly string[];
};

const pointerToken = (pointerId: LocalPianoPointerId): string =>
  `${typeof pointerId === "number" ? "pointer" : "keyboard"}:${pointerId}`;

const unique = (values: readonly string[]): string[] => Array.from(new Set(values));

export const clampLocalPianoVolume = (volume: number): number =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.7;

export const createLocalPianoKeyboardState = (
  volume = 0.7,
): LocalPianoKeyboardState => ({
  volume: clampLocalPianoVolume(volume),
  sustainEnabled: false,
  pointers: {},
  activeKeyIds: [],
  latchedKeyIds: [],
});

const heldKeyIds = (pointers: Readonly<Record<string, string>>): Set<string> =>
  new Set(Object.values(pointers));

export const releaseLocalPianoPointer = (
  state: LocalPianoKeyboardState,
  pointerId: LocalPianoPointerId,
): LocalPianoKeyboardState => {
  const token = pointerToken(pointerId);
  const keyId = state.pointers[token];
  if (!keyId) return state;

  const pointers = { ...state.pointers };
  delete pointers[token];
  if (heldKeyIds(pointers).has(keyId)) {
    return { ...state, pointers };
  }

  if (state.sustainEnabled) {
    return {
      ...state,
      pointers,
      latchedKeyIds: unique([...state.latchedKeyIds, keyId]),
    };
  }

  return {
    ...state,
    pointers,
    activeKeyIds: state.activeKeyIds.filter((activeKeyId) => activeKeyId !== keyId),
    latchedKeyIds: state.latchedKeyIds.filter((latchedKeyId) => latchedKeyId !== keyId),
  };
};

export const pressLocalPianoKey = (
  state: LocalPianoKeyboardState,
  pointerId: LocalPianoPointerId,
  keyId: string,
): LocalPianoKeyboardState => {
  if (!keyId) return state;
  const token = pointerToken(pointerId);
  const currentKeyId = state.pointers[token];
  if (currentKeyId === keyId) return state;

  const releasedState = currentKeyId === undefined
    ? state
    : releaseLocalPianoPointer(state, pointerId);
  const keyIsActive = releasedState.activeKeyIds.includes(keyId);
  if (!keyIsActive && releasedState.activeKeyIds.length >= MAX_LOCAL_PIANO_ACTIVE_KEYS) {
    return releasedState;
  }

  return {
    ...releasedState,
    pointers: { ...releasedState.pointers, [token]: keyId },
    activeKeyIds: keyIsActive
      ? releasedState.activeKeyIds
      : [...releasedState.activeKeyIds, keyId],
    latchedKeyIds: releasedState.latchedKeyIds.filter(
      (latchedKeyId) => latchedKeyId !== keyId,
    ),
  };
};

export const setLocalPianoSustain = (
  state: LocalPianoKeyboardState,
  sustainEnabled: boolean,
): LocalPianoKeyboardState => {
  if (state.sustainEnabled === sustainEnabled) return state;
  if (sustainEnabled) return { ...state, sustainEnabled: true };

  const held = heldKeyIds(state.pointers);
  return {
    ...state,
    sustainEnabled: false,
    activeKeyIds: state.activeKeyIds.filter((keyId) => held.has(keyId)),
    latchedKeyIds: [],
  };
};

export const setLocalPianoVolume = (
  state: LocalPianoKeyboardState,
  volume: number,
): LocalPianoKeyboardState => {
  const nextVolume = clampLocalPianoVolume(volume);
  return nextVolume === state.volume ? state : { ...state, volume: nextVolume };
};

export const resetLocalPianoKeyboard = (
  state: LocalPianoKeyboardState,
): LocalPianoKeyboardState => {
  if (
    Object.keys(state.pointers).length === 0
    && state.activeKeyIds.length === 0
    && state.latchedKeyIds.length === 0
  ) {
    return state;
  }
  return {
    ...state,
    pointers: {},
    activeKeyIds: [],
    latchedKeyIds: [],
  };
};
