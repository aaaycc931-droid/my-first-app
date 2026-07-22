import assert from "node:assert/strict";

import { createLocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";
import { createLocalMelodyImitationTimeline } from "../lib/practice/localMelodyImitation";
import {
  createLocalMelodySightSingingTarget,
  getLocalMelodySightSingingP113Targets,
  getLocalMelodySightSingingPresentation,
  LOCAL_MELODY_SIGHT_SINGING_PRESENTATION_VERSION,
  LOCAL_MELODY_SIGHT_SINGING_TARGET_VERSION,
  validateLocalMelodySightSingingTarget,
  validateLocalMelodySightSingingTargetMatch,
} from "../lib/practice/localMelodySightSinging";

const questionFor = (difficulty: "基础" | "进阶" | "挑战", questionIndex: number) =>
  createLocalEarTrainingMelodyQuestion({
    difficulty,
    sequence: 11,
    questionIndex,
    catalogMode: "expanded-local-v2",
  });

const targetFor = (difficulty: "基础" | "进阶" | "挑战", questionIndex: number, bpm = 120) => {
  const timeline = createLocalMelodyImitationTimeline({ question: questionFor(difficulty, questionIndex), bpm });
  return { timeline, target: createLocalMelodySightSingingTarget({ timeline }) };
};

const threeDifficulties = (["基础", "进阶", "挑战"] as const).map((difficulty, index) =>
  targetFor(difficulty, index).target,
);
assert.equal(new Set(threeDifficulties.map(({ targetId }) => targetId)).size, 3);
assert.equal(new Set(threeDifficulties.map(({ visiblePresentationId }) => visiblePresentationId)).size, 3);

const challengeQuestion = questionFor("挑战", 1);
const timeline = createLocalMelodyImitationTimeline({ question: challengeQuestion, bpm: 120 });
const target = createLocalMelodySightSingingTarget({ timeline });
const replay = createLocalMelodySightSingingTarget({ timeline });
assert.deepEqual(replay, target);
assert.equal(target.targetVersion, LOCAL_MELODY_SIGHT_SINGING_TARGET_VERSION);
assert.equal(target.presentationVersion, LOCAL_MELODY_SIGHT_SINGING_PRESENTATION_VERSION);
assert.equal(target.timelineVersion, timeline.timelineVersion);
assert.equal(target.timedTargetId, timeline.targetId);
assert.notEqual(target.targetId, timeline.targetId);
assert.match(target.visiblePresentationId, /^local-melody-sight-singing-presentation:/);
assert.deepEqual(target.meter, { beatsPerMeasure: 4, beatUnit: 4 });
assert.deepEqual(target.countIn, { beats: 4, startMs: 0, endMs: 2_000 });
assert.equal(target.recordingZeroMs, 2_000);
assert.deepEqual(target.events.map(({ onsetMs }) => onsetMs), [2_000, 2_500, 3_000]);
assert.deepEqual(target.events.map(({ durationMs }) => durationMs), [500, 500, 500]);
assert.deepEqual(target.phrase, { startMs: 2_000, endMs: 3_500 });

const presentation = getLocalMelodySightSingingPresentation(target);
assert.deepEqual(presentation.map(({ position }) => position), [0, 1, 2]);
assert.deepEqual(presentation.map(({ noteId }) => noteId), challengeQuestion.melody.noteIds);
assert.deepEqual(presentation.map(({ fixedSolfegeToken }) => fixedSolfegeToken), ["mi4", "fa4", "fi4"]);
assert.deepEqual(presentation.map(({ fixedSolfegeLabel }) => fixedSolfegeLabel), ["mi", "fa", "升 fa"]);
assert.equal(presentation[2].accidental, "sharp");
assert.equal(presentation[2].staffStepFromBottomLine, 1);
assert.match(presentation[2].accessibleLabel, /F♯4，固定唱名 升 fa/);

const edgeQuestion = {
  ...challengeQuestion,
  id: `${challengeQuestion.id}:edge`,
  variantId: `${challengeQuestion.variantId}:edge`,
  melody: { ...challengeQuestion.melody, noteIds: ["c4", "f-sharp-4", "c5"] },
};
const edgeTimeline = createLocalMelodyImitationTimeline({ question: edgeQuestion, bpm: 96 });
const edgeTarget = createLocalMelodySightSingingTarget({ timeline: edgeTimeline });
const edgePresentation = getLocalMelodySightSingingPresentation(edgeTarget);
assert.deepEqual(edgePresentation.map(({ staffStepFromBottomLine }) => staffStepFromBottomLine), [-2, 1, 5]);
assert.deepEqual(edgePresentation.map(({ ledgerLine }) => ledgerLine), ["c4-below-staff", null, null]);
assert.deepEqual(edgePresentation.map(({ accidental }) => accidental), [null, "sharp", null]);
assert.deepEqual(edgePresentation.map(({ fixedSolfegeLabel }) => fixedSolfegeLabel), ["do", "升 fa", "高音 do"]);

const repeatedQuestion = {
  ...challengeQuestion,
  id: `${challengeQuestion.id}:repeat`,
  variantId: `${challengeQuestion.variantId}:repeat`,
  melody: { ...challengeQuestion.melody, noteIds: ["c4", "c4", "c4"] },
};
const repeatedTarget = createLocalMelodySightSingingTarget({
  timeline: createLocalMelodyImitationTimeline({ question: repeatedQuestion }),
});
assert.deepEqual(getLocalMelodySightSingingPresentation(repeatedTarget).map(({ noteId }) => noteId), ["c4", "c4", "c4"]);

const p113Targets = getLocalMelodySightSingingP113Targets(edgeTarget);
assert.deepEqual(p113Targets.map(({ index }) => index), [0, 1, 2]);
assert.deepEqual(p113Targets.map(({ midi }) => midi), [60, 66, 72]);
assert.deepEqual(p113Targets.map(({ startMs }) => startMs), [0, 625, 1_250]);
assert.deepEqual(p113Targets.map(({ endMs }) => endMs), [625, 1_250, 1_875]);
assert.deepEqual(p113Targets.map(({ targetId }, index) => targetId), [0, 1, 2].map((index) => `${edgeTarget.targetId}:position-${index}`));
assert.deepEqual(
  p113Targets.map(({ index, startMs, endMs }) => ({ index, startMs, endMs })),
  edgeTarget.events.map(({ position, onsetMs, durationMs }) => ({
    index: position,
    startMs: onsetMs - edgeTarget.recordingZeroMs,
    endMs: onsetMs + durationMs - edgeTarget.recordingZeroMs,
  })),
);

assert.equal(validateLocalMelodySightSingingTarget(target), target);
assert.equal(validateLocalMelodySightSingingTargetMatch({ presentationTarget: target, analysisTarget: replay }), replay);
assert.notEqual(target.targetId, createLocalMelodySightSingingTarget({ timeline, targetVersion: "target-v2" }).targetId);
assert.notEqual(target.targetId, createLocalMelodySightSingingTarget({ timeline, presentationVersion: "presentation-v2" }).targetId);
assert.notEqual(target.visiblePresentationId, createLocalMelodySightSingingTarget({ timeline, presentationVersion: "presentation-v2" }).visiblePresentationId);
assert.notEqual(target.targetId, targetFor("挑战", 1, 121).target.targetId);
assert.notEqual(target.targetId, targetFor("挑战", 2).target.targetId);
const changedEventsTimeline = createLocalMelodyImitationTimeline({
  question: {
    ...challengeQuestion,
    melody: { ...challengeQuestion.melody, noteIds: ["c4", "d4", "e4"] },
  },
  bpm: 120,
});
assert.notEqual(
  target.targetId,
  createLocalMelodySightSingingTarget({ timeline: changedEventsTimeline }).targetId,
  "canonical event content must participate in target identity",
);

const mutate = (mutator: (draft: any) => void) => {
  const draft = structuredClone(target);
  mutator(draft);
  return () => validateLocalMelodySightSingingTarget(draft);
};
assert.throws(mutate((draft) => { draft.targetId = "stale"; }), /target identity/);
assert.throws(mutate((draft) => { draft.visiblePresentationId = "stale"; }), /visible presentation identity/);
assert.throws(mutate((draft) => { draft.timedTargetId = "stale"; }), /target identity/);
assert.throws(mutate((draft) => { draft.events.pop(); }), /exactly three events/);
assert.throws(mutate((draft) => { [draft.events[0], draft.events[1]] = [draft.events[1], draft.events[0]]; }), /position is out of order/);
assert.throws(mutate((draft) => { draft.events[1].onsetMs = draft.events[0].onsetMs + 10; }), /onset is invalid|overlaps/);
assert.throws(mutate((draft) => { draft.events[0].onsetMs = Number.NaN; }), /not finite/);
assert.throws(mutate((draft) => { draft.events[0].noteId = "C4"; }), /noteId is invalid/);
assert.throws(mutate((draft) => { draft.phrase.endMs -= 1; }), /phrase must cover/);
assert.throws(mutate((draft) => { draft.clef = "bass"; }), /clef must be treble/);
assert.throws(mutate((draft) => { draft.solfegeSystem = "movable-do"; }), /solfegeSystem must be fixed-do/);
assert.throws(
  () => validateLocalMelodySightSingingTargetMatch({
    presentationTarget: target,
    analysisTarget: targetFor("挑战", 1, 121).target,
  }),
  /presentation and analysis targets do not match/,
);

console.log("local melody sight-singing target tests passed");
