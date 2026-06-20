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

Synthetic pitch benchmark support has started with CI-safe generated `Float32Array` sine-wave buffers that can exercise the extracted pitch estimate helper without committing binary audio fixtures. Synthetic no-pitch benchmark support has also started for validating expected failure behavior only. A default synthetic benchmark suite now has a runnable baseline-safe validation command through `npm run validate:synthetic-pitch-benchmark`. Current baseline results are recorded in `docs/pitch-evaluation-benchmark-results.md`.

The default known-frequency pitch cases include A3 220Hz, C3 130.81Hz, E3 164.81Hz, A4 440Hz, C4 261.63Hz, E4 329.63Hz, G4 392Hz, C5 523.25Hz, and A5 880Hz. After PR #111, the A4/C4/G4/E4 synthetic sine-wave cases passed honestly within the existing 50-cent tolerance. After PR #116, the added A3/C3/E3/C5/A5 extended synthetic diagnostics also passed in an actual validation run. Because those extended cases were already passing, they are now promoted from extended exploratory diagnostics to blocking synthetic pitch regression cases. No tolerance was relaxed and no target frequencies were changed. If any A3/C3/E3/A4/C4/E4/G4/C5/A5 case regresses, `npm run validate:synthetic-pitch-benchmark` should exit 1. The validation command still prints concise pitch diagnostics for each known-frequency case, including target frequency, estimated frequency, cents error, nearest note, confidence, valid/analyzed frame counts, and pass/fail status. This is a synthetic regression gate only; it is not production accuracy proof, not formal scoring, and does not prove real singing accuracy.

The default no-pitch cases include a silent sustained buffer and a too-short buffer. These no-pitch cases remain blocking: `npm run validate:synthetic-pitch-benchmark` should exit 1 for known-frequency pitch regression failures, no-pitch failures, script exceptions, or compilation failures, and it should exit 0 when A3/C3/E3/A4/C4/E4/G4/C5/A5 and the no-pitch blocking cases all pass. Benchmark results should be recorded before algorithm changes so estimator improvements can be compared against a documented baseline. The first estimator improvement focused specifically on autocorrelation peak selection: normalized lag correlation, choosing the earliest strong local maximum, and reducing the synthetic sine-wave subharmonic / octave-down errors shown in the baseline. The validation uses generated in-memory buffers, commits no binary audio fixtures, and does not establish production accuracy claims. Passing `npm run validate:synthetic-pitch-benchmark` is only an early CI-safe synthetic regression gate plus no-pitch behavior gate, not formal scoring evidence.

The PR #116 extended synthetic pitch diagnostics added generated in-memory sine-wave cases for A3 220Hz, C3 130.81Hz, E3 164.81Hz, C5 523.25Hz, and A5 880Hz. Those cases passed in the actual PR #116 validation run and are now blocking synthetic pitch regression cases rather than exploratory/non-blocking diagnostics. This expands the regression gate only; it is still not production accuracy proof, not formal scoring, and does not prove real singing accuracy.

P3a adds a small exploratory/non-blocking synthetic diagnostic layer for more complex generated audio conditions: higher deterministic noise, frequency drift, vibrato, and mixed harmonics. These cases are clearly printed as exploratory diagnostics by `npm run validate:synthetic-pitch-benchmark`; they can pass or appear outside the existing tolerance without changing the command exit code. They are intentionally not promoted to blocking gates, do not relax any existing tolerance, do not change any existing blocking target frequency, and do not remove any clean sine, robustness, or no-pitch blocking case. The observations are intended to guide future estimator work only and must not be described as production accuracy, formal scoring, or real singing accuracy proof.

