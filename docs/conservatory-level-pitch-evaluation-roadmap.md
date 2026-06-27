# Conservatory-Level Pitch Evaluation Roadmap

## 1. Purpose

P7b documents candidate pitch-engine directions for future phone-based real-time pitch feedback and deeper opt-in assessment. This PR is research and architecture documentation only. It does not install dependencies, connect a new model or library, change the existing pitch estimator, modify Practice Mode workflow, implement real-time recording, upload audio, add accounts, persist data, call AI APIs, or create formal grades.

The long-term product direction is a sight-singing and ear-training practice and assessment system that could be useful in a university music conservatory context. The current Practice Mode remains a browser-local MVP with an experimental estimator. It must not be described as production-grade pitch evaluation, formal assessment, or conservatory-level accuracy.

## 2. Target product architecture

Future pitch evaluation should separate three concerns:

1. **Browser-local real-time trend feedback** for private practice on a phone in a quiet indoor room.
2. **Opt-in cloud deep assessment** for richer analysis after a user explicitly chooses to submit audio.
3. **GPT-generated coaching suggestions** based only on structured assessment outputs, not raw claims of correctness from an unvalidated estimator.

This separation keeps the current MVP simple while allowing future engines to be evaluated honestly before they affect product claims.

## 3. Evaluation assumptions

The candidate matrix below assumes:

- Primary user input is a single singer in a quiet indoor room.
- The near-term local UI should show pitch trend in **cents relative to the current target note**, not only a detected note name.
- Local feedback should distinguish **pitch correctness** from **sustained pitch instability** such as drift, unstable sustain, or wide vibrato.
- Real-time browser feedback values latency, graceful no-pitch handling, and transparent uncertainty over perfect offline accuracy.
- Cloud deep assessment can use heavier engines, but only after explicit user consent and a privacy review.
- Every candidate requires validation on a real mobile recording dataset before any stronger accuracy claim.

## 4. Candidate pitch engine evaluation matrix

Legend: High / Medium / Low describe architectural fit for this product, not verified accuracy in this repository.

| Candidate | Browser local real-time | Phone fit | Cloud deep assessment | Quiet single voice fit | Confidence / voicing | Octave error risk | Vibrato / drift / weak voice / noise robustness | License / commercial risk | Integration difficulty | Suitable as current next PR? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current in-repo autocorrelation estimator | High because it already runs locally and has no dependency cost | Medium; needs real phone microphone validation and latency checks | Low as the sole assessment engine | Medium for clean sustained notes only | Limited internal confidence; not calibrated | Medium to high, especially with harmonics and weak fundamentals | Limited; synthetic diagnostics exist but real voice is unproven | Low because it is in-project code | Low | Yes, only as baseline documentation and comparison target |
| Pitchy / McLeod Pitch Method browser candidate | High; browser-oriented MPM approach is a strong local baseline candidate | Medium to high if bundle size and mobile CPU are acceptable | Low to medium as a secondary baseline, not final deep assessment | Medium to high for monophonic singing if validated | Often exposes clarity/probability-style signals depending on API | Medium; MPM can still choose subharmonics in difficult voices | Medium; needs real singing tests for vibrato and weak voice | Must verify package license before use | Low to medium | Yes, as a future comparison PR only; not in this docs-only PR |
| Pitchfinder: YIN / McLeod / AMDF / Dynamic Wavelet | Medium to high for JS local experiments | Medium if algorithms meet mobile latency budget | Medium as traditional baseline comparisons | Medium for monophonic voice with method-dependent tradeoffs | Varies by method; confidence may need wrapping/calibration | Medium; algorithm choice matters | Medium; YIN/MPM likely better than naive autocorrelation, AMDF may be less stable | Must verify package and transitive licenses before use | Low to medium | Yes, as a future local benchmark comparison PR only |
| aubio / pYIN / Essentia traditional MIR baseline | Low for direct browser use unless compiled to WebAssembly or run server-side | Low to medium locally; better on desktop/server | High as a traditional MIR reference baseline | High for monophonic pitch tracking when tuned and benchmarked | Stronger voicing/confidence possibilities depending on tool | Medium; pYIN-style tracking can reduce but not eliminate errors | Medium to high; mature MIR tools are useful baselines | Medium; confirm licenses and commercial compatibility per component | Medium to high | No for immediate MVP UI; good future benchmark/deep-assessment baseline |
| CREPE | Low to medium in browser due to model size/compute, unless optimized | Medium only if mobile inference is proven acceptable | High as a neural pitch baseline for deep assessment | High candidate for monophonic voice, subject to dataset validation | Yes, frame confidence is a core output pattern | Medium; neural models can still make octave mistakes | High candidate; must verify on target phone recordings | Medium; verify model/code licenses and deployment constraints | Medium to high | No immediate integration; candidate for cloud/deep benchmark PR |
| RMVPE | Low for browser MVP because it is heavier and usually used in ML/audio pipelines | Low to medium locally depending on optimized runtime | High candidate for cloud deep assessment | High candidate for singing voice, subject to validation | Likely supports voicing/confidence-like output depending on implementation | Low to medium candidate, but must verify empirically | High candidate for singing robustness, but repository must not assume it | Medium to high; verify implementation/model licenses and commercial terms | High | No immediate integration; future cloud benchmark research only |
| SwiftF0 or other lightweight real-time pitch model | Medium; browser support depends on export/runtime path | High candidate if designed for on-device low-latency use | Medium to high as another comparison engine | Medium to high if trained/evaluated for voice | Depends on model; must require confidence/voicing output | Unknown; must measure octave errors directly | Unknown to medium/high; promising but unproven for this product | Medium to high; model license and training-data risk must be reviewed | High | No immediate integration; research and prototype only after dataset plan |
| Performous / karaoke-style pitch trace UI reference | Not a pitch engine; UI/product reference only | High as an interaction reference if simplified | Not applicable | Useful reference for singing feedback visualization | Not applicable | Not applicable | Not applicable | License matters if reusing code/assets; use only as inspiration unless reviewed | Low for documentation, high if copying code | Yes as product reference documentation only |

