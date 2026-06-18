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

| caseName | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| A4 440Hz | 440.00 | 109.98 | -2400.39 | A2 | 1.000 | 20/20 | exploratory failed |
| C4 261.63Hz | 261.63 | 109.01 | -1515.72 | A2 | 1.000 | 20/20 | exploratory failed |
| G4 392Hz | 392.00 | 147.00 | -1698.04 | D3 | 1.000 | 20/20 | exploratory failed |
| E4 329.63Hz | 329.63 | 205.77 | -815.80 | G#3 | 1.000 | 20/20 | exploratory failed |

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch cases, 4 exploratory known-frequency pitch cases.
- Exploratory known-frequency pitch cases failed: 4 cases.
- Exploratory failed cases: A4 440Hz, C4 261.63Hz, G4 392Hz, E4 329.63Hz.
- These exploratory failures are reported for future algorithm work and do not fail this validation command.

## Blocking no-pitch result summary

| no-pitch case | expected behavior | blocking status |
| --- | --- | --- |
| Silent sustained buffer | No usable pitch should be detected. | Passed |
| Too-short buffer | Recording length should be rejected as too short. | Passed |

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

| caseName | targetFrequencyHz | estimatedFrequencyHz | centsError | nearestNote | confidence | frames | status |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| A4 440Hz | 440.00 | 440.00 | 0.00 | A4 | 1.000 | 20/20 | passed |
| C4 261.63Hz | 261.63 | 261.63 | -0.00 | C4 | 1.000 | 20/20 | passed |
| G4 392Hz | 392.00 | 392.00 | -0.00 | G4 | 1.000 | 20/20 | passed |
| E4 329.63Hz | 329.63 | 329.63 | -0.00 | E4 | 1.000 | 20/20 | passed |

Relative to the baseline, all four known-frequency sine-wave cases improved from octave-down / subharmonic estimates to the target notes within the existing 50-cent tolerance. These diagnostics are not production accuracy proof, not formal scoring, and do not prove real singing accuracy.

Summary from the command output:

- Synthetic pitch benchmark validation completed: 2 blocking no-pitch cases, 4 known-frequency pitch cases.
- Known-frequency pitch cases passed: 4/4.
- Blocking no-pitch validation passed: 2/2 cases.

## Blocking no-pitch result summary after improvement

| no-pitch case | expected behavior | blocking status |
| --- | --- | --- |
| Silent sustained buffer | No usable pitch should be detected. | Passed |
| Too-short buffer | Recording length should be rejected as too short. | Passed |

The no-pitch cases remain a blocking validation gate. Because the A4/C4/G4/E4 synthetic pitch cases now pass honestly after PR #111, they are now promoted to a blocking synthetic pitch regression gate. No tolerance was relaxed, and the target frequencies were not changed. This remains synthetic regression validation only, not production accuracy proof and not formal scoring.
