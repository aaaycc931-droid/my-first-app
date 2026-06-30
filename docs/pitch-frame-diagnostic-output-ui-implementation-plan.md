# P12j Diagnostic Output UI Implementation Plan

## 1. Purpose

This document plans a future UI copy-only implementation for applying the P12h research-only diagnostic output copy to the `/research/local-audio-decode` decoded WAV pitch-frame extraction POC.

P12j is documentation-only. It does not implement UI changes, runtime code, route behavior changes, pitch extraction changes, note segmentation, `TargetPitchCurve` generation, Practice Mode integration, scoring, upload/cloud/AI behavior, or APK-ready support.

## 2. Current UI status

The current `/research/local-audio-decode` route is an isolated research route with a decoded WAV pitch-frame extraction POC.

P12j does not change:

- file selection
- decode action
- extract pitch frames action
- extraction logic
- output data
- route behavior
- Practice Mode

## 3. Implementation target

A future UI copy-only implementation may adjust only these diagnostic output copy areas:

- diagnostic output section heading
- diagnostic result summary text
- field labels / helper text
- warning / error helper copy
- boundary banner copy
- research-only disclaimers

A future UI copy-only implementation must not:

- add features
- change button behavior
- change file input behavior
- change decode behavior
- change extraction behavior
- change the pitch algorithm
- add `TargetPitchCurve`
- integrate Practice Mode

## 4. Proposed output section structure

A future diagnostic output area can contain the following structure.

### A. Heading

Allowed heading examples:

- Pitch frame diagnostics
- Local research diagnostics
- Decoded WAV frame summary

Avoid headings such as:

- Pitch recognition result
- Melody recognition result
- Singing score
- Practice result
- Target curve result
- Audio import result

### B. Boundary banner

The boundary banner should make the diagnostic scope explicit with copy such as:

- Local-only research diagnostics
- No upload
- No cloud
- No AI API
- No melody recognition
- No scoring
- No `TargetPitchCurve` generation
- Not Practice Mode
- Not APK-ready

### C. Summary text

Future summary text can use copy such as:

- These values summarize local research diagnostics from the decoded WAV frames.
- They are not a formal pitch score, melody transcription, or Practice Mode result.
- No `TargetPitchCurve` is generated from this output.

### D. Field-level helper text

Future field-level helper text can cover:

- analyzed duration
- frame count
- voiced frames
- unvoiced frames
- min / median / max frequency
- confidence, if shown
- frame state, if shown

## 5. Field-level UI copy plan

### analyzed duration

- Label: Analyzed duration
- Helper: Decoded duration inspected for research diagnostics.
- Do not describe this as a formal practice duration or score basis.

### frame count

- Label: Analysis frames
- Helper: Number of diagnostic frames inspected.
- Do not describe this as note count.

### voiced frames

- Label: Voiced diagnostic frames
- Helper: Frames where the diagnostic extractor found a pitch-like signal.
- Do not describe these as correct pitch frames.

### unvoiced frames

- Label: Unvoiced diagnostic frames
- Helper: Frames where no pitch-like signal was detected.
- Do not describe these as mistakes.

### frequency summary

- Label: Frequency summary
- Helper: Min / median / max frequency estimates across voiced diagnostic frames.
- Do not describe this as vocal range, melody range, accuracy, score, or target curve.

### confidence

- Label: Diagnostic confidence
- Helper: Signal-level confidence for research diagnostics only.
- Do not describe this as grade, correctness, pass, fail, or scoring.

### frame state

- Label: Frame state
- Helper: Diagnostic state such as voiced, unvoiced, low-confidence, or invalid.
- Do not describe this as correct, wrong, pass, or fail.

## 6. Warning / error UI copy plan

Warnings should be introduced as:

- Research hints
- Diagnostic warnings
- Local analysis hints

Avoid warning framing such as:

- Formal failure
- Score result
- Singing judgment
- Practice feedback

Example warning copy:

- Too few voiced frames for useful diagnostics.
- Many frames did not contain a pitch-like signal.
- Frequency estimates varied significantly.
- The decoded audio may contain noise.
- The audio may not be simple monophonic content.
- The clip may be too short for useful diagnostics.
- The clip may be longer than intended for this research POC.

Example error copy:

- Decode failed.
- Pitch-frame extraction failed.
- Unsupported or unreadable input.
- Not enough voiced frames for diagnostics.
- Browser limitation encountered.

Avoid error copy such as:

- You failed.
- Bad singing.
- Incorrect melody.
- Score unavailable.
- Recognition failed, unless carefully scoped as diagnostic extraction failure.

## 7. UI placement plan

A future copy-only implementation should affect only the `/research/local-audio-decode` diagnostic output area.

It should not affect:

- page title, unless needed for clarity
- file selection behavior
- decode button behavior
- extract pitch frames button behavior
- Practice Mode UI
- homepage
- navigation
- public demo flow

