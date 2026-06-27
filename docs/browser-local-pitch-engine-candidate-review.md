# P7e / P7f Browser-local Pitch Engine Candidate Review

## P7f dependency review result

P7f reviewed and installed only the `pitchy` candidate dependency as the first browser-local comparison adapter candidate.

| Package | Installed version | Relationship | License | Review status |
| --- | --- | --- | --- | --- |
| `pitchy` | 4.1.0 | Candidate pitch engine | MIT | Accepted for comparison-only adapter |
| `fft.js` | 4.0.4 | Direct dependency of `pitchy` | MIT | Accepted as direct dependency |

Package metadata reviewed before integration:

- `pitchy@4.1.0` declares `type: "module"`, `main: "index.js"`, `types: "index.d.ts"`, and package exports for the default module plus package metadata.
- `pitchy@4.1.0` is ESM-only. The comparison harness loads it with dynamic `import("pitchy")` so the repository's NodeNext validation command can compile and run without converting the app to ESM.
- `pitchy` exposes `PitchDetector.forFloat32Array(inputLength)` and `findPitch(input, sampleRate)`, returning `[frequencyHz, clarity]`.
- `fft.js@4.0.4` declares MIT license and no runtime dependencies in the installed package metadata.

No unresolved license risk was found for the installed `pitchy` and direct `fft.js` dependency metadata. This review is limited to the installed npm package metadata and basic TypeScript / Node validation used by the comparison harness; it is not a full legal review.

## P7f adapter status

P7f connects `pitchy` as a comparison-only adapter with engine id `pitchy-mcleod` and label `Pitchy / McLeod Pitch Method`. The current in-repository autocorrelation estimator remains the baseline engine and remains unchanged.

The adapter maps Pitchy output as follows:

- detected frequency maps to `estimatedFrequencyHz`
- Pitchy's clarity maps to `clarity`, `confidence`, and `voicing` for reporting only
- no detected pitch maps to `noPitch: "no-pitch"`
- unavailable frame diagnostics remain empty / unavailable rather than being fabricated

## Boundaries

Pitchy is not a production replacement in P7f. It is not used by Practice Mode UI, Practice Mode workflow, user pages, `/api/recognize`, recognition providers, real-time recording, pitch trend charts, cloud assessment, formal scoring, grade/pass/fail labels, rhythm evaluation, or sight-singing assessment.

The P7f output is reporting-only. It is not a professional accuracy claim, not formal scoring, not a benchmark gate change, and not conservatory-grade assessment.

## Current evidence gaps

P7f still has no real phone recording benchmark, no mobile Safari performance conclusion, no Android Chrome performance conclusion, and no real singer / device robustness conclusion. Follow-up work needs local-only real phone recording fixtures and mobile performance testing before considering any production estimator change.
