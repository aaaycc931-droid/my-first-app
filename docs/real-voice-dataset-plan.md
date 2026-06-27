# Real Voice Dataset Plan

## 1. Purpose

P5a defines a future real voice dataset plan for evaluating real singing pitch robustness. This document is design-only: it does not collect recordings, add audio fixtures, upload audio, connect external datasets, or change product behavior.

The dataset is intended to support future pitch evaluation accuracy work after the current generated in-memory synthetic benchmark work. It should help the team understand whether the experimental local pitch estimate remains useful on real sung notes across common voice and recording conditions.

This plan is not current production accuracy proof. Until real voice data is collected, labeled, and validated through a repeatable benchmark process, the product must continue to describe pitch feedback as experimental and local-only rather than production-grade assessment.

## 2. Current benchmark context

The existing benchmark coverage is useful but limited:

- P3a added exploratory synthetic cases for higher noise, frequency drift, vibrato, and mixed harmonics.
- P3b added frame-level diagnostics for exploratory synthetic cases.
- P4a improved vibrato robustness through a small frame aggregation change.
- P4b clarified frequency drift benchmark metadata.
- P4c decided that frequency drift is a sustained pitch instability diagnostic candidate, not an ending-pitch correctness case.
- P4d prototyped sustained pitch instability diagnostic fields.
- P4e consolidated the benchmark status and boundaries.

Those steps are still based on generated in-memory synthetic cases. They do not prove real singing robustness, production accuracy, formal grading quality, rhythm evaluation, or sight-singing assessment readiness.

## 3. Dataset goals

A future real voice dataset should answer narrow pitch robustness questions:

- Does the estimator find the intended single-note pitch for real sung notes?
- How often does it produce usable pitch frames under realistic MVP recording conditions?
- How do confidence, valid frame rate, stability, vibrato, and drift diagnostics behave on real voices?
- Which voice ranges, vowels, dynamics, durations, and environments create likely failure modes?

The dataset should not be used to claim production-grade pitch evaluation unless a later PR defines collection, labeling, validation scripts, result thresholds, and product language updates.

## 4. Sampling scope

The first real voice dataset should remain small and controlled. It should prefer sustained single-note samples before intervals or melodies.

Recommended sampling dimensions:

| Dimension | Initial coverage |
| --- | --- |
| Pitch range | Low, middle, and high notes for each participating singer's comfortable range |
| Vowel | At least `ah`, `ee`, and `oo` sustained vowels |
| Volume | Soft, medium, and loud attempts when comfortable and safe |
| Duration | Short sustained notes around 1 second, medium around 2 seconds, and longer around 4 seconds |
| Vibrato | Straight tone plus light natural vibrato where the singer can provide it |
| Drift | Stable target attempts plus mild intentional upward or downward drift attempts |
| Noise | Quiet room, normal laptop fan / room tone, and mild background noise conditions |
| Device | Built-in laptop microphone first; optional phone or external microphone metadata later |

The initial scope should avoid rhythm tasks, sight-singing tasks, full melodies, harmony, accompaniment, and uncontrolled public audio.

## 5. Annotation schema draft

Each future sample should have a small metadata record stored separately from the audio file. The metadata should support repeatable analysis without requiring accounts or personally identifying information.

Suggested fields:

- `sampleId`: non-identifying stable sample id.
- `targetNote`: intended note name such as `A4`.
- `expectedFrequencyHz`: expected equal-tempered frequency for the target note.
- `singerType`: broad optional category such as soprano, alto, tenor, bass, child voice, or unspecified.
- `vocalRange`: optional documented comfortable range when known, such as `A3-E5`.
- `vowel`: intended vowel, such as `ah`, `ee`, or `oo`.
- `intendedDurationMs`: approximate requested sustained-note duration.
- `volumeIntent`: soft, medium, or loud.
- `condition`: short recording condition label such as quiet room or mild background noise.
- `deviceClass`: broad device class, such as laptop built-in microphone.
- `expectedBehavior`: stable, light vibrato, slight upward drift, or slight downward drift.
- `knownCaveats`: free-text caveats such as clipped audio, uncertain target, background speech, or singer fatigue.
- `consentStatus`: consent category for future collection workflows.
- `localOnly`: whether the sample is restricted to local developer machines and excluded from the repository.

