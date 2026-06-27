# P7e Browser-Local Pitch Engine Candidate Review

## 1. Scope and decision boundary

P7e is a documentation-only dependency review for a future browser-local pitch engine adapter. It does not install new dependencies, connect Pitchy, Pitchfinder, CREPE, RMVPE, SwiftF0, or any other external pitch library, change the current estimator, change the P7d comparison harness, modify Practice Mode, add recording, add trend charts, upload audio, call AI APIs, add persistence, add scores, change benchmark gates, relax tolerance, or modify `/api/recognize`.

The goal is to decide which candidate should be tried first in P7f as a small adapter behind the existing P7d comparison harness shape, if the project chooses to proceed. This review is not a benchmark result and does not claim that any candidate reaches conservatory-grade accuracy.

## 2. Reviewed evidence

This review used package metadata and public project documentation rather than installing dependencies:

- `npm view pitchy version license dependencies dist.unpackedSize repository --json` reported Pitchy `4.1.0`, MIT license, one direct dependency on `fft.js`, and a published unpacked size of `33090` bytes.
- `npm view pitchfinder version license dependencies dist.unpackedSize repository --json` reported Pitchfinder `2.3.4`, license string `GNU v3`, and a published unpacked size of `228607` bytes.
- Pitchy's public README describes it as a JavaScript pitch detection module intended for real-time applications and based on the McLeod Pitch Method.
- Pitchfinder's public README describes YIN, McLeod, AMDF, and Dynamic Wavelet variants, with documented tradeoffs such as YIN occasionally returning wildly incorrect values, AMDF being slow and about `+/- 2%`, and Dynamic Wavelet struggling with lower frequencies.
- `audiojs/pitch-detection` was noted as another lightweight browser-oriented package because its README advertises MIT licensing, YIN / McLeod / pYIN / autocorrelation / AMDF options, and a `{ freq, clarity } | null` pitch API. It is not selected for P7f because it was outside the original Pitchy / Pitchfinder decision path and still needs separate package-size, maintenance, and browser-bundling review.

These sources are useful for dependency triage only. README statements are not treated as benchmark proof.

## 3. Candidate comparison matrix

Legend: `Good`, `Medium`, `Weak`, and `Unresolved` are review judgments for this MVP's likely fit, not measured repository benchmark results.

