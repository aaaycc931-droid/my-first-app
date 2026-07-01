# P13m Third Tiny Pitch Extraction Improvement Source Decision

## 1. Purpose

This document decides the third tiny pitch extraction improvement direction for `/research/local-audio-decode` decoded WAV pitch-frame diagnostics.

P13m is a docs-only source decision. It does not implement code, modify runtime behavior, change the pitch extraction algorithm, change route behavior, change UI copy, change file selection, change decode behavior, change **Extract pitch frames** behavior, or change disabled / enabled gating.

## 2. Current baseline after P13d and P13i

The current baseline remains:

- Route: `/research/local-audio-decode`.
- Browser-local decoded WAV research POC.
- Explicit file selection.
- Explicit decode metadata action.
- Explicit **Extract pitch frames** action.
- Extraction remains gated behind decoded metadata.
- P13d diagnostic frequency guard remains intact.
- P13d invalid / non-finite / non-positive / out-of-range estimates remain excluded.
- P13i diagnostic median smoothing remains intact.
- P13i smoothing remains valid-frequency-only, 3-frame, and diagnostic-only.
- Null / invalid / unvoiced frames are preserved.
- Smoothing does not cross unvoiced gaps.
- Valid-only diagnostic min / median / max summary remains diagnostic-only.
- Output remains pitch-frame diagnostics only.
- No Practice Mode integration.
- No note segmentation.
- No `TargetPitchCurve` generation.
- No scoring.
- No upload / cloud / AI behavior.

## 3. Decision summary

### Chosen

Option C — diagnostic clarity / voiced-unvoiced threshold review as the next future tiny isolated improvement direction.

A future P13n may try a very small diagnostic voiced / unvoiced refinement that:

- Reviews the current autocorrelation clarity / reliability threshold.
- Keeps the threshold diagnostic-only.
- Avoids treating weak or noisy frames as reliable voiced pitch.
- Avoids creating voiced pitch from silence or low-confidence frames.
- Preserves P13d bounds and P13i smoothing behavior.
- Keeps output diagnostic-only.
- Does not infer notes.
- Does not infer melody.
- Does not generate `TargetPitchCurve`.
- Does not score singing.
- Does not modify Practice Mode.

### Deferred

- Octave correction.
- Window / hop size changes.
- Advanced confidence calibration system.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Formal scoring.
- New external pitch library.
- Dependency changes.
- APK / WebView claims.

## 4. Options considered

### Option A: Do nothing after P13i

Pros:

- Safest.
- Avoids more algorithm complexity.

Cons:

- Does not improve weak / noisy frame classification.

Decision:

- Defer as fallback only.

### Option B: Octave correction

Description:

- Detect likely 2x / 0.5x pitch jumps.

Pros:

- Potentially useful for future pitch tracking quality.

Risks:

- More complex than a tiny refinement.
- Requires neighboring-frame logic beyond smoothing.
- Can suppress real leaps.
- Needs stronger fixtures and manual QA.
- Could be confused with melody interpretation.

Decision:

- Defer.

### Option C: Diagnostic clarity / voiced-unvoiced threshold review

Description:

- Review or slightly refine the current autocorrelation clarity / reliability threshold used to decide whether a frame should count as voiced.
- Keep this diagnostic-only.
- Do not create a formal confidence calibration system.

Pros:

- Natural next step after bounds and smoothing.
- Helps reduce noisy false-voiced diagnostics.
- Smaller than octave correction.
- Does not require new dependency.
- Fits synthetic cases such as silence, low-amplitude sine, noisy sine, and no-pitch input.
- Supports better diagnostic summary quality without note segmentation.

Risks:

- Threshold may be arbitrary if not documented carefully.
- Too strict a threshold may drop soft valid singing.
- Too loose a threshold may keep noise as voiced.
- Must not be described as formal confidence scoring.

Decision:

- Choose as the third improvement direction, with strict boundaries.

### Option D: Window / hop size changes

Pros:

- Could affect stability and responsiveness.

Cons:

- Larger behavior change.
- Affects overall extraction behavior more broadly.
- Harder to QA.

Decision:

- Defer.

### Option E: Advanced confidence calibration system

Pros:

- Useful long-term.

Cons:

- Too broad for one tiny PR.
- May imply formal reliability / scoring if not careful.

Decision:

- Defer.

### Option F: New external pitch library