Metadata should not include names, email addresses, account ids, or other direct identifiers.

## 6. Privacy and local-only boundaries

The current product must keep its existing privacy boundary:

- no upload of user recordings
- no storage of user recordings on a server
- no account connection for voice samples
- no committed real audio files
- no hidden telemetry collection
- no AI API or external transcription call for pitch evaluation

Future local fixture prototypes may use developer-owned or consent-based recordings only if the files remain outside the repository and are documented as local-only. If a later PR proposes repository fixtures, it must use synthetic or clearly licensed non-user assets and must explicitly revisit this boundary.

## 7. Data source strategy

Future dataset work can consider these source categories in separate PRs:

1. **Manual developer recordings:** small local recordings produced by developers for private validation. These are useful for early workflow testing but should not be committed.
2. **Consent-based recordings:** opt-in recordings from participants with explicit consent language and clear deletion expectations. This requires a future collection protocol and must not be added in P5a.
3. **Synthetic-to-real comparison:** compare existing generated in-memory synthetic cases against equivalent real sung attempts to identify mismatches in confidence, valid frame rate, vibrato handling, drift behavior, and octave errors.
4. **Public datasets:** possible future research option only after license, consent, redistribution, and attribution requirements are reviewed. P5a does not connect any external dataset.

## 8. Evaluation metrics draft

A future validation script extension can report metrics such as:

- median pitch cents error against `expectedFrequencyHz`
- p90 / p95 pitch cents error
- octave error rate
- no-pitch detection rate
- false pitch frame rate
- valid frame rate
- confidence distribution
- frame-level pitch min / median / max
- sustained stability range in cents
- first-half to second-half drift in cents
- diagnostic agreement for expected stable, light vibrato, or mild drift samples

These metrics should remain diagnostic until a later scoring-design PR defines any user-facing interpretation. P5a does not add a grade, pass/fail label, formal score, blocking gate, tolerance change, or production acceptance threshold.

## 9. Phased implementation plan

1. **Dataset design:** document goals, scope, metadata, privacy boundaries, source strategy, and metric candidates. P5a covers this phase only.
2. **Small local fixture prototype:** create a local-only folder convention and metadata example without committing real audio. This phase can validate developer workflow.
3. **Validation script extension:** allow local opt-in real voice metadata/audio paths to be analyzed without changing CI gates or committing audio.
4. **Result reporting:** record non-blocking real voice observations separately from synthetic benchmark gates.
5. **Possible future scoring design:** only after enough labeled real voice data exists, consider whether any user-facing scoring or product language should change.

## 10. Explicit non-goals for P5a

P5a does not:

- add real audio files
- add audio fixtures
- upload recordings
- connect an AI API
- connect an external dataset
- change the pitch estimator algorithm
- change the Practice Mode UI workflow
- add formal scores, grades, pass/fail labels, or blocking gates
- relax any tolerance
- promote exploratory synthetic cases to blocking
- evaluate rhythm
- evaluate sight singing
- modify `/api/recognize`
- modify the recognition provider union
- add PDF upload
- connect Audiveris

## 11. Current accuracy statement

The project still does not have production-grade pitch evaluation evidence. Current validation remains limited to generated in-memory synthetic regression gates and exploratory diagnostics. A real voice dataset is necessary before making stronger claims about real singing pitch robustness.

## 12. P5b local real voice fixture convention

P5b adds a repository convention for future developer local real voice experiments without adding real recordings or changing validation behavior. The convention lives under `local-fixtures/real-voice/` and commits only text documentation plus a placeholder JSON metadata template.

The intended local-only layout is:

```text
local-fixtures/real-voice/
  README.md
  metadata.example.json
  metadata.local.json        # local-only, ignored by git
  audio/                     # local-only, ignored by git
    <id>.wav                 # local-only, ignored by git
```

