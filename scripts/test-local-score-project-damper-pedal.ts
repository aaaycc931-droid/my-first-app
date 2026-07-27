import assert from "node:assert/strict";
import {
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventDamperPedalMark,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  parseLocalScoreProject,
  pasteLocalScoreProjectEvent,
  undoLocalScoreProject,
  type LocalScoreProjectEventLocation,
} from "../lib/music/localScoreProject.js";
import { createLocalScoreProjectNumberedPresentation } from "../lib/music/localScoreProjectNumberedPresentation.js";
import { createLocalScoreProjectPlaybackPlan } from "../lib/music/localScoreProjectPlayback.js";
import { createLocalScoreProjectStaffPresentation } from "../lib/music/localScoreProjectStaffPresentation.js";

const location: LocalScoreProjectEventLocation = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 1,
};
const eventAt = (project: ReturnType<typeof createLocalScoreProject>, id: string) =>
  project.document.parts[0]!.staves[0]!.voices[0]!.measures[0]!.events
    .find((event) => event.id === id)!;

let project = createLocalScoreProject({
  projectId: "damper-pedal",
  title: "踏板",
  now: "2026-07-26T00:00:00.000Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: 1,
  location,
  input: { type: "note", pitch: "C4", duration: "quarter" },
  eventId: "note-1",
  now: "2026-07-26T00:00:00.100Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: 2,
  location,
  input: { type: "rest", pitch: null, duration: "quarter" },
  eventId: "rest-1",
  now: "2026-07-26T00:00:00.200Z",
});
assert.equal(project.schemaVersion, "local-score-project-storage-v13");
assert.equal(project.document.schemaVersion, "score-document-v12");
assert.equal(eventAt(project, "note-1").damperPedalMark, null);

project = changeLocalScoreProjectEventDamperPedalMark({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-1",
  damperPedalMark: "down",
  now: "2026-07-26T00:00:01.000Z",
});
project = changeLocalScoreProjectEventDamperPedalMark({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "rest-1",
  damperPedalMark: "up",
  now: "2026-07-26T00:00:02.000Z",
});
assert.equal(eventAt(project, "note-1").damperPedalMark, "down");
assert.equal(eventAt(project, "rest-1").damperPedalMark, "up");
assert.throws(() => changeLocalScoreProjectEventDamperPedalMark({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-1",
  damperPedalMark: "DOWN" as never,
  now: "2026-07-26T00:00:03.000Z",
}));

const copied = copyLocalScoreProjectEvent({ project, location, eventId: "note-1" });
assert.equal(copied.damperPedalMark, "down");
const pasted = pasteLocalScoreProjectEvent({
  project,
  expectedRevision: project.document.revision,
  destination: location,
  eventId: "note-2",
  input: copied,
  now: "2026-07-26T00:00:04.000Z",
});
assert.equal(eventAt(pasted, "note-2").damperPedalMark, "down");
const undone = undoLocalScoreProject({
  project: pasted,
  expectedRevision: pasted.document.revision,
  now: "2026-07-26T00:00:05.000Z",
});
assert.equal(eventAt(undone, "note-2"), undefined);

const roundTrip = parseLocalScoreProject(JSON.parse(JSON.stringify(project)));
assert.equal(roundTrip && eventAt(roundTrip, "note-1").damperPedalMark, "down");
const staff = createLocalScoreProjectStaffPresentation(project.document);
assert.equal(staff.status, "ready");
if (staff.status === "ready") {
  assert.equal(staff.tokens[0]!.damperPedalMark, "down");
  assert.equal(staff.tokens[1]!.damperPedalMark, "up");
  assert.match(staff.tokens[0]!.accessibleLabel, /踩下制音踏板/);
  assert.ok(staff.damperPedalY > staff.dynamicMarkY);
}
const numbered = createLocalScoreProjectNumberedPresentation(project.document);
assert.equal(numbered.status, "ready");
if (numbered.status === "ready") {
  assert.equal(numbered.tokens[0]!.damperPedalMark, "down");
  assert.equal(numbered.tokens[1]!.damperPedalMark, "up");
  assert.match(numbered.tokens[0]!.accessibleLabel, /踩下制音踏板/);
}
const withPedal = createLocalScoreProjectPlaybackPlan({
  document: project.document,
  bpm: project.tempoBpm,
});
let withoutPedalProject = createLocalScoreProject({
  projectId: "without-pedal",
  title: "无踏板",
  now: "2026-07-26T00:00:00.000Z",
});
withoutPedalProject = addLocalScoreProjectEvent({
  project: withoutPedalProject,
  expectedRevision: 1,
  location,
  input: { type: "note", pitch: "C4", duration: "quarter" },
  eventId: "note-1",
  now: "2026-07-26T00:00:00.100Z",
});
withoutPedalProject = addLocalScoreProjectEvent({
  project: withoutPedalProject,
  expectedRevision: 2,
  location,
  input: { type: "rest", pitch: null, duration: "quarter" },
  eventId: "rest-1",
  now: "2026-07-26T00:00:00.200Z",
});
const withoutPedal = createLocalScoreProjectPlaybackPlan({
  document: withoutPedalProject.document,
  bpm: project.tempoBpm,
});
assert.equal(withPedal.status, "ready");
assert.equal(withoutPedal.status, "ready");
if (withPedal.status === "ready" && withoutPedal.status === "ready") {
  assert.deepEqual(
    {
      durationMs: withPedal.durationMs,
      events: withPedal.events.map((event) =>
        event.type === "all-notes-off"
          ? event
          : {
            type: event.type,
            delayMs: event.delayMs,
            midi: event.midi,
            sourceEventId: event.sourceEventId,
          }),
      spans: withPedal.spans.map(({ sourceEventId, startMs, endMs }) =>
        ({ sourceEventId, startMs, endMs })),
      warnings: withPedal.warnings,
    },
    {
      durationMs: withoutPedal.durationMs,
      events: withoutPedal.events.map((event) =>
        event.type === "all-notes-off"
          ? event
          : {
            type: event.type,
            delayMs: event.delayMs,
            midi: event.midi,
            sourceEventId: event.sourceEventId,
          }),
      spans: withoutPedal.spans.map(({ sourceEventId, startMs, endMs }) =>
        ({ sourceEventId, startMs, endMs })),
      warnings: withoutPedal.warnings,
    },
  );
}

console.log("local-score-project damper pedal tests passed");
