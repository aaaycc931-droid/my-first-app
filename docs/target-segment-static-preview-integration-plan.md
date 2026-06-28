# P9i Target Segment Static Preview Integration Plan

## 1. Purpose

This document plans a future integration path for the P8c large static pitch trend preview to read `TargetPitchCurve` / `TargetPitchSegment[]` data as its rendering source.

The goal is to prepare later small PRs without immediately wiring converter output or fixtures into `/practice`. P9i is intentionally docs-only: it records integration boundaries before any Practice Mode runtime work begins.

## 2. Current status

The current repository state is:

- P8c's large pitch trend preview is still a static UI placeholder.
- P9d's `TargetPitchCurve` / `TargetPitchSegment` type-only contract exists for future target curve work.
- P9e's hand-authored mock melody target curve fixture/example exists.
- P9g's example-only generated fixture exists.
- P9f's mock-only converter exists but remains isolated.
- `/practice` still does not import the converter or generated fixture.
- Existing `melodySteps` have not been replaced.
- There is currently no live chart data, target curve generation, or real-time feedback integration.

## 3. Future integration options

P9i does not choose or implement any option. It only records future choices so they can be reviewed in separate small PRs.

### Option A: Static preview reads a hand-authored `TargetPitchCurve` example

- Pros: safest and most predictable path.
- Cons: still does not represent actual `melodySteps` data.

### Option B: Static preview reads generated fixture from converter

- Pros: verifies converter output can feed a chart preview shape.
- Cons: would be the first time converter-derived data enters `/practice`, so the PR must explicitly keep the result UI-only and non-interactive.

### Option C: Practice Mode converts current `melodySteps` to `TargetPitchCurve`

- Pros: closest to the future real data flow.
- Cons: begins touching Practice Mode runtime data and therefore needs a separate small PR plus stricter QA.

## 4. Recommended next implementation order

Recommended future sequencing:

1. P9j: static preview rendering source decision, docs-only.
2. P9k: non-interactive static preview reads a hand-authored target curve example.
3. P9l: QA confirming no Record / Estimate / history changes.
4. Later: consider converter-derived preview data.
5. Later still: consider current `melodySteps` runtime conversion.

## 5. Rendering contract reminder

When a future static preview reads target segment data:

- Pitched-note segments should render as horizontal target blocks.
- Rest-gap segments should render as blank / inactive target areas.
- Repeated notes should remain separate blocks.
- Tied notes may render as linked blocks.
- `0 cents` remains the target-relative center line.
- `centsToleranceGuide` is visual only.
- `shouldCreateFormalScore` must remain `false`.
- No-pitch / low-confidence user frames are not part of P9i.

## 6. Practice Mode boundary

Future integration work must not automatically change:

- Target playback.
- `currentMelodyStepIndex`.
- Previous / next / restart melody behavior.
- Record / Estimate flow.
- Attempt history.
- Retry specific target behavior.
- Microphone behavior.
- Scoring behavior.

Any PR that changes one of these areas must state that explicitly and include dedicated QA for that behavior.

## 7. Non-goals

P9i does not do any of the following:

- Runtime code.
- `app/practice/page.tsx` changes.
- Converter import into `/practice`.
- Fixture import into `/practice`.
- Target curve generation.
- Live chart rendering.
- MusicXML parser.
- MIDI import.
- MP3 / WAV import.
- Melody guide audio import.
- Accompaniment playback.
- Microphone access.
- `AudioContext`.
- `getUserMedia`.
- Real-time recording.
- Frame-level pitch analysis.
- Estimator changes.
- Pitchy Practice Mode integration.
- Comparison harness changes.
- Benchmark gate / tolerance changes.
- Upload.
- Cloud assessment.
- GPT / AI API.
- Formal score.
- Rhythm evaluation.
- Sight-singing assessment.
- Song Learning Mode.
- Source separation.
- Vocal melody extraction.
- `/api/recognize` changes.
- PDF upload.
- Audiveris.
