import assert from "node:assert/strict";
import {
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventFermataMark,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  parseLocalScoreProject,
  pasteLocalScoreProjectEvent,
  undoLocalScoreProject,
  type LocalScoreProjectEventLocation,
} from "../lib/music/localScoreProject.js";
import { createLocalScoreProjectStaffPresentation } from "../lib/music/localScoreProjectStaffPresentation.js";
import { createLocalScoreProjectNumberedPresentation } from "../lib/music/localScoreProjectNumberedPresentation.js";
import { createLocalScoreProjectPlaybackPlan } from "../lib/music/localScoreProjectPlayback.js";

const location: LocalScoreProjectEventLocation = {
  partId: "part-1", staffId: "staff-1", voiceId: "voice-1", measureNumber: 1,
};
const eventAt = (project: ReturnType<typeof createLocalScoreProject>, id: string) =>
  project.document.parts[0]!.staves[0]!.voices[0]!.measures[0]!.events.find((event) => event.id === id)!;
let project = createLocalScoreProject({ projectId: "fermata", title: "延长", now: "2026-07-27T00:00:00.000Z" });
project = addLocalScoreProjectEvent({ project, expectedRevision: 1, location, input: { type: "note", pitch: "C4", duration: "quarter" }, eventId: "note-1", now: "2026-07-27T00:00:00.100Z" });
project = addLocalScoreProjectEvent({ project, expectedRevision: 2, location, input: { type: "rest", pitch: null, duration: "quarter" }, eventId: "rest-1", now: "2026-07-27T00:00:00.200Z" });
assert.equal(project.schemaVersion, "local-score-project-storage-v14");
assert.equal(project.document.schemaVersion, "score-document-v13");
assert.equal(eventAt(project, "note-1").fermataMark, null);
project = changeLocalScoreProjectEventFermataMark({ project, expectedRevision: project.document.revision, location, eventId: "note-1", fermataMark: "fermata", now: "2026-07-27T00:00:01.000Z" });
project = changeLocalScoreProjectEventFermataMark({ project, expectedRevision: project.document.revision, location, eventId: "rest-1", fermataMark: "fermata", now: "2026-07-27T00:00:02.000Z" });
assert.equal(eventAt(project, "note-1").fermataMark, "fermata");
assert.throws(() => changeLocalScoreProjectEventFermataMark({ project, expectedRevision: project.document.revision, location, eventId: "note-1", fermataMark: "bad" as never, now: "2026-07-27T00:00:03.000Z" }));
const copied = copyLocalScoreProjectEvent({ project, location, eventId: "note-1" });
assert.equal(copied.fermataMark, "fermata");
const pasted = pasteLocalScoreProjectEvent({ project, expectedRevision: project.document.revision, destination: location, eventId: "note-2", input: copied, now: "2026-07-27T00:00:04.000Z" });
assert.equal(eventAt(pasted, "note-2").fermataMark, "fermata");
const undone = undoLocalScoreProject({ project: pasted, expectedRevision: pasted.document.revision, now: "2026-07-27T00:00:05.000Z" });
assert.equal(eventAt(undone, "note-2"), undefined);
const parsed = parseLocalScoreProject(JSON.parse(JSON.stringify(project)));
assert.equal(parsed && eventAt(parsed, "note-1").fermataMark, "fermata");
const staff = createLocalScoreProjectStaffPresentation(project.document);
assert.equal(staff.status, "ready");
if (staff.status === "ready") {
  assert.equal(staff.tokens[0]!.fermataMark, "fermata");
  assert.ok(staff.fermataY > staff.damperPedalY);
  assert.match(staff.tokens[0]!.accessibleLabel, /延长记号/);
}
const numbered = createLocalScoreProjectNumberedPresentation(project.document);
assert.equal(numbered.status, "ready");
if (numbered.status === "ready") assert.equal(numbered.tokens[0]!.fermataMark, "fermata");
const withFermata = createLocalScoreProjectPlaybackPlan({ document: project.document, bpm: project.tempoBpm });
const rawV10 = JSON.parse(JSON.stringify(project.document)) as Record<string, unknown>;
rawV10.schemaVersion = "score-document-v10";
for (const part of rawV10.parts as Array<Record<string, unknown>>) {
  for (const staff of part.staves as Array<Record<string, unknown>>) {
    for (const voice of staff.voices as Array<Record<string, unknown>>) {
      for (const measure of voice.measures as Array<Record<string, unknown>>) {
        for (const event of measure.events as Array<Record<string, unknown>>) {
          delete event.damperPedalMark;
          delete event.fermataMark;
        }
      }
    }
  }
}
assert.equal(createLocalScoreProjectStaffPresentation(rawV10).status, "ready");
assert.equal(createLocalScoreProjectPlaybackPlan({ document: rawV10, bpm: project.tempoBpm }).status, "ready");
let plain = createLocalScoreProject({ projectId: "plain", title: "普通", now: "2026-07-27T00:00:00.000Z" });
plain = addLocalScoreProjectEvent({ project: plain, expectedRevision: 1, location, input: { type: "note", pitch: "C4", duration: "quarter" }, eventId: "note-1", now: "2026-07-27T00:00:00.100Z" });
plain = addLocalScoreProjectEvent({ project: plain, expectedRevision: 2, location, input: { type: "rest", pitch: null, duration: "quarter" }, eventId: "rest-1", now: "2026-07-27T00:00:00.200Z" });
const withoutFermata = createLocalScoreProjectPlaybackPlan({ document: plain.document, bpm: plain.tempoBpm });
assert.equal(withFermata.status, "ready"); assert.equal(withoutFermata.status, "ready");
if (withFermata.status === "ready" && withoutFermata.status === "ready") {
  assert.deepEqual(
    {
      durationMs: withFermata.durationMs,
      events: withFermata.events.map((event) => event.type === "all-notes-off"
        ? event
        : { type: event.type, delayMs: event.delayMs, midi: event.midi, sourceEventId: event.sourceEventId }),
      spans: withFermata.spans,
      warnings: withFermata.warnings,
    },
    {
      durationMs: withoutFermata.durationMs,
      events: withoutFermata.events.map((event) => event.type === "all-notes-off"
        ? event
        : { type: event.type, delayMs: event.delayMs, midi: event.midi, sourceEventId: event.sourceEventId }),
      spans: withoutFermata.spans,
      warnings: withoutFermata.warnings,
    },
  );
}
console.log("local-score-project fermata tests passed");
