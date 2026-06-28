# P10d WAV-only Local Melody Guide Fixture Convention

## 1. Purpose

This document defines a local fixture convention for future research on local monophonic melody guide audio. The convention is intended to support later validation with user-provided, local-only, short-duration, monophonic WAV guide audio.

P10d is documentation and fixture-convention work only. It does not implement file import, audio decoding, `AudioContext`, pitch tracking, target curve generation, or Practice Mode integration.

## 2. Allowed first-phase audio scope

The recommended first-phase research scope is intentionally narrow:

- WAV only.
- Uncompressed PCM WAV.
- Short clips, preferably 5-30 seconds.
- Monophonic melody guide material.
- Piano or keyboard melody guide preferred.
- No chords.
- No polyphony.
- No complex accompaniment.
- No commercial song mix.
- No source separation.
- User-provided local material only.

This scope is meant to make a later proof-of-concept easier to validate before considering broader formats or more complex musical inputs.

## 3. Not supported / out of scope

The first phase should not support:

- MP3.
- M4A / AAC / WebM / OGG.
- Complex accompaniment.
- Chordal piano.
- Full song mixes.
- Vocal plus accompaniment mixes.
- Source separation.
- Vocal separation.
- Accompaniment-to-melody inference.
- Copyrighted built-in song libraries.
- Cloud processing.

## 4. Suggested local fixture layout

Use this local-only fixture location for future WAV research materials:

```text
local-fixtures/melody-guide-audio/
  README.md
  metadata.example.json
  metadata.local.json       # local-only, ignored by git
  audio/
    .gitkeep
    *.wav                   # local-only, ignored by git
```

Only the convention files, the fake example metadata, and the empty audio directory placeholder should be committed. Real WAV files and local metadata must stay on the developer machine.

## 5. Metadata convention

Future local `metadata.local.json` files should use a top-level object with a `samples` array. Each sample may include:

- `id`: non-identifying local sample id.
- `targetLabel`: short label for the intended guide phrase.
- `expectedInstrument`: expected guide instrument, preferably `piano` or `keyboard` in the first phase.
- `expectedMonophonic`: must be `true` for first-phase research.
- `fileName`: local WAV file name under `audio/`.
- `format`: must be `wav`.
- `encoding`: must be `pcm`.
- `durationSeconds`: approximate clip duration.
- `sampleRateHz`: expected sample rate, if known.
- `channelCount`: expected channel count, if known.
- `sourceType`: `local-melody-guide-audio`.
- `rightsConfirmation`: `user-provided-local-only`.
- `notes`: non-identifying local notes.
- `includeInLocalResearch`: whether the sample should be considered by a future local-only script.

The committed `metadata.example.json` must use fake/sample values only. It must not reference real songs, real teaching materials, real copyrighted works, real user recordings, real people, accounts, exact locations, or private context.

## 6. Privacy and copyright boundary

- Real audio is local-only.
- Real audio must not be committed.
- `metadata.local.json` must not be committed.
- No upload is part of this convention.
- No server storage is part of this convention.
- No public audio library is created by this convention.
- The user or developer is responsible for having rights to any source material used locally.
- This convention does not bypass copyright restrictions.

## 7. Future Android APK packaging note

The WAV-only local fixture convention is designed for browser-local research first. Future Android APK packaging must re-check local file selection, WAV decoding, memory limits, and local processing behavior inside Android WebView / packaging environments before claiming APK readiness.

## 8. Relationship to P10c

P10c recommended WAV-first research before broadening local melody guide audio work to additional formats such as MP3. P10d defines the local fixture convention for that future WAV-first research. P10d does not implement decoding, validation, file reading, or runtime behavior.

## 9. Future validation direction

Possible later small steps include:

- P10e metadata validation plan.
- P10f metadata-only validation script.
- P10g local WAV capability proof-of-concept plan.

P10d does not implement any of those steps.

## 10. Non-goals

P10d does not add or change:

- Runtime code.
- `app/practice/page.tsx`.
- File input UI.
- MP3 / WAV import implementation.
- Browser audio decoding.
- `AudioContext` creation.
- `getUserMedia`.
- Microphone access.
- Recording.
- Pitch tracking.
- Note segmentation.
- Target curve generation.
- Practice Mode integration.
- Live chart rendering.
- Converter behavior.
- Generated fixtures.
- MusicXML parser behavior.
- MIDI import.
- Accompaniment playback.
- Source separation.
- Vocal separation.
- Song Learning Mode implementation.
- Cloud upload.
- Cloud assessment.
- GPT / AI API behavior.
- Formal score.
- Rhythm evaluation.
- Sight-singing assessment.
- Estimator behavior.
- Pitchy Practice Mode integration.
- Comparison harness behavior.
- Benchmark gates or tolerances.
- `/api/recognize`.
- Recognition provider union.
- PDF upload.
- Audiveris.
- Dependencies.