Pros:

- May improve accuracy.

Cons:

- Dependency change.
- Bundle / runtime / browser concerns.
- Larger review.

Decision:

- Defer.

## 5. Chosen future P13n implementation boundaries

Future P13n should be:

- Tiny.
- Isolated.
- Browser-local.
- Diagnostic-only.
- Dependency-free.
- No route behavior change.
- No UI copy change unless separately justified.
- No automatic decode / extract.
- No Practice Mode integration.
- No `TargetPitchCurve`.
- No note segmentation.
- No scoring.

Possible future P13n behavior:

- Document the current clarity / reliability threshold.
- Define a named diagnostic clarity threshold constant if not already clear.
- Apply the threshold only to frame voiced / unvoiced diagnostic classification.
- Ensure weak / noisy candidates do not become reliable voiced diagnostics.
- Preserve P13d 50–1200 Hz bounds.
- Preserve P13i valid-frequency-only smoothing.
- Preserve null / invalid / unvoiced frames.
- Keep min / median / max summary diagnostic-only.

## 6. What clarity / voiced-unvoiced refinement must not mean

A clarity / voiced-unvoiced refinement must not mean:

- Formal confidence scoring.
- Singing accuracy scoring.
- Note segmentation.
- Melody recognition.
- `TargetPitchCurve` generation.
- Practice Mode feedback.
- Formal pitch recognition.
- APK readiness.

## 7. Future P13n testing expectations

Future implementation should use the P13b synthetic fixture policy:

- Generated / in-memory synthetic values.
- No WAV fixture committed.
- No real audio committed.
- No `metadata.local.json` committed.
- No external dependency.

Suggested minimal future checks:

- Silence remains unvoiced / no valid summary.
- Clean A4-like signal remains voiced when clearly reliable.
- Low-amplitude A4-like signal does not produce misleading overconfident diagnostics.
- Noisy A4-like signal does not over-count voiced frames.
- Out-of-range estimates remain excluded by P13d guard.
- Smoothing does not create voiced pitch from unvoiced frames.
- Summary remains diagnostic-only.

## 8. Acceptance criteria for P13n

Future P13n is acceptable only if:

- Algorithm change is tiny and isolated.
- P13d diagnostic bounds remain intact.
- P13i smoothing remains intact.
- Invalid / out-of-range estimates remain excluded.
- Weak / unreliable frames do not pollute valid voiced summary.
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

Future P13o should review:

- Exact runtime files changed.
- Whether clarity helper / threshold is pure and local.
- Whether threshold is diagnostic-only.
- Whether P13d bounds remain intact.
- Whether P13i smoothing remains intact.
- Whether invalid / out-of-range estimates remain excluded.
- Whether null / unvoiced frames are preserved.
- Whether no note segmentation appeared.
- Whether no `TargetPitchCurve` appeared.
- Whether no Practice Mode integration appeared.
- Whether route behavior / UI / file / decode / extract / gating are unchanged.
- Whether synthetic checks use generated / in-memory data only.
- Whether package files remain unchanged unless explicitly approved.

## 10. Future manual browser QA checklist

Future P13p should verify:

- Route loads.
- File selection remains explicit.
- Decode metadata remains explicit.
- **Extract pitch frames** remains explicit.
- Gating still works.
- Diagnostic output appears.
- Output remains research-only.
- No misleading score / melody / target-curve claims.
- No upload / cloud / AI observed if Network panel is checked.
- `/practice` smoke check remains normal.

## 11. Relationship to P13d/P13i

- P13d added diagnostic frequency bounds and invalid-estimate exclusion.
- P13i added valid-frequency-only diagnostic median smoothing.
- P13m chooses the next possible refinement around diagnostic clarity / voiced-unvoiced classification.
- P13m does not implement that refinement.

## 12. Relationship to P14/P15/P16

- P13m does not start note segmentation.
- P13m does not start `TargetPitchCurve` generation.
- P13m does not start Practice Mode integration.
- P14 / P15 / P16 remain future phases.

## 13. Research-only wording

Allowed wording:

- Diagnostic clarity threshold.
- Voiced / unvoiced diagnostic refinement.
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

This third improvement source decision does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 15. Non-goals

P13m does not do any of the following:

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
- Clarity threshold implementation.
- Confidence calibration implementation.
- Smoothing implementation changes.
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
