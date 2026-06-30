# P12d decoded WAV pitch-frame extraction manual browser QA checklist

## 1. Purpose

This document defines a docs-only manual browser QA checklist for validating the research-only decoded WAV pitch-frame extraction proof of concept at `/research/local-audio-decode`.

P12d does not implement code, does not change runtime behavior, and does not change route behavior. It only defines a manual checklist for real browser observation before any future feature work continues.

## 2. Scope

Manual QA covers only:

- Route loading.
- Research-only copy.
- File selection.
- Decode metadata action.
- Extract pitch frames action.
- Disabled / enabled gating.
- Error states.
- Local-only behavior.
- Practice Mode non-regression.

Manual QA does not cover:

- Formal accuracy.
- Formal pitch recognition.
- Melody recognition.
- `TargetPitchCurve` generation.
- Scoring.
- Rhythm evaluation.
- Sight-singing assessment.
- APK readiness.

## 3. Test environment

Record the following for each manual QA pass:

- Browser name and version.
- OS.
- Device type.
- Route URL: `/research/local-audio-decode`.
- Test date.
- Whether the test was run in local dev or a deployed preview.
- Whether the browser DevTools Network tab was inspected for unexpected uploads or cloud calls.

## 4. Test files

Use only small local WAV files supplied by the tester:

- User-provided local-only WAV.
- Short duration, recommended 5–30 seconds.
- Preferably monophonic simple tone or simple melody.
- No commercial song clips.
- No copyrighted examples committed.
- No real audio committed to the repository.
- No `metadata.local.json` committed.

The test WAV must exist only on the tester's local machine for the manual QA session. It must not be added to git.

## 5. Route loading checks

Confirm that:

- `/research/local-audio-decode` loads.
- The page is clearly marked research-only.
- The page does not describe itself as Practice Mode.
- The page does not claim formal import.
- The page does not claim formal pitch recognition.
- The page does not claim melody recognition.
- The page does not claim scoring.
- The page does not claim APK-ready support.

## 6. Initial state checks

Confirm the initial state:

- No selected file.
- No decoded metadata.
- The **Extract pitch frames** action is disabled before decode.
- No pitch frame results are shown before extraction.
- No automatic decode runs on page load.
- No automatic pitch extraction runs on page load.
- No microphone permission prompt appears.
- No upload prompt appears.
- No account requirement appears.

## 7. File selection checks

Confirm that:

- Selecting a local WAV updates selected file status.
- File name / size / type display, if implemented, is clear.
- Selecting a file does not automatically extract pitch frames.
- Selecting a file does not mutate Practice Mode.
- Cancelling file selection leaves the route in a safe state.
- Invalid file type shows a safe error or warning if supported.

## 8. Decode action checks

Confirm that:

- Decode is an explicit user action.
- Decode does not run automatically after selection unless explicitly designed and documented by the route copy.
- Successful decode shows decoded metadata only.
- Decode failure shows a clear error.
- After decode success, **Extract pitch frames** becomes enabled.
- Decoded metadata does not claim formal recognition or scoring.

## 9. Pitch-frame extraction checks

Confirm that:

- **Extract pitch frames** is an explicit separate action.
- The action remains unavailable before decoded metadata exists.
- The extraction result is diagnostic only.
- Output is limited to analyzed duration, frame count, voiced/unvoiced frame counts, and optional min/median/max frequency estimates.
- No note sequence is generated.
- No melody transcription is generated.
- No `TargetPitchCurve` is generated.
- No score / grade / pass/fail is generated.
- No Practice Mode result is created.

## 10. Clear / reset checks

If the route has clear/reset behavior, confirm that:

- Clearing removes selected/decode/extraction state as expected.
- **Extract pitch frames** returns to disabled state if decoded metadata is cleared.
- No persistent storage is created by default.
- No Practice Mode state is affected.

If the route has no clear/reset behavior, record that as not applicable rather than as a failure.

## 11. Error-state checks

Test or record behavior for:

- Unsupported file type.
- Corrupted WAV.
- Too-short or too-long file.
- Decode failure.
- Extraction failure.
- User cancellation.
- Browser unsupported behavior.
- Mobile browser limitation, if tested.

## 12. Local-only / network checks

Open browser DevTools and inspect the Network tab. Confirm that there is:

- No upload request after file selection.
- No upload request after decode.
- No upload request after pitch-frame extraction.
- No AI API call.
- No cloud assessment call.
- No server storage behavior.
- No account requirement.

## 13. Practice Mode non-regression checks

Manually visit `/practice` and confirm that:

- Practice Mode still loads.
- Target note playback still works.
- Record / Estimate flow is unchanged.
- `currentMelodyStepIndex` behavior is unchanged.
- Previous / next / restart melody behavior is unchanged.
- Local attempt history is unchanged.
- Static pitch trend preview is unchanged.
- No imported audio state appears in Practice Mode.

## 14. Android APK / WebView caveat

Record the following caveats:

- Browser manual QA does not prove APK readiness.
- Android WebView / packaged APK must later separately validate file picker behavior, `AudioContext`, `decodeAudioData`, memory limits, local processing, permissions, and performance.
- No APK-ready claim is allowed after P12d.

## 15. Pass criteria

The P12b route passes manual QA only if:

- The route remains research-only.
- Actions remain separated.
- **Extract pitch frames** remains gated behind decoded metadata.
- No upload / cloud / AI behavior is observed.
- Output remains diagnostic only.
- No `TargetPitchCurve` / scoring / melody recognition appears.
- Practice Mode remains untouched.
- No APK-ready claim is made.

## 16. Fail criteria

Manual QA should fail if:

- File selection triggers automatic pitch extraction unexpectedly.
- The route uploads audio.
- The route calls cloud / AI.
- The route creates a formal score or pass/fail outcome.
- The route generates `TargetPitchCurve`.
- The route mutates Practice Mode state.
- The route claims melody recognition or formal pitch recognition.
- The route claims APK-ready support.
- Real audio or `metadata.local.json` is committed.

## 17. Manual QA result template

```text
Tester:
Date:
Browser / version:
OS / device:
Route tested:
WAV description:
File selection result:
Decode result:
Pitch-frame extraction result:
Network/upload check:
Practice Mode non-regression:
Issues found:
Overall result: Pass / Fail / Needs follow-up
```

## 18. Non-goals

P12d does not implement or change:

- Runtime code.
- Route behavior changes.
- Pitch extraction algorithm changes.
- Automated tests.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- File input changes.
- Automatic decoding.
- Automatic pitch extraction.
- Browser API changes.
- Imported audio playback changes.
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
