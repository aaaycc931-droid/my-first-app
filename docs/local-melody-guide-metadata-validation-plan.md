# P10e Melody Guide Metadata Validation Plan

## 1. Purpose

This document plans future validation rules for `local-fixtures/melody-guide-audio/metadata.local.json`.

The goal is to make future local monophonic melody guide audio fixture metadata safe, explicit, and verifiable while preserving the P10d boundary that real audio files and local metadata must not be committed. P10e is docs-only planning and does not implement a validation script.

## 2. Current fixture convention recap

P10d established the WAV-only local melody guide fixture convention:

- Fixture root: `local-fixtures/melody-guide-audio/`.
- Audio folder: `local-fixtures/melody-guide-audio/audio/`.
- `metadata.example.json` is committed and must stay fake/sample only.
- `metadata.local.json` is ignored and local-only.
- Real `audio/*.wav` files are ignored and local-only.
- The first phase is WAV-only, uncompressed PCM, short monophonic guide audio.

## 3. Future `metadata.local.json` expected shape

Future `metadata.local.json` should follow the existing P10d `metadata.example.json` shape: a top-level object with a `samples` array. P10e does not rename that field to `records` because the committed example already uses `samples`.

Each sample may include:

- `id`
- `targetLabel`
- `expectedInstrument`
- `expectedMonophonic`
- `fileName`
- `format`
- `encoding`
- `durationSeconds`
- `sampleRateHz`
- `channelCount`
- `sourceType`
- `rightsConfirmation`
- `includeInLocalResearch`
- `notes`

This planned shape should remain aligned with `local-fixtures/melody-guide-audio/metadata.example.json` unless a later PR intentionally changes the fixture convention.

## 4. Required fields

A future metadata-only validator should require these fields for each sample:

- `id`
- `targetLabel`
- `fileName`
- `format`
- `encoding`
- `expectedMonophonic`
- `durationSeconds`
- `sourceType`
- `rightsConfirmation`
- `includeInLocalResearch`

Optional fields may include `expectedInstrument`, `sampleRateHz`, `channelCount`, and `notes`.

## 5. Allowed values

A future metadata-only validator should enforce these allowed values:

- `format`: `"wav"` only.
- `encoding`: `"pcm"`, matching the P10d committed example.
- `sourceType`: `"local-melody-guide-audio"`.
- `rightsConfirmation`: `"user-provided-local-only"`.
- `expectedMonophonic`: `true`.
- `includeInLocalResearch`: boolean.

If a later PR intentionally updates `metadata.example.json`, validation rules should follow the committed example rather than inventing new field names or values in isolation.

## 6. Numeric constraints

A future metadata-only validator should check numeric metadata without making product or audio-content claims:

- `durationSeconds` should be greater than `0`.
- `durationSeconds` is recommended to be 5-30 seconds for first-phase research.
- `sampleRateHz` should be positive if provided.
- `channelCount` should be `1` or `2` if provided.
- These values must not be used as hard proof of product readiness, audio quality, or musical correctness.
- Metadata-only validation does not prove actual audio content.

## 7. File reference checks

A future metadata-only validator should check file references defensively:

- `fileName` should end with `.wav`.
- `fileName` should not contain path traversal such as `../`.
- `fileName` should not be an absolute path.
- `fileName` should follow the `audio/` folder convention, for example `audio/example.wav`.
- A future script may check whether the ignored local audio file exists by filename.
- P10e does not implement this script or any file-existence check.
- A future script must not read or decode WAV files unless a later PR explicitly adds that behavior.

## 8. Privacy / copyright safety checks

A future validator and fixture documentation should preserve these safety boundaries:

- `notes` must not include real copyrighted song titles unless the user intentionally documents local rights.
- `metadata.example.json` must stay fake/sample only.
- `metadata.local.json` must stay ignored.
- Real user recordings must not be committed.
- Real teaching material audio must not be committed.
- Commercial song clips must not be committed.
- Validation does not verify copyright ownership.
- The user remains responsible for rights to local material.

## 9. What validation must not claim

Future metadata validation cannot prove that:

- The WAV is actually monophonic.
- The WAV contains piano or keyboard.
- The WAV is legally usable.
- The audio has stable pitch.
- The file can be decoded.
- Target curve generation will work.
- The system has conservatory-grade accuracy.

## 10. Future validation script direction

A later P10f may add a metadata-only validation script such as:

```bash
npm run validate:local-melody-guide-fixtures
```

That future script should:

- Read `metadata.local.json` only if present.
- Validate metadata shape.
- Validate allowed values.
- Optionally check ignored local audio file presence by filename.
- Not decode WAV.
- Not create `AudioContext`.
- Not run pitch tracking.
- Not generate target curves.
- Not upload anything.

P10e does not implement this script.

## 11. Relationship to existing local real voice fixtures

Melody guide fixtures are separate from the existing local real voice fixture family:

- Melody guide fixtures are separate from `local-fixtures/real-voice`.
- Do not mix metadata formats unless explicitly planned.
- P10e makes no changes to `validate:local-real-voice-fixtures`.
- P10e makes no changes to `validate:local-real-phone-comparison`.
- No real audio is shared between these fixture families.

## 12. Future Android APK packaging note

Future Android APK packaging must re-check metadata file selection, local file access, WAV decoding, memory limits, and local processing behavior inside Android WebView / packaging environments before treating this fixture validation plan as APK-ready.

## 13. Non-goals

P10e does not add or change:

- Runtime code.
- Validation script.
- `package.json` script.
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
- Generated fixture changes.
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
- `package.json` or `package-lock.json`.
- Real audio files.
- `metadata.local.json`.

## 14. P10f follow-up: metadata-only validator added

P10f adds the opt-in `npm run validate:local-melody-guide-fixtures` script for local melody guide fixture metadata. The script validates the committed fake/sample-only `metadata.example.json`, skips cleanly when ignored `metadata.local.json` is absent, and validates metadata shape, allowed values, numeric bounds, and safe local `audio/*.wav` references when `metadata.local.json` exists.

The P10f script is metadata-only. It does not read or decode WAV contents, does not create `AudioContext`, does not perform pitch tracking, and does not generate target curves.
