# P7c Local Pitch Engine Comparison Benchmark Design

## 1. Purpose and scope

This document designs a future benchmark for comparing local pitch engines for phone-based sight-singing and ear-training practice. It is a design document only: it does not install dependencies, connect Pitchy, Pitchfinder, CREPE, RMVPE, SwiftF0-style models, change the in-repository estimator, change Practice Mode, add recording, upload audio, add scoring, or modify benchmark gates.

The current in-repository autocorrelation estimator remains an MVP baseline. It is useful for local experimentation and target-aware feedback, but it is not production-grade pitch evaluation and must not be described as conservatory-level assessment.

Future candidates to compare may include:

- the current in-repository autocorrelation estimator
- Pitchy / McLeod Pitch Method
- Pitchfinder YIN, McLeod, AMDF, and Dynamic Wavelet variants
- future opt-in cloud candidates such as CREPE, RMVPE, or SwiftF0-style models, after separate license, privacy, and server-cost review

## 2. Baseline principles

- Keep the current in-repository estimator as the reference baseline until a documented benchmark shows a clear reason to replace or supplement it.
- Compare every candidate engine against the baseline on the same test inputs, target frequencies, frame windows, and reporting format.
- Do not judge an engine from one demo, one successful recording, one singer, or one target note.
- Record both improvements and regressions. A candidate that performs better on vibrato but worse on no-pitch behavior is not automatically a replacement.
- Keep existing blocking benchmark gates unchanged unless a future PR explicitly proposes and justifies a gate change. P7c does not change gates or tolerance.
- Treat comparison output as engineering evidence, not formal student grades, pass/fail labels, or conservatory assessment proof.

## 3. Synthetic benchmark comparison design

Synthetic cases should remain generated in memory so the repository does not need binary audio fixtures. Each candidate engine should receive identical buffers and identical expected target metadata.

| Scenario | Purpose | Blocking status for future comparison |
| --- | --- | --- |
| Clean sine | Preserve known-frequency baseline behavior for stable tones. | Existing blocking regression category where already gated. |
| Quiet amplitude | Verify behavior when phone input is low but usable. | Existing blocking robustness category where already gated. |
| Short duration | Verify minimum-duration behavior and avoid overclaiming on tiny clips. | Existing blocking robustness / no-pitch category where already gated. |
| Deterministic light noise | Check repeatable light-noise robustness without random test flake. | Existing blocking robustness category where already gated. |
| Higher noise | Compare graceful degradation under harder noise. | Exploratory comparison only. |
| Mixed harmonics | Compare fundamental tracking when harmonics are stronger than the fundamental. | Exploratory comparison only. |
| Vibrato | Compare whether the engine reports a useful central pitch while preserving instability context. | Exploratory comparison only. |
| Frequency drift | Compare sustained-pitch instability behavior, not just ending-pitch correctness. | Exploratory comparison only. |
| No-pitch / too-short behavior | Verify silence, unvoiced, and too-short clips return no reliable pitch instead of random note names. | Existing blocking behavior category where already gated. |

Blocking regression cases should protect already accepted MVP behavior. Exploratory cases should print diagnostics for comparison, but should not fail validation, relax tolerance, or become product accuracy claims until a later PR explicitly promotes them with recorded evidence.

## 4. Real phone recording comparison design

Real phone recordings should be local-only and opt-in. They should not be committed, uploaded, or connected to CI. Their role is to reveal real human-voice and device behavior that synthetic tones cannot cover.

Recommended collection conditions:

- quiet indoor room with low background noise
- one singer only
- target note known before recording
- multiple vowels, such as `ah`, `ee`, `oo`, and optionally a hum
- multiple vocal ranges / registers when available
- soft and normal volume attempts
- stable sustained tone, vibrato, and intentional drift examples
- multiple phones or microphones when available
- short repeated takes rather than one long uncontrolled session

Recommended local metadata fields:

- sample id using a non-identifying local label
- target note and expected frequency in Hz
- vowel
- approximate duration in seconds
- singer range category, not personal identity
- device class, such as phone built-in mic, laptop mic, or external USB mic
- room condition, such as quiet indoor room or audible HVAC
- input distance estimate, such as close, arm length, or table distance
- volume intent, such as soft or normal
- performance type, such as stable, vibrato, or drift
- engine versions or commit SHA used for comparison
- consent status and confirmation that the file is local-only
- caveats, such as clipping, cough, background noise, or uncertain target

