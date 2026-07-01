# P13h Second Tiny Pitch Extraction Improvement Source Decision

## 1. Purpose

This document makes the source decision for the second tiny pitch extraction improvement direction for `/research/local-audio-decode` decoded WAV pitch-frame extraction.

P13h is docs-only. It does not implement smoothing, modify runtime code, change the pitch extraction algorithm, change route behavior, change UI copy, change file selection, change decode behavior, change **Extract pitch frames** behavior, or change disabled / enabled gating.

## 2. Current baseline after P13d

The current baseline after P13d is:

- Route: `/research/local-audio-decode`.
- Browser-local decoded WAV research POC.
- Explicit file selection.
- Explicit decode metadata action.
- Explicit **Extract pitch frames** action.
- Extraction remains gated behind decoded metadata.
- P13d diagnostic guard filters invalid and out-of-range frequency estimates.
- Valid-only min / median / max summary.
- Diagnostic-only output.
- No Practice Mode integration.
- No `TargetPitchCurve` generation.
- No note segmentation.
- No scoring.
- No upload, cloud, or AI behavior.

## 3. Decision summary

Chosen:

**Option B — Conservative frame-level median smoothing for diagnostic frequency summary only.**

A future P13i may try a small, conservative smoothing improvement that:

- Applies smoothing only to valid diagnostic frame frequency estimates.
- Uses a small local median window.
- Reduces single-frame jitter in diagnostic summaries.
- Keeps raw frame and count semantics clear.
- Does not infer notes.
- Does not infer melody.
- Does not generate `TargetPitchCurve`.
- Does not score singing.
- Does not modify Practice Mode.

Deferred:

- Octave correction.
- Window / hop size changes.
- Confidence calibration system.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Formal scoring.
- New external pitch library.
- Dependency changes.
- APK / WebView claims.

## 4. Options considered

### Option A: Do nothing after P13d

Pros:

- Safest.
- Avoids algorithm complexity.

Cons:

- Does not improve jitter or unstable diagnostics.

Decision:

- Defer as fallback only.

### Option B: Small median smoothing on valid diagnostic frequencies

Description:

- Use a tiny median window over neighboring valid diagnostic frequency estimates.
- Intended only for diagnostic stability.
- Should not rewrite extraction.
- Should not produce note segments.
- Should not change UI copy.

Pros:

- Small meaningful improvement after the P13d guard.
- Can reduce isolated outlier frames.
- Does not require a new dependency.
- Fits synthetic cases like noisy A4 and vibrato-like signal.
- Easier to test than note segmentation or octave correction.

Risks:

- May hide real rapid pitch changes.
- May blur short notes.
- May be misread as melody curve smoothing if wording is careless.
- Should be limited to diagnostic summary or clearly documented diagnostic frame output.

Decision:

- Choose as the second improvement direction, with strict boundaries.

### Option C: Octave error correction

Description:

- Detect 2x / 0.5x jumps across neighboring frames.

Pros:

- Important future quality improvement.

Cons:

- More complex.
- Can suppress true leaps.
- Needs richer test harness.
- Better after basic smoothing / diagnostic stability work.

Decision:

- Defer.

### Option D: Window / hop size changes

Pros:

- Could affect responsiveness and stability.

Cons:

- Larger behavior change.
- Harder QA.
- Could affect all existing manual expectations.

Decision:

- Defer.

### Option E: Confidence calibration system

Pros:

- Important for voiced / unvoiced quality.

Cons:

- Needs clearer metric definition.
- Current extractor may only have limited clarity threshold.
- Larger design surface.

Decision:

- Defer.

### Option F: New external pitch library

Pros:

- Potential accuracy improvement.

Cons:

- New dependency.
- Bundle / runtime implications.
- Larger review.
- Browser compatibility uncertainty.

Decision:

- Defer.

## 5. Chosen P13i implementation boundaries

Future P13i should be:

- Tiny.
- Isolated.
- Browser-local.
- Diagnostic-only.
- No new dependency.
- No route behavior change.
- No UI copy change unless separately justified.
- No automatic decode / extract.
- No Practice Mode integration.
- No `TargetPitchCurve`.
- No note segmentation.
- No scoring.

Possible future P13i behavior:

- Smooth only valid diagnostic frequency estimates.
- Use a small median window, for example a 3-frame window, as a candidate.
- Preserve null / invalid frames.
- Do not turn unvoiced frames into voiced frames.
- Do not smooth across long unvoiced gaps.
- Do not include invalid estimates in smoothing.
- Keep min / median / max summary diagnostic-only.
- Document that smoothing is not note segmentation.

## 6. What smoothing must not mean

Smoothing is not:

- Note segmentation.
- Melody recognition.
- `TargetPitchCurve` generation.
- Scoring.
- Practice Mode feedback.
- Formal pitch recognition.
- APK readiness.

## 7. Future P13i testing expectations

Future implementation should use the P13b synthetic fixture policy:

- Generated / in-memory synthetic values.
- No WAV fixture committed.
- No real audio committed.
- No `metadata.local.json` committed.
- No external dependency.

Suggested minimal future checks:

- Clean A4-like values remain stable.
- One-frame outlier is reduced or excluded from smoothed diagnostic summary.
- Null / invalid frames remain null / invalid.
- Smoothing does not create valid pitch from silence.
- Smoothing does not cross unvoiced gaps.
- Noisy A4-like generated sequence remains diagnostic-only.

## 8. Acceptance criteria for P13i

Future P13i is acceptable only if:

- The algorithm change is tiny and isolated.
- P13d diagnostic bounds remain intact.
- Invalid / out-of-range estimates remain excluded.
- Smoothing uses only valid diagnostic frequencies.
- No route behavior changes.
- File / decode / extract actions remain explicit.
- **Extract pitch frames** remains gated behind decoded metadata.
- Output remains diagnostic-only.
- No note sequence is produced.
- No `TargetPitchCurve` is generated.
- No Practice Mode files are modified.
- No scoring is introduced.
- No upload / cloud / AI behavior is introduced.
- No dependency changes unless separately approved.
- No real audio or `metadata.local.json` is committed.
- Validation commands pass.

## 9. Future source review checklist

Future P13j should review:

- Exact runtime files changed.
- Whether the smoothing helper is pure.
- Whether smoothing is small and local.
- Whether invalid / out-of-range estimates remain excluded.
- Whether null / unvoiced frames are preserved.
- Whether no note segmentation appeared.
- Whether no `TargetPitchCurve` appeared.
- Whether no Practice Mode integration appeared.
- Whether route behavior, UI, file, decode, extract, and gating are unchanged.
- Whether synthetic checks use generated / in-memory data only.
- Whether package files remain unchanged unless explicitly approved.

## 10. Future manual browser QA checklist

Future P13k should verify:

- Route loads.
- File selection remains explicit.
- Decode metadata remains explicit.
- **Extract pitch frames** remains explicit.
- Gating still works.
- Diagnostic output appears.
- Output remains research-only.
- No misleading score / melody / target-curve claims.
- No upload / cloud / AI observed if the Network panel is checked.
- `/practice` smoke check remains normal.

## 11. Relationship to P13d/P13e/P13f

- P13d implemented the first diagnostic guard.
- P13e reviewed source.
- P13f recorded manual browser QA.
- P13h chooses the second improvement direction.
- P13h does not implement smoothing.

## 12. Relationship to P14/P15/P16

- P13h does not start note segmentation.
- P13h does not start `TargetPitchCurve` generation.
- P13h does not start Practice Mode integration.
- P14 / P15 / P16 remain future phases.

## 13. Research-only wording

Allowed wording:

- Diagnostic smoothing.
- Diagnostic frame stability.
- Local browser pitch-frame diagnostics.
- Research-only extractor stability improvement.

Avoid wording:

- Pitch recognition is live.
- Melody recognized.
- Singing score.
- Correct / wrong singing.
- Practice Mode audio import.
- `TargetPitchCurve` generated.
- APK-ready.
- Product-ready audio import.

## 14. APK / WebView caveat

This second improvement source decision does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 15. Non-goals

P13h does not do any of the following:

- Runtime code.
- Route behavior changes.
- UI copy changes.
- Navigation changes.
- Homepage link.
- `/practice` link.
- Feature flag implementation.
- Dev-only guard implementation.
- `package.json` changes.
- `app/research/local-audio-decode` page / component changes.
- `app/practice/page.tsx` changes.
- File input behavior changes.
- Decode behavior changes.
- **Extract pitch frames** behavior changes.
- Disabled / enabled gating changes.
- Automatic decoding.
- Automatic pitch extraction.
- Pitch extraction algorithm changes.
- Synthetic WAV generation.
- Committed WAV fixtures.
- New test scripts.
- Waveform analysis implementation.
- Smoothing implementation.
- Octave correction implementation.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- MusicXML parser.
- MIDI import.
- Accompaniment playback.
- Source separation.
- Vocal separation.
- Song Learning Mode implementation.
- Cloud upload.
- Cloud assessment.
- GPT / AI API.
- Formal score.
- Rhythm evaluation.
- Sight-singing assessment.
- Estimator changes in `/practice`.
- Pitchy Practice Mode integration.
- Comparison harness changes.
- Benchmark gate / tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
- APK-ready claim.

## 16. P13i follow-up implementation note

P13i implemented the chosen conservative diagnostic median smoothing as a tiny isolated runtime change for `/research/local-audio-decode`. The implementation preserves the P13d 50–1200 Hz diagnostic bounds, invalid-frame exclusion, invalid / out-of-range summary exclusion, route behavior, UI copy, explicit file selection / decode / extract actions, disabled / enabled gating, Practice Mode boundaries, note segmentation boundaries, `TargetPitchCurve` boundaries, scoring boundaries, upload / cloud / AI boundaries, dependency boundaries, real audio boundaries, and APK / WebView caveats.
