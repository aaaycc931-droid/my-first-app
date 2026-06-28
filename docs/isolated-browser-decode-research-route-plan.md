# P10s Isolated Browser Decode Research Route Plan

## 1. Purpose

This document plans a future isolated browser `decodeAudioData` research route.

P10s is docs-only. It does not implement any route, UI, file input, runtime code, browser decoding, `AudioContext` creation, `decodeAudioData` call, pitch tracking, `TargetPitchCurve` generation, or Practice Mode integration.

## 2. Future route identity

The future research route should have an identity that makes its scope obvious before a user interacts with it.

Candidate route names:

- `/research/local-audio-decode`
- `/dev/local-audio-decode-research`

The route should be positioned as research-only. It is not Practice Mode, not a formal product audio import flow, not Song Learning Mode, not an arbitrary song analysis tool, and not an APK-ready feature.

## 3. Future route visibility

The future route should be intentionally low-visibility until a later PR decides the exact guard and deployment behavior.

Recommended visibility boundaries:

- Not linked from the public homepage by default.
- Not linked from `/practice` by default.
- Not presented as a production feature.
- Clearly marked research-only.
- Possibly guarded by dev-only copy, a feature flag, or a route-level warning in a later PR.

P10s does not implement a visibility guard, feature flag, route warning, or route.

## 4. Page copy / user-facing warning

The future page copy must prevent users and reviewers from interpreting the route as a finished import or recognition feature.

Required warning points:

- This is a local browser decoding research tool.
- It only tests whether the browser can decode a selected local WAV file.
- No upload.
- No cloud.
- No AI API.
- No microphone.
- No pitch tracking.
- No melody recognition.
- No `TargetPitchCurve` generation.
- Not Practice Mode.
- Not APK-ready.

Suggested short page warning:

> Research-only local decode test. This page only checks whether your browser can decode one manually selected local WAV file. It does not upload audio, use the cloud, call AI, use the microphone, track pitch, recognize melody, generate a TargetPitchCurve, modify Practice Mode, or prove APK readiness.

## 5. Future user flow

The future route should use an explicit, user-triggered, local-only flow:

1. User opens the isolated research route.
2. User sees the research-only warning before any file interaction.
3. User manually selects one local WAV file.
4. Route displays file name and file size before decoding.
5. User confirms a local-only decode attempt.
6. Browser attempts decode only after confirmation.
7. Route displays decode metadata or a clear error.
8. User can clear the selected file, result, and error state.
9. No data persists by default.

## 6. Future state model

The future route should keep its state model small and separate from Practice Mode:

- `idle`
- `file-selected`
- `confirming-local-only`
- `decoding`
- `decode-success`
- `decode-error`
- `unsupported-browser`
- `cleared`

State boundaries:

- No automatic decode on page load.
- No automatic `AudioContext` creation.
- No microphone state.
- No Practice Mode state mutation.
- No `currentMelodyStepIndex` mutation.
- No Record / Estimate state coupling.
- No target segment or static preview state coupling.
- No attempt history state coupling.

## 7. Future displayed metadata

On successful decode, the future route should display metadata only:

- File name.
- File size.
- Decoded duration.
- Decoded sample rate.
- Decoded channel count.
- Decode status.
- Browser support note.

The future route should not display:

- Waveform.
- Pitch curve.
- Notes.
- `TargetPitchCurve`.
- Score.
- Pass/fail.
- Melody recognition.
- Song analysis.

## 8. Future error states

The future implementation should plan explicit errors for:

- User cancelled file selection.
- Unsupported file type.
- File too large.
- Duration too long.
- `AudioContext` unavailable.
- `decodeAudioData` failed.
- Browser unsupported.
- Mobile browser limitation.
- Android WebView unverified.
- Memory/performance issue.

Each error should explain what happened without implying that the app can import, recognize, score, or analyze songs.

## 9. Future file limits

The first route POC should stay conservative:

- WAV only.
- 5-30 seconds.
- Conservative file size limit.
- One file at a time.
- No batch upload.
- No MP3 in the first route POC.
- No commercial song examples.
- No committed audio.

## 10. Future AudioContext lifecycle

If a later PR implements browser decoding, the route should manage browser audio lifecycle conservatively:

- `AudioContext` is created only after user action.
- `AudioContext` is closed or cleaned up after a decode attempt where appropriate.
- Lifecycle errors are handled clearly.
- No microphone access.
- No `getUserMedia`.
- No playback unless separately planned.
- No recording.

## 11. Relationship to Node-side header inspector

The Node-side WAV header inspector and future browser decode route answer different questions:

- The Node-side header inspector validates local WAV container/header metadata.
- The browser route would test browser decode behavior.
- These are separate checks.
- Header success does not guarantee browser decode success.
- Browser decode success does not imply pitch tracking or target curve generation.

## 12. Relationship to Practice Mode

The future route must remain separate from Practice Mode unless a later PR explicitly plans and implements an integration.

The future route should not change:

- `/practice` integration.
- `currentMelodyStepIndex`.
- Record / Estimate behavior.
- Attempt history.
- Target segment behavior.
- Static preview behavior.
- Scoring.
- Live chart behavior.

## 13. Android APK / WebView caveat

Future Android APK packaging must separately validate file picker behavior, `AudioContext` behavior, `decodeAudioData` support, memory limits, local processing, and permission behavior inside Android WebView or packaged environments before any APK-ready claim.

A future isolated browser decode research route is not, by itself, APK-ready support.

## 14. Future manual QA checklist

After a later PR implements the route, manual QA should confirm:

- Route loads with research-only warning.
- No `AudioContext` before user action.
- No microphone permission prompt.
- Local WAV select works.
- Cancel selection works.
- Decode success displays metadata only.
- Decode failure displays clear error.
- Clear result works.
- `/practice` behavior unchanged.
- No network upload.
- Mobile browser behavior noted.
- Android WebView is not claimed unless tested.

## 15. Product claim boundary

The future route must not claim:

- Formal audio import.
- Melody recognition.
- Pitch recognition.
- Arbitrary song analysis.
- Accompaniment melody inference.
- Vocal separation.
- `TargetPitchCurve` generation.
- Scoring.
- Practice Mode support.
- APK-ready support.

## 16. Non-goals

P10s does not do any of the following:

- Runtime code.
- Route creation.
- Scripts.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- File input UI.
- Browser WAV decoding.
- Browser MP3 decoding.
- `AudioContext` creation.
- `decodeAudioData` call.
- `getUserMedia`.
- Microphone access.
- Recording.
- Imported audio playback.
- Waveform analysis.
- Pitch tracking.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- Generated fixture changes.
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