Real recording reports should aggregate results by target note, vowel, range, device class, volume intent, and performance type. They should not include personally identifying information or raw audio in the repository.

## 5. Metrics

Each candidate engine report should include:

- median cents error against the known target note
- mean absolute cents error
- gross pitch error rate, using a documented cents threshold such as errors above 50 or 100 cents
- octave error rate, especially octave-doubled and octave-halved outputs
- valid frame rate: voiced / valid pitch frames divided by analyzed frames
- confidence and voicing behavior, including false voiced frames on silence and false unvoiced frames on usable singing
- first-half vs second-half drift to identify sustained pitch movement over the sample
- sustained pitch instability indicators, such as frame-level cents spread or trend slope
- real-time latency target for local phone feedback, measured from available audio frame to displayed feedback
- CPU and mobile performance concerns, including battery, thermal behavior, and low-end phone responsiveness

Reports should keep pitch correctness separate from pitch stability. A singer can be centered near the target but unstable, or stable but consistently sharp/flat.

## 6. Mobile real-time feedback requirements

Future mobile feedback should follow these product requirements:

- Show a local trend relative to the current target note in cents offset, not only a detected note name.
- Distinguish pitch correctness from pitch instability such as drift, wobble, or wide vibrato.
- Show `unknown` / `no pitch` for frames without reliable pitch rather than guessing random note names.
- Use uncertainty and confidence language carefully; confidence is not a score.
- Keep trend feedback separate from formal scoring. A visual trend can guide practice without assigning a grade, pass/fail label, or conservatory assessment result.
- Prefer local browser processing for immediate private practice until any cloud path has explicit consent, privacy review, license review, and cost review.

## 7. Future comparison path

A safe staged path is:

1. **P7d:** add a comparison harness skeleton that can call registered engine adapters, emit a common report shape, and still use only the existing in-repository estimator. Do not add external libraries yet.
2. **P7e:** consider one browser-local candidate, such as Pitchy or Pitchfinder, after reviewing bundle size, license, browser support, latency, and no-pitch behavior.
3. **Later cloud review:** evaluate CREPE, RMVPE, or SwiftF0-style candidates only after license, privacy, opt-in upload, storage, server cost, and user-consent review.
4. **Only after evidence:** consider changing product language, gates, or estimator defaults after comparison reports show repeatable improvement without unacceptable regressions.

## 8. Explicit non-goals for P7c

P7c does not:

- install new dependencies
- connect Pitchy, Pitchfinder, CREPE, RMVPE, or SwiftF0
- modify the pitch estimator algorithm
- modify Practice Mode UI workflow
- implement real-time recording
- implement a pitch trend chart
- implement cloud assessment
- connect GPT or any AI API
- upload audio
- add user accounts or persistence
- add formal scores, grades, pass/fail labels, rhythm evaluation, or sight-singing assessment
- change benchmark gates, tolerance, `/api/recognize`, recognition provider union, PDF upload, or Audiveris behavior

## 9. P7d comparison harness skeleton status

P7d implements the first comparison harness skeleton described by this design. It is intentionally small and uses only the current in-repository autocorrelation estimator through a baseline adapter. The common report shape now reserves fields for engine identity, case identity, target / expected frequency, estimated frequency, nearest note, cents error, confidence-like fields, valid frame counts, frame frequency min / median / max, first-half and second-half medians, drift cents, no-pitch / unknown handling, notes, and caveats.

The P7d harness reuses the existing generated synthetic benchmark cases for reporting-only output. It does not change existing benchmark gates, tolerances, validation blocker logic, target frequencies, exploratory-case status, or no-pitch behavior. Exploratory synthetic cases remain non-blocking.

Current P7d limitations:

- Only `in-repo-autocorrelation` is registered.
- Pitchy, Pitchfinder, CREPE, RMVPE, SwiftF0-style models, and other external pitch libraries are not installed or connected.
- Real phone recording benchmark execution is not implemented.
- The output is engineering comparison scaffolding only, not conservatory-grade accuracy evidence, professional assessment, formal scoring, grade, pass, or fail.
- P7e may consider adding one browser-local candidate adapter after dependency, license, bundle-size, browser-support, latency, and no-pitch behavior review.

