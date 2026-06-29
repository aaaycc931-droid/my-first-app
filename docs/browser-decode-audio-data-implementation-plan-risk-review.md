# P10z Browser DecodeAudioData Implementation Plan / Risk Review

## Purpose

P10z plans a future isolated browser `decodeAudioData` proof-of-concept for `/research/local-audio-decode`.

This document is docs-only. It does not implement browser decoding, add a decode button, read file bytes, create `AudioContext`, call `decodeAudioData`, play audio, analyze waveform data, track pitch, generate `TargetPitchCurve`, or integrate with `/practice`.

Related references:

- P10q acceptance criteria: `docs/browser-decode-audio-data-poc-acceptance-criteria.md`.
- P10w file-selection acceptance criteria: `docs/browser-decode-route-file-input-acceptance-criteria.md`.
- P10y file-selection source-review QA: `docs/browser-decode-route-file-selection-ui-source-review-qa.md`.

## Current status

The current `/research/local-audio-decode` surface is file-selection-only. P10x added a WAV-first local file-selection UI shell, and P10y confirmed by source review that selecting a file only records browser-provided file metadata.

The route does not currently:

- Read bytes from the selected file.
- Inspect WAV headers.
- Use `FileReader`.
- Call `file.arrayBuffer()`.
- Create object URLs.
- Create `AudioContext` or `webkitAudioContext`.
- Call `decodeAudioData`.
- Play imported audio.
- Render waveforms.
- Track pitch.
- Generate `TargetPitchCurve` data.
- Pass imported audio or decoded data into `/practice`.

File selection alone must not be described as browser decoding.

## Why the next decode step must stay isolated

The next decoding step must remain isolated to `/research/local-audio-decode` because browser decoding is a capability and risk probe, not a user-facing Practice Mode feature yet.

Keeping the proof-of-concept isolated protects the MVP by ensuring that:

- `/practice` remains focused on the current browser-local practice workflow.
- File decode failures do not block or complicate the existing Practice Mode record / estimate loop.
- `AudioContext` lifecycle behavior can be reviewed without interacting with microphone or target playback behavior.
- Memory and file-size limits can be tested conservatively before any product claim.
- Browser-specific behavior can be documented before any Android APK / WebView claim.
- Decoded metadata cannot be mistaken for pitch analysis, waveform analysis, melody extraction, or target curve generation.

The research route should stay unlinked from the public product flow unless a later PR explicitly changes visibility with its own acceptance criteria.

## Proposed future minimum decode-only POC scope

A later implementation PR may add a minimum decode-only POC with the smallest useful behavior:

1. User selects a local WAV file through the existing isolated route UI.
2. The page shows file-selection metadata as it does today.
3. The page provides a separate user-triggered decode action.
4. Only after that decode action, the implementation may read the selected file bytes with `file.arrayBuffer()`.
5. The implementation may create an `AudioContext` only for the decode attempt.
6. The implementation may call `decodeAudioData` once for the selected file.
7. The page may display decoded metadata only.
8. The page must show clear decode success, decode failure, unsupported browser, and cleanup states.

Minimum success output should be metadata-only, such as:

- Decoded duration.
- Decoded sample rate.
- Channel count.
- `numberOfChannels` when available from the decoded `AudioBuffer`.

The POC should remain WAV-first. MP3 and other compressed formats should stay deferred unless a later separate source decision expands the scope.

## Future decode button boundary

Decoding must be a separate, explicit user action. Selecting a file must not automatically read bytes or decode.

A future implementation should therefore keep these states separate:

- No file selected.
- File selected, not decoded.
- Decode requested by the user.
- Decode in progress.
- Decode succeeded with metadata-only result.
- Decode failed with a clear message.
- Decode reset / cleanup completed.

The decode button should be disabled when no file is selected, when the selected file is outside conservative limits, or while a decode attempt is already running.

## Future file byte read boundary

`file.arrayBuffer()` should become allowed only in the later implementation PR that adds the explicit decode action.

The boundary should be:

- File selection may store only browser-provided metadata.
- The future decode button may start the byte-read path.
- The byte read must stay client-side in the browser.
- The byte read must not upload, persist, cache, or send audio to `/api/recognize` or any other server route.
- The read buffer should be released by clearing references after decode success, decode failure, reset, or component unmount where applicable.

The future implementation should not use `FileReader` unless a separate source decision explains why `file.arrayBuffer()` is insufficient.

## AudioContext lifecycle risks and cleanup expectations

`AudioContext` introduces browser behavior that is easy to leak or confuse with playback readiness. A later implementation should treat it as a scoped decode resource.

Expected lifecycle practices:

- Create the context only after the user clicks the decode action.
- Avoid creating the context on page load or file selection.
- Handle browsers that expose only prefixed `webkitAudioContext`, if that compatibility path is intentionally accepted.
- Avoid connecting decoded buffers to speakers or playback nodes.
- Close the context after the decode attempt where practical.
- Clear references to `AudioBuffer`, `ArrayBuffer`, and context instances on reset and unmount.
- Prevent overlapping decode attempts from creating multiple active contexts.
- Display an unsupported-browser state if no compatible context is available.