Committed files in this folder must remain limited to convention docs and safe text examples. Real voice recordings, exported clips, audio fixtures, and local metadata containing collection-specific details must stay on the developer machine and must not be uploaded or committed.

The example metadata template uses non-identifying placeholder values and includes these fields for each local sample: `id`, `targetNote`, `expectedFrequencyHz`, `vowel`, `durationSeconds`, `singerRange`, `recordingCondition`, `deviceClass`, `consentStatus`, `localOnly`, and `caveats`.

This convention is for developer local experiments only. It is not part of CI, does not add blocking validation, does not relax tolerances, and does not promote exploratory cases to blocking. If a future PR proposes a validation script for local real voice files, that script must be opt-in and non-blocking by default, and the PR must separately review privacy, consent, repository hygiene, and product-claim boundaries.

P5b does not change the pitch estimator algorithm, Practice Mode UI workflow, formal scoring, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, `/api/recognize`, recognition provider union, PDF upload, Audiveris behavior, AI API usage, audio upload behavior, or external dataset usage.

## 13. P5c opt-in local metadata validation script

P5c adds an opt-in local metadata validation script for the P5b local real voice fixture convention. Developers can manually run `npm run validate:local-real-voice-fixtures` to check the shape of `local-fixtures/real-voice/metadata.local.json` when they have created that ignored local file on their own machine.

The script validates only text metadata fields from the P5b convention: `id`, `targetNote`, `expectedFrequencyHz`, `vowel`, `durationSeconds`, `singerRange`, `recordingCondition`, `deviceClass`, `consentStatus`, `localOnly`, and `caveats`. It treats a missing `metadata.local.json` as normal and exits successfully so developers without local real voice experiments are not blocked.

This script does not read audio file contents, upload data, call the network, call AI APIs, connect external datasets, change the pitch estimator algorithm, change Practice Mode UI workflow, add formal scores, add grades, add pass/fail labels, evaluate rhythm, evaluate sight singing, change blocking gates, relax tolerances, promote exploratory cases, join CI, join `npm run validate:local`, modify `/api/recognize`, modify recognition providers, add PDF upload, or connect Audiveris.

## 14. P5d local metadata authoring guide

P5d adds a docs-only `metadata.local.json` authoring guide to `local-fixtures/real-voice/README.md`. The guide explains how developers can copy `metadata.example.json` to the ignored local `metadata.local.json`, fill each P5b/P5c metadata field with non-identifying local-only values, and manually run `npm run validate:local-real-voice-fixtures` as an opt-in, local-only, non-blocking metadata shape check.

P5d does not add scripts, commit real audio, commit audio fixtures, commit real `metadata.local.json`, upload audio, call AI APIs, connect external datasets, change the pitch estimator algorithm, change Practice Mode UI workflow, add scores, add grades, add pass/fail labels, evaluate rhythm, assess sight singing, change blocking gates, relax tolerances, promote exploratory cases to blocking, connect real voice validation to CI, add the local real voice validator to `npm run validate:local`, modify `/api/recognize`, modify recognition providers, add PDF upload, or connect Audiveris.

## 15. P5e local real voice PR reviewer checklist

Use this checklist when reviewing future local real voice PRs so the local experiment boundary stays privacy-preserving, opt-in, and non-blocking.

### Repository hygiene

- [ ] The PR does not commit real audio files, exported clips, derived audio assets, or audio fixtures.
- [ ] The PR does not commit `local-fixtures/real-voice/metadata.local.json` or any other local-only metadata file.
- [ ] The PR does not include real names, email addresses, phone numbers, street addresses, exact locations, account ids, device owner names, or other personally identifiable information.

### Validation wiring

- [ ] The PR does not connect local real voice validation to CI.
- [ ] The PR does not add local real voice validation to `npm run validate:local`.
- [ ] Any local real voice validation remains manual, local-only, opt-in, and non-blocking.

### Product and algorithm boundaries

