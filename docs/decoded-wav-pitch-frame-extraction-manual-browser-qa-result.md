# P12e decoded WAV pitch-frame extraction manual browser QA result

## 1. Purpose

This document records one manual browser QA result for the research-only decoded WAV pitch-frame extraction proof of concept at `/research/local-audio-decode`.

P12e does not implement code, does not change runtime behavior, does not change route behavior, and does not change pitch extraction logic. It records the manual result only so future research can continue from a documented baseline.

## 2. Test summary

- Result: Pass.
- Route tested: `/research/local-audio-decode`.
- Feature tested: decoded WAV pitch-frame extraction POC.
- Scope: research-only local browser route.
- Test file: local-only small WAV, not committed to repository.
- No real audio committed.
- No `metadata.local.json` committed.

## 3. Test environment

- Tester: not recorded.
- Date: 2026-06-30.
- Browser / version: not recorded.
- OS / device: not recorded.
- Environment: not recorded.
- Network panel inspected: not recorded.

## 4. Route loading result

- Route loaded successfully.
- Research-only copy visible.
- Route did not present itself as Practice Mode.
- Route did not claim formal audio import.
- Route did not claim formal pitch recognition.
- Route did not claim melody recognition.
- Route did not claim scoring.
- Route did not claim APK-ready support.

## 5. Initial state result

- No selected file initially.
- No decoded metadata initially.
- Extract pitch frames unavailable before decoded metadata.
- No automatic decode on page load.
- No automatic pitch extraction on page load.
- No microphone prompt.
- No account requirement.

## 6. File selection result

- Local WAV selection worked.
- File selection remained a user action.
- File selection did not automatically extract pitch frames.
- File selection did not mutate Practice Mode.
- Selected file was local-only and not committed.

## 7. Decode result

- Decode remained explicit user action.
- Decoded metadata appeared after decode.
- Extract pitch frames became available only after decoded metadata.
- Decoded metadata did not claim formal recognition or scoring.

## 8. Pitch-frame extraction result

- Extract pitch frames remained explicit separate action.
- Extraction output remained diagnostic only.
- Output was limited to analyzed duration, frame count, voiced/unvoiced frame counts, and optional min/median/max frequency estimates.
- No note sequence generated.
- No melody transcription generated.
- No `TargetPitchCurve` generated.
- No score / grade / pass/fail generated.
- No Practice Mode result created.

## 9. Local-only / network result

- Upload behavior: not recorded / requires future verification because Network panel inspection was not recorded.
- Cloud assessment behavior: not recorded / requires future verification because Network panel inspection was not recorded.
- AI API call behavior: not recorded / requires future verification because Network panel inspection was not recorded.
- Server storage behavior: not recorded / requires future verification because Network panel inspection was not recorded.
- No account requirement observed.

## 10. Practice Mode non-regression result

- `/practice` still loads: not recorded.
- Target note playback still works, if checked: not recorded.
- Record / Estimate flow unchanged, if checked: not recorded.
- Melody navigation unchanged, if checked: not recorded.
- Local attempt history unchanged, if checked: not recorded.
- Static pitch trend preview unchanged, if checked: not recorded.
- No imported audio state appears in Practice Mode: not recorded.

## 11. Issues found

- None observed.

## 12. Overall result

- Pass.
- P12b research route can remain isolated research-only.
- No product claim should be expanded based on this manual QA.
- Browser QA does not prove APK-ready behavior.

## 13. Android APK / WebView caveat

This manual browser QA does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, and performance inside Android WebView / packaged environments before any APK-ready claim.

## 14. Non-goals

P12e does not do or change:

- Runtime code.
- Route behavior changes.
- Pitch extraction algorithm changes.
- Automated tests.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- File input changes.
- Automatic decoding.
- Automatic pitch extraction.
- Waveform analysis.
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
- Estimator changes.
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

P12f plans a future research-only decoded WAV pitch frame diagnostic data shape while keeping route behavior, pitch extraction logic, note segmentation, `TargetPitchCurve` generation, Practice Mode integration, formal scoring, upload/cloud/AI behavior, and APK-ready claims unchanged.
