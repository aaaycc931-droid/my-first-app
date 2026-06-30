# P12h Pitch Frame Diagnostic Output Copy Plan

## 1. Purpose

This document plans future diagnostic output copy for the `/research/local-audio-decode` decoded WAV pitch-frame extraction POC.

P12h is documentation-only. It does not implement code, route behavior changes, UI runtime changes, pitch extraction changes, note segmentation, `TargetPitchCurve` generation, Practice Mode integration, scoring, upload/cloud/AI behavior, or APK-ready support.

The goal is to define safe labels and explanatory copy before any future diagnostic output UI adjustment so users do not confuse research diagnostics with formal pitch recognition, melody recognition, scoring, `TargetPitchCurve`, or Practice Mode results.

## 2. Current status

Current boundaries for the decoded WAV pitch-frame diagnostics are:

- `/research/local-audio-decode` is an isolated research route.
- The P12b pitch-frame extraction POC is research-only.
- The output is limited diagnostics: analyzed duration, frame counts, voiced/unvoiced counts, and optional frequency summaries.
- There is no Practice Mode integration.
- There is no `TargetPitchCurve` generation.
- There is no note segmentation.
- There is no formal pitch recognition.
- There is no melody recognition.
- There is no scoring.
- There is no APK-ready claim.

## 3. Copy principles

Future diagnostic output copy should:

- Use words such as "diagnostic", "research", and "experimental".
- Clearly state that results are for research debugging only.
- Avoid "score", "grade", "pass", and "fail".
- Avoid "recognized melody".
- Avoid "pitch accuracy".
- Avoid "target curve generated".
- Avoid "Practice Mode result".
- Avoid implying the output is a formal product audio import or assessment result.

## 4. Suggested heading copy

Future output headings may use:

- Pitch frame diagnostics
- Local research diagnostics
- Decoded WAV frame summary

Future output headings should avoid:

- Pitch recognition result
- Melody recognition result
- Singing score
- Practice result
- Target curve result
- Audio import result

## 5. Suggested summary copy

Future result summaries may use copy such as:

- "These values summarize local research diagnostics from the decoded WAV frames."
- "They are not a formal pitch score, melody transcription, or Practice Mode result."
- "No TargetPitchCurve is generated from this output."

These are suggested copy examples only. P12h does not implement this copy in the UI.

## 6. Field-level copy

### `analyzedDurationSeconds`

Suggested explanation:

- "Decoded duration analyzed for research diagnostics."

Do not describe this as a formal practice duration, scoring basis, rhythm assessment window, or sight-singing assessment duration.

### `frameCount`

Suggested explanation:

- "Number of analysis frames inspected."

Do not describe this as a note count, melody segment count, rhythm event count, or Practice Mode step count.

### `voicedFrameCount`

Suggested explanation:

- "Frames where a pitch-like signal was detected by the diagnostic extractor."

Do not describe these as correct pitch frames, passed frames, notes, target matches, or scoring units.

### `unvoicedFrameCount`

Suggested explanation:

- "Frames where no pitch-like signal was detected."

Do not describe these as mistakes, failed frames, bad singing, incorrect melody, or Practice Mode errors.

### `minFrequencyHz` / `medianFrequencyHz` / `maxFrequencyHz`

Suggested explanation:

- "Frequency summary across voiced diagnostic frames."

Do not describe these values as vocal range, melody range, pitch accuracy, recognized melody, score, grade, `TargetPitchCurve`, or target segment output.

### `confidence`

If future output displays confidence, explain it as diagnostic confidence or signal confidence.

Do not describe confidence as a grade, score, correctness percentage, pass/fail result, Practice Mode result, or singing quality assessment.

### `frameState`

If future output displays frame state, explain `voiced`, `unvoiced`, `low-confidence`, and `invalid` as diagnostic states.

Do not describe frame states as pass, fail, wrong, correct, mistake, grade, or scoring feedback.

## 7. Warning copy

Future warning copy may use:

- `too-few-voiced-frames`: "Too few voiced frames for useful diagnostics."
- `high-unvoiced-ratio`: "Many frames did not contain a pitch-like signal."
- `unstable-frequency`: "Frequency estimates varied significantly."
- `possible-noise`: "The decoded audio may contain noise."
- `possible-polyphonic-content`: "The audio may not be simple monophonic content."
- `short-duration`: "The clip may be too short for useful diagnostics."
- `long-duration`: "The clip may be longer than intended for this research POC."

Warnings are research hints only. They are not formal failures, scores, grades, Practice Mode feedback, singing judgments, rhythm assessment, sight-singing assessment, or APK readiness checks.

## 8. Error copy

Future error copy may use:

- Decode failed
- Pitch-frame extraction failed
- Unsupported or unreadable input
- Not enough voiced frames for diagnostics
- Browser limitation encountered

Error copy must avoid:

- "you failed"
- "bad singing"
- "incorrect melody"
- "score unavailable"
- "recognition failed", unless carefully scoped as diagnostic extraction failure

## 9. Boundary banner copy

Future output areas should display boundary copy such as:

- Local-only research diagnostics
- No upload
- No cloud
- No AI API
- No melody recognition
- No scoring
- No `TargetPitchCurve` generation
- Not Practice Mode
- Not APK-ready

## 10. Relationship to data shape

P12f plans the future decoded WAV pitch frame data shape. P12h plans how to label and explain those fields.

The data shape and copy remain research-only. P12h does not implement either the data shape or the UI copy.

## 11. Relationship to Practice Mode

Diagnostic output is not Practice Mode feedback.

It is not tied to `currentMelodyStepIndex`, not stored in attempt history, not used for Record / Estimate, not used for static pitch trend preview, and not used for scoring.

## 12. Relationship to TargetPitchCurve

Diagnostic output is not `TargetPitchCurve`.

Minimum, median, and maximum frequencies do not create target segments. Frame diagnostics do not create notes.

Future `TargetPitchCurve` generation requires a separate source decision, acceptance criteria, implementation PR, and source review QA.

## 13. Relationship to note segmentation

Diagnostic output does not generate a note sequence.

Voiced frames do not equal notes. Frequency changes do not equal melody segmentation. P12h plans no rhythm inference.

## 14. Product claim boundary

P12h copy must not claim:

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

Output copy planning does not prove APK readiness.

Future Android APK / WebView packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, and performance.

## 16. Future recommended sequence

Recommended next steps are:

- P12i Diagnostic Output Copy Source Review QA, docs-only.
- P12j Diagnostic Output UI Implementation Plan, docs-only.
- Only later, if approved, a tiny UI copy-only implementation PR.
- Source review QA after any UI implementation.

## 17. Non-goals

P12h does not do any of the following:

- runtime code
- route behavior changes
- UI implementation
- pitch extraction algorithm changes
- automated tests
- `package.json` changes
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

## 18. P12i Source Review QA note

P12i reviewed this diagnostic output copy plan and confirmed the proposed headings, summary text, field-level copy, warning copy, error copy, and boundary banner remain research-only diagnostics.

The reviewed copy plan does not describe the diagnostics as formal pitch recognition, melody recognition, note segmentation, `TargetPitchCurve` generation, scoring, Practice Mode feedback, upload/cloud/AI behavior, or APK-ready support.

P12i also confirmed the relationship to the P12f data shape remains limited: P12f plans research-only diagnostic fields, while P12h plans labels and explanations for those fields. Neither P12h nor P12i implements the data shape, route behavior, UI copy, pitch extraction algorithm changes, Practice Mode integration, note segmentation, scoring, or `TargetPitchCurve` generation.

## 19. P12j UI implementation planning note

P12j plans how future UI copy-only implementation could apply this diagnostic output copy to `/research/local-audio-decode` while keeping route behavior, UI implementation, pitch extraction logic, note segmentation, `TargetPitchCurve` generation, Practice Mode integration, formal scoring, upload/cloud/AI behavior, and APK-ready claims unchanged.
