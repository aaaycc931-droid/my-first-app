# P10l Node-side WAV Header Inspection POC Acceptance Criteria

## 1. Purpose

This document defines acceptance criteria for a future isolated Node-side WAV header inspection proof of concept (POC) for local monophonic melody guide audio research.

P10l originally documented the acceptance criteria. P10m adds the isolated Node-side header inspector script while preserving the same boundary: it reads minimal WAV header/chunk metadata only and does not decode WAV audio, analyze waveform data, track pitch, generate target curves, or touch Practice Mode.

## 2. Current status

The project already has:

- WAV-only fixture convention for future local melody guide audio research.
- Ignored local WAV fixtures under the local fixture convention.
- Ignored `metadata.local.json` for developer-owned local fixture metadata.
- Metadata-only validator for local melody guide fixture metadata.
- Metadata validator tests, including negative-case coverage.
- Source decision choosing Node-side header inspection first before browser `decodeAudioData` research.

The project still intentionally has no:

- WAV decoding.
- `AudioContext` creation.
- `decodeAudioData` call.
- Pitch tracking.
- Target curve generation.
- Practice Mode integration.

## 3. Future POC location

P10m implements the isolated Node script:

- `scripts/inspect-local-melody-guide-wav-headers.mjs`

P10m also adds the opt-in npm script:

- `validate:local-melody-guide-wav-headers`

The script remains local-fixture-only and is not imported by application runtime code.

## 4. Future input source

A future POC should only read:

- `local-fixtures/melody-guide-audio/metadata.local.json` if present.
- Ignored local WAV files referenced by `metadata.local.json`.
- Samples with `includeInLocalResearch: true`.

If `metadata.local.json` does not exist, the future POC should:

- Skip cleanly.
- Exit 0.

If no samples have `includeInLocalResearch: true`, the future POC should:

- Skip cleanly or print a clear no-op summary.
- Exit 0.

## 5. Future WAV header inspection scope

The P10m inspector performs only minimal header and chunk metadata inspection, including:

- `RIFF` marker.
- `WAVE` marker.
- `fmt ` chunk presence.
- Audio format code.
- PCM-only format validation.
- Channel count.
- Sample rate.
- Byte rate.
- Block align.
- Bits per sample.
- `data` chunk presence.
- `data` chunk byte size.
- Estimated duration from header and `data` metadata.

This must remain container/header inspection only. It is not audio decoding, waveform analysis, pitch analysis, or target curve generation.

## 6. Future reading limit

The P10m implementation:

- Avoids reading the full WAV into memory.
- Reads only enough bytes to find required `RIFF`, `WAVE`, `fmt `, and `data` metadata.
- Imposes a conservative 1MB maximum scan limit for chunk traversal.
- Fails with a clear error if required chunks are not found within the limit.

## 7. Future pass criteria

A future POC should pass when:

- `metadata.local.json` is absent and the command skips cleanly.
- Valid referenced local PCM WAV headers pass.
- Output includes a concise summary per checked file.
- Output includes sample id, `targetLabel`, and `fileName`.
- Output includes sample rate, channels, bits per sample, and estimated duration.
- The command exits 0 when all checked local headers pass.
- There is no upload, cloud processing, or AI behavior.
- There is no Practice Mode integration.

## 8. Future fail criteria

A future POC should fail with exit 1 when:

- A referenced WAV file is missing.
- `fileName` is unsafe.
- The file is not `RIFF`.
- The file is not `WAVE`.
- The `fmt ` chunk is missing.
- The `data` chunk is missing.
- The audio format is not PCM.
- The channel count is unsupported.
- The sample rate is invalid.
- Bits per sample is unsupported.
- Estimated duration is outside the accepted range.
- Header metadata conflicts with `metadata.local.json` in major ways.

## 9. Future allowed WAV subset

The first implementation phase should allow only:

- PCM WAV.
- `channelCount` of 1 or 2.
- Positive `sampleRateHz`, with common values preferred.
- `bitsPerSample` of 16 preferred.
- Duration of 5 to 30 seconds.
- User-provided local-only fixtures.

The first implementation phase should not support:

- MP3.
- M4A / AAC.
- WebM / OGG.
- Compressed WAV.
- Float WAV unless separately planned.
- Multi-channel audio beyond stereo.
- Long recordings.
- Commercial song mixes.

## 10. Future test direction

A future P10m or P10n may add tests, but P10l does not implement them. Future tests may cover:

- Valid minimal PCM WAV header fixture generated in a temporary directory.
- Invalid `RIFF` marker.
- Invalid `WAVE` marker.
- Missing `fmt ` chunk.
- Missing `data` chunk.
- Unsupported audio format.
- Invalid duration.
- Unsafe filename.
- Missing referenced WAV.

Tests should continue to use temporary fake fixtures, commit no real audio, and avoid touching real `metadata.local.json`.

## 11. Relationship to metadata validator

The P10f metadata validator checks JSON shape and path safety. A future WAV header inspector should check only local WAV container/header metadata.

These are separate safety gates:

- Metadata validation does not prove WAV validity.
- WAV header inspection does not prove monophonic melody quality.
- WAV header inspection does not prove pitch stability.
- WAV header inspection does not prove legal rights.
- WAV header inspection does not prove target curve quality.

## 12. Android APK / WebView caveat

Node-side header inspection is only a local research step. Future Android APK packaging must separately validate file access, browser decoding, `AudioContext` behavior, memory limits, and local processing behavior inside Android WebView or packaged environments before any APK-ready claim.

## 13. Non-goals

P10l does not do any of the following:

- Runtime code.
- Scripts.
- `package.json` changes.
- `app/practice/page.tsx` changes.
- File input UI.
- WAV header parser implementation.
- WAV decoding.
- `AudioContext` creation.
- `decodeAudioData` calls.
- `getUserMedia`.
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
- Benchmark gate or tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris integration.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.

## 14. P10m implementation status

P10m adds the isolated Node-side WAV header inspector and the opt-in `validate:local-melody-guide-wav-headers` npm script. It reads ignored local WAV files only when `metadata.local.json` exists and samples explicitly set `includeInLocalResearch: true`.

P10m does not decode WAV audio, does not analyze waveform data, does not track pitch, does not generate target curves, does not touch Practice Mode, does not add UI, does not upload audio, does not call cloud or AI services, and does not add dependencies.


## 15. P10n temporary-fixture test harness status

P10n adds a temporary-fixture test harness for the isolated Node-side WAV header inspector via `npm run test:local-melody-guide-wav-header-inspector`. The harness creates temporary fake fixture roots and temporary synthetic WAV-like files only, invokes `npm run validate:local-melody-guide-wav-headers` with `MELODY_GUIDE_FIXTURE_ROOT`, and deletes the temporary directories after each run.

The P10n tests cover clean skip/no-op paths plus valid and invalid RIFF/WAVE/PCM header cases, including unsafe filename, missing file, invalid `RIFF`, invalid `WAVE`, missing `fmt `, missing `data`, non-PCM format, unsupported bit depth, duration mismatch, invalid channel count, and invalid duration range.

P10n commits no real audio and no `metadata.local.json`. The tests do not use committed real audio, do not write to the real local fixture directory, do not decode WAV files, do not analyze waveform data, do not perform pitch tracking, and do not generate `TargetPitchCurve` data. P10n also does not create `AudioContext`, call `decodeAudioData`, use `getUserMedia`, access the microphone, connect Practice Mode, upload audio, call cloud/AI services, add dependencies, or change `/api/recognize`, PDF, Audiveris, estimator, Pitchy, comparison harness, benchmark gate, or tolerance behavior.