## 8. Interaction boundary

A future UI copy-only implementation should not change:

- disabled / enabled gating
- file selection state
- decode state
- extraction state
- error state logic
- clear/reset behavior
- network behavior
- local-only processing
- audio API lifecycle

## 9. Relationship to P12h copy plan

- P12h defines safe copy principles and examples.
- P12i reviewed those copy boundaries.
- P12j plans how to apply them to UI.
- Implementation remains deferred.

## 10. Relationship to P12f data shape

- P12f planned future diagnostic data shapes.
- UI copy should label those fields as diagnostics only.
- The data shape does not become formal pitch recognition.
- UI labels must not imply notes, score, `TargetPitchCurve`, or Practice Mode results.

## 11. Practice Mode boundary

Diagnostic UI copy is not Practice Mode feedback.

It is not:

- tied to `currentMelodyStepIndex`
- stored in attempt history
- used by Record / Estimate
- used by static pitch trend preview
- used for score / pass / fail

## 12. TargetPitchCurve boundary

- Diagnostic output UI must not imply `TargetPitchCurve` generation.
- Frequency summaries do not create target segments.
- Frame diagnostics do not create notes.
- Future `TargetPitchCurve` generation requires a separate source decision, acceptance criteria, implementation PR, and source review QA.

## 13. Note segmentation boundary

- Diagnostic UI must not imply a note sequence.
- Voiced frames do not equal notes.
- Frequency changes do not equal melody segmentation.
- There is no rhythm inference.

## 14. Product claim boundary

A future UI copy-only implementation must not claim:

- formal audio import
- formal pitch recognition
- melody recognition
- arbitrary song analysis
- source separation
- vocal separation
- accompaniment-to-melody inference
- `TargetPitchCurve` generation
- Practice Mode support
- scoring
- APK-ready support

## 15. Android APK / WebView caveat

UI copy planning does not prove APK readiness. Future Android APK / WebView packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, and performance.

## 16. Future implementation acceptance criteria

A future tiny UI copy-only implementation PR should meet these acceptance criteria:

- only edits `app/research/local-audio-decode/page.tsx` copy/labels
- no behavior changes
- no algorithm changes
- no new dependencies
- no Practice Mode changes
- no `TargetPitchCurve` generation
- no note segmentation
- no scoring
- no upload/cloud/AI
- diagnostic output clearly labeled research-only
- boundary banner present or equivalent copy present
- source review QA follows immediately after implementation

## 17. Future recommended sequence

Recommended sequence if separately approved:

- P12k Tiny Diagnostic Output UI Copy-only Implementation
- P12l Diagnostic Output UI Copy Source Review QA
- P12m Manual Browser QA for updated diagnostic output copy

P12j does not implement these steps.

## 18. Non-goals

P12j does not do any of the following:

- runtime code
- route behavior changes
- UI implementation
- pitch extraction algorithm changes
- automated tests
- package.json changes
- `app/research/local-audio-decode/page.tsx` changes
- `app/practice/page.tsx` changes
- file input changes
- automatic decoding
- automatic pitch extraction
- waveform rendering
- note segmentation
- `TargetPitchCurve` generation
- Practice Mode integration
- live chart rendering
- converter changes
- MusicXML parser
- MIDI import
- accompaniment playback
- source separation
- vocal separation
- Song Learning Mode implementation
- cloud upload
- cloud assessment
- GPT / AI API
- formal score
- rhythm evaluation
- sight-singing assessment
- estimator changes
- Pitchy Practice Mode integration
- comparison harness changes
- benchmark gate / tolerance changes
- `/api/recognize` changes
- recognition provider union changes
- PDF upload
- Audiveris
- dependency changes
- real audio commits
- `metadata.local.json` commits
- APK-ready claim

## P12k implementation note

P12k applies a tiny UI copy-only update to the `/research/local-audio-decode` diagnostic output area while keeping route behavior, file/decode/extract actions, pitch extraction logic, note segmentation, TargetPitchCurve generation, Practice Mode integration, formal scoring, upload/cloud/AI behavior, and APK-ready claims unchanged.

## P12l source review QA note

P12l reviewed the P12k UI copy-only implementation and confirmed the `/research/local-audio-decode` diagnostic output copy remains research-only while route behavior, file/decode/extract actions, disabled/enabled gating, pitch extraction logic, note segmentation, TargetPitchCurve generation, Practice Mode integration, formal scoring, upload/cloud/AI behavior, and APK-ready claims remain unchanged.

## P12m manual browser QA result note

P12m records a passing manual browser visual QA result for the updated diagnostic output copy while keeping route behavior, file/decode/extract actions, disabled/enabled gating, pitch extraction logic, note segmentation, TargetPitchCurve generation, Practice Mode integration, formal scoring, upload/cloud/AI behavior, and APK-ready claims unchanged.
