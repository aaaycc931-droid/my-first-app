# Synthetic pitch benchmark baseline results

## Date

2026-06-18

## Command run

```bash
npm run validate:synthetic-pitch-benchmark
```

These results are a baseline snapshot from the current synthetic pitch benchmark before future pitch estimator work. They were copied from an actual local run of the command above, not hand-written from expected values.

This baseline is not production accuracy proof and is not formal scoring. The known-frequency pitch case failures are diagnostic signals for future estimator work. No audio fixtures were committed; the benchmark uses generated in-memory buffers.

## Benchmark interpretation

- A4/C4/G4/E4 known-frequency pitch cases are exploratory and non-blocking.
- Silent sustained buffer and too-short buffer no-pitch cases are the current blocking validation gate.
- The command exits successfully when only exploratory known-frequency pitch cases fail.
- Blocking no-pitch failures, script exceptions, or compilation failures should fail the validation command.

## Known-frequency exploratory pitch diagnostics

| caseName    | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status             |
| ----------- | ----------------: | -------------------: | ---------: | ----------- | ---------: | ------ | ------------------ |
| A4 440Hz    |            440.00 |               109.98 |   -2400.39 | A2          |      1.000 | 20/20  | exploratory failed |
| C4 261.63Hz |            261.63 |               109.01 |   -1515.72 | A2          |      1.000 | 20/20  | exploratory failed |
| G4 392Hz    |            392.00 |               147.00 |   -1698.04 | D3          |      1.000 | 20/20  | exploratory failed |
| E4 329.63Hz |            329.63 |               205.77 |    -815.80 | G#3         |      1.000 | 20/20  | exploratory failed |

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch cases, 4 exploratory known-frequency pitch cases.
- Exploratory known-frequency pitch cases failed: 4 cases.
- Exploratory failed cases: A4 440Hz, C4 261.63Hz, G4 392Hz, E4 329.63Hz.
- These exploratory failures are reported for future algorithm work and do not fail this validation command.

## Blocking no-pitch result summary

| no-pitch case           | expected behavior                                 | blocking status |
| ----------------------- | ------------------------------------------------- | --------------- |
| Silent sustained buffer | No usable pitch should be detected.               | Passed          |
| Too-short buffer        | Recording length should be rejected as too short. | Passed          |

Blocking no-pitch validation passed: 2/2 cases.

## Boundaries for this baseline

This documentation-only baseline does not change:

- pitch estimate algorithm
- confidence calculation
- target comparison algorithm
- UI behavior
- validation behavior
- formal scoring behavior
- rhythm evaluation behavior
- AI API behavior
- audio upload behavior
- provider behavior
- dependencies
- `/api/recognize`
- Audiveris behavior

## After autocorrelation peak selection improvement

## Date

2026-06-18

## Command run

```bash
npm run validate:synthetic-pitch-benchmark
```

These results were recorded after a small experimental pitch estimator change focused on autocorrelation peak selection. The documented baseline above is preserved for comparison. This run still uses generated in-memory synthetic buffers only; it does not add audio fixtures, formal scoring, production accuracy claims, rhythm evaluation, AI calls, uploads, UI changes, provider changes, dependency changes, `/api/recognize` changes, or Audiveris changes.

## Known-frequency pitch diagnostics after improvement

| caseName    | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status |
| ----------- | ----------------: | -------------------: | ---------: | ----------- | ---------: | ------ | ------ |
| A4 440Hz    |            440.00 |               440.00 |       0.00 | A4          |      1.000 | 20/20  | passed |
| C4 261.63Hz |            261.63 |               261.63 |      -0.00 | C4          |      1.000 | 20/20  | passed |
| G4 392Hz    |            392.00 |               392.00 |      -0.00 | G4          |      1.000 | 20/20  | passed |
| E4 329.63Hz |            329.63 |               329.63 |      -0.00 | E4          |      1.000 | 20/20  | passed |

Relative to the baseline, all four known-frequency sine-wave cases improved from octave-down / subharmonic estimates to the target notes within the existing 50-cent tolerance. These diagnostics are not production accuracy proof, not formal scoring, and do not prove real singing accuracy.

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch cases, 4 known-frequency pitch cases.
- Known-frequency pitch cases passed: 4/4.
- Blocking no-pitch validation passed: 2/2 cases.

## Blocking no-pitch result summary after improvement