## 10. P7e browser-local candidate review decision

P7e adds a docs-only review in `docs/browser-local-pitch-engine-candidate-review.md`. The review compares Pitchy / McLeod Pitch Method, Pitchfinder YIN / McLeod / AMDF / Dynamic Wavelet, and a noted lightweight alternative candidate without installing or connecting any dependency.

The P7e recommendation was to try Pitchy first in a future P7f comparison-adapter PR, if its transitive license and mobile bundle / CPU checks were acceptable. Pitchy was preferred for the first adapter because npm metadata reported an MIT license, a smaller package footprint than Pitchfinder, a browser-oriented real-time use case, and a clarity-style output that should map cleanly into the existing P7d report shape. Pitchfinder remained useful for later comparisons, but npm metadata reported `GNU v3`, so future commercial compatibility was unresolved at P7e review time and needed review before adoption.

P7e did not claim that Pitchy, Pitchfinder, or any other candidate had conservatory-grade accuracy. It also did not modify the P7d comparison harness, estimator algorithm, Practice Mode workflow, benchmark gates, tolerance, `/api/recognize`, recognition providers, PDF upload, Audiveris, audio upload, persistence, scoring, rhythm evaluation, sight-singing assessment, or AI/API behavior.

## 11. P7f Pitchy comparison adapter status

P7f adds the first external browser-local comparison adapter: `pitchy-mcleod` (`Pitchy / McLeod Pitch Method`). The current `in-repo-autocorrelation` adapter remains the baseline and the existing pitch estimator algorithm is not replaced.

The P7f harness output now registers two engines and produces reporting-only rows for both engines against the same generated in-memory synthetic cases. The output explicitly remains not a professional accuracy claim, not formal scoring, not a gate change, and not conservatory-grade assessment. Existing blocking gates, tolerances, no-pitch behavior gates, exploratory-case status, and benchmark inputs are unchanged.

Dependency review for P7f found `pitchy@4.1.0` and its direct dependency `fft.js@4.0.4` both declare MIT license in installed package metadata. `pitchy@4.1.0` is ESM-only, so the harness loads it with dynamic `import("pitchy")` for the NodeNext validation path.

Remaining limitations after P7f:

- No real phone recording benchmark has been run.
- Mobile Safari and Android Chrome runtime performance are still unverified.
- Pitchy comparison results are not production pitch accuracy evidence.
- Practice Mode still uses the existing local estimator path and is not changed by the comparison adapter.

## 12. P7g anomaly flag reporting

P7g adds reporting-only anomaly flags to the pitch engine comparison rows. This does not fix, smooth, hide, or target-correct any engine output; raw `estimatedFrequencyHz` and `centsError` remain visible so regressions stay explicit.

The anomaly fields identify conditions such as out-of-human-voice-range estimates, gross pitch errors, possible octave or catastrophic errors, no-pitch expectation mismatches, and exploratory-only observations. They are intended to make adapter caveats easier to review before any product decision.

These flags are not formal scoring, not professional accuracy claims, not conservatory-grade assessment, and not a benchmark gate or tolerance change. Exploratory cases such as vibrato, drift, higher noise, and mixed harmonics can record anomalies, but those anomalies remain non-blocking. The P7f Pitchy vibrato exploratory result that reported roughly 1.00Hz / -10534.80 cents is therefore documented as a severe caveat rather than hidden or promoted into a product claim.

## 13. P7h Song Learning Mode benchmark boundary

The current pitch engine comparison harness is for monophonic single-note and melody-step pitch-engine comparison. It must not be treated as a benchmark for full-song mixes, source separation, vocal melody extraction, polyphonic music transcription, or separating a user's live vocal from original vocals and accompaniment.

A future Song Learning Mode will need an independent benchmark plan covering authorized real song material, source separation quality, vocal melody extraction accuracy, target pitch curve generation, user-vocal isolation, phrase-level intonation feedback, optional cloud deep assessment, and copyright / consent / storage policy. P7h only records this direction in documentation and does not modify harness behavior, gates, tolerances, adapters, or Practice Mode.
