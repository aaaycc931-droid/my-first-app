# P13b Pitch Extraction Test Fixture Plan

## 1. Purpose

P13b plans a future test fixture strategy for decoded WAV pitch-frame extraction accuracy improvements on `/research/local-audio-decode`.

This document is planning only. P13b does not implement code, generate fixtures, add test scripts, change route behavior, change UI copy, change file selection, change decode behavior, change Extract pitch frames behavior, change disabled / enabled gating, change pitch extraction logic, integrate Practice Mode, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or commit audio.

## 2. Test fixture goals

Future fixtures should support:

- Repeatable synthetic checks.
- Local-only manual checks.
- Algorithm regression review.
- Diagnostic output sanity checks.
- Confidence and voiced/unvoiced behavior review.
- No real audio commits.
- No copyrighted audio commits.
- No `metadata.local.json` commits.

## 3. Fixture categories

### Category A: Synthetic generated WAV fixtures

Future work may use programmatically generated temporary WAV files or fixture-like signals for diagnostic checks, such as:

- Clean sine.
- Silence.
- Low amplitude sine.
- Noisy sine.
- Vibrato-like sine.
- Frequency drift.
- Octave-jump stress signal.
- Mixed harmonics.
- Short tone.
- Repeated tone.
- Tone + silence transitions.

P13b does not generate these files. Future implementation should prefer temporary generated fixtures inside scripts or tests. Committed binary WAV fixtures should be avoided unless a separate PR justifies the storage, review, licensing, and privacy tradeoff before adding them. Generated fixtures must not contain real performances, personal voice data, or copyrighted material.

### Category B: Local-only manual WAV fixtures

Future manual QA may use ignored local WAV files, such as:

- Local small WAV.
- Local monophonic voice or instrument sample.
- Local test-only guide audio.

Real audio remains ignored. `metadata.local.json` remains ignored. Results may be manually documented only when relevant and should avoid identifying details. Personal voice data and copyrighted audio must not be committed.

### Category C: Metadata-only or shape-only fixtures

Future diagnostic review may use JSON-like expected summaries or diagnostic snapshots, such as:

- Expected sample rate.
- Expected duration.
- Expected approximate frequency range.
- Expected voiced/unvoiced pattern.
- Expected warnings.

These summaries should not imply formal scoring. Approximate expectations should be documented as diagnostic observations, not pass/fail singing assessment.

## 4. Recommended initial synthetic cases

The smallest future P13c/P13d priority set should be:

- Silence: should produce no stable voiced pitch.
- Clean A4 sine around 440 Hz: should produce stable frequency diagnostics.
- Low amplitude A4 sine: should test confidence / low signal behavior.
- Noisy A4 sine: should test robustness.
- Vibrato-like A4 signal: should test frame stability without forcing note segmentation.
- Frequency drift around A4: should test diagnostic summary behavior.
- Octave stress case: should expose 2x / 0.5x jump risk.

These are future test plan cases only. P13b does not implement them, generate WAV files, or add scripts.

## 5. Expected diagnostic observations

### Silence

- Mostly unvoiced, invalid, or low-confidence frames.
- No misleading melody claim.
- No score.

### Clean sine

- Stable voiced frames.
- Frequency summary near the expected tone.
- No `TargetPitchCurve`.

### Noisy sine

- Possible lower confidence.
- Warnings may be diagnostic-only.
- No formal correctness claim.

### Vibrato

- Frequency variation is expected.
- No note segmentation is inferred.
- No scoring is inferred.

### Drift

- Frequency movement is expected.
- No automatic melody transcription.
- No formal accuracy claim.

### Octave stress

- Identify potential octave instability.
- Do not auto-claim the algorithm solved octave instability unless a future implementation verifies it.

## 6. Future fixture storage policy

Future fixture work should:

- Avoid committed binary audio by default.
- Prefer generated temporary synthetic fixtures in test scripts.
- Keep real WAVs in ignored local fixture folders only.
- Keep `metadata.local.json` ignored.
- Keep `metadata.example.json` non-identifying and fake.
- Document any future committed fixture decision separately before adding binary audio.

## 7. Future script / test strategy

Future PRs may add, but P13b does not implement:

- A synthetic WAV generator helper for tests.
- A pitch extraction diagnostic test harness.
- Assertions around diagnostic ranges rather than exact frame-by-frame equality.
- Fixture cleanup after tests.
- No dependency changes unless separately approved.
- No browser route behavior changes.

## 8. Acceptance criteria for future P13d algorithm tests

A future algorithm implementation PR should satisfy:

- Synthetic fixtures are deterministic or generated in temporary directories.
- No real audio is committed.
- No `metadata.local.json` is committed.
- Tests avoid fragile exact floating-point equality.
- Assertions use safe tolerances and diagnostic ranges.
- Tests do not imply a formal singing score.
- Practice Mode remains untouched.
- `TargetPitchCurve` generation remains absent.
- Note segmentation remains absent.
- Upload/cloud/AI remains absent.

## 9. Manual QA fixture guidance

Future manual fixture checks may use local WAV files, but reviewers must:

- Keep files local.
- Not commit them.
- Not upload them.
- Not record identifying details unless necessary.
- Document browser/session caveats honestly.
- Use the Network panel when validating local-only behavior.

## 10. Relationship to P13a

P13a planned pitch extraction accuracy, stability, and diagnostic quality improvement directions. P13b plans the fixture and test strategy for those improvements. P13b does not choose algorithm changes and does not implement tests.

## 11. Relationship to P13c/P13d

P13c should decide which algorithm improvement to implement first. P13d may implement a tiny isolated algorithm change and matching synthetic tests. P13b only prepares the test fixture strategy.

## 12. Relationship to P14/P15/P16

P13b does not start note segmentation, generate `TargetPitchCurve`, or integrate with Practice Mode. P14/P15/P16 remain future phases.

## 13. Research-only wording

Future test fixture docs and results should use:

- Pitch-frame diagnostics.
- Synthetic diagnostic fixture.
- Research-only extractor behavior.
- Approximate diagnostic range.

Future test fixture docs and results should avoid:

- Singing score.
- Melody recognized.
- Correct / wrong singing.
- Practice Mode import.
- `TargetPitchCurve` generated.
- APK-ready.

## 14. APK / WebView caveat

Synthetic and local browser test fixture planning does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 15. Non-goals

P13b does not do:

- Runtime code.
- Route behavior changes.
- UI copy changes.
- Navigation changes.
- Homepage link.
- `/practice` link.
- Feature flag implementation.
- Dev-only guard implementation.
- `package.json` changes.
- `app/research/local-audio-decode` page/component changes.
- `app/practice/page.tsx` changes.
- File input behavior changes.
- Decode behavior changes.
- Extract pitch frames behavior changes.
- Disabled/enabled gating changes.
- Automatic decoding.
- Automatic pitch extraction.
- Pitch extraction algorithm changes.
- Synthetic WAV generation.
- Committed WAV fixtures.
- New test scripts.
- Waveform analysis implementation.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- MusicXML parser.
- MIDI import.
- Accompaniment playback.
- Source separation.
- Vocal separation.
- Song Learning Mode implementation.
- Cloud upload.
- Cloud assessment.
- GPT / AI API.
- Formal score.
- Rhythm evaluation.
- Sight-singing assessment.
- Estimator changes in `/practice`.
- Pitchy Practice Mode integration.
- Comparison harness changes.
- Benchmark gate / tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
- APK-ready claim.