| no-pitch case           | expected behavior                                 | blocking status |
| ----------------------- | ------------------------------------------------- | --------------- |
| Silent sustained buffer | No usable pitch should be detected.               | Passed          |
| Too-short buffer        | Recording length should be rejected as too short. | Passed          |

The no-pitch cases remain a blocking validation gate. Because the A4/C4/G4/E4 synthetic pitch cases now pass honestly after PR #111, they are now promoted to a blocking synthetic pitch regression gate. No tolerance was relaxed, and the target frequencies were not changed. This remains synthetic regression validation only, not production accuracy proof and not formal scoring.

## Extended exploratory synthetic pitch diagnostics

## Date

2026-06-18

## Command run

```bash
npm run validate:synthetic-pitch-benchmark
```

These extended diagnostics were copied from an actual local run of the command above. They use generated in-memory sine buffers only. They are exploratory, non-blocking diagnostics for wider synthetic pitch coverage and are intended to guide future estimator work. They are not product failures, not production accuracy proof, not formal scoring, and not proof of real singing accuracy.

The A4/C4/G4/E4 cases remain blocking synthetic pitch regression cases, and the silent sustained plus too-short no-pitch cases remain blocking. Extended exploratory failures do not affect the command exit code.

| caseName    | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status |
| ----------- | ----------------: | -------------------: | ---------: | ----------- | ---------: | ------ | ------ |
| A3 220Hz    |            220.00 |               220.00 |       0.00 | A3          |      1.000 | 20/20  | passed |
| C3 130.81Hz |            130.81 |               130.81 |       0.00 | C3          |      1.000 | 20/20  | passed |
| E3 164.81Hz |            164.81 |               164.81 |      -0.00 | E3          |      1.000 | 20/20  | passed |
| C5 523.25Hz |            523.25 |               523.25 |       0.00 | C5          |      1.000 | 20/20  | passed |
| A5 880Hz    |            880.00 |               880.00 |       0.00 | A5          |      1.000 | 20/20  | passed |

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch cases, 4 blocking synthetic known-frequency pitch regression cases, 5 extended exploratory pitch diagnostic cases.
- Blocking synthetic pitch regression cases passed: 4/4.
- Blocking no-pitch validation passed: 2/2 cases.
- Extended exploratory pitch diagnostics do not affect the exit code.

## Promotion note after PR #116 extended diagnostics

The passing A3 220Hz, C3 130.81Hz, E3 164.81Hz, C5 523.25Hz, and A5 880Hz extended synthetic cases above are now promoted to the blocking synthetic pitch regression gate. This promotion only expands synthetic regression coverage; it is not production accuracy proof, not formal scoring, and does not prove real singing accuracy.

No tolerance was relaxed. The synthetic pitch tolerance remains 50 cents, and the target frequencies were not changed.

## Robustness exploratory synthetic pitch diagnostics

## Date

2026-06-18

## Command run

```bash
npm run validate:synthetic-pitch-benchmark
```

These robustness diagnostics were copied from an actual local run of the command above. They use generated in-memory buffers only. The diagnostics cover quiet amplitude, short duration, and deterministic light-noise variants for A4 and C4. At PR #118 time they were recorded as diagnostics before promotion. They are not product failures, not production accuracy proof, not formal scoring, and not proof of real singing accuracy.

The A3/C3/E3/A4/C4/E4/G4/C5/A5 clean sine cases remain blocking synthetic pitch regression cases. The silent sustained and too-short no-pitch cases remain blocking. The promotion note below records their current blocking synthetic robustness regression status.

| caseName                              | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status |
| ------------------------------------- | ----------------: | -------------------: | ---------: | ----------- | ---------: | ------ | ------ |
| A4 440Hz quiet amplitude 0.05         |            440.00 |               440.00 |       0.00 | A4          |      1.000 | 20/20  | passed |
| C4 261.63Hz quiet amplitude 0.05      |            261.63 |               261.63 |      -0.00 | C4          |      1.000 | 20/20  | passed |
| A4 440Hz short duration 0.5s          |            440.00 |               440.00 |       0.00 | A4          |      1.000 | 9/9    | passed |
| C4 261.63Hz short duration 0.5s       |            261.63 |               261.63 |      -0.00 | C4          |      1.000 | 9/9    | passed |
| A4 440Hz deterministic light noise    |            440.00 |               440.02 |       0.06 | A4          |      1.000 | 20/20  | passed |
| C4 261.63Hz deterministic light noise |            261.63 |               261.64 |       0.04 | C4          |      1.000 | 20/20  | passed |

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch case(s), 9 blocking synthetic known-frequency pitch regression case(s), 6 robustness exploratory pitch diagnostic case(s).
- Blocking synthetic pitch regression cases passed: 9/9.
- Blocking no-pitch validation passed: 2/2 case(s).
- The promotion note below records that these passing robustness cases are now blocking synthetic robustness regression cases.

