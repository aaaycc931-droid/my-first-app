# P10l Node-side WAV Header Inspection POC Acceptance Criteria

## 1. Purpose

This document defines acceptance criteria for a future isolated Node-side WAV header inspection proof of concept (POC) for local monophonic melody guide audio research.

P10l is documentation only. It does not implement any code, scripts, WAV reading, WAV header parsing, WAV decoding, audio analysis, runtime behavior, Practice Mode integration, or target pitch curve generation.

## 2. Current status

The project already has:

- WAV-only fixture convention for future local melody guide audio research.
- Ignored local WAV fixtures under the local fixture convention.
- Ignored `metadata.local.json` for developer-owned local fixture metadata.
- Metadata-only validator for local melody guide fixture metadata.
- Metadata validator tests, including negative-case coverage.
- Source decision choosing Node-side header inspection first before browser `decodeAudioData` research.

The project still intentionally has no:

- WAV header inspection script.
- WAV binary reading.
- WAV decoding.
- `AudioContext` creation.
- `decodeAudioData` call.
- Pitch tracking.
- Target curve generation.
- Practice Mode integration.

## 3. Future POC location

A future implementation may use an isolated Node script such as:

- `scripts/inspect-local-melody-guide-wav-headers.mjs`

A future npm script may be named:

- `validate:local-melody-guide-wav-headers`

P10l does not add that script and does not modify `package.json`.

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

A future POC may perform only minimal header and chunk metadata inspection, including:

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

A future implementation should:

- Avoid reading the full WAV into memory when possible.
- Read only enough bytes to find required `RIFF`, `WAVE`, `fmt `, and `data` metadata.
- Impose a conservative maximum scan limit if chunk traversal is needed.
- Fail with a clear error if required chunks are not found within the limit.

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
- WAV binary reading.
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
