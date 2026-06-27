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

P3b keeps those exploratory cases non-blocking and adds more detailed diagnostic summary output for estimator analysis. Exploratory pitch diagnostics now include valid/analyzed frame counts, estimated frequency, nearest note, cents offset, confidence, and frame-level pitch min/median/max. The frequency drift diagnostic also prints the configured start frequency, configured end frequency, and estimated frequency together; the vibrato diagnostic prints the base frequency, vibrato depth, vibrato rate, and estimated frequency together. These details are reporting-only and must not affect validation pass/fail, benchmark tolerances, pitch estimator behavior, or the existing clean sine, robustness, and no-pitch blocking gates.

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

P4a keeps the P3a/P3b exploratory cases non-blocking and adds only a minimal frame aggregation robustness step inside the experimental local pitch estimator. The estimator now filters per-frame candidates to a dominant rounded-MIDI cluster before taking the final median when enough frames support that cluster. This is intentionally scoped to frame aggregation / outlier robustness only: it does not rewrite pitch detection, does not change benchmark tolerances or blocking target frequencies, does not promote exploratory cases to blocking, and does not modify `/api/recognize`, recognition providers, Practice Mode workflow, P1/P2 melody behavior, uploads, AI APIs, PDF handling, Audiveris, formal scoring, rhythm evaluation, or sight-singing assessment.

The P4a exploratory observations should be read as diagnostic only. In the recorded run, frequency drift retained fewer dominant-cluster frames but remained outside the start-frequency tolerance, so it is still unresolved. Vibrato improved from 422.09Hz / -71.93 cents to 436.60Hz / -13.44 cents after the octave-spread guard limited late extreme outlier frames, while higher noise and mixed harmonics stayed stable. This means P4a is a small regression-safe aggregation hardening step, not a complete vibrato estimator solution or production accuracy proof.

## 13. P4b frequency drift semantic clarification

The frequency-drift exploratory case is intentionally not promoted to a blocking gate. It remains a generated in-memory diagnostic that drifts from 440.00Hz to 466.16Hz over the sample. P4b clarifies that a single cents error against the starting 440.00Hz target is not enough to describe the intended behavior.

For this case, benchmark output should expose:

- `driftStartFrequencyHz`: the starting 440.00Hz pitch currently used as the historical target.
- `driftMidpointFrequencyHz`: the arithmetic midpoint of the generated linear drift, 453.08Hz.
- `driftExpectedMedianFrequencyHz`: the current semantic median expectation for the linear drift, also 453.08Hz.
- `driftEndFrequencyHz`: the ending 466.16Hz pitch.
- cents offsets against start, midpoint, end, and expected median.

P4c resolves that product-semantics question for the current MVP: the frequency-drift exploratory case should be interpreted as a pitch drift / unstable sustained pitch diagnostic candidate, not as a correct ending-pitch match and not as production pitch accuracy. It remains exploratory only, non-blocking, and excluded from formal scoring. Future work may detect and surface sustained-pitch instability separately from the nearest-note estimate, but that future work should be designed explicitly instead of treating the ending pitch as the product answer.

P4b does not change the estimator algorithm, tolerance, blocking targets, provider boundaries, `/api/recognize`, uploads, AI APIs, Audiveris, real voice datasets, formal pitch scoring, rhythm evaluation, sight-singing assessment, Practice Mode workflow, or P1/P2 melody flow/history behavior.


## 14. P4c frequency drift semantics decision

P4c makes the product semantics explicit for the existing generated in-memory frequency drift case that moves from 440.00Hz to 466.16Hz and currently estimates near the ending pitch. For sustained pitch / single target note practice, this diagnostic must not be interpreted as simply correct because the estimator lands close to the ending pitch. It also must not be packaged as production pitch accuracy, formal scoring, or teacher-level assessment.

The final P4c semantic decision is:

- The case represents a pitch drift / unstable sustained pitch diagnostic.
- The case is exploratory only.
- The case is non-blocking.
- The case is not formal scoring.
- The case does not add a grade, pass, or fail result.
- The case does not change the existing nearest-note estimate behavior.
- Future work may detect and surface sustained-pitch instability separately from the nearest-note estimate.

The current recorded observation remains useful precisely because it shows semantic risk: start 440.00Hz, midpoint / expected median 453.08Hz, end 466.16Hz, estimate 466.73Hz, +102.08 cents vs start, +51.37 cents vs midpoint / expected median, and +2.10 cents vs end. That ending-pitch proximity is diagnostic evidence of drift behavior, not evidence that the sustained target note should be scored as correct.

P4c is documentation-only. It does not modify the pitch estimator algorithm, Practice Mode UI workflow, validation pass/fail logic, benchmark tolerance, existing blocking gates, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, PDF upload, Audiveris, AI API usage, audio upload, real voice datasets, rhythm evaluation, sight-singing assessment, formal scores, grades, pass/fail labels, or production accuracy claims.

## 15. P4d sustained pitch instability diagnostic prototype