## Robustness promotion note

The six passing PR #118 robustness cases are now promoted to the blocking synthetic robustness regression gate. A4/C4 quiet amplitude, A4/C4 short duration, and A4/C4 deterministic light-noise variants now fail `npm run validate:synthetic-pitch-benchmark` if they regress.

No tolerance was relaxed. The robustness target frequencies, durations, amplitudes, and deterministic noise amounts were not changed. These cases remain generated in-memory only; no audio fixtures were added. This is not production accuracy proof, not formal scoring, and does not prove real singing accuracy.

## P3a exploratory synthetic pitch cases — 2026-06-20

Command:

```bash
npm run validate:synthetic-pitch-benchmark
```

Scope:

- Added four generated in-memory exploratory/non-blocking synthetic pitch diagnostics: higher noise, frequency drift, vibrato, and mixed harmonics.
- Existing clean sine, robustness, and no-pitch cases remain blocking regression gates.
- Exploratory diagnostics are observation-only and do not affect the validation exit code.
- No real voice dataset, AI API, uploaded audio, `/api/recognize`, recognition provider union, PDF upload, or Audiveris integration was added.

Observed exploratory diagnostics from the local run:

- Higher noise: A4 440Hz with deterministic higher noise estimated 440.32Hz, +1.27 cents, nearest note A4, confidence 1.000, 20/20 valid frames.
- Frequency drift: A4 drift from 440Hz to 466.16Hz estimated 465.51Hz, +97.58 cents against the starting target, nearest note A#4, confidence 1.000, 20/20 valid frames.
- Vibrato: A4 440Hz with 35-cent 5Hz vibrato estimated 422.09Hz, -71.93 cents, nearest note G#4, confidence 1.000, 20/20 valid frames.
- Mixed harmonics: A4 440Hz with second and third harmonics estimated 440.00Hz, +0.00 cents, nearest note A4, confidence 1.000, 20/20 valid frames.

These observations are synthetic diagnostics only. They are not production accuracy claims, formal scoring evidence, or proof of real singing accuracy.

## P3b exploratory pitch benchmark diagnostics — 2026-06-21

Command:

```bash
npm run validate:synthetic-pitch-benchmark
```

Scope:

- Enhanced the generated in-memory exploratory/non-blocking benchmark output with diagnostic fields for valid/analyzed frame count, estimated frequency, nearest note, cents offset, confidence, and frame-level pitch min/median/max.
- Added exploratory-only condition details so the frequency drift case prints its start frequency, end frequency, and estimated frequency together, and the vibrato case prints its base frequency, vibrato depth, vibrato rate, and estimated frequency together.
- Existing clean sine, robustness, and no-pitch cases remain blocking regression gates. Exploratory cases remain observation-only and do not affect validation pass/fail.
- No tolerance was relaxed, no pitch estimator algorithm was changed, no real voice dataset or audio fixture was added, and no AI/API/upload/provider/Audiveris boundary was changed.

Observed exploratory diagnostics from the local run:

| exploratory case | estimated frequency | nearest note | cents offset | confidence | valid frames | frame min | frame median | frame max | condition detail | exploratory status |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| A4 440Hz exploratory higher noise | 440.32Hz | A4 | +1.27 | 1.000 | 20/20 | 438.18Hz | 440.32Hz | 441.21Hz | deterministic higher noise | passed |
| A4 exploratory frequency drift 440Hz to 466.16Hz | 465.51Hz | A#4 | +97.58 | 1.000 | 20/20 | 442.44Hz | 465.51Hz | 488.60Hz | start 440.00Hz → end 466.16Hz → estimate 465.51Hz | observed outside tolerance |
| A4 440Hz exploratory vibrato 35 cents at 5Hz | 422.09Hz | G#4 | -71.93 | 1.000 | 20/20 | 196.17Hz | 422.09Hz | 602.57Hz | base 440.00Hz, depth 35 cents, rate 5Hz → estimate 422.09Hz | observed outside tolerance |
| A4 440Hz exploratory mixed harmonics | 440.00Hz | A4 | +0.00 | 1.000 | 20/20 | 440.00Hz | 440.00Hz | 440.00Hz | second and third harmonics | passed |