Robustness synthetic pitch variants cover quiet amplitude, short duration, and deterministic light-noise conditions for A4 and C4. After PR #118, the six added robustness diagnostics passed in an actual validation run, so they are now promoted from exploratory/non-blocking diagnostics to blocking synthetic robustness regression cases. No tolerance was relaxed, and no robustness target frequency, duration, amplitude, or noiseAmount was changed for the promotion. The validation command prints target frequency, estimate, cents error, nearest note, confidence, frame counts, and status for these blocking robustness cases. If any robustness blocking pitch case regresses, `npm run validate:synthetic-pitch-benchmark` should exit 1. This remains generated in-memory synthetic regression coverage only; it is not production accuracy proof, not formal scoring, and does not prove real singing accuracy. The existing clean sine A3/C3/E3/A4/C4/E4/G4/C5/A5 pitch cases remain blocking, and the silent sustained plus too-short no-pitch cases remain blocking.

The no-pitch direction generates silent buffers and too-short buffers in memory, so no binary audio fixtures are committed. Silent sustained buffers validate the no usable pitch frames path, and too-short buffers validate the recording length error path. This support is infrastructure only: it validates no-pitch failure behavior, does not change pitch estimation, and does not establish production scoring accuracy.

Future automated benchmark work may add more CI-safe tests without committing binary audio files. Possible directions include:

- minimal buffer-like synthetic fixtures compatible with browser `AudioBuffer` usage
- generated `Float32Array` sine-wave input
- known frequency expected output
- no-pitch silent buffer
- too-short no-pitch buffer
- noisy synthetic buffer
- generated in-memory blocking synthetic robustness regression cases for amplitude, duration, and deterministic light-noise variants
- future test helper for pitch estimate
- future CI-safe benchmark without binary audio files

This document now records the synthetic helper direction while keeping benchmark output separate from product accuracy claims.

## 10. Product accuracy language

Current product language may say:

- experimental local pitch estimate

Current product language must not say:

- accurate pitch scoring
- formal assessment
- voice teacher replacement

Product claims should change only after benchmark results justify the stronger wording and those results are documented.

## 11. Non-goals for this benchmark work

The current small estimator improvement is benchmark-guided and limited to autocorrelation peak selection for synthetic subharmonic errors. Its results are compared against the documented baseline in `docs/pitch-evaluation-benchmark-results.md`. This benchmark work still does not include:

- production pitch accuracy claims
- formal scoring
- rhythm evaluation
- AI API
- audio upload
- audio fixture files
- dependency changes

## 12. Future PR sequence

A safe future sequence is:

1. docs: add pitch benchmark plan
2. code: extract pitch helper only if needed (started by extracting the local pitch estimate helper)
3. code: add synthetic pitch benchmark helper (started with generated `Float32Array` sine-wave buffers and no binary audio fixtures)
4. code: add synthetic no-pitch benchmark (started with in-memory silent and too-short buffers; validates expected no-pitch failure behavior only)
5. code: add default synthetic benchmark suite (started with A4/C4/G4/E4 known-frequency cases plus silent and too-short no-pitch cases; infrastructure only with no production accuracy claims and no binary audio fixtures)
6. code: add runnable synthetic pitch benchmark validation command (started with `npm run validate:synthetic-pitch-benchmark`; uses generated in-memory buffers, commits no binary audio fixtures, and remains an early CI-safe gate rather than proof of production accuracy)
7. code: improve no-pitch / quiet recording feedback
8. code: add confidence display polish
9. docs: record benchmark results before changing product claims
10. code: improve autocorrelation peak selection for synthetic subharmonic / octave-down pitch errors
11. code: promote passing A4/C4/G4/E4 synthetic known-frequency cases to blocking regression cases while keeping no-pitch cases blocking
12. code: add extended generated in-memory synthetic pitch diagnostics as exploratory/non-blocking coverage
13. code: promote the passing PR #116 A3/C3/E3/C5/A5 extended diagnostics to blocking synthetic pitch regression cases without relaxing tolerance or changing target frequencies
14. code: add generated in-memory synthetic robustness diagnostics for amplitude, duration, and deterministic light-noise variants as exploratory/non-blocking coverage
15. code: promote the passing PR #118 A4/C4 robustness diagnostics to blocking synthetic robustness regression cases without relaxing tolerance or changing target frequency, duration, amplitude, or noiseAmount