P4d adds a diagnostic-only sustained pitch instability prototype on top of the existing frame-level pitch diagnostics. The goal is to make the P4c frequency-drift semantic risk observable without changing the primary nearest-note estimate, current estimated frequency semantics, Practice Mode workflow, or benchmark pass/fail gates.

New diagnostic fields may be reported by local benchmark output:

- `frameFrequencyRangeCents`: cents range between retained frame-level minimum and maximum frequency.
- `firstHalfMedianFrequencyHz`: median retained frame frequency from the first half of retained pitch frames.
- `secondHalfMedianFrequencyHz`: median retained frame frequency from the second half of retained pitch frames.
- `firstToSecondHalfDriftCents`: cents drift from first-half median to second-half median.
- `sustainedPitchInstabilityThresholdCents`: the current diagnostic-only exploratory threshold, set to 50 cents.
- `sustainedPitchInstabilityObserved`: whether `abs(firstToSecondHalfDriftCents)` meets or exceeds that diagnostic-only threshold.

The 50-cent threshold is deliberately documented as a prototype diagnostic threshold only. It is not a tolerance relaxation, not a blocking benchmark gate, not a formal score, and not a user-facing grade/pass/fail. It exists only so generated in-memory exploratory cases can say whether they would be considered unstable by this prototype diagnostic.

P4d must keep all existing blocking gates unchanged. Clean sine, robustness, and no-pitch blocking cases still determine validation pass/fail exactly as before. Exploratory higher-noise, frequency-drift, vibrato, mixed-harmonics, and instability fields remain observation-only.

P4d does not change nearest-note selection behavior, target comparison, Practice Mode UI workflow, formal scoring, rhythm evaluation, sight-singing assessment, tolerance, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, PDF upload, Audiveris integration, AI API usage, audio upload, or real voice datasets.

## 16. P4e consolidated benchmark status

P4e is a documentation-only consolidation of the current P3a through P4d pitch benchmark and diagnostic status. It does not introduce a new algorithm, UI workflow, validation gate, formal score, grade, pass/fail label, rhythm evaluation, sight-singing assessment, audio upload, real voice dataset, AI API, PDF upload, Audiveris integration, `/api/recognize` change, or recognition provider change.

Current blocking validation coverage is limited to generated in-memory synthetic regression and no-pitch behavior:

- Clean sine known-frequency pitch cases are blocking: A3 220Hz, C3 130.81Hz, E3 164.81Hz, A4 440Hz, C4 261.63Hz, E4 329.63Hz, G4 392Hz, C5 523.25Hz, and A5 880Hz.
- Synthetic robustness cases are blocking: A4/C4 quiet amplitude, A4/C4 short duration, and A4/C4 deterministic light-noise variants.
- No-pitch behavior cases are blocking: silent sustained buffer and too-short buffer.
- Blocking gates still use the existing tolerance and existing target frequencies. P4e does not relax tolerance, change blocking target frequencies, or promote any exploratory case.

Current exploratory / non-blocking diagnostics are:

- Higher deterministic noise.
- Frequency drift from 440.00Hz to 466.16Hz.
- Vibrato at A4 440Hz with 35-cent depth and 5Hz rate.
- Mixed harmonics.
- P4d sustained pitch instability fields derived from retained frame-level pitch diagnostics.

P4a improved the vibrato exploratory aggregate in the recorded synthetic run from 422.09Hz / -71.93 cents to 436.60Hz / -13.44 cents by reducing the influence of late extreme frame outliers. This is a useful robustness observation only. Vibrato remains exploratory/non-blocking and should not be described as solved for production singing accuracy.

Frequency drift remains a pitch drift / unstable sustained pitch diagnostic candidate. It is not a pitch correctness case, not an ending-pitch correctness result, not formal scoring, and not production pitch accuracy proof. The current generated drift input remains 440.00Hz to 466.16Hz; P4e does not change that input.

P4d instability diagnostics are reporting-only. `frameFrequencyRangeCents`, first-half / second-half median frequencies, first-to-second-half drift, the 50-cent diagnostic threshold, and `sustainedPitchInstabilityObserved` may help explain exploratory benchmark behavior, but they do not participate in validation pass/fail and are not user-facing grade/pass/fail semantics.

The current benchmark suite is still not production-grade pitch evaluation. It has no real voice dataset, no formal score, no grade, no pass/fail assessment for users, no rhythm evaluation, no sight-singing assessment, and no teacher-level claim. Passing local validation means only that the current synthetic blocking regression gates and boundary checks passed.

Recommended next-step options, none implemented by P4e:

1. Decide whether to continue expanding generated synthetic exploratory cases, while keeping them non-blocking until their semantics are clear.
2. Design a licensed, privacy-safe real voice dataset plan before adding any real recordings; do not add the dataset in the current P4e work.
3. Consider whether sustained pitch instability should later be surfaced in Practice Mode UI, but do not connect P4d diagnostics to UI yet.
4. Start planning formal scoring semantics only after pitch correctness, instability, and real-data validation are better defined; do not add formal scoring now.