Cleanup should be reviewed as part of the implementation PR, not assumed from a passing decode result.

## Decode success and failure states

A future POC should provide clear states for:

- Unsupported browser or missing `AudioContext`.
- No selected file.
- User-selected file exceeds conservative file-size or type guidance.
- Byte read failed.
- Decode failed because the browser rejected the data.
- Decode succeeded and returned metadata.
- Decode was reset by the user.

Failure copy should avoid claiming that the file is invalid audio in all environments. Browser decode failure may mean unsupported encoding, memory pressure, browser limitation, corrupted file, or a file that is not actually WAV audio.

## Metadata-only result boundary

Decoded metadata display is allowed in the future POC only as capability evidence.

Decoded metadata is not playback. The POC must not connect the decoded buffer to an output node or play imported audio.

Decoded metadata is not waveform analysis. The POC must not render amplitude over time, peaks, spectrograms, or waveform summaries.

Decoded metadata is not pitch tracking. The POC must not estimate fundamental frequency, note names, intervals, pitch confidence, or pitch trends.

Decoded metadata does not generate `TargetPitchCurve`. The POC must not create target segments, note sequences, guide melody curves, scoring data, or Practice Mode target data from an imported file.

The decoded `AudioBuffer` must not be passed into `/practice`, imported by `/practice`, stored in shared Practice Mode state, or used to alter the Practice Mode record / estimate workflow.

## Memory and file-size risks

Browser decoding can require substantially more memory than the selected file size because compressed or PCM bytes may expand into decoded floating-point channel buffers.

Risks to document and test conservatively:

- Large WAV files can cause long main-thread stalls or memory pressure.
- Multi-channel files can multiply decoded buffer memory.
- Long durations increase memory and cleanup risk.
- Mobile browsers and WebViews may have lower memory ceilings than desktop browsers.
- Repeated decode attempts may leak memory if references are not cleared.
- Browser support and error messages vary.

A future implementation should start with short WAV files, a conservative file-size limit, one file at a time, no batch decoding, and no committed real audio fixtures.

## Manual QA expectations for desktop browser

A later implementation PR should include manual desktop browser QA for at least:

- Opening `/research/local-audio-decode`.
- Selecting no file / canceling the picker.
- Selecting a small local WAV file.
- Confirming no decode starts until the decode button is clicked.
- Clicking decode and seeing metadata-only success for a known-good short WAV.
- Selecting an obvious non-WAV file and confirming failure or blocked state.
- Selecting an oversized or too-long file if size/duration guardrails are implemented.
- Resetting selection and confirming decoded metadata is cleared.
- Repeating decode and confirming no stale metadata is shown.
- Confirming no playback occurs.
- Confirming no waveform, pitch tracking, target curve, upload, or Practice Mode behavior occurs.

Manual QA should use local developer-provided files only and must not commit real audio.

## Android APK / WebView caveat

Desktop browser decode success does not prove Android APK readiness.

Before any APK-ready claim, a separate validation pass must test Android WebView or packaged behavior for:

- File picker access.
- Local file permissions and user gestures.
- `AudioContext` availability and lifecycle.
- `decodeAudioData` support for the accepted WAV subset.
- Memory limits on real devices.
- Cleanup after repeated decode attempts.
- No accidental microphone permission request.
- No upload or server processing.

## Source review checklist for the later implementation PR

A later implementation PR that adds decode behavior should include source review confirming:

- `/research/local-audio-decode` remains the only modified runtime surface for browser decoding.
- `/practice` is not modified and does not import decoded audio code.
- `/api/recognize` is not modified and receives no local audio data.
- File selection still does not decode automatically.
- `file.arrayBuffer()` appears only in the user-triggered decode path.
- No `FileReader` is introduced unless explicitly justified.
- `AudioContext` / `webkitAudioContext` construction is user-triggered and cleaned up.
- `decodeAudioData` is called only in the isolated decode POC.
- No object URLs are created unless a later playback-specific plan allows them.
- No playback nodes, waveform rendering, pitch tracking, or `TargetPitchCurve` generation are added.
- Decoded metadata remains display-only.
- Decoded `AudioBuffer` is not passed to `/practice` or shared app state.
- No upload, cloud, AI, accounts, storage, or server processing is added.
- No real audio files or `metadata.local.json` are committed.
- Dependencies and `package-lock.json` are unchanged unless separately approved.

## Boundary confirmation

P10z is documentation and risk review only. It plans the next browser `decodeAudioData` step but does not implement it.

Browser Local Practice Mode remains an MVP. File selection remains distinct from decoding, decoding remains distinct from analysis, and decoded metadata must not be treated as playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, or `/practice` integration.
