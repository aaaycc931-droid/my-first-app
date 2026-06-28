# P10q Browser DecodeAudioData POC Acceptance Criteria

## 1. Purpose

This document defines acceptance criteria for a future isolated browser-side `decodeAudioData` proof of concept.

P10q is docs-only. It does not implement any code, browser decoding, `AudioContext`, `decodeAudioData`, file input, pitch tracking, `TargetPitchCurve` generation, Practice Mode integration, or runtime behavior.

## 2. Current status

The project currently has:

- Local melody guide fixture convention.
- Metadata-only validator.
- Metadata validator tests.
- Node-side WAV header inspector.
- WAV header inspector tests.
- Browser `decodeAudioData` research revisit plan.

The project still intentionally has no:

- Browser file input.
- Browser WAV or MP3 decoding.
- `AudioContext` for imported audio.
- `decodeAudioData` call.
- Imported audio playback.
- Pitch tracking from imported audio.
- `TargetPitchCurve` generation.
- Practice Mode integration for imported audio.

## 3. Future POC location

If a future browser decode POC is implemented, it should first live on an isolated research surface, such as:

- A dev-only research route.
- An isolated local-only browser experiment page.
- Not `/practice`.
- Not a public product flow by default.

P10q does not add any route, page, UI, or runtime surface.

## 4. Future POC input boundary

A future browser decode POC should allow only:

- User-triggered local file selection.
- WAV first.
- Short clips, recommended 5-30 seconds.
- User-provided local-only files.
- No upload.
- No server storage.
- No built-in library.

MP3 remains deferred unless a later separate source decision explicitly allows it.

## 5. Future decode scope

A future browser decode POC may validate only that:

- The browser can receive a user-selected local WAV file.
- The browser can attempt `decodeAudioData` on that file.
- The decoded buffer exposes sample rate.
- The decoded buffer exposes channel count.
- The decoded buffer exposes duration.
- Decode success and failure behavior are understandable.
- Cleanup and resource release behavior are handled.

A future browser decode POC must not perform:

- Waveform analysis.
- Pitch tracking.
- Note segmentation.
- `TargetPitchCurve` generation.
- Scoring.
- Practice Mode integration.

## 6. Future AudioContext boundary

If a future POC uses `AudioContext`, it must:

- Be user-triggered.
- Not start automatically on page load.
- Stay isolated from the Practice Mode microphone flow.
- Handle suspend, close, and cleanup where applicable.
- Show a clear error state if unsupported.
- Not use `getUserMedia`.
- Not request microphone permission.
- Not play audio unless explicitly planned in a later PR.

## 7. Future pass criteria

A future browser decode POC can pass only if:

- The user explicitly selects a local WAV file.
- No upload occurs.
- Decode success prints or displays basic metadata only:
  - File name.
  - File size.
  - Decoded duration.
  - Sample rate.
  - Channel count.
- Decode failure is handled clearly.
- The `AudioContext` lifecycle is controlled.
- No Practice Mode state is touched.
- No pitch tracking or target curve generation occurs.
- Clear boundary copy states that the surface is browser decoding research only.

## 8. Future fail / warning criteria

A future browser decode POC should show a clear error or warning for:

- Unsupported browser.
- `AudioContext` unavailable.
- `decodeAudioData` failure.
- Unsupported format.
- File too large.
- Duration too long.
- Memory or performance issue.
- User cancels file selection.
- Non-WAV file selected.
- Mobile browser limitation.
- Android WebView unverified.

## 9. Future limits

A future browser decode POC should use conservative limits:

- WAV only.
- Duration 5-30 seconds.
- Conservative file size limit.
- No batch files.
- No commercial song examples.
- No committed audio files.
- No persistent storage by default.

## 10. Relationship to Node-side header inspection

Node-side header inspection checks RIFF/WAVE/PCM header metadata only.

Browser `decodeAudioData` checks whether a browser can decode a locally selected file.

These are separate capabilities:

- Node-side success does not prove browser decode success.
- Browser decode success does not prove pitch tracking.
- Browser decode success does not prove target curve generation.

## 11. Android APK / WebView caveat

Future Android APK packaging must separately validate file picker behavior, `AudioContext` behavior, `decodeAudioData` support, memory limits, local processing, and permission behavior inside Android WebView or packaged environments before any APK-ready claim.

## 12. Privacy / copyright boundary

A future browser decode POC must preserve these privacy and copyright boundaries:

- User-provided local files only.
- No built-in song library.
- No commercial song clips.
- No upload by default.
- No public sharing.
- The user remains responsible for rights to any local file they choose.
- Browser decoding research does not bypass copyright restrictions.

## 13. Product claim boundary

A future browser decode POC must not claim that the product:

- Supports formal audio import.
- Supports arbitrary song analysis.
- Supports vocal separation.
- Supports accompaniment-to-melody inference.
- Supports pitch tracking.
- Supports `TargetPitchCurve` generation.
- Supports scoring.
- Supports Practice Mode integration.
- Is APK-ready.

## 14. Future test direction

If a future browser POC is implemented, later validation may consider:

- Source review QA.
- Manual browser QA checklist.
- Mobile browser checklist.
- Android WebView checklist later.

P10q does not implement tests.

## 15. Non-goals

P10q does not do any of the following:

- Runtime code.
- Scripts.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- Route creation.
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
- Benchmark gate or tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.

## P10r surface decision addendum

P10r chooses an isolated dev/research route as the future browser `decodeAudioData` POC surface while keeping implementation, `/practice` integration, pitch tracking, `TargetPitchCurve` generation, and product import flow deferred.
