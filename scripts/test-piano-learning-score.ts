import assert from "node:assert/strict";

import {
  confirmPianoLearningDraft,
  createPianoLearningDraftFromMusicXML,
  createPianoLearningSchedule,
  createPianoWaterfallNotes,
  P110_ORIGINAL_PIANO_EXERCISE,
  removePianoLearningDraftNote,
} from "../lib/piano/pianoLearningScore";

const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note></measure></part></score-partwise>`;
const draft = createPianoLearningDraftFromMusicXML({ xml, fileName: "练习.musicxml" });
assert.equal(draft.reviewState, "needs-review");
assert.deepEqual(draft.notes.map((note) => [note.pitch, note.startBeat, note.durationBeats]), [
  ["C4", 0, 1], ["E4", 1, 2],
]);
assert.deepEqual(createPianoLearningSchedule(draft, 60), []);

const edited = removePianoLearningDraftNote(draft, draft.notes[1].id);
assert.equal(edited.notes.length, 1);
assert.equal(edited.reviewState, "needs-review");
const confirmed = confirmPianoLearningDraft(edited);
const schedule = createPianoLearningSchedule(confirmed, 60);
assert.equal(schedule[0]?.type, "note-on");
assert.equal(schedule.at(-1)?.type, "all-notes-off");
assert.equal(schedule.at(-1)?.delayMs, 1_000);
assert.equal(createPianoWaterfallNotes(confirmed)[0]?.leftPercent, 50);

assert.equal(P110_ORIGINAL_PIANO_EXERCISE.notes.length, 8);
assert.ok(createPianoLearningSchedule(P110_ORIGINAL_PIANO_EXERCISE, 120).length > 8);
assert.throws(() => createPianoLearningDraftFromMusicXML({ xml: "", fileName: "空.xml" }), /为空/);
assert.throws(() => createPianoLearningDraftFromMusicXML({ xml: "<score-timewise />", fileName: "错.xml" }), /score-partwise/);

console.log("Piano learning score tests passed.");
