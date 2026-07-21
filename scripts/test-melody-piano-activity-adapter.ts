import assert from "node:assert/strict";

import type { ActivityAnswer } from "../lib/activity/activityAnswer";
import { adaptMelodyDictationQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import {
  adaptMelodyScreenPianoNoteEventsToNoteIds,
  adaptMelodyPianoAnswerToActivityEvidence,
  createMelodyPianoInputOriginId,
  createMelodyPianoAnswer,
  createMelodyPianoAnswerFromNoteEvents,
  enableMelodyPianoInput,
} from "../lib/activity/melodyPianoActivityAdapter";
import { createScreenPianoActivityNoteOn } from "../lib/activity/pianoNoteEventActivityAdapter";
import type { NoteEventV1 } from "../lib/music/noteEvent";
import { enableMelodyFixedSolfegeInput } from "../lib/activity/melodySolfegeActivityAdapter";
import type { LocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";

const question = (noteIds: string[]): LocalEarTrainingMelodyQuestion => ({
  id: `test-${noteIds.join("-")}`,
  variantId: `melody:test-${noteIds.join("-")}`,
  difficulty: "挑战",
  sequence: 0,
  melody: {
    id: `test-${noteIds.join("-")}`,
    label: "测试三音旋律",
    noteIds,
    explanation: "测试旋律说明。",
  },
});

const baseDefinition = adaptMelodyDictationQuestionToActivity(
  question(["c4", "f-sharp-4", "c5"]),
);
const definition = enableMelodyPianoInput(
  enableMelodyFixedSolfegeInput(baseDefinition),
);
assert.deepEqual(definition.allowedInputModes, ["choice", "solfege", "piano"]);
assert.deepEqual(definition.target.expectedAnswer, {
  mode: "choice",
  optionIds: ["c4", "f-sharp-4", "c5"],
});

const exactAnswer = createMelodyPianoAnswer(["c4", "f-sharp-4", "c5"]);
assert.deepEqual(exactAnswer, {
  mode: "piano",
  noteIds: ["c4", "f-sharp-4", "c5"],
});

const screenEvents = [60, 66, 72].map((note, sequence) =>
  createScreenPianoActivityNoteOn({
    originId: "p117a-screen-input",
    sequence,
    producer: "screen-piano",
    note,
    velocity: 0.7,
    atMs: sequence * 100,
  }),
);
assert.deepEqual(
  adaptMelodyScreenPianoNoteEventsToNoteIds(screenEvents, "p117a-screen-input"),
  ["c4", "f-sharp-4", "c5"],
);
assert.deepEqual(
  createMelodyPianoAnswerFromNoteEvents(screenEvents, "p117a-screen-input"),
  exactAnswer,
);

const originId = createMelodyPianoInputOriginId({
  questionVariantId: "melody:test",
  attemptId: "attempt-1",
  inputRun: 1,
});
assert.equal(originId, "melody-piano:melody:test:attempt-1:run-1");
assert.notEqual(originId, createMelodyPianoInputOriginId({
  questionVariantId: "melody:test",
  attemptId: "attempt-2",
  inputRun: 1,
}));
assert.notEqual(originId, createMelodyPianoInputOriginId({
  questionVariantId: "melody:test",
  attemptId: "attempt-1",
  inputRun: 2,
}));
assert.throws(() => createMelodyPianoInputOriginId({
  questionVariantId: "melody:test",
  attemptId: "attempt-1",
  inputRun: 0,
}), /缺少题目/);

assert.deepEqual(
  adaptMelodyScreenPianoNoteEventsToNoteIds(
    [screenEvents[2], screenEvents[0], screenEvents[1]],
    "p117a-screen-input",
  ),
  ["c4", "f-sharp-4", "c5"],
  "屏幕事件必须按协议 sequence 归一化，而不是相信数组到达顺序",
);
assert.equal(
  adaptMelodyScreenPianoNoteEventsToNoteIds(
    [{ ...screenEvents[1], eventId: screenEvents[0].eventId }],
    "p117a-screen-input",
  ),
  null,
  "重复事件标识必须 fail closed",
);
assert.equal(
  adaptMelodyScreenPianoNoteEventsToNoteIds(
    [{ ...screenEvents[1], sequence: 0 }, screenEvents[0]],
    "p117a-screen-input",
  ),
  null,
  "重复 sequence 必须 fail closed",
);
assert.equal(
  adaptMelodyScreenPianoNoteEventsToNoteIds(
    [screenEvents[0], screenEvents[2]],
    "p117a-screen-input",
  ),
  null,
  "sequence 缺口必须 fail closed",
);
assert.equal(
  adaptMelodyScreenPianoNoteEventsToNoteIds(
    [{ ...screenEvents[0], time: { ...screenEvents[0].time, originId: "foreign-attempt" } }],
    "p117a-screen-input",
  ),
  null,
  "跨 attempt 的屏幕事件不得污染当前答案",
);

const contaminatedEvents: NoteEventV1[] = [
  ...screenEvents,
  createScreenPianoActivityNoteOn({
    originId: "p117a-keyboard-input",
    sequence: 3,
    producer: "computer-keyboard",
    note: 62,
    velocity: 0.7,
    atMs: 400,
  }),
  { ...screenEvents[0], eventId: "playback-event", sequence: 4, source: {
    producer: "playback",
    transport: "none",
    verification: "not-applicable",
    deviceSessionId: null,
  } },
  { ...screenEvents[0], eventId: "screen-note-off", sequence: 5, type: "note-off" } as NoteEventV1,
  { ...screenEvents[0], eventId: "screen-sustain", sequence: 6, type: "sustain", down: true, value: 1 } as NoteEventV1,
  { ...screenEvents[0], eventId: "screen-all-notes-off", sequence: 7, type: "all-notes-off", channel: null } as NoteEventV1,
  { ...screenEvents[0], eventId: "web-midi-event", sequence: 8, source: {
    producer: "web-midi",
    transport: "unknown",
    verification: "unverified",
    deviceSessionId: "web-midi-session",
  } },
  { ...screenEvents[0], eventId: "android-midi-event", sequence: 9, source: {
    producer: "android-midi",
    transport: "usb",
    verification: "android-device-type",
    deviceSessionId: "android-midi-session",
  } },
];
assert.deepEqual(
  adaptMelodyScreenPianoNoteEventsToNoteIds(contaminatedEvents, "p117a-screen-input"),
  ["c4", "f-sharp-4", "c5"],
  "键盘与自动播放事件不得冒充屏幕钢琴答案",
);
const exactEvidence = adaptMelodyPianoAnswerToActivityEvidence({
  definition,
  answer: exactAnswer ?? undefined,
});
assert.equal(exactEvidence.state, "consistent");
assert.equal(exactEvidence.assessmentMode, "non-scoring");
assert.equal("score" in exactEvidence, false);
assert.equal("grade" in exactEvidence, false);
assert.equal("pass" in exactEvidence, false);
assert.equal("fail" in exactEvidence, false);
assert.equal("accuracyPercentage" in exactEvidence, false);

assert.equal(
  adaptMelodyPianoAnswerToActivityEvidence({
    definition,
    answer: { mode: "piano", noteIds: ["c5", "f-sharp-4", "c4"] },
  }).state,
  "different",
  "屏幕钢琴答案必须保留音符顺序",
);

const repeatedDefinition = enableMelodyPianoInput(
  adaptMelodyDictationQuestionToActivity(question(["c4", "c4", "d4"])),
);
const repeatedAnswer = createMelodyPianoAnswer(["c4", "c4", "d4"]);
assert.deepEqual(repeatedAnswer, {
  mode: "piano",
  noteIds: ["c4", "c4", "d4"],
});
assert.equal(
  adaptMelodyPianoAnswerToActivityEvidence({
    definition: repeatedDefinition,
    answer: repeatedAnswer ?? undefined,
  }).state,
  "consistent",
  "重复音必须保留每次出现的位置",
);
assert.equal(
  adaptMelodyPianoAnswerToActivityEvidence({
    definition: repeatedDefinition,
    answer: { mode: "piano", noteIds: ["c4", "d4", "c4"] },
  }).state,
  "different",
  "重复音换序仍必须识别为有差异",
);

assert.equal(createMelodyPianoAnswer([]), null);
assert.equal(createMelodyPianoAnswer(["c4", "d4"]), null);
assert.equal(createMelodyPianoAnswer(["c4", "unknown", "d4"]), null);
assert.equal(createMelodyPianoAnswer(["c4", "d4", "e4", "f4"]), null);

const insufficientAnswers: Array<ActivityAnswer | undefined> = [
  undefined,
  { mode: "piano", noteIds: [] },
  { mode: "piano", noteIds: ["c4", "d4"] },
  { mode: "piano", noteIds: ["c4", "unknown", "d4"] },
  { mode: "choice", optionIds: ["c4", "f-sharp-4", "c5"] },
];
for (const answer of insufficientAnswers) {
  assert.equal(
    adaptMelodyPianoAnswerToActivityEvidence({ definition, answer }).state,
    "insufficient",
  );
}

assert.equal(
  adaptMelodyPianoAnswerToActivityEvidence({
    definition: baseDefinition,
    answer: { mode: "piano", noteIds: ["c4", "f-sharp-4", "c5"] },
  }).state,
  "insufficient",
  "未在 allowedInputModes 中启用 piano 时必须拒绝检查",
);

assert.throws(
  () => enableMelodyPianoInput({ ...baseDefinition, family: "melody-imitation" }),
  /只支持当前三音/,
);
assert.throws(
  () => enableMelodyPianoInput({
    ...baseDefinition,
    target: {
      ...baseDefinition.target,
      answerPolicy: { choiceOrder: "unordered" },
    },
  }),
  /只支持当前三音/,
);
assert.throws(
  () => enableMelodyPianoInput({
    ...baseDefinition,
    target: {
      ...baseDefinition.target,
      expectedAnswer: { mode: "choice", optionIds: ["c4", "d4"] },
    },
  }),
  /只支持当前三音/,
);
assert.throws(
  () => enableMelodyPianoInput({
    ...baseDefinition,
    target: {
      ...baseDefinition.target,
      expectedAnswer: { mode: "choice", optionIds: ["c4", "unknown", "d4"] },
    },
  }),
  /只支持当前三音/,
);

console.log("P117a melody piano activity adapter tests passed.");