| Candidate | Phone browser real-time fit | Quiet indoor single voice fit | Confidence / clarity / voicing | No-pitch / unknown behavior | Octave error risk | Harness report-shape fit | Cents trend fit | License / commercial risk | Bundle / mobile CPU risk | Maintenance status | P7f adapter recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pitchy / McLeod Pitch Method | Good candidate because it is browser-oriented JavaScript and intended for real-time tuner-like use, but must be measured on target phones. | Medium to good for monophonic sustained voice if validated on real local recordings. | Good candidate: MPM-style clarity/probability output can map to confidence-like fields, but calibration remains product-specific. | Good candidate if the adapter maps missing / low-clarity output to `unknown` instead of forcing a note. Exact thresholds must be benchmarked. | Medium. MPM is designed to improve over naive autocorrelation, but harmonics, weak fundamentals, and low voices can still create octave or subharmonic errors. | Good. A small adapter can map frequency, clarity, and no-pitch state into the P7d report shape. | Good. Frame-level frequency estimates can be converted to cents relative to the current target note, provided unknown frames remain unknown. | Low known package risk from MIT metadata, but transitive `fft.js` license should be confirmed before merge. | Low to medium known footprint from metadata: about 33 KB unpacked plus one dependency. Real mobile CPU remains unresolved until measured. | Appears active enough for review because current npm metadata reports a published version; exact release cadence should be rechecked in P7f. | **Recommended first P7f adapter candidate**, gated by license confirmation and mobile benchmark results. |
| Pitchfinder YIN | Medium to good for browser-local experiments, but the package is larger and license risk blocks immediate commercial use. | Medium for monophonic voice with tuning and validation. | Medium. Public API examples generally return a frequency or null/undefined rather than a calibrated confidence field, so voicing may need adapter heuristics. | Medium. Can be wrapped as unknown when no frequency is returned, but false voiced behavior must be measured. | Medium. README warns YIN can occasionally return wildly incorrect values; octave and gross pitch errors need explicit tracking. | Medium. Frequency can map easily; confidence fields may be unknown or adapter-derived. | Good for voiced frames; unknown and outlier smoothing need careful handling. | **High / unresolved for commercial product** because npm metadata reports `GNU v3`, which must be reviewed by counsel before commercial distribution. | Medium: metadata reports about 229 KB unpacked. CPU varies by algorithm and frame size; mobile risk unresolved. | Published package exists, but maintenance details need follow-up before adoption. | Not first choice unless GPL/commercial concerns are resolved and confidence handling is acceptable. |
| Pitchfinder McLeod | Medium. Same package-level concerns as Pitchfinder; algorithmically close to Pitchy but with less direct clarity fit in the package API. | Medium to good if validated. | Medium. May need heuristic confidence wrapping. | Medium. Adapter must avoid guessing when method cannot return a reliable frequency. | Medium. Same MPM-family risks as Pitchy. | Medium. Frequency maps easily; confidence support is weaker. | Good for voiced frames if outliers are handled. | **High / unresolved for commercial product** due to Pitchfinder package license metadata. | Medium to unresolved due to larger package and method CPU checks. | Needs follow-up. | Defer behind Pitchy unless license is resolved and package API offers a clear advantage. |
| Pitchfinder AMDF | Weak to medium for real-time feedback because Pitchfinder's README characterizes it as slow and only around `+/- 2%`. | Medium at best for rough monophonic tracking; likely too coarse for cents trend feedback. | Weak. No clear calibrated confidence. | Medium if wrapped conservatively. | Medium to high. Lower precision can appear as large cents errors. | Medium for frequency-only reports, weak for confidence-rich reports. | Weak for cents trend because `+/- 2%` is roughly tens of cents and may be too noisy for useful intonation trend. | **High / unresolved for commercial product** due to Pitchfinder package license metadata. | Medium to high because README calls it slow; phone CPU risk unresolved. | Needs follow-up. | Do not choose first. |
| Pitchfinder Dynamic Wavelet | Medium for speed, according to Pitchfinder README, but lower-frequency limitations are a concern for singing ranges. | Medium; weak for lower voices unless benchmarked otherwise. | Weak to medium. No clear calibrated confidence. | Medium if wrapped conservatively. | Medium to high for lower voices because README notes lower-frequency struggles. | Medium for frequency-only reports, weak for confidence-rich reports. | Medium only if low-register failures are cleanly marked unknown. | **High / unresolved for commercial product** due to Pitchfinder package license metadata. | Low to medium CPU candidate, but mobile behavior remains unresolved. | Needs follow-up. | Do not choose first. |
| audiojs/pitch-detection | Medium to good as a possible later browser-local candidate because its documented API returns `{ freq, clarity } | null`. | Medium to good if independently validated. | Good on paper because clarity and null are explicit in the documented API. | Good on paper due to documented `null` no-pitch behavior. | Medium; depends on chosen algorithm and implementation. | Good if frame output is stable and null states are preserved. | Low known risk from README MIT claim, but npm package metadata and transitive dependencies still need review. | Unresolved. Package size, tree-shaking, and mobile CPU were not reviewed enough for P7f. | Unresolved. Needs repository/package activity review. | Record as a promising later candidate, not the first P7f adapter. |

## 4. Decision notes by review criterion

### 4.1 Phone browser local real-time feedback

Pitchy is the best first trial because it is browser-oriented, small in npm metadata, and exposes MPM-style clarity information that can plausibly fit local real-time feedback. Pitchfinder is useful for comparing multiple classic algorithms, but package-level license risk and a larger footprint make it a worse first adapter for a commercializable MVP.

### 4.2 Quiet indoor single voice

All reviewed browser-local candidates remain plausible only for monophonic, quiet-room, single-singer practice. None should be described as robust to all voices, microphones, registers, vibrato, or background-noise conditions until measured against local real voice fixtures and mobile recordings.

### 4.3 Confidence, clarity, voicing, and no-pitch handling