Diagnostic observations:

- The frequency drift case's median estimate is close to the configured end frequency and outside the 50-cent comparison to the start frequency, which reinforces why this case remains exploratory/non-blocking.
- The vibrato case shows a wide frame-level pitch spread and a median below the base frequency, which makes it useful for future estimator behavior analysis without changing validation pass/fail.
- Higher noise and mixed harmonics remained near A4 in this run, but they are still exploratory diagnostics rather than production accuracy proof.

## P4a vibrato frame outlier robustness — 2026-06-21

Command:

```bash
npm run validate:synthetic-pitch-benchmark
```

Scope:

- Added a minimal pitch estimator frame aggregation hardening step that filters per-frame frequency candidates to the strongest rounded-MIDI cluster before computing the aggregate median.
- Existing clean sine, robustness, and no-pitch cases remain blocking regression gates.
- Exploratory diagnostics remain observation-only and do not affect validation pass/fail.
- No tolerance was relaxed, no blocking target frequency was changed, no exploratory input case was changed, and no exploratory case was promoted to blocking.
- No real voice dataset, audio fixture, uploaded audio, AI API, `/api/recognize`, recognition provider union, PDF upload, Audiveris integration, rhythm evaluation, formal pitch scoring, sight-singing assessment, Practice Mode UI workflow, or P1/P2 melody flow/history behavior was added or changed.

Before/after exploratory observations:

| exploratory case | before estimate | before frames | before frame min/median/max | after estimate | after frames | after frame min/median/max | observation |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| A4 exploratory frequency drift 440Hz to 466.16Hz | 465.51Hz (+97.58 cents) | 20/20 | 442.44Hz / 465.51Hz / 488.60Hz | 466.73Hz (+102.08 cents) | 15/20 | 449.72Hz / 466.73Hz / 483.75Hz | The robust aggregation narrows the retained frame spread around the dominant pitch cluster; this case remains exploratory and outside the start-frequency tolerance. |
| A4 440Hz exploratory vibrato 35 cents at 5Hz | 422.09Hz (-71.93 cents) | 20/20 | 196.17Hz / 422.09Hz / 602.57Hz | 436.60Hz (-13.44 cents) | 10/20 | 396.04Hz / 436.60Hz / 515.54Hz | The octave-spread guard reduces the influence of late extreme outlier frames and improves the vibrato exploratory aggregate by 58.49 absolute cents while keeping the case exploratory/non-blocking. |

Blocking gate result from the same run:

- Clean sine blocking pitch regression cases passed: 9/9.
- Robustness blocking pitch regression cases passed: 6/6.
- Blocking no-pitch validation passed: 2/2.

These observations are synthetic diagnostics only. They are not production accuracy claims, formal scoring evidence, rhythm evaluation, sight-singing assessment, or proof of real singing accuracy.

## P4b frequency drift benchmark semantics investigation — 2026-06-21

Command:

```bash
npm run validate:synthetic-pitch-benchmark
```

Scope:

- Clarified the generated in-memory frequency-drift exploratory diagnostic semantics without changing the pitch estimator algorithm.
- Kept the frequency-drift case non-blocking and observation-only.
- Kept the drift input itself as the existing 440.00Hz to 466.16Hz generated case; only semantic metadata and benchmark output were added.
- Added explicit start, midpoint / expected median, and end comparisons so future P4c accuracy work can decide whether the intended target should be start pitch, ending pitch, median / average pitch, or an unstable-pitch classification.
- Did not relax tolerance, promote frequency drift, change blocking targets, modify `/api/recognize`, change providers, add uploads, add Audiveris, add AI APIs, add real voice data, add formal pitch scoring, add rhythm evaluation, or change Practice Mode / melody workflow behavior.

Observed frequency-drift diagnostic from the local run:

| caseName | startFrequencyHz | midpointFrequencyHz | expectedMedianFrequencyHz | endFrequencyHz | estimatedFrequencyHz | centsVsStart | centsVsMidpoint | centsVsEnd | centsVsExpectedMedian | nearestNote | confidence | frames | status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |
| A4 exploratory frequency drift 440Hz to 466.16Hz | 440.00 | 453.08 | 453.08 | 466.16 | 466.73 | +102.08 | +51.37 | +2.10 | +51.37 | A#4 | 0.750 | 15/20 | observed-outside-tolerance |

Semantic observation:

- Against the historical starting-frequency target, the estimate remains outside the existing 50-cent tolerance at +102.08 cents.
- Against the linear midpoint / expected median frequency of 453.08Hz, the estimate is still slightly outside the same tolerance at +51.37 cents.
- Against the ending frequency of 466.16Hz, the estimate is very close at +2.10 cents.
- Therefore this diagnostic currently appears ending-pitch-biased after P4a frame aggregation, but P4b intentionally does not define that as correct or incorrect. It only makes the semantics visible so a later P4c can choose the intended behavior.

This P4b result remains exploratory and is not production accuracy proof, not formal scoring, and not evidence of real singing accuracy.


## P4c frequency drift semantics decision — 2026-06-25

P4c does not rerun or reinterpret the frequency-drift exploratory case as a production pitch-accuracy result. It records the product decision for the existing P4b observation:

| caseName | startFrequencyHz | midpoint / expected median Hz | endFrequencyHz | estimatedFrequencyHz | centsVsStart | centsVsMidpoint / expectedMedian | centsVsEnd | product semantic | validation role |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| A4 exploratory frequency drift 440Hz to 466.16Hz | 440.00 | 453.08 | 466.16 | 466.73 | +102.08 | +51.37 | +2.10 | pitch drift / unstable sustained pitch diagnostic candidate | exploratory, non-blocking, not formal scoring |

Decision:

- The estimate being close to the ending 466.16Hz pitch is not treated as sustained-note correctness.
- The case is not promoted to a blocking benchmark gate.
- The case is not a grade, pass/fail label, formal score, production pitch-accuracy claim, rhythm evaluation, or sight-singing assessment.
- Future work may add explicit instability detection and user-facing drift feedback separately from the nearest-note estimate, but P4c does not implement that behavior.

Boundaries confirmed for this result update: no pitch estimator algorithm change, no Practice Mode UI workflow change, no validation pass/fail change, no tolerance change, no blocking target frequency change, no frequency drift input change, no `/api/recognize` change, no recognition provider union change, no PDF upload, no Audiveris integration, no AI API usage, no audio upload, and no real voice dataset.

## P4d sustained pitch instability diagnostic prototype — 2026-06-26

Command:

```bash
npm run validate:synthetic-pitch-benchmark
```

Scope:

- Added reporting-only sustained pitch instability diagnostic fields based on retained frame-level pitch diagnostics.
- Kept nearest-note estimate selection and current estimated frequency aggregation unchanged.
- Kept the existing frequency-drift input unchanged at 440.00Hz to 466.16Hz.
- Kept clean sine, robustness, and no-pitch blocking validation pass/fail logic unchanged.
- Kept exploratory diagnostics non-blocking and observation-only.
- Did not change Practice Mode UI workflow, add formal scoring, add grade/pass/fail labels, add rhythm evaluation, add sight-singing assessment, change `/api/recognize`, change recognition providers, add PDF upload, connect Audiveris, call AI APIs, upload audio, or add real voice data.

Observed sustained pitch instability diagnostics from the local run:

| exploratory case | estimated frequency | nearest note | frames | frame range cents | first-half median | second-half median | first-to-second drift | diagnostic threshold | instability observed | exploratory status |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| A4 440Hz exploratory higher noise | 440.32Hz | A4 | 20/20 | 11.94 | 440.32Hz | 440.36Hz | +0.13 cents | 50.00 cents | false | passed |
| A4 exploratory frequency drift 440Hz to 466.16Hz | 466.73Hz | A#4 | 15/20 | 126.26 | 457.02Hz | 475.24Hz | +67.67 cents | 50.00 cents | true | observed-outside-tolerance |
| A4 440Hz exploratory vibrato 35 cents at 5Hz | 436.60Hz | A4 | 10/20 | 456.52 | 442.52Hz | 420.97Hz | -86.45 cents | 50.00 cents | true | passed |
| A4 440Hz exploratory mixed harmonics | 440.00Hz | A4 | 20/20 | 0.01 | 440.00Hz | 440.00Hz | +0.00 cents | 50.00 cents | false | passed |

