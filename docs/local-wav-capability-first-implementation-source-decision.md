# P10k WAV Capability First Implementation Source Decision

## 1. Purpose

This document decides only the first future implementation source path for a real local WAV capability proof of concept. P10k is a docs-only source decision and does not implement WAV reading, WAV header parsing, WAV decoding, browser decoding, Practice Mode integration, or any runtime behavior.

The decision follows the P10a-P10j local monophonic melody guide audio planning sequence and narrows the next safe direction after P10j recommended a separate source decision before any WAV capability POC.

## 2. Decision

**Chosen: Option A — Node-side minimal WAV header inspection first.**

The first future implementation path should be an isolated Node-side, opt-in, local-fixture-only capability that reads only the minimum WAV header and chunk metadata needed to validate container metadata.

**Deferred: Option B — browser `decodeAudioData` research.**

Browser-side decoding research is deferred until after Node-side header inspection is planned and reviewed, and possibly after a very small isolated header-inspection POC exists.

## 3. Why not browser `decodeAudioData` first

Browser `decodeAudioData` research is closer to a future browser-local product experience, but it is riskier as the first implementation path:

- It needs a browser runtime rather than a simple local Node command.
- It may involve `AudioContext` lifecycle behavior earlier than the project needs.
- Browser compatibility varies across desktop browsers.
- Mobile behavior varies, especially across iOS Safari and Android Chrome.
- Android WebView and APK packaging behavior must be checked separately before any APK-ready claim.
- Memory and duration handling are more complex when decoding audio buffers instead of reading metadata bytes.
- It is easier to accidentally imply that the product already supports real audio import, decoding, or analysis.
- It is not suitable as the first implementation PR while the project is still establishing isolated local fixture validation boundaries.

## 4. Why Node-side header inspection first

Node-side minimal WAV header inspection is the safer first implementation path because it is:

- More isolated from product runtime behavior.
- Local-only and aligned with ignored local fixtures.
- Opt-in through an explicit developer command if implemented later.
- Independent from Practice Mode and `/practice` UI.
- Independent from browser APIs.
- Independent from `AudioContext` and `decodeAudioData`.
- Independent from browser permissions.
- Independent from mobile WebView compatibility at this stage.
- Better aligned with the `local-fixtures/melody-guide-audio/` fixture convention from P10d.
- Better aligned with the P10f metadata-only validator and its local opt-in behavior.
- Easier to review because it can validate WAV container metadata before touching audio content.
- Easier to test with small fake or local ignored fixtures.
- Lower risk for misunderstanding the work as shipped audio import, audio decoding, pitch recognition, or target curve generation.

## 5. Future Node-side header inspection scope

If a future PR implements the chosen path, the allowed scope should remain narrow:

- Use an isolated script.
- Read local ignored WAV fixtures only when `metadata.local.json` explicitly opts in.
- Read only minimal header and chunk bytes.
- Validate `RIFF` / `WAVE` container metadata.
- Validate presence and shape of the `fmt ` chunk.
- Validate PCM encoding.
- Validate channel count.
- Validate sample rate.
- Validate bits per sample.
- Validate byte rate.
- Validate data chunk size.
- Estimate duration from header and data chunk metadata.
- Print a clear local-only summary.
- Exit with clear errors for unsupported, unsafe, missing, or inconsistent metadata.

A future Node-side header inspection implementation must still not include:

- Full audio decoding.
- Waveform analysis.
- Pitch tracking.
- Note segmentation.
- Target curve generation.
- Practice Mode integration.
- `/practice` changes.
- File input UI.
- Browser APIs.
- `AudioContext`.
- `decodeAudioData`.
- `getUserMedia`.
- Microphone access.
- Upload, cloud, or AI behavior.

## 6. Future browser `decodeAudioData` scope

Browser `decodeAudioData` research can be considered later, but only in a separate PR with explicit boundaries:

- It must be user-triggered.
- It must remain browser-local.
- It must not upload audio.
- It must have clear cleanup and resource release behavior.
- It must have explicit error handling for unsupported files, decode failures, duration limits, memory pressure, and cancellation.
- It must re-check Android WebView and APK packaging behavior.
- It must not be treated as APK-ready until tested in the packaged Android environment.
- It must not imply source separation, vocal separation, pitch tracking, target curve generation, formal scoring, or full product audio import support.

## 7. Android APK / WebView caveat

Future Android APK packaging must re-check local file selection, WAV header behavior, browser decoding behavior, memory limits, `AudioContext` behavior, and local processing inside Android WebView / packaging environments before treating any browser-local WAV capability as APK-ready.

## 8. Relationship to P10j staged plan

P10j proposed a staged WAV local capability POC plan. P10k maps onto that plan as follows:

- P10j Stage A metadata and file presence is already covered by P10f and P10h.
- P10k selects Stage B Node-side WAV header inspection as the first future implementation direction.
- Stage C browser decoding remains deferred.
- Stage D pitch tracking remains later.
- Stage E `TargetPitchCurve` generation remains later.

This means the next implementation step, if approved, should be a tiny isolated Node-side header inspection POC rather than browser decoding or Practice Mode integration.

P10l defines the future acceptance criteria for the isolated Node-side WAV header inspection POC, without implementing header parsing, WAV reading, decoding, or runtime behavior.

## 9. Non-goals

P10k does not do any of the following:

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


## 10. P10m follow-up

P10m implements the chosen Node-side-first direction as an isolated, opt-in local fixture command: `npm run validate:local-melody-guide-wav-headers`. The script reads only minimal RIFF/WAVE/`fmt `/`data` header and chunk metadata for ignored local WAV files referenced by ignored `metadata.local.json` samples with `includeInLocalResearch: true`. It remains separate from browser `decodeAudioData` research and does not decode audio, analyze waveform data, track pitch, generate `TargetPitchCurve` data, touch Practice Mode, upload audio, call cloud/AI services, add dependencies, or commit real audio/metadata.

P10p revisits browser `decodeAudioData` research after the Node-side header-only path, but keeps browser decoding, `AudioContext`, pitch tracking, `TargetPitchCurve` generation, and Practice Mode integration deferred.
