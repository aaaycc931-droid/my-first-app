# P7i Real Phone Recording Comparison Protocol & Metadata Extension

## Purpose

P7i prepares for a later opt-in local comparison of real phone recordings across the current in-repository autocorrelation estimator and Pitchy. The protocol focuses on quiet indoor, single-voice, known-target-note recordings captured from mobile browsers so future work can compare practical phone behavior instead of relying only on generated synthetic benchmarks.

This PR is documentation and local fixture convention only. It does not add real audio, upload audio, create accounts, persist recordings, call GPT or any AI API, implement real-time recording, change Practice Mode workflow, change pitch estimator behavior, change Pitchy adapter behavior, change benchmark gates, or make real phone checks part of CI.

## Evaluation goal and non-goal

The future local set should help identify:

- gross pitch error
- octave error
- false voiced behavior
- false unvoiced behavior
- out-of-human-range estimates
- drift and vibrato anomalies
- device/browser-specific recording caveats

The set must not be used as a formal score, grade, pass/fail label, rhythm evaluation, sight-singing assessment, conservatory-grade accuracy claim, or production accuracy proof.

## Recording collection protocol

1. Use iPhone Safari and Android Chrome when available; laptop microphone samples may be kept as comparison controls.
2. Record in a quiet indoor room with one singer and no accompaniment.
3. Keep the phone microphone roughly 20-40 cm from the singer.
4. Play target notes through headphones when possible so target tones do not leak into the microphone.
5. Record one target note, or one clearly bounded practice fragment, per local audio file.
6. Store audio only in ignored local paths such as `local-fixtures/real-voice/audio/`.
7. Create one non-identifying `metadata.local.json` record per sample before using it for comparison.
8. Do not write real names, phone numbers, email addresses, exact locations, account ids, workplace/school names, or other personal identity details.

## Minimum initial coverage

| Dimension | Recommended values |
| --- | --- |
| Target notes | `C4`, `E4`, `G4`, `A4`, `C5`; optionally `A3` / `C3` for lower male voices |
| Vowels | `a`, `e`, `i`, `o`, `u` |
| Durations | `1s`, `3s`, `5s` |
| Volume | `soft`, `normal`, `loud` |
| Performance type | `stable`, `light-vibrato`, `intentional-drift`, `no-pitch` |
| Device class | `iphone-safari`, `android-chrome`, `laptop-mic` |
| Room condition | `quiet-room` |
| Singer range | `male-low`, `male-mid`, `female-mid`, `female-high`, `unknown-nonidentifying` |

## Metadata extension

P7i local phone records should extend the existing local metadata convention with these fields:

- `id`: non-identifying sample id.
- `audioFile`: relative ignored local audio path, never a committed real file.
- `targetNote`: intended target note.
- `expectedFrequencyHz` / `targetFrequencyHz`: expected equal-tempered target frequency.
- `vowel`: one of the planned vowel labels.
- `durationSeconds`: approximate duration.
- `deviceClass`: broad source such as `iphone-safari`, `android-chrome`, or `laptop-mic`.
- `browser`: non-identifying browser label.
- `os`: non-identifying OS label.
- `microphoneDistanceCm`: approximate distance in centimeters.
- `playbackMode`: `headphones`, `speaker`, or `none`.
- `roomCondition`: broad room condition such as `quiet-room`.
- `volume`: `soft`, `normal`, or `loud`.
- `performanceType`: `stable`, `light-vibrato`, `intentional-drift`, or `no-pitch`.
- `singerRange`: broad non-identifying range category.
- `consentStatus`: local consent category.
- `localOnly`: must be `true`.
- `includeInPitchEngineComparison`: opt-in flag for future local comparison scripts.
- `expectedBehavior`: short reporting expectations, not score criteria.
- `caveats`: known limitations.

The committed `metadata.example.json` remains a placeholder only. Real `metadata.local.json` and real audio files must remain gitignored.

## Future P7j local execution design

A later opt-in local script may:

1. Read ignored `local-fixtures/real-voice/metadata.local.json`.
2. Read ignored local audio files referenced by `audioFile`.
3. Run the current estimator and Pitchy over the same samples.
4. Output a reporting-only comparison summary.
5. Reuse P7g anomaly flags for gross pitch, octave, false voiced, false unvoiced, out-of-human-range, drift, and vibrato observations.
6. Stay outside CI and outside `npm run validate:local`.
7. Exit successfully with a clear message when metadata or audio is absent.

It must not add a formal score, grade, pass/fail label, benchmark gate, tolerance change, cloud upload, AI API call, new dependency, or new pitch engine integration without a separate explicit PR.

## Mobile browser validation checklist