Diagnostic observations:

- The frequency-drift case is flagged by the prototype diagnostic because the retained first-half median is 457.02Hz, the retained second-half median is 475.24Hz, and the first-to-second-half drift is +67.67 cents, exceeding the reporting-only 50-cent threshold.
- The same frequency-drift case still estimates near the ending pitch at 466.73Hz and remains +102.08 cents vs the starting 440.00Hz target, +51.37 cents vs the midpoint / expected median, and +2.10 cents vs the ending 466.16Hz pitch. This continues to support the P4c interpretation: it is an unstable sustained pitch diagnostic candidate, not an ending-pitch correctness result.
- The vibrato exploratory case also crosses the prototype first-half / second-half drift threshold, showing that the prototype diagnostic can identify instability-like frame behavior beyond simple linear drift. This remains exploratory and is not a formal score or pass/fail result.
- Higher noise and mixed harmonics do not cross the prototype threshold in this run.

These observations are generated in-memory synthetic diagnostics only. They are not production accuracy claims, formal scoring evidence, rhythm evaluation, sight-singing assessment, or proof of real singing accuracy.

## P4e consolidated current benchmark status — 2026-06-26

P4e consolidates the current status after P3a, P3b, P4a, P4b, P4c, and P4d. This section is documentation-only and does not record a new algorithm change or a new benchmark feature.

Current validation role summary:

| area | current role | notes |
| --- | --- | --- |
| Clean sine A3/C3/E3/A4/C4/E4/G4/C5/A5 | Blocking synthetic pitch regression gate | Existing 50-cent tolerance and existing target frequencies remain unchanged. |
| A4/C4 quiet amplitude, short duration, deterministic light-noise robustness cases | Blocking synthetic robustness regression gate | Existing robustness inputs remain unchanged. |
| Silent sustained and too-short buffers | Blocking no-pitch behavior gate | Expected no-usable-pitch and too-short behavior remain blocking. |
| Higher deterministic noise | Exploratory / non-blocking diagnostic | Reporting only; does not affect validation pass/fail. |
| Frequency drift 440.00Hz → 466.16Hz | Exploratory / non-blocking unstable sustained pitch diagnostic candidate | Not a pitch correctness case and not ending-pitch correctness. |
| Vibrato 35 cents at 5Hz | Exploratory / non-blocking diagnostic | P4a improved the recorded aggregate, but this remains non-blocking and not production proof. |
| Mixed harmonics | Exploratory / non-blocking diagnostic | Reporting only; does not affect validation pass/fail. |
| P4d sustained pitch instability fields | Reporting-only exploratory diagnostics | Not validation logic, not formal scoring, and not UI pass/fail semantics. |

Current P4a/P4d exploratory observations to preserve:

- Vibrato improved after P4a from 422.09Hz / -71.93 cents to 436.60Hz / -13.44 cents in the recorded generated benchmark run. This is an outlier-robustness improvement, not a production-grade vibrato solution.
- Frequency drift remains semantically unstable: the generated input still moves from 440.00Hz to 466.16Hz, estimates near the ending pitch at 466.73Hz, and is interpreted as a pitch drift / unstable sustained pitch diagnostic candidate rather than a correct sustained-note result.
- P4d reports instability fields such as frame range, first-half median, second-half median, first-to-second-half drift, a diagnostic-only 50-cent threshold, and `sustainedPitchInstabilityObserved`. These fields explain behavior only and do not change exit status.

Current limitations:

- No production-grade pitch evaluation claim.
- No real voice dataset.
- No formal score, grade, pass, or fail.
- No rhythm evaluation or sight-singing assessment.
- No Practice Mode UI integration for instability diagnostics.
- No changed blocking gates, tolerance, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, uploads, Audiveris, AI API, or audio handling.

Recommended next-step options, not implemented here:

1. Continue synthetic exploration only if each case remains clearly labeled as blocking or exploratory.
2. Draft a real voice dataset design before adding any real recordings or claiming singing accuracy.
3. Decide whether instability diagnostics should become user-facing Practice Mode feedback in a future PR.
4. Begin formal scoring planning only after correctness semantics and validation data are stronger.
