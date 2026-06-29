# P10w Browser Decode Route File Input Acceptance Criteria

## 1. Purpose

P10w defines acceptance criteria for a future isolated local file-selection UI on `/research/local-audio-decode`.

This is docs-only acceptance criteria. It does not implement the UI, add a file input, convert the route to a client component, decode audio, play audio, analyze waveform data, track pitch, generate `TargetPitchCurve` data, or integrate with Practice Mode.

The project remains a Browser Local Practice Mode MVP. Browser decoding is not implemented, and selecting a file must not be described or treated as decoding.

## 2. Route isolation acceptance criteria

A later implementation PR for the file-selection UI is acceptable only if all of the following stay true:

- The feature remains isolated to `/research/local-audio-decode`.
- The route remains clearly labeled as research-only and local-only.
- `/practice` is not modified, imported into, linked as a dependent flow, or updated from the selected file.
- `/api/recognize` is not modified or called.
- No upload, cloud processing, AI call, account, persistence, storage, or server-side audio processing is introduced.
- The homepage and Practice Mode must not imply that the research route is a production import path unless a separate later plan explicitly changes that boundary.

## 3. User-triggered file selection criteria

The future file selection must be user-triggered only:

- The browser file picker opens only after a direct user action.
- The page does not request files on load.
- The page does not request microphone access.
- The route accepts at most one file unless a later PR explicitly documents multi-file support.
- Canceling file selection leaves the page in an idle or missing-file state without side effects.

## 4. WAV-first copy and UI language criteria

The future UI must use WAV-first copy:

- WAV is presented as the only recommended first format.
- Non-WAV formats are described as out of scope for the first file-selection step.
- The copy must avoid implying support for commercial song analysis, arbitrary song import, accompaniment extraction, vocal separation, formal scoring, or APK readiness.
- The selected-file status must say that checks are pre-decode checks only and do not prove the file can be decoded.
- Any success state must use placeholder language such as `Ready for a future explicit decode step`, not `Decoded`, `Analyzed`, `Imported`, or `Recognized`.

## 5. Consent, rights, and local-only warning criteria

A visible warning must appear before or near file selection. It must tell the user:

- Select only a local WAV file they created or have rights to use.
- The research route is local-only for this step.
- The page does not upload the file.
- The page does not call cloud processing or AI.
- The page does not use the microphone for this file-selection step.
- The page does not decode, play, analyze waveform data, track pitch, recognize melody, generate a `TargetPitchCurve`, or connect to Practice Mode.

If a confirmation checkbox or acknowledgment is added later, it must not weaken these boundaries.

## 6. No automatic side effects criteria

Selecting a file must not automatically perform any audio or product behavior. Source and manual QA must confirm that file selection does not:

- Automatically decode audio.
- Automatically play audio.
- Analyze waveform data.
- Run pitch tracking.
- Generate `TargetPitchCurve` data.
- Mutate Practice Mode state.
- Update recent attempts, target steps, pitch estimates, or any `/practice` state.
- Call `/api/recognize` or any server route.
- Start upload, cloud, AI, account, storage, or server processing.

## 7. Rejected state acceptance criteria

The future implementation must provide explicit rejected states for at least these cases:

- Non-WAV file extension or clearly unsupported file type.
- Oversized file over the current future limit.
- Unclear, missing, or inconsistent MIME type when the implementation cannot safely classify the file for the WAV-first step.
- Missing file, including canceled selection or empty selection.
- Multiple files when multi-file selection is unsupported.
- Duration over the future limit, if a later safe duration check exists.

Rejected-state copy must say that rejection happened before decoding and that no audio was decoded, played, uploaded, analyzed, or sent to Practice Mode.

## 8. Ready-to-decode-later placeholder criteria

A `ready-to-decode-later` or equivalent state is acceptable only as a placeholder state:

- It means the selected file passed conservative pre-decode checks.
- It must not create an `AudioContext`.
- It must not call `decodeAudioData`.
- It must not produce duration, waveform, pitch, melody, notes, or `TargetPitchCurve` output unless a separate later PR explicitly implements those behaviors.
- It must not be represented as a successful decode or import.
- It may prepare the user for a future explicit decode button, but that button and decode behavior are outside this file-selection acceptance scope.

## 9. Manual QA expectations

When a later PR implements the UI, manual QA should include a desktop browser pass that confirms:

- `/research/local-audio-decode` loads as isolated research UI.
- Warning and rights/local-only copy are visible before or near selection.
- Selecting one small WAV reaches the placeholder selected or ready-to-decode-later state without decoding.
- Non-WAV, oversized, unclear-MIME, missing-file, unsupported-multiple-file, and over-duration cases reach rejected states when applicable.
- Canceling selection has no side effects.
- There is no audio playback.
- There is no waveform, pitch, melody, note, or target curve output.
- DevTools Network shows no upload or server audio processing.
- Practice Mode behavior and state are unchanged.

Future mobile browser and WebView checks should separately verify file picker behavior, MIME reporting, filename reporting, memory behavior, and copy visibility on small screens.

## 10. Android APK / WebView caveat

Passing this future browser file-selection acceptance criteria does not prove Android APK readiness.

Before making any APK-ready claim, a separate Android APK or WebView validation pass must confirm file picker integration, local file access, MIME and filename behavior, memory limits, permissions, and local-only privacy copy inside the chosen packaged environment.

## 11. Explicit source review checklist for the later implementation PR

Reviewers of the later implementation PR should explicitly check that the source does not add or change any of the following unless a separate approved scope says otherwise:

- `app/practice/page.tsx`.
- `/api/recognize`.
- Upload, cloud, AI, account, storage, or server audio processing code.
- Real audio files or committed local `metadata.local.json`.
- Automatic playback.
- Waveform analysis.
- Pitch tracking.
- `TargetPitchCurve` generation.
- Practice Mode state mutation or imports from the research route into Practice Mode.

For the file-selection-only step, reviewers should also check that any `<input type="file">`, client component boundary, state names, and copy are limited to user-triggered file selection and placeholder pre-decode validation only. If the implementation adds `AudioContext`, `webkitAudioContext`, `decodeAudioData`, audio playback APIs, waveform processing, pitch-estimation imports, or Practice Mode integration, it must be rejected as outside this acceptance criteria.