| Manual check | What to record |
| --- | --- |
| iPhone Safari microphone permission | Whether permission can be granted and recording starts locally |
| Android Chrome microphone permission | Whether permission can be granted and recording starts locally |
| Stable recording | Whether recordings complete without browser interruption |
| Echo cancellation / noise suppression / auto gain control | Whether browser processing appears to affect pitch reliability |
| Headphone need | Whether target playback leaks into the microphone without headphones |
| Low-end phone performance | Whether stutter, dropped frames, or high CPU use appears |
| Latency suitability | Whether latency seems acceptable for a future trend chart; do not implement the chart here |
| Unreliable-frame handling | Whether unreliable frames produce unknown / no pitch instead of random note names |

## Boundary checklist

P7i remains local-only, documentation-first, and non-blocking. It does not commit recordings, upload audio, connect cloud evaluation, add accounts, add persistence, implement recording features, implement Song Learning Mode, upload songs, separate sources, extract vocal melody, generate target curves, change Practice Mode UI workflow, change algorithms, install dependencies, modify recognition APIs, or connect PDF/Audiveris behavior.

## P7j opt-in local comparison script status

P7j adds `npm run validate:local-real-phone-comparison` as an opt-in, local-only, reporting-only preparation script for future real phone recording comparisons. The script reads only ignored local files under `local-fixtures/real-voice/`, does not upload audio, does not call the network, does not call GPT or AI APIs, and is intentionally outside CI and outside `npm run validate:local`.

Behavior:

- If `local-fixtures/real-voice/metadata.local.json` is missing, the script prints a clear message and exits `0`.
- If metadata exists, only samples with `includeInPitchEngineComparison: true` are considered.
- Missing local audio files are reported as `skipped-missing-audio`; they do not fail normal developer validation.
- The script currently supports a minimal no-dependency decode path for uncompressed PCM `.wav` files. Other formats are reported as `unsupported-audio-decoding`; the script does not fabricate `estimatedFrequencyHz` values for skipped samples.
- When a sample is executable, it attempts the current in-repository autocorrelation estimator and the Pitchy comparison adapter through the same reporting-only row language used by the pitch engine comparison harness.

The P7j output is not a formal score, grade, pass/fail result, professional accuracy claim, or conservatory-grade assessment. It does not change the current estimator, Pitchy adapter, Practice Mode, benchmark gates, tolerances, recognition APIs, persistence, accounts, uploads, cloud evaluation, or any CI requirement.

## P7k local real phone smoke test addendum

P7k records one local-only smoke test of the P7j opt-in script using a private, uncommitted A3 PCM WAV sample. No recording, audio fixture, exported clip, derived audio asset, or `metadata.local.json` file is added to the repository. The result is a non-identifying summary only.

Smoke test input summary:

- sample count: 1
- `targetNote`: `A3`
- `targetFrequencyHz`: `220`
- `vowel`: `a`
- duration: about 3 seconds
- `roomCondition`: `quiet-room`
- `deviceClass`: `phone-mic`
- `playbackMode`: `headphones`

P7j script execution summary:

- `metadataFound`: `true`
- `totalSamples`: `1`
- `includedSamples`: `1`
- `missingAudioSamples`: `0`
- `unsupportedAudioSamples`: `0`
- `skippedSamples`: `0`
- `executedSamples`: `1`
- `enginesAttempted`: `2`
- `rowsGenerated`: `2`
- `grossPitchErrors`: `0`
- `outOfHumanVoiceRange`: `0`
- `possibleFalseVoiced`: `0`
- `unknownResults`: `0`

Observed reporting-only rows:

| Engine | Estimated frequency | Nearest note | Cents error | Confidence / clarity / voicing | Anomaly labels |
| --- | --- | --- | --- | --- | --- |
| current in-repo autocorrelation estimator | about 217.32Hz | A3 | about -21.23 cents | about 0.941 | none |
| Pitchy / McLeod Pitch Method | about 217.56Hz | A3 | about -19.34 cents | about 0.982 | none |

Interpretation:

- The P7j script successfully read ignored local metadata, read an ignored local PCM WAV fixture, executed both engines, and generated reporting-only comparison rows.
- Both engines produced close A3 estimates on the same local phone sample.
- Both engines agreed that the sample was slightly flat relative to A3.
- No gross pitch error, out-of-human-voice-range result, possible false voiced issue, unknown result, or anomaly label was reported.
- This is a smoke test only. It is not statistically meaningful accuracy evidence, not conservatory-grade accuracy proof, not a reason to replace the baseline estimator, and not a product scoring claim.
- More local samples across notes, vowels, phones, singers, and performance types are still required before any product accuracy language changes.

P7k does not modify P7j script behavior, the pitch estimator algorithm, the Pitchy adapter algorithm, comparison harness behavior, Practice Mode UI workflow, recording behavior, pitch trend charts, Song Learning Mode, song upload, source separation, vocal melody extraction, target pitch curve generation, cloud assessment, GPT / AI APIs, accounts, persistence, formal scores, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, benchmark gates, tolerances, `/api/recognize`, recognition providers, PDF upload, or Audiveris behavior.
