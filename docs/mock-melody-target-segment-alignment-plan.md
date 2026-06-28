# P9c Mock Melody Steps to Target Segment Alignment Plan

## 1. Purpose

This docs-only plan defines how the current Practice Mode mock melody / `melodySteps` concept can align with future target pitch segments.

The goals are to:

* let the existing Practice Mode melody step flow become the smallest starting point for a future target curve
* avoid jumping directly to a MusicXML parser or complex score converter
* reduce ambiguity before a later mock melody → target segments prototype

P9c is only a planning document. It does not implement a converter, add TypeScript types, change runtime behavior, or change the `/practice` UI.

## 2. Current Practice Mode concept

A source review of `app/practice/page.tsx` shows that Practice Mode currently uses a fixed mock exercise and derives `melodySteps` from its target-note list. The current concepts are:

* a fixed mock melody / `melodySteps` list derived from `mockExercise.targetNotes`
* `currentMelodyStepIndex` as the active step pointer
* Step X/N progress based on the current melody step index and total melody step count
* a current target note derived from the active melody step
* a Play target control for the selected target note
* previous / next / restart melody controls that move through the fixed melody steps
* local in-session attempt history stored in React state
* retrying a specific target step from attempt history by restoring the stored melody step index

The current mock melody is not yet a formal target pitch curve. It does not include complete timing, rests, measure / beat alignment, or target segment rendering data. Its target-note playback frequency is currently a simple lookup from note name to frequency, not a score-derived segment model.

## 3. Future target segment concept recap

P8e, P9a, and P9b frame the future target pitch segment shape around target-relative rendering and score-derived alignment. The relevant target segment fields / concepts include:

* `targetId`
* `sourceType`
* `noteName`
* `frequencyHz`
* `expectedMidiNumber`
* `startTimeMs` / `endTimeMs`
* `startBeat` / `endBeat`
* `measureNumber` / `beatInMeasure`
* `displayLabel`
* `centsToleranceGuide`
* `segmentKind`
* `sourceNoteIds`
* `shouldCreateFormalScore: false`

For the MVP path, these fields should support visual and practice alignment without implying formal scoring, rhythm grading, or production-quality score conversion.

## 4. Field alignment table

| Current Practice Mode field / concept | Future target segment alignment | Notes |
| --- | --- | --- |
| Melody step `id` such as `melody-step-1` | `targetId` or `sourceNoteIds` | A later prototype can preserve the current step id as a source reference or derive a stable `targetId` from it. |
| Melody step array order | target segment display order / optional `melodyStepIndex` metadata | The current array order is the simplest initial horizontal segment order. |
| Melody step index | display order / active segment index | This can remain the UI pointer for stepping through a mock-derived target segment array. |
| `targetNote` / note name | `noteName` and `displayLabel` | The current note string can become both the musical note value and a simple display label such as `Step 1 · C4`. |
| `noteFrequencies[targetNote]` | `frequencyHz` | The current lookup can seed target frequency for mock-derived pitched-note segments. |
| selected target note playback frequency | target frequency source | Playback can later read from the active segment's `frequencyHz` rather than from a separate note lookup. |
| `currentMelodyStepIndex` | active target segment pointer | This should become the active segment pointer once mock melody steps are represented as target segments. |
| Step X/N | display progress derived from target segment order | Progress should be derived from ordered target segments, not duplicated independently. |
| Attempt history `melodyStepId` | `targetId` / `melodyStepId` alignment | Keeping a stable id helps reconnect attempts to the exact target segment. |
| Attempt history `melodyStepIndex` | active target segment index fallback | Useful for local retry behavior, but less stable than ids if the sequence changes. |
| Attempt history `melodyStepNumber` | user-facing display position | This can remain display-only and should not be the canonical segment identity. |
| Retry a specific target step | restore active segment by `targetId`, with index fallback | This avoids repeated-note ambiguity when two steps share the same note name. |

Fields / concepts missing from the current mock melody model include:

* `startTimeMs` / `endTimeMs`
* `startBeat` / `endBeat`
* `measureNumber` / `beatInMeasure`
* rests
* ties
* slurs
* repeated note articulation semantics
* tempo assumptions beyond a simple suggested BPM
* phrase boundaries

## 5. Recommended first implementation direction

This section is a future recommendation only. P9c does not implement it.

The recommended first implementation should be a small mock melody / `melodySteps` → target segment array prototype. The initial version can use synthetic timing and fixed spacing:

* each melody step becomes one pitched-note segment
* no rests yet
* no ties yet
* no rhythm scoring
* no MusicXML parsing
* no audio import
* no live microphone
* no formal scoring

This keeps the next step small and reviewable. It also creates a bridge between the existing Practice Mode step flow and the later score-derived target segment model without requiring a full converter first.

## 6. Attempt history compatibility

Future target segment alignment should not break the existing attempt history behavior:

* existing step id / index should remain stable where possible
* repeated notes must not collapse into one ambiguous target
* retrying a specific target should still return to the correct step / segment
* future `targetId` values should help avoid repeated-note ambiguity

The current attempt history already records the step id, index, number, target note, estimated note, frequency estimate, cents offset, confidence, and feedback label. A later target segment prototype should preserve that intent by storing or deriving enough segment identity to retry the exact target, even when multiple segments share the same note name.

## 7. Rendering relationship

The current melody step can become the smallest future target data for a trend chart:

* the current step target note could render as one active target block
* future segment order could render as horizontal note blocks
* the 0 cents center line remains target-relative
* user pitch frames compare against the active target segment only when live feedback exists
* P9c does not render real chart data

This relationship keeps the chart model incremental. The first mock-derived segment array can support target blocks before real-time pitch frames, MusicXML-derived timing, or rhythm-aware display are added.

## 8. Boundaries and non-goals

P9c does not do any of the following:

* runtime code
* TypeScript type file
* converter implementation
* `app/practice/page.tsx` changes
* UI changes
* target curve generation
* MusicXML parser
* MIDI import
* MP3 / WAV import
* melody guide audio import
* accompaniment playback
* microphone access
* AudioContext
* getUserMedia
* real-time recording
* frame-level pitch analysis
* live chart rendering
* estimator changes
* Pitchy Practice Mode integration
* comparison harness changes
* benchmark gate / tolerance changes
* upload
* cloud assessment
* GPT / AI API
* formal scoring
* rhythm evaluation
* sight-singing assessment
* Song Learning Mode
* source separation
* vocal melody extraction
* `/api/recognize` changes
* PDF upload
* Audiveris
