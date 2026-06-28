# P10p Browser DecodeAudioData Research Revisit Plan

## 1. Purpose

This document re-evaluates the boundary for future browser-side `decodeAudioData` research after the project established a safer Node-side WAV header inspection path.

P10p is a docs-only research revisit plan. It does not implement browser decoding, audio import, audio analysis, Practice Mode integration, or any runtime behavior.

## 2. Current status recap

The project currently has:

- Local melody guide fixture convention.
- Metadata-only validator.
- Metadata validator tests.
- Node-side WAV header inspector.
- WAV header inspector temporary tests.
- Source review QA confirming the header inspector and tests remain isolated, local-only, and header-only.

The project still intentionally has no:

- Browser file input for imported melody guide audio.
- Browser WAV or MP3 decoding.
- `AudioContext` creation for imported audio decoding.
- `decodeAudioData` call.
- Imported audio playback.
- Pitch tracking from imported audio.
- Target curve generation from imported audio.
- Practice Mode integration for imported audio.

## 3. Why browser decoding remains deferred

Browser decoding remains deferred because it is closer to the future product experience but carries higher product, technical, and review risk than metadata-only or header-only local checks.

Key reasons:

- Browser decoding likely requires `AudioContext` or related browser audio capabilities.
- Desktop and mobile browser compatibility can differ.
- Android WebView and APK-packaged environments must be validated separately before any APK-ready claim.
- Large files can create memory and performance issues after full decode into audio buffers.
- Decode behavior and failure modes can vary by file type, codec, browser, and device.
- A browser decoding experiment can easily make users think the product already supports formal audio import or song analysis.
- Browser decoding should not be wired directly into Practice Mode.

## 4. Relationship to Node-side header inspection

Node-side WAV header inspection validates only RIFF/WAVE/PCM container metadata. It is not audio decoding.

The Node-side header inspector:

- Does not prove that a browser can decode the file.
- Does not prove that the audio is suitable for pitch tracking.
- Does not inspect waveform content for melody quality.
- Does not generate target curves.
- Does not enable imported audio practice.

Its role is to be a safer prerequisite before any browser decoding research, by checking local fixture metadata and basic WAV container/header constraints first.

## 5. Future browser research questions

Before any future browser decoding research begins, the project should answer:

- Should the first research scope be WAV-only, or include MP3?
- Must all research files come from explicit user file selection?
- Should only short clips be allowed?
- What duration and file size limits are required?
- How should the `AudioContext` lifecycle be managed?
- How should decode failures be explained to the user or developer?
- How should memory pressure or out-of-memory failures be handled?
- How do mobile browsers behave?
- How do Android WebView and APK-packaged environments behave?
- Should research live on an isolated experiment page instead of `/practice`?
- How can the UI avoid implying support for arbitrary song analysis?

## 6. Suggested future research stages

### Stage A: docs-only browser decoding acceptance criteria

Define acceptance criteria for a future browser decoding proof of concept. Do not implement browser decoding.

### Stage B: isolated browser research page or script decision

Decide whether future research belongs in an isolated research route, a dev-only page, or continued documentation. Do not connect it to `/practice`.

### Stage C: WAV-only browser decode proof of concept

Consider only in a later separate PR. If approved, it should handle only explicitly user-selected local WAV files, upload nothing, perform no pitch tracking, and generate no target curves.

### Stage D: MP3 later research

Consider MP3 only after WAV browser decoding research is stable. MP3 should not be the first browser decoding stage.

### Stage E: imported audio pitch tracking prototype

Consider much later and still keep it isolated. Do not connect directly to Practice Mode.

## 7. Future isolated browser POC boundary

If a future browser POC is implemented, it must remain:

- User-triggered.
- Local-only.
- No upload.
- No cloud processing.
- No AI API usage.
- No server storage.
- No Practice Mode integration by default.
- No pitch tracking in the first browser decode POC.
- No `TargetPitchCurve` generation.
- No formal scoring.
- No arbitrary song analysis claim.

## 8. Android APK / WebView caveat

Future Android APK packaging must separately validate file picker behavior, `AudioContext` behavior, `decodeAudioData` support, memory limits, local processing, and permission behavior inside Android WebView or packaged environments before any APK-ready claim.

## 9. Privacy / copyright boundary

Future browser decoding research must preserve these boundaries:

- User-provided local files only.
- No built-in song library.
- No commercial song clips.
- No upload by default.
- No public sharing.
- The user remains responsible for rights to any local file they choose.
- Browser decoding research does not bypass copyright restrictions.

## 10. Product claim boundary

Future browser decoding research must not claim support for any of the following unless a later separate PR implements and verifies that capability:

- Arbitrary song analysis.
- Vocal separation.
- Accompaniment-to-melody inference.
- Pitch tracking.
- Target curve generation.
- Scoring.
- Practice Mode import.
- APK-ready behavior.

## 11. Relationship to future milestones

Suggested follow-up PRs:

- P10q Browser DecodeAudioData POC Acceptance Criteria, docs-only.
- P10r Browser DecodeAudioData Source Decision, docs-only.
- P10s isolated browser WAV decode research POC, only if the project later decides to implement it.

P10p does not implement any of those follow-up stages.

## 12. Non-goals

P10p does not do any of the following:

- Runtime code.
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
- Pitch tracking.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- Generated fixture changes.
- MusicXML parser changes.
- MIDI import.
- Accompaniment playback.
- Source separation.
- Vocal separation.
- Song Learning Mode implementation.
- Cloud upload.
- Cloud assessment.
- GPT / AI API usage.
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
- Audiveris integration.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