P7f should prefer an adapter that can report either a confidence-like signal or a clear unknown state. Pitchy is preferred because clarity/probability output can be mapped into the P7d fields without inventing a formal score. Pitchfinder can still be wrapped, but if an algorithm only returns frequency, the adapter should set confidence to `null` / unresolved rather than fabricate confidence.

No-pitch handling must be conservative: silence, too-short clips, unvoiced frames, and low-clarity frames should stay `unknown` / `no pitch`. A future adapter must never fill a random nearest note just to satisfy UI display.

### 4.4 Octave error and cents trend risk

MPM and YIN-family methods are reasonable traditional candidates, but both can still make octave, subharmonic, or gross pitch mistakes on difficult voice frames. The trend chart direction should therefore use frame-level cents relative to the current target note plus unknown states and outlier diagnostics. A smooth-looking trend must not be treated as formal assessment.

AMDF and Dynamic Wavelet should not be first choices for cents trend feedback. AMDF's documented precision tradeoff is too coarse for fine intonation guidance without strong benchmark evidence, and Dynamic Wavelet's lower-frequency concern is risky for lower voices.

### 4.5 TypeScript and harness integration

P7f should wrap a candidate into the P7d comparison report shape without changing the harness contract. The adapter should expose:

- engine id and version;
- per-case target metadata;
- estimated frequency in Hz or `null`;
- nearest note and cents only when a reliable frequency exists;
- confidence / clarity when the candidate provides it, otherwise `null` with a caveat;
- valid frame count and analyzed frame count;
- no-pitch state and caveats;
- notes about thresholds, frame size, sample rate, and mobile timing.

TypeScript risk is expected to be low to medium for Pitchy because a small wrapper can normalize its output. Pitchfinder TypeScript risk is medium because confidence and per-algorithm output semantics may need more custom typing and caveats. Actual type availability must be checked in P7f without assuming it here.

## 5. Recommended P7f adapter choice

**Recommend P7f try Pitchy / McLeod Pitch Method first** as a single browser-local comparison adapter, not as a production replacement.

Reasons:

1. MIT package metadata is more compatible with future commercial use than Pitchfinder's `GNU v3` metadata, pending final transitive-license confirmation.
2. The npm package footprint appears much smaller than Pitchfinder in metadata, reducing first-pass bundle-risk exposure.
3. It is browser-oriented and intended for real-time pitch detection use cases.
4. Its MPM-style clarity output is easier to map into the P7d comparison report's confidence-like fields without pretending confidence is a grade.
5. A single Pitchy adapter keeps the P7f PR small and MVP-aligned while still testing the harness path for external browser-local engines.

Pitchfinder remains valuable for later controlled comparisons, especially YIN and McLeod, but it should not be the first P7f adapter until the GPL/commercial question is resolved and confidence/no-pitch mapping is designed.

## 6. Unresolved risks before any dependency merge

Before P7f installs or connects any candidate, the project should resolve:

- Confirm Pitchy's full dependency license chain, including `fft.js`, and record whether commercial use is acceptable.
- Measure actual bundled output in this Next.js app instead of relying only on npm unpacked size.
- Run mobile CPU and latency checks on at least one low-end phone and one modern phone.
- Verify browser compatibility for Safari iOS, Chrome Android, and microphone / AudioWorklet or main-thread usage assumptions.
- Define conservative clarity / confidence thresholds for no-pitch behavior.
- Track false voiced frames on silence and false unvoiced frames on usable singing.
- Measure octave-doubled, octave-halved, and gross pitch errors on generated synthetic cases and local real voice fixtures.
- Confirm whether the package ships usable TypeScript declarations or whether a small local type wrapper is needed.
- Recheck maintenance status immediately before dependency installation.
- Decide whether frame-level trend output should smooth, debounce, or hide low-confidence frames before any Practice Mode UI change.

## 7. Recommended next step

P7f should be a small, separate PR that installs only one candidate dependency if license review is acceptable, adds only a Pitchy comparison adapter behind the P7d harness, records benchmark output, and keeps Practice Mode unchanged. If license, mobile CPU, bundle size, or browser support cannot be verified, P7f should remain docs-only or add only a no-dependency adapter design note.
