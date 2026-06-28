# P10j WAV Local Capability Proof-of-Concept Plan

## 1. Purpose

This document plans a future isolated WAV local capability proof-of-concept (POC) for local monophonic melody guide audio research.

The future POC goal is to verify the smallest safe capability boundary for WAV guide audio in a browser, Node.js, or local developer environment. P10j is documentation only and does not implement code, scripts, runtime behavior, WAV reading, WAV decoding, audio analysis, Practice Mode integration, or target pitch curve generation.

## 2. Current status recap

The project already has a staged local melody guide audio foundation:

- WAV-only fixture convention for future local melody guide audio research.
- Committed `metadata.example.json` with safe fake/sample-only metadata.
- Ignored `metadata.local.json` for developer-owned local fixture metadata.
- Ignored `audio/*.wav` local fixture audio files.
- Metadata-only validator for local melody guide fixture metadata.
- Metadata validator negative-case tests.

The project still intentionally has no:

- File input UI.
- WAV import implementation.
- WAV binary reading.
- WAV decoding.
- `AudioContext` creation.
- `decodeAudioData` call.
- Pitch tracking.
- Note segmentation.
- Target curve generation.
- Practice Mode integration.

## 3. Future POC principle

Any future WAV capability POC must remain:

- Isolated from `/practice`.
- Local-only.
- Opt-in.
- No upload.
- No cloud processing.
- No AI API usage.
- No scoring.
- No target curve generation at first.
- No formal product claim.
- No commercial song support.
- No source separation.
- No vocal separation.
- No accompaniment-to-melody inference.

## 4. Recommended future POC stages

Future WAV capability work should be split into small, reviewable stages.

### Stage A: metadata + file presence only

- Already covered by P10f and P10h.
- Validates metadata shape and safe file references only.
- Does not read WAV binary contents.
- Does not decode WAV audio.
- Does not analyze waveform data.

### Stage B: WAV header/read capability plan

A future stage may plan or implement minimal WAV header/container inspection only.

Possible checks:

- RIFF/WAVE marker validation.
- PCM encoding validation.
- Sample rate extraction.
- Channel count extraction.
- Bits-per-sample extraction.
- Duration estimate from byte rate and data chunk size.

Boundaries:

- No pitch tracking.
- No note segmentation.
- No target curve generation.
- No Practice Mode integration.

### Stage C: browser decoding research implementation plan

If browser decoding research becomes necessary, it should be a separate future PR.

Required constraints:

- Use an explicit user-triggered flow.
- Release resources after research use.
- Handle decoding errors clearly.
- Keep implementation isolated from Practice Mode by default.
- Avoid product claims until tested across required browsers/devices.

### Stage D: monophonic pitch tracking prototype plan

Only consider this after Stage B and/or Stage C have been completed and reviewed.

Constraints:

- Remain isolated from `/practice`.
- Use local-only fixtures.
- Avoid formal recognition or accuracy claims.
- Do not claim arbitrary-song analysis.
- Do not claim reliable melody extraction from accompaniment.

### Stage E: `TargetPitchCurve` generation prototype plan

This is the latest stage and should not be attempted until earlier capability boundaries are clear.

Constraints:

- Must be a separate PR.
- Must remain isolated until reviewed.
- Must not become Practice Mode behavior by default.
- Must define accuracy and failure boundaries before user-facing use.

## 5. First recommended implementation after P10j

The recommended P10k follow-up should still avoid full decoding. A safer P10k could be another docs-only source decision that:

- Decides whether the first actual POC should be Node-side WAV header inspection or browser `decodeAudioData` research.
- Compares implementation, privacy, platform, and review risks.
- Chooses one path.
- Still does not implement WAV reading or decoding.

If a future team decides that the first actual implementation must happen immediately, it should be extremely small:

- Isolated script only.
- Local fixture only.
- Opt-in command only.
- No `/practice` integration.
- No `AudioContext` if the chosen path is Node-side header inspection.
- No pitch tracking.
- No target curve generation.

P10j does not implement any of the above.

## 6. WAV header inspection future idea

If a future PR chooses Node-side WAV header inspection, the implementation should:

- Read only minimal header bytes where practical.
- Validate the RIFF/WAVE container markers.
- Validate PCM format.
- Infer channel count.
- Infer sample rate.
- Infer bits per sample.
- Estimate duration from byte rate and data chunk size.
- Avoid reading full audio into memory when possible.
- Avoid waveform analysis.
- Avoid pitch extraction.
- Avoid target curve generation.
- Avoid audio-quality claims.

This future idea is only a plan. P10j does not add a WAV header parser.

## 7. Browser `decodeAudioData` future idea

If a future PR chooses browser-side decoding research, it must:

- Be a separate PR.
- Be user-triggered.
- Never run automatically.
- Never upload files.
- Handle browser compatibility differences.
- Consider Android WebView and APK packaging separately.
- Not be treated as APK-ready until tested in the packaged environment.

P10j does not create `AudioContext` and does not call `decodeAudioData`.

## 8. Android APK / WebView note

Future Android APK packaging must re-check local file selection, WAV header handling, browser decoding behavior, memory limits, `AudioContext` behavior, and local processing inside Android WebView / packaging environments before treating any browser-local WAV POC as APK-ready.

## 9. Privacy / copyright boundary

Future capability POCs must preserve these boundaries:

- Use user-provided local fixtures only.
- Commit no real audio.
- Include no built-in song library.
- Include no commercial song clips.
- Upload nothing.
- Store nothing on a server.
- Share nothing publicly by default.
- Keep the user responsible for rights to local materials.
- Do not treat capability POCs as a way to bypass copyright restrictions.

## 10. Accuracy and claim boundary

Future POCs must not claim that the product can:

- Analyze arbitrary songs.
- Infer melody from accompaniment.
- Separate vocals.
- Transcribe polyphonic music.
- Produce reliable target curves.
- Perform formal scoring.
- Provide conservatory-grade accuracy.
- Replace teacher evaluation.

## 11. Relationship to existing target curve work

Existing target curve work provides a possible future destination for guide-audio-derived data, but not an immediate implementation target:

- P9d defined `TargetPitchCurve` and `TargetPitchSegment`.
- P9k proved that the static preview can read hand-authored target curve data.
- Future WAV guide audio work may eventually produce compatible `TargetPitchCurve` data.
- P10j and the first capability POC should not generate `TargetPitchCurve` data yet.

## 12. Non-goals

P10j does not do any of the following:

- Runtime code.
- Scripts.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- File input UI.
- MP3 import implementation.
- WAV import implementation.
- WAV binary reading.
- WAV decoding.
- WAV header parser implementation.
- `AudioContext` creation.
- `decodeAudioData` call.
- `getUserMedia` call.
- Microphone access.
- Recording.
- Pitch tracking.
- Note segmentation.
- Target curve generation.
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
- Benchmark gate changes.
- Tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris changes.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