- [ ] The PR does not modify the pitch estimator algorithm.
- [ ] The PR does not modify the Practice Mode UI workflow.
- [ ] The PR does not add a score, formal score, grade, pass label, fail label, rhythm evaluation, or sight-singing assessment.
- [ ] The PR does not modify blocking gates, tolerance values, or target frequencies.
- [ ] The PR does not promote exploratory cases to blocking.

### Integration boundaries

- [ ] The PR does not introduce audio upload behavior.
- [ ] The PR does not call or wire an AI API.
- [ ] The PR does not connect an external dataset.
- [ ] The PR does not modify `/api/recognize`.
- [ ] The PR does not modify the recognition provider union.
- [ ] The PR does not add PDF upload behavior.
- [ ] The PR does not connect Audiveris.

### Required reviewer conclusion

- [ ] The PR explicitly preserves the local real voice workflow as local-only, opt-in, non-blocking, and outside CI.
- [ ] The PR remains docs-only unless a future task explicitly authorizes a narrow non-doc change with the same privacy, product, and validation boundaries reviewed again.

## 12. P7b mobile pitch-engine validation requirements

The P7b pitch-engine evaluation matrix makes the real voice dataset a required prerequisite for stronger pitch-evaluation claims. Candidate engines must be tested on real phone recordings before the product can describe any local or cloud result as production-grade.

Future dataset coverage should include:

- real phone microphones rather than only generated buffers;
- quiet indoor single-singer recordings;
- multiple voice ranges and weak-voice examples;
- sustained notes with stable pitch, vibrato, and drift;
- examples that may trigger octave errors or no-pitch decisions;
- metadata sufficient to compare cents error relative to the intended target note;
- separate labels or derived diagnostics for pitch correctness versus sustained pitch instability.

The dataset should support side-by-side evaluation of the current estimator, future Pitchy/Pitchfinder browser baselines, traditional MIR baselines such as aubio/pYIN/Essentia, and future cloud/deep candidates such as CREPE, RMVPE, and SwiftF0-style models. This remains future work only: P7b does not collect recordings, commit audio, upload audio, connect external datasets, add dependencies, change Practice Mode, call AI APIs, add accounts, add persistence, or add formal scoring.

## 16. P7c real phone recording comparison notes

P7c documents how future local-only real phone recordings can support pitch engine comparison without entering the repository. Recordings should be made in a quiet indoor room with one singer, known target notes, multiple vowels, multiple ranges where available, soft and normal volume, stable / vibrato / drift examples, and more than one phone or microphone when available.

Metadata should stay local and non-identifying. Useful fields include sample id, target note, expected frequency, vowel, duration, singer range category, device class, room condition, input distance, volume intent, performance type, engine version or commit SHA, consent status, local-only confirmation, and caveats.

These recordings remain opt-in, local-only, non-blocking, and outside CI. They must not be committed, uploaded, used for formal grades, used for pass/fail labels, connected to persistence, or used to claim production-grade pitch evaluation.

## 18. P7i real phone recording comparison protocol

P7i narrows the next local-only real voice step to quiet indoor real phone recordings for comparing the current in-repository estimator with Pitchy under the same local sample set. The protocol is defined in `docs/real-phone-recording-comparison-protocol.md` and extends the `local-fixtures/real-voice/` convention without committing recordings.

The first local phone set should cover known target notes `C4`, `E4`, `G4`, `A4`, and `C5`, optional lower `A3` / `C3`, vowels `a/e/i/o/u`, durations `1s/3s/5s`, volumes `soft/normal/loud`, performance types `stable/light-vibrato/intentional-drift/no-pitch`, device classes `iphone-safari/android-chrome/laptop-mic`, `quiet-room`, and broad non-identifying singer range labels.

The metadata extension adds local-only comparison fields such as `audioFile`, `targetFrequencyHz`, `browser`, `os`, `microphoneDistanceCm`, `playbackMode`, `roomCondition`, `volume`, `performanceType`, `includeInPitchEngineComparison`, and `expectedBehavior`. These fields are for future reporting-only local comparison, not formal scoring or CI gating.
