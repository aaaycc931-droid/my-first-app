# P9j Static Preview Target Curve Source Decision

## 1. Purpose

This document decides which source the future P8c large static pitch trend preview should read first when it starts consuming `TargetPitchCurve` / `TargetPitchSegment[]` data.

P9j is a docs-only source decision. It does not implement any `/practice` integration, does not change UI, and does not import any fixture or converter.

## 2. Decision

Choose **Option A: Static preview reads a hand-authored `TargetPitchCurve` example** as the first future implementation path.

Do not choose these sources yet:

* **Option B: converter-generated fixture**
* **Option C: current `melodySteps` runtime conversion**

## 3. Why Option A first

The hand-authored example should come first because it is the safest and most controllable way to connect target segment data to the static preview.

Reasons:

* It has the smallest integration risk.
* It does not change Practice Mode runtime data flow.
* It does not depend on converter behavior.
* It does not replace existing `melodySteps`.
* It does not affect `currentMelodyStepIndex`.
* It does not affect Record / Estimate / attempt history.
* It makes static chart rendering easy to review.
* It is the best first step for validating the relationship between the P8c visual rendering and the `TargetPitchSegment` shape.

## 4. Why not Option B yet

The converter-generated fixture should not be the first static preview source yet.

Reasons:

* It would be the first step that brings converter-derived output into `/practice`.
* It would require extra QA to confirm that a converter import does not change runtime behavior.
* It is better suited after the hand-authored example preview is stable and reviewed.

## 5. Why not Option C yet

The current `melodySteps` runtime conversion should not be the first static preview source yet.

Reasons:

* It would touch existing Practice Mode runtime data flow.
* It could affect `currentMelodyStepIndex`, Step X/N display, retry step behavior, or attempt history.
* It requires stricter QA than a hand-authored static preview source.
* It should wait until static example rendering succeeds.

## 6. Recommended future order

Recommended future sequence:

1. **P9k:** static preview reads the hand-authored `TargetPitchCurve` example.
2. **P9l:** source review / QA confirms no Practice Mode behavior change.
3. **P9m:** optional converter-generated preview data plan.
4. **P9n:** optional converter-generated preview implementation.
5. Consider current `melodySteps` runtime conversion only after the safer static and converter-generated paths are understood.

## 7. Boundary for P9k

P9k may:

* import only hand-authored example data into `/practice` for static preview rendering.

P9k must not:

* import the converter;
* import the generated fixture;
* replace existing `melodySteps`;
* change Record / Estimate;
* change attempt history;
* add live microphone, recording, or scoring;
* become interactive live feedback;
* do anything beyond a non-interactive static preview.

## 8. Non-goals

P9j does not do any of the following:

* runtime code
* `app/practice/page.tsx` changes
* fixture import into `/practice`
* converter import into `/practice`
* target curve generation
* current `melodySteps` conversion
* Practice Mode UI changes
* live chart rendering
* MusicXML parser
* MIDI import
* MP3 / WAV import
* melody guide audio import
* accompaniment playback
* microphone access
* `AudioContext`
* `getUserMedia`
* real-time recording
* frame-level pitch analysis
* estimator changes
* Pitchy Practice Mode integration
* comparison harness changes
* benchmark gate / tolerance changes
* upload
* cloud assessment
* GPT / AI API
* formal score
* rhythm evaluation
* sight-singing assessment
* Song Learning Mode
* source separation
* vocal melody extraction
* `/api/recognize` changes
* PDF upload
* Audiveris

## P9k implementation note

P9k implemented the first static preview integration using only the hand-authored `TargetPitchCurve` example, without converter/generated fixture/runtime `melodySteps` integration.

## P9l QA note

P9l reviewed the P9k hand-authored static preview integration and confirmed it remains non-interactive, keeps the converter and generated fixture unimported by `/practice`, and does not affect Practice Mode runtime behavior.
