import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { NoteEventV1 } from "../music/noteEvent";
import { midiToScientificNoteName } from "../piano/pianoInteraction";
import type { PianoLearningScore } from "../piano/pianoLearningScore";
import {
  adaptPianoNoteSequenceToActivityEvidence,
  createPianoLearningActivityDefinition,
} from "./pianoLearningActivityAdapter";

export type AndroidVerifiedMidiMode = "usb-midi" | "ble-midi";

const transportForMode = (mode: AndroidVerifiedMidiMode) => mode === "ble-midi" ? "ble" : "usb";
const labelForMode = (mode: AndroidVerifiedMidiMode) => mode === "ble-midi" ? "BLE" : "USB";

export const createAndroidMidiActivityDefinition = (
  score: PianoLearningScore,
  mode: AndroidVerifiedMidiMode,
): ActivityDefinitionV1 => {
  const piano = createPianoLearningActivityDefinition(score);
  const label = labelForMode(mode);
  return {
    ...piano,
    activityId: `local.android-${transportForMode(mode)}-midi.${score.id}`,
    title: `Android ${label} MIDI 跟弹`,
    instructions: `连接 Android 已验证的 ${label} MIDI 设备，明确开始后按目标顺序弹奏，再检查本轮输入。`,
    skillTags: ["钢琴", "跟弹", `${label} MIDI`, "音符顺序"],
    allowedInputModes: [mode],
    target: {
      ...piano.target,
      expectedAnswer: piano.target.expectedAnswer.mode === "piano"
        ? { mode, noteIds: [...piano.target.expectedAnswer.noteIds] }
        : piano.target.expectedAnswer,
    },
    explanation: `反馈只比较经 Android 原生设备类型验证的 ${label} MIDI note-on 顺序，不判断力度、时值或演奏水平。`,
  };
};

export const createAndroidUsbMidiActivityDefinition = (
  score: PianoLearningScore,
): ActivityDefinitionV1 => createAndroidMidiActivityDefinition(score, "usb-midi");

export const createAndroidBleMidiActivityDefinition = (
  score: PianoLearningScore,
): ActivityDefinitionV1 => createAndroidMidiActivityDefinition(score, "ble-midi");

export const appendVerifiedAndroidMidiNoteId = (
  currentNoteIds: readonly string[],
  event: NoteEventV1,
  mode: AndroidVerifiedMidiMode,
  expectedDeviceSessionId?: string,
): string[] => {
  if (
    event.type !== "note-on"
    || event.source.producer !== "android-midi"
    || event.source.transport !== transportForMode(mode)
    || event.source.verification !== "android-device-type"
    || !event.source.deviceSessionId
    || (expectedDeviceSessionId !== undefined && event.source.deviceSessionId !== expectedDeviceSessionId)
  ) return [...currentNoteIds];
  return [...currentNoteIds, midiToScientificNoteName(event.note)];
};

export const appendVerifiedAndroidUsbNoteId = (
  currentNoteIds: readonly string[],
  event: NoteEventV1,
  expectedDeviceSessionId?: string,
): string[] => {
  return appendVerifiedAndroidMidiNoteId(currentNoteIds, event, "usb-midi", expectedDeviceSessionId);
};

export const appendVerifiedAndroidBleNoteId = (
  currentNoteIds: readonly string[],
  event: NoteEventV1,
  expectedDeviceSessionId?: string,
): string[] => appendVerifiedAndroidMidiNoteId(currentNoteIds, event, "ble-midi", expectedDeviceSessionId);

export const adaptAndroidUsbMidiSequenceToEvidence = ({
  expectedNoteIds,
  actualNoteIds,
}: {
  expectedNoteIds: readonly string[];
  actualNoteIds: readonly string[];
}): ActivityCheckEvidence => adaptPianoNoteSequenceToActivityEvidence({
  expectedNoteIds,
  actualNoteIds,
});