## 16. P5a real voice dataset design

P5a adds a design-only real voice dataset plan in `docs/real-voice-dataset-plan.md`. The goal is to prepare future real singing pitch robustness evaluation without collecting recordings, committing audio fixtures, uploading audio, connecting external datasets, changing estimator behavior, or changing user-facing Practice Mode workflow.

The real voice dataset direction should remain separate from current production claims. It is intended for future diagnostic analysis of target note accuracy, expected frequency, singer type or vocal range, recording condition, known caveats, cents error, valid frame rate, confidence, stability, and drift diagnostics. It is not current production accuracy proof, not formal scoring, not a grade/pass/fail system, not rhythm evaluation, and not sight-singing assessment.

The recommended sequence is dataset design, then a small local-only fixture prototype, then validation script extension, then non-blocking result reporting, and only later a possible scoring design if sufficient labeled real voice evidence exists. Existing generated in-memory clean sine, robustness, and no-pitch gates remain unchanged; exploratory cases remain non-blocking; no tolerance is relaxed.

## 15. P7b pitch engine comparison benchmark direction

P7b adds a docs-only evaluation matrix for future pitch-engine choices in `docs/conservatory-level-pitch-evaluation-roadmap.md`. The benchmark implication is that future engine work should compare candidates before changing product claims.

The near-term benchmark sequence should be:

1. Preserve the current in-repo autocorrelation estimator as the baseline.
2. Add a future browser-local candidate comparison, likely Pitchy / McLeod Pitch Method or Pitchfinder YIN / McLeod / AMDF / Dynamic Wavelet, without claiming production-grade accuracy.
3. Keep local results expressed in cents relative to the current target note rather than only note names.
4. Track pitch correctness separately from sustained pitch instability diagnostics such as drift, unstable sustain, and wide vibrato.
5. Evaluate cloud-oriented candidates such as CREPE, RMVPE, SwiftF0-style lightweight models, aubio, pYIN, and Essentia only after privacy, license, and real-recording benchmark requirements are defined.

This P7b benchmark direction is documentation only. It does not install dependencies, connect any candidate engine, change the estimator algorithm, change benchmark pass/fail gates, relax tolerance, promote exploratory cases, modify Practice Mode, upload audio, call AI APIs, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

## 16. P7c local pitch engine comparison design

P7c adds a docs-only design for future local pitch engine comparison in `docs/pitch-engine-comparison-benchmark-design.md`. The design keeps the current in-repository autocorrelation estimator as the baseline and requires any future candidate engine to be compared against that baseline on the same synthetic and local real-recording inputs.

The design separates existing blocking regression categories from exploratory comparison categories. Clean sine, quiet amplitude, short duration, deterministic light noise, and no-pitch / too-short behavior remain aligned with already gated baseline behavior where applicable. Higher noise, mixed harmonics, vibrato, and frequency drift remain exploratory comparison categories until a future PR records evidence and explicitly proposes promotion.

P7c does not change benchmark gates, relax tolerance, modify the estimator algorithm, add dependencies, connect external pitch libraries or models, modify Practice Mode, add recording, upload audio, add scoring, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

## 17. P7d pitch engine comparison harness skeleton

P7d adds a reporting-only pitch engine comparison harness skeleton through `npm run validate:pitch-engine-comparison`. The harness creates a common comparison report shape and currently registers only the current in-repository autocorrelation estimator as the baseline adapter.

The P7d output is separate from the existing synthetic pitch validation gate. It reuses generated in-memory synthetic cases for baseline reporting, but it does not change existing benchmark gates, validation blocker logic, tolerances, target frequencies, no-pitch behavior, or exploratory case status. Exploratory cases remain non-blocking diagnostics only.

The harness is not a production accuracy claim. It does not install or connect Pitchy, Pitchfinder, CREPE, RMVPE, SwiftF0, or any other pitch library/model. It does not execute real phone recording benchmarks, upload audio, add scoring, add grades, add pass/fail labels, evaluate rhythm, or perform sight-singing assessment. Future P7e work may consider one browser-local candidate engine adapter only after separate review.

## 18. P7e browser-local engine candidate review

P7e records a dependency review for browser-local pitch engine candidates before any installation. The review recommends Pitchy / McLeod Pitch Method as the first future P7f adapter candidate for the P7d comparison harness, provided transitive license, bundle, browser, and mobile CPU checks pass. Pitchfinder YIN / McLeod remain later comparison candidates, but the package license metadata is unresolved for future commercial use. Pitchfinder AMDF and Dynamic Wavelet are not preferred for the first cents-trend adapter because their documented tradeoffs are less aligned with fine real-time intonation feedback.

The P7e decision does not change the benchmark plan's evidence standard. Any future adapter must run against the same generated synthetic cases and must preserve no-pitch behavior, octave-error reporting, valid-frame reporting, confidence / clarity caveats, and the separation between pitch correctness and sustained pitch instability. No README claim should be substituted for measured benchmark output.