## 5. Recommendation

### Short-term local real-time feedback

The safest next implementation direction is to keep the current estimator as the known in-repo baseline and add a controlled comparison against a browser candidate such as Pitchy or Pitchfinder in a future PR. That future PR should be benchmark-gated, optional, and framed as comparison work, not a production upgrade.

The local UI direction should emphasize:

- cents relative to the current target note;
- pitch trend over time;
- no-pitch / low-confidence states;
- separate feedback for target correctness versus sustained pitch instability;
- no formal score, grade, pass, or fail language.

### Cloud deep assessment candidates

CREPE, RMVPE, SwiftF0-style lightweight models, and traditional MIR tools such as aubio, pYIN, and Essentia are reasonable future candidates for opt-in deep assessment. They should be evaluated behind a clear privacy boundary, with explicit consent, license review, reproducible benchmarks, and no automatic claim that any one model is conservatory-grade.

### Product claim boundary

No candidate should be marketed as music-conservatory-level accurate until validated against real phone recordings from the target environment. Synthetic sine-wave performance and anecdotal singing tests are not enough.

## 6. Required validation before stronger claims

Before stronger product claims or formal scoring, the project needs:

1. A real mobile recording test set covering phone microphones, quiet indoor rooms, voice types, weak voices, drift, vibrato, and noise.
2. Ground-truth labeling policy for intended notes and frame-level pitch references where possible.
3. Metrics for median cents error, p90/p95 cents error, octave error rate, no-pitch rate, false pitch rate, voicing accuracy, confidence calibration, valid frame ratio, latency, and battery/CPU budget.
4. Side-by-side comparisons across the current estimator, Pitchy/Pitchfinder-style browser baselines, traditional MIR baselines, and neural candidates.
5. A product review that maps metrics to user-facing wording without adding unsupported formal scores.

## 7. Explicit non-goals for P7b

P7b does not:

- install Pitchy, Pitchfinder, CREPE, RMVPE, SwiftF0, aubio, pYIN, or Essentia;
- modify the pitch estimator algorithm;
- modify Practice Mode UI workflow;
- implement real-time recording;
- implement cloud assessment;
- call GPT or any AI API;
- upload audio;
- add accounts, persistence, formal scores, grades, pass/fail, rhythm evaluation, or sight-singing assessment;
- modify benchmark gates or tolerance;
- modify `/api/recognize` or recognition provider unions;
- add PDF upload or Audiveris integration.

## 8. P7c local pitch engine comparison benchmark design

P7c defines the future comparison benchmark before replacing the current MVP estimator. The current in-repository autocorrelation estimator remains the baseline. Future candidates such as Pitchy / McLeod, Pitchfinder YIN / McLeod / AMDF / Dynamic Wavelet, and later cloud candidates such as CREPE, RMVPE, or SwiftF0-style models must be compared on the same inputs and metrics before any product claim changes.

The comparison design reinforces the mobile feedback direction: local trend feedback should show cents offset relative to the current target note, distinguish pitch correctness from sustained pitch instability, and show unknown / no pitch when frames are unreliable. It must not convert trend feedback into formal scoring, grades, pass/fail labels, rhythm evaluation, or sight-singing assessment.

The recommended next path is P7d for a comparison harness skeleton without external libraries, then P7e for considering one browser-local candidate after license, bundle-size, latency, and no-pitch behavior review. Cloud candidates require separate license, privacy, opt-in upload, and server-cost review before any integration.
