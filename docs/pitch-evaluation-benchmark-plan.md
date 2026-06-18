# Pitch Evaluation Benchmark Plan

## 1. Purpose

This document defines the benchmark plan for validating pitch evaluation accuracy in future work.

The current pitch estimate is experimental. It is useful for local MVP exploration and target-aware feedback, but it is not yet a validated scoring system.

Until repeatable benchmarks exist, the product must not claim accurate pitch scoring, formal assessment, or teacher-level evaluation. Product language should describe the feature as an experimental local pitch estimate only.

## 2. Current state

The current browser-local practice prototype includes:

- selected target note
- selected target note playback
- browser local recording
- local audio quality analysis
- experimental pitch estimate
- target-aware pitch comparison
- single-note practice loop card
- all processing browser local-only

This means practice feedback can help users explore a single-note loop, but it should not be treated as a formal assessment result.

## 3. Benchmark principles

Future benchmark work should follow these principles:

- Start with single notes, then intervals, then short melodies.
- Validate pitch before rhythm.
- Start with synthetic or controlled input before real human voice recordings.
- Do not upload user recordings.
- Do not commit real audio files to the repository.
- Do not use samples without ground truth to claim accuracy.

## 4. Evaluation stages

### Stage 1: synthetic single-note benchmark

Use generated tones with known frequencies to validate the basic pitch estimation path. This stage should focus on stable single-note input and clear expected output.

### Stage 2: local controlled single-note recordings

Use documented local manual recordings for selected notes, but keep the files out of the repository. This stage should compare the estimate against known target notes and manually documented recording conditions.

### Stage 3: interval benchmark

Evaluate two-note transitions with known targets. This stage should measure whether the system can detect and compare each note separately before any melody-level scoring claims.

### Stage 4: short melody benchmark

Evaluate short sequences of notes with known target pitches. This stage should remain pitch-focused and should avoid claiming rhythm accuracy until timing alignment is benchmarked separately.

### Stage 5: pitch + timing alignment benchmark

Add onset and timing alignment measurements only after pitch estimation is repeatable. This stage should define how pitch frames map to intended note windows.

### Stage 6: future sight-singing scoring benchmark

Only after pitch and timing benchmarks are reliable should the product define a broader sight-singing scoring benchmark. This future stage may combine pitch accuracy, timing accuracy, confidence, and user-facing feedback quality.

## 5. Metrics

Future benchmark reports should include at least:

- median cents error
- p90 / p95 cents error
- octave error rate
- no-pitch detection rate
- false pitch detection rate
- valid pitch frame ratio
- confidence calibration
- target note classification accuracy
- processing time
- browser compatibility notes

Metrics should be reported separately for synthetic tones, controlled local recordings, intervals, melodies, and any future real-world datasets.

## 6. Tolerance policy

The current MVP display thresholds are:

- `abs(cents) <= 25`: Close to target
- `25 < abs(cents) <= 75`: A little sharp / A little flat
- `abs(cents) > 75`: Far from target

These thresholds are display guidance for the current MVP prototype. They are not final scoring standards, not formal assessment criteria, and not evidence that the pitch estimate is accurate enough for production grading.

## 7. Test data strategy

The benchmark data strategy must protect users, licensing boundaries, and repository hygiene:

- Do not commit real recordings.
- Do not commit user audio.
- Do not commit copyrighted samples.
- Future work may use local-only generated tones.
- Future work may use synthetic sine wave buffers.
- Future work may use documented local manual recordings, but those files must not enter the repository.
- If a public dataset is used, its license must be confirmed before use.

## 8. Manual QA strategy

Manual QA for the current local-only single-note loop should cover:

- select C4/D4/E4/G4
- play selected target note
- record local attempt
- estimate pitch locally
- compare cents from target
- clear and retry
- test quiet recording
- test short recording
- test noisy recording
- repeated playback / recording cleanup

Manual QA findings should distinguish subjective usefulness from measured benchmark accuracy.

## 9. Automated benchmark direction

Future automated benchmark work may add CI-safe tests without committing binary audio files. Possible directions include:

- synthetic `AudioBuffer` fixtures
- generated sine wave input
- known frequency expected output
- no-pitch silent buffer
- noisy synthetic buffer
- future test helper for pitch estimate
- future CI-safe benchmark without binary audio files

This document does not implement those helpers. It only records the intended direction.

## 10. Product accuracy language

Current product language may say:

- experimental local pitch estimate

Current product language must not say:

- accurate pitch scoring
- formal assessment
- voice teacher replacement

Product claims should change only after benchmark results justify the stronger wording and those results are documented.

## 11. Non-goals for this PR

This PR does not include:

- code changes
- algorithm changes
- formal scoring
- rhythm evaluation
- AI API
- audio upload
- audio fixture files
- dependency changes

## 12. Future PR sequence

A safe future sequence is:

1. docs: add pitch benchmark plan
2. code: extract pitch helper only if needed
3. code: add synthetic pitch benchmark helper
4. code: add synthetic no-pitch benchmark
5. code: improve no-pitch / quiet recording feedback
6. code: add confidence display polish
7. docs: record benchmark results before changing product claims
