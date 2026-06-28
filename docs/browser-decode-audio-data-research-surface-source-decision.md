# P10r Browser DecodeAudioData Research Surface Source Decision

## 1. Purpose

This document only decides the future research surface for a browser-side `decodeAudioData` proof of concept.

P10r is docs-only. It does not implement runtime code, create a route, add UI, add a file input, create `AudioContext`, call `decodeAudioData`, implement browser decoding, modify `/practice`, implement pitch tracking, generate `TargetPitchCurve`, or change any production import flow.

## 2. Decision

Chosen: Option A — an isolated dev/research route for a future browser `decodeAudioData` POC.

A future isolated research surface could be similar to:

- `app/research/local-audio-decode/page.tsx`
- Or another clearly isolated research-only route.

Deferred:

- Option B — `/practice` integration.
- Public product import flow.
- Song Learning Mode integration.
- MP3 support.
- Pitch tracking.
- `TargetPitchCurve` generation.
- APK-ready claim.

Browser decoding remains unimplemented. `/practice` integration remains deferred.

## 3. Why not `/practice` first

`/practice` already has local recording, pitch estimate, target note, melody step, static target preview, and attempt history flows.

A browser decoding POC is unrelated to those states. Placing it inside `/practice` first would create unnecessary coupling with Practice Mode behavior and could accidentally affect `currentMelodyStepIndex`, Record / Estimate behavior, target segment preview assumptions, or attempt history.

It would also make users more likely to think formal audio import is already complete, even if the surface only proves basic browser decoding metadata. That is not an appropriate first step for browser-side decode research.

Strict source review is easier when the first POC is not embedded in `/practice` and does not share Practice Mode state, UI controls, microphone assumptions, scoring language, or target-curve concepts.

## 4. Why isolated research route first

An isolated dev/research route is the preferred first surface because it can:

- Display clear research-only copy.
- Validate only local file selection, decode metadata, and browser lifecycle behavior.
- Avoid Practice Mode state mutation.
- Avoid Record / Estimate coupling.
- Avoid target note, static preview, target segment, and attempt history coupling.
- Avoid scoring, pitch tracking, and target curve misunderstandings.
- Make no-upload, no-cloud, and no-AI boundaries easier to review.
- Keep browser decoding lifecycle review focused.
- Support safer manual browser QA.
- Be easier to remove, hide, or refactor later.

If browser decoding is later considered for `/practice`, that should happen only after source review, manual QA, mobile QA, and a separate integration decision.

## 5. Future route boundary

If a future route is implemented, it must be:

- Not linked from the main public homepage by default.
- Not linked from `/practice` by default.
- Clearly labeled research-only.
- Local-only.
- User-triggered.
- WAV-first.
- No upload.
- No cloud.
- No AI API.
- No scoring.
- No pitch tracking.
- No `TargetPitchCurve` generation.
- No Practice Mode state access.
- No automatic `AudioContext` on page load.
- No `getUserMedia`.
- No microphone permission.

## 6. Future browser POC allowed behavior

A future isolated route POC may display only basic decode research information, such as:

- Selected file name.
- File size.
- Decoded duration.
- Decoded sample rate.
- Decoded channel count.
- Decode success / failure.
- `AudioContext` lifecycle status if needed.
- Clear boundary copy.

It must not display or generate:

- Pitch curve.
- Note segmentation.
- `TargetPitchCurve`.
- Score.
- Pass/fail.
- Melody recognition result.
- Song analysis result.

## 7. Production visibility caveat

If a future research route would be deployed to a public or Vercel environment, the implementation PR must decide before implementation:

- Whether it remains unlinked from normal UI.
- Whether additional research-only copy is required.
- Whether a local/dev-only guard is required.
- Whether a feature flag is required.
- Whether a route-level warning is required.

P10r does not implement these controls. It only records that they must be considered before any public deployment of a research route.

## 8. Android APK / WebView caveat

Future Android APK packaging must separately validate file picker behavior, `AudioContext` behavior, `decodeAudioData` support, memory limits, local processing, and permission behavior inside Android WebView or packaged environments before any APK-ready claim.

A browser research route, by itself, is not an APK-ready claim.

## 9. Relationship to P10q acceptance criteria

P10q defined future browser `decodeAudioData` POC acceptance criteria.

P10r chooses the future surface for that POC: an isolated dev/research route.

Implementation remains deferred. `/practice` integration remains deferred. Product import flow remains deferred. Pitch tracking and `TargetPitchCurve` generation remain deferred.

## 10. Non-goals

P10r does not do any of the following:

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
