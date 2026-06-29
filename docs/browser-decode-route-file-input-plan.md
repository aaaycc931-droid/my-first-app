# P10v Browser Decode Route File Input Plan

## 1. Purpose

This document plans a future file input step for the isolated browser decode research route at `/research/local-audio-decode`.

P10v is docs-only. It does not implement a file picker, client component, browser decoding, playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, or Practice Mode integration.

The future file input is only meant to let a user manually select one local audio file so the route can display pre-decode file-selection status and decide whether a later decode attempt should be allowed. File selection alone is not decoding, does not create an `AudioContext`, and does not call `decodeAudioData`.

## 2. Future isolated route file input purpose

The future file input should support only the research route's local browser decode investigation. Its purpose is to answer a narrow question:

- Can the isolated route safely accept a user-selected local file and show conservative pre-decode validation feedback before a later browser decode attempt?

The file input must not become a product import flow. It must remain separate from:

- `/practice`.
- Practice Mode Record / Estimate behavior.
- Attempt history.
- Target pitch preview rendering.
- `/api/recognize`.
- Any upload, cloud, AI, account, storage, or server processing path.

## 3. WAV-first local user-selected file direction

The future implementation should be WAV-first:

- Accept one user-selected local file at a time.
- Present WAV as the only recommended first format.
- Treat MP3, M4A, AAC, and other formats as out of scope for the first file-input step.
- Prefer short monophonic practice-guide WAV files created by the user or explicitly authorized for local research use.
- Avoid bundled example audio and avoid committing real audio fixtures.

The first file-input step should not decode automatically after selection. It should only move the route toward a later explicit decode action after validation and user confirmation.

## 4. User consent / rights / local-only warning copy

The future route should show warning copy before file selection and again near any later decode action.

Suggested warning copy:

> Research-only local file check. Select only a WAV file that you created or have rights to use. The selected file stays in your browser for this research step. This page does not upload audio, use cloud processing, call AI, use the microphone, play audio, decode audio yet, track pitch, recognize melody, generate a TargetPitchCurve, or connect to Practice Mode.

Suggested rights confirmation copy:

> I confirm I have the right to use this file for local testing, and I understand this research route is not a Practice Mode import feature.

The copy should avoid implying support for commercial songs, arbitrary song analysis, accompaniment extraction, vocal separation, formal scoring, or APK readiness.

## 5. Future UI states

The future file-input step should use a small state model that is easy to manually QA:

- `idle`: No file is selected. The page shows the research-only warning and WAV-first instructions.
- `selected`: One local file has been selected. The page shows file name, size, reported type if available, and the pre-decode validation status.
- `rejected`: The selected file fails pre-decode validation, such as extension, size, or user-facing WAV-first constraints. The page explains that no decode was attempted.
- `ready-to-decode-later`: The selected file passes pre-decode checks and the route may enable a future explicit decode button in a later PR. This state still does not decode.
- `error`: A file-selection or validation error occurred. The page shows a clear local-only message and offers a reset path.

State boundaries:

- No automatic decode on page load.
- No automatic decode on file selection.
- No `AudioContext` for these states.
- No `decodeAudioData` for these states.
- No playback.
- No waveform, pitch, note, or target curve output.
- No Practice Mode state mutation.

## 6. Future validation boundaries

The future file-input step should use conservative pre-decode validation. These checks are guardrails only; they do not prove the audio can be decoded or analyzed.

Recommended first-pass boundaries:

- **Extension**: Prefer `.wav` only for the first route file-input step.
- **MIME caveat**: Treat `file.type` as helpful but unreliable because browser and OS MIME reporting can be missing or inconsistent. A missing or unexpected MIME value should not be the only source of truth.
- **Size limit**: Use a small explicit size limit before decode research, for example 10 MB or smaller if mobile memory becomes a concern.
- **Duration limit**: Duration cannot be known reliably from file selection alone unless a future header inspection step is added in-browser. Copy should describe an intended short-file target, such as 5-30 seconds, without claiming duration has been verified by selection alone.
- **WAV-first copy**: Explain that WAV is the first research format because it is simpler to reason about than compressed formats and aligns with the local WAV fixture/header-inspection research path.

Rejected files should show plain-language feedback such as:

- `Use a .wav file for this research step.`
- `Choose one short local file under the current size limit.`
- `This selection was rejected before decoding; no audio was decoded or uploaded.`

## 7. Future manual QA expectations

When a later PR implements the file input, manual QA should confirm:

- The route still loads as isolated research UI.
- The homepage and `/practice` do not link to the route unless a later PR explicitly changes that boundary.
- The warning copy appears before file selection.
- Selecting a `.wav` file reaches `selected` and then `ready-to-decode-later` only after pre-decode checks pass.
- Selecting a non-WAV file reaches `rejected` with WAV-first copy.
- Oversized files reach `rejected` without decoding.
- Canceling file selection returns to or remains in `idle` without errors.
- Resetting clears selected-file metadata.
- DevTools/network review shows no upload or server processing.
- Source review confirms no `AudioContext`, `decodeAudioData`, playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, `/practice` integration, or `/api/recognize` change for the file-selection-only step.

## 8. Android APK / WebView caveat

This research does not prove Android APK readiness. Browser file input behavior in a desktop or mobile browser is not enough to claim support for packaged Android WebView environments.

Before any APK-ready claim, future work must separately validate:

- File picker behavior in Android WebView or the chosen APK wrapper.
- Local file access constraints.
- MIME and filename reporting differences.
- Memory behavior for selected files.
- Future `AudioContext` and `decodeAudioData` behavior if browser decoding is later implemented.
- Permission prompts and local-only privacy copy in the packaged environment.

## 9. Practice Mode isolation boundary

The future file input must remain isolated from `/practice` until later QA explicitly approves integration.

The file-input step must not:

- Modify `app/practice/page.tsx`.
- Import state or helpers into Practice Mode.
- Change Record / Estimate behavior.
- Change melody step navigation.
- Change attempt history.
- Feed selected files into the static pitch trend preview.
- Generate or pass `TargetPitchCurve` data.
- Call `/api/recognize`.

A later integration plan should be required before any selected local file can influence Practice Mode.

## 10. Non-goals for this plan

P10v does not implement and does not approve implementation of:

- `<input type="file">`.
- `"use client"`.
- `AudioContext` or `webkitAudioContext`.
- `decodeAudioData`.
- Browser decoding.
- Playback.
- Waveform analysis.
- Pitch tracking.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- `/api/recognize` changes.
- Upload, cloud, AI, accounts, storage, or server processing.
- Real audio fixtures.
- `metadata.local.json`.
