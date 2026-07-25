import assert from "node:assert/strict";

import {
  createLocalScoreProjectPlaybackPlan,
  LOCAL_SCORE_PROJECT_PLAYBACK_GATE,
  type LocalScoreProjectPlaybackEvent,
  type LocalScoreProjectPlaybackNoteEvent,
} from "../lib/music/localScoreProjectPlayback";
import type {
  LocalNotationProjectScoreDocumentV1,
  ScoreDocumentEventV1,
} from "../lib/music/scoreDocument";

const note = (
  id: string,
  pitch: NonNullable<ScoreDocumentEventV1["pitch"]>,
  duration: ScoreDocumentEventV1["duration"],
  measure = 1,
): ScoreDocumentEventV1 => ({
  id,
  type: "note",
  pitch,
  duration,
  measure,
});

const rest = (id: string, measure = 1): ScoreDocumentEventV1 => ({
  id,
  type: "rest",
  pitch: null,
  duration: "quarter",
  measure,
});

const isNoteEvent = (
  event: LocalScoreProjectPlaybackEvent,
): event is LocalScoreProjectPlaybackNoteEvent =>
  event.type !== "all-notes-off";

const documentWithVoices = (
  voices: readonly (readonly ScoreDocumentEventV1[])[],
  {
    documentId = "local.score-project.playback-test",
    revision = 7,
    meter = "4/4",
  }: Partial<Pick<
    LocalNotationProjectScoreDocumentV1,
    "documentId" | "revision" | "meter"
  >> = {},
): LocalNotationProjectScoreDocumentV1 => ({
  schemaVersion: "score-document-v1",
  documentKind: "notation-project",
  documentId,
  revision,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "playback-test",
  },
  meter,
  parts: [{
    partId: "part-1",
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef: "treble",
      voices: voices.map((events, index) => ({
        voiceId: `voice-${index + 1}`,
        measures: [{
          measureNumber: 1,
          events,
        }],
      })),
    }],
  }],
});

{
  const document = documentWithVoices([[
    note("c4", "C4", "quarter"),
    rest("rest"),
    note("d4", "D4", "half"),
  ]]);
  const plan = createLocalScoreProjectPlaybackPlan({ document, bpm: 120 });
  assert.equal(plan.status, "ready");
  assert.equal(plan.durationMs, 2_000);
  assert.deepEqual(
    plan.events.map((event) => [event.type, event.delayMs]),
    [
      ["note-on", 0],
      ["note-off", 500 * LOCAL_SCORE_PROJECT_PLAYBACK_GATE],
      ["note-on", 1_000],
      ["note-off", 1_000 + 1_000 * LOCAL_SCORE_PROJECT_PLAYBACK_GATE],
      ["all-notes-off", 2_000],
    ],
  );
  assert.equal(plan.warnings.length, 0);
  const noteEvents = plan.events.filter(isNoteEvent);
  assert.ok(noteEvents.every((event) =>
    event.pointerId.includes("local.score-project.playback-test")
    && event.pointerId.includes("r7")));
}

{
  const document = documentWithVoices([[
    note("c4", "C4", "quarter"),
    rest("trailing-rest"),
  ]]);
  const plan = createLocalScoreProjectPlaybackPlan({ document, bpm: 120 });
  assert.equal(plan.status, "ready");
  assert.equal(plan.durationMs, 1_000, "trailing rests must extend playback");
  assert.equal(plan.warnings.length, 1);
}

{
  const document = documentWithVoices([
    [rest("first-voice-rest")],
    [note("second-voice-note", "E4", "quarter")],
  ]);
  const first = createLocalScoreProjectPlaybackPlan({
    document,
    bpm: 10,
    voiceSelection: "first",
  });
  const all = createLocalScoreProjectPlaybackPlan({
    document,
    bpm: 999,
    voiceSelection: "all",
  });
  assert.equal(first.status, "ready");
  assert.equal(all.status, "ready");
  assert.equal(first.bpm, 30);
  assert.equal(first.events.filter((event) => event.type === "note-on").length, 0);
  assert.equal(all.bpm, 240);
  assert.deepEqual(
    all.events
      .filter(isNoteEvent)
      .filter((event) => event.type === "note-on")
      .map((event) => event.sourceEventId),
    ["second-voice-note"],
  );
}

{
  const document = documentWithVoices([
    [note("shared-c4-a", "C4", "half")],
    [note("shared-c4-b", "C4", "half")],
  ]);
  const first = createLocalScoreProjectPlaybackPlan({
    document,
    bpm: 120,
    voiceSelection: "first",
  });
  const all = createLocalScoreProjectPlaybackPlan({
    document,
    bpm: 120,
    voiceSelection: "all",
  });
  assert.equal(first.status, "ready");
  assert.equal(all.status, "ready");
  assert.equal(first.events.filter((event) => event.type === "note-on").length, 1);
  const allPointers = all.events
    .filter(isNoteEvent)
    .filter((event) => event.type === "note-on")
    .map((event) => event.pointerId);
  assert.equal(allPointers.length, 2);
  assert.equal(new Set(allPointers).size, 2);
  assert.deepEqual(
    all.events.slice(0, 2).map((event) => event.type),
    ["note-on", "note-on"],
    "simultaneous events must remain deterministic",
  );
}

{
  const overfull = documentWithVoices([[
    note("half-1", "C4", "half"),
    note("half-2", "D4", "half"),
    note("half-3", "E4", "half"),
  ]]);
  const plan = createLocalScoreProjectPlaybackPlan({ document: overfull, bpm: 120 });
  assert.equal(plan.status, "blocked");
  if (plan.status !== "blocked") throw new Error("expected blocked plan");
  assert.match(plan.reason, /超过/);
}

{
  const empty = documentWithVoices([[]]);
  const emptyPlan = createLocalScoreProjectPlaybackPlan({ document: empty, bpm: 120 });
  const invalidBpmPlan = createLocalScoreProjectPlaybackPlan({
    document: documentWithVoices([[note("c4", "C4", "quarter")]]),
    bpm: Number.NaN,
  });
  assert.equal(emptyPlan.status, "blocked");
  assert.equal(invalidBpmPlan.status, "blocked");
  if (invalidBpmPlan.status !== "blocked") throw new Error("expected blocked plan");
  assert.equal(invalidBpmPlan.bpm, null);
}

{
  const document = documentWithVoices(
    [[note("stable", "C4", "quarter")]],
    { documentId: "document:a/b", revision: 9 },
  );
  const left = createLocalScoreProjectPlaybackPlan({ document, bpm: 90 });
  const right = createLocalScoreProjectPlaybackPlan({ document, bpm: 90 });
  assert.deepEqual(left, right, "same document revision must produce the same plan");
  assert.equal(left.status, "ready");
  assert.match(left.scheduleId, /r9/);
  assert.equal(left.events.at(-1)?.type, "all-notes-off");
}

console.log("local score project playback checks passed");
