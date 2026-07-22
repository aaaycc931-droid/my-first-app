import assert from "node:assert/strict";

import { createLocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";
import {
  createLocalMelodyImitationTimeline,
  getLocalMelodyImitationP113Targets,
  getLocalMelodyImitationPlaybackEvents,
  getLocalMelodyImitationRecordingTimeMs,
  LOCAL_MELODY_IMITATION_COUNT_IN_BEATS,
  LOCAL_MELODY_IMITATION_TIMELINE_VERSION,
  validateLocalMelodyImitationTimeline,
  validateLocalMelodyImitationTimelineMatch,
  type LocalMelodyImitationTimeline,
} from "../lib/practice/localMelodyImitation";

const questionFor = (difficulty: "基础" | "进阶" | "挑战", questionIndex: number) =>
  createLocalEarTrainingMelodyQuestion({
    difficulty,
    sequence: 7,
    questionIndex,
    catalogMode: "expanded-local-v2",
  });

const timelines = (["基础", "进阶", "挑战"] as const).map((difficulty, index) =>
  createLocalMelodyImitationTimeline({ question: questionFor(difficulty, index), bpm: 96 }),
);
assert.equal(new Set(timelines.map(({ targetId }) => targetId)).size, 3);

const question = questionFor("挑战", 1);
const timeline = createLocalMelodyImitationTimeline({ question, bpm: 120 });
const replay = createLocalMelodyImitationTimeline({ question, bpm: 120 });
assert.deepEqual(replay, timeline);
assert.equal(timeline.timelineVersion, LOCAL_MELODY_IMITATION_TIMELINE_VERSION);
assert.equal(timeline.bpm, 120);
assert.deepEqual(timeline.meter, { beatsPerMeasure: 4, beatUnit: 4 });
assert.equal(timeline.countIn.beats, LOCAL_MELODY_IMITATION_COUNT_IN_BEATS);
assert.equal(timeline.countIn.endMs, 2_000);
assert.equal(timeline.recordingZeroMs, 2_000);
assert.deepEqual(timeline.events.map(({ onsetMs }) => onsetMs), [2_000, 2_500, 3_000]);
assert.deepEqual(timeline.events.map(({ durationMs }) => durationMs), [500, 500, 500]);
assert.deepEqual(timeline.events.map(({ noteId }) => noteId), question.melody.noteIds);
assert.deepEqual(timeline.phrase, { startMs: 2_000, endMs: 3_500 });
assert.deepEqual(timeline.recordingWindow, timeline.phrase);
assert.equal(timeline.totalWindowMs, 3_500);

const playback = getLocalMelodyImitationPlaybackEvents(timeline);
const targets = getLocalMelodyImitationP113Targets(timeline);
assert.deepEqual(playback.map(({ startOffsetMs }) => startOffsetMs), [0, 500, 1_000]);
assert.deepEqual(targets.map(({ startMs }) => startMs), [0, 500, 1_000]);
assert.deepEqual(targets.map(({ endMs }) => endMs), [500, 1_000, 1_500]);
assert.equal(getLocalMelodyImitationRecordingTimeMs(timeline, timeline.recordingZeroMs), 0);
assert.deepEqual(
  timeline.events.map(({ position, noteId, onsetMs, durationMs }) => ({ position, noteId, onsetMs, durationMs })),
  playback.map(({ position, noteId, startOffsetMs, durationMs }) => ({
    position,
    noteId,
    onsetMs: startOffsetMs + timeline.recordingZeroMs,
    durationMs,
  })),
);
for (const event of timeline.events) {
  assert.deepEqual(Object.keys(event).sort(), ["durationMs", "noteId", "onsetMs", "position"]);
}

assert.notEqual(createLocalMelodyImitationTimeline({ question, bpm: 121 }).targetId, timeline.targetId);
assert.throws(
  () => validateLocalMelodyImitationTimelineMatch({
    playbackTimeline: timeline,
    analysisTimeline: createLocalMelodyImitationTimeline({ question, bpm: 121 }),
  }),
  /playback and analysis timelines do not match/,
);
assert.equal(
  validateLocalMelodyImitationTimelineMatch({ playbackTimeline: timeline, analysisTimeline: replay }),
  replay,
);
assert.notEqual(
  createLocalMelodyImitationTimeline({ question, bpm: 120, timelineVersion: "local-melody-imitation-timeline-v2" }).targetId,
  timeline.targetId,
);
assert.notEqual(
  createLocalMelodyImitationTimeline({ question: questionFor("挑战", 2), bpm: 120 }).targetId,
  timeline.targetId,
);

const mutate = (mutator: (draft: any) => void) => {
  const draft = structuredClone(timeline);
  mutator(draft);
  return () => validateLocalMelodyImitationTimeline(draft);
};
assert.throws(mutate((draft) => draft.events.pop()), /exactly three events/);
assert.throws(mutate((draft) => [draft.events[0], draft.events[1]] = [draft.events[1], draft.events[0]]), /position is out of order/);
assert.throws(mutate((draft) => { draft.events[1].onsetMs = draft.events[0].onsetMs + 100; }), /onset is invalid|overlaps/);
assert.throws(mutate((draft) => { draft.events[0].onsetMs = Number.NaN; }), /not finite/);
assert.throws(mutate((draft) => { draft.events[0].noteId = "C4"; }), /noteId is invalid/);
assert.throws(mutate((draft) => { draft.phrase.endMs = draft.events[2].onsetMs; }), /phrase must cover/);
assert.throws(mutate((draft) => { draft.recordingZeroMs += 1; }), /recording zero must equal/);
assert.throws(mutate((draft) => { draft.targetId = "stale-target"; }), /target identity/);
assert.throws(
  () => createLocalMelodyImitationTimeline({
    question: {
      ...question,
      melody: { ...question.melody, noteIds: ["c4", "d4"] },
    },
  }),
  /exactly three notes/,
);
assert.throws(
  () => createLocalMelodyImitationTimeline({
    question: {
      ...question,
      melody: { ...question.melody, noteIds: ["c4", "d4", "invalid"] },
    },
  }),
  /invalid canonical noteId/,
);
assert.throws(() => createLocalMelodyImitationTimeline({ question, bpm: Number.POSITIVE_INFINITY }), /finite and positive/);
assert.throws(() => getLocalMelodyImitationRecordingTimeMs(timeline, Number.NaN), /not finite/);

assert.equal(validateLocalMelodyImitationTimeline(timeline), timeline);
assert.equal((timeline as LocalMelodyImitationTimeline).events.length, 3);
console.log("local melody imitation timeline tests passed");
