# P13c Pitch Extraction Algorithm Source Decision

## 1. Purpose

P13c decides the first tiny isolated pitch extraction algorithm improvement direction for `/research/local-audio-decode` decoded WAV pitch-frame extraction accuracy and stability work.

This document is a source decision only. P13c does not implement code, change the extractor, add tests, generate synthetic WAV files, commit WAV fixtures, change route behavior, change UI copy, change file selection, change decode behavior, change **Extract pitch frames** behavior, change disabled / enabled gating, integrate Practice Mode, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or commit real audio.

## 2. Current baseline

The current baseline remains:

- Route: `/research/local-audio-decode`.
- Browser-local decoded WAV research POC.
- File selection, decode metadata, and **Extract pitch frames** are separate explicit user actions.
- **Extract pitch frames** is gated behind decoded metadata.
- The current extractor is a tiny local diagnostic extractor in `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.
- The current local helper shape includes frame size, hop size, diagnostic pitch range, and autocorrelation clarity constants, then summarizes nullable pitch-frame frequency diagnostics.
- Output remains pitch-frame diagnostics.
- No Practice Mode integration.
- No `TargetPitchCurve` generation.
- No note segmentation.
- No scoring.
- No upload, cloud, or AI behavior.

## 3. Decision summary

Chosen:

**Option A — Conservative frequency bounds + confidence / voiced-unvoiced guard for diagnostic frames.**

Future P13d should only make one small, conservative, isolated algorithm improvement:

- Define or refine safe diagnostic frequency bounds.
- Avoid treating obviously invalid frequency estimates as valid voiced pitch.
- Keep uncertain frames as unvoiced, low-confidence, or invalid diagnostics according to the existing data shape.
- Avoid expanding output into notes, melody, `TargetPitchCurve`, score, or Practice Mode result.
- Keep the route research-only.

Deferred:

- Smoothing / median filtering.
- Octave error correction.
- Window / hop size changes.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Formal scoring.
- New external pitch library.
- Dependency changes.
- APK / WebView claims.

## 4. Options considered

### Option A: Frequency bounds + confidence / voiced-unvoiced guard

Description:

- Add conservative diagnostic validation around estimated frequencies.
- Treat out-of-range or unstable / low-confidence candidates as not reliable voiced pitch.
- Preserve nullable diagnostic output where appropriate.
- Keep output diagnostic-only.

Pros:

- Smallest meaningful improvement.
- Easier to reason about.
- Less likely to change route behavior.
- Helps avoid obviously bad frequency summaries.
- Does not imply note segmentation.
- Does not require a new dependency.
- Fits P13b synthetic cases such as silence, low amplitude, noisy sine, and octave stress.

Risks:

- Bounds may drop valid extreme low / high notes if too strict.
- Confidence threshold may be arbitrary if over-specified.
- Should be described as a diagnostic guard, not a formal accuracy guarantee.

Suggested future mitigation:

- Use conservative default bounds.
- Document limits.
- Use synthetic temporary fixtures in P13d tests.
- Avoid exact pitch-score claims.

Decision:

- Choose as the first future tiny isolated algorithm improvement direction.

### Option B: Frame-level smoothing / median filtering

Description:

- Smooth frame-to-frame jitter.

Pros:

- May stabilize noisy outputs.
- Useful for vibrato / noise cases.

Risks:

- Can hide real pitch changes.
- Can blur short notes.
- Can be confused with melody / curve extraction.
- Better after basic validity guards.

Decision:

- Defer.

### Option C: Octave error guard

Description:

- Detect likely 2x / 0.5x jumps.

Pros:

- Important for pitch tracking quality.

Risks:

- More complex.
- Needs neighboring-frame logic.
- Can suppress real jumps.
- Better after fixtures and basic bounds.

Decision:

- Defer.

### Option D: Window / hop size review

Description:

- Adjust analysis window and hop size.

Pros:

- May improve stability / responsiveness.

Risks:

- Can change perceived behavior significantly.
- Needs broader synthetic comparison.
- Can complicate QA.

Decision:

- Defer.

### Option E: New external pitch library

Description:

- Replace or augment the current extractor with a library.

Pros:

- Potentially better accuracy.

Risks:

- Dependency change.
- Bundle / runtime implications.
- Browser compatibility concerns.
- Larger review scope.
- Not appropriate as the first P13 implementation.

Decision:

- Defer.

## 5. Chosen decision details

P13d should be:

- Tiny.
- Isolated.
- Browser-local.
- Diagnostic-only.
- No new dependency.
- No route behavior change.
- No UI copy change unless strictly necessary and separately justified.
- No automatic decode / extract.
- No Practice Mode integration.
- No `TargetPitchCurve`.
- No note segmentation.
- No scoring.

Possible future implementation behavior:

- Define or refine diagnostic min / max frequency range constants.
- Ignore or mark out-of-range estimates as invalid, low-confidence, or unvoiced depending on the existing data shape.
- Avoid including invalid estimates in min / median / max frequency summaries.
- Preserve analyzed duration and frame count semantics.
- Preserve explicit user actions and gating.

P13d should document intended behavior rather than overfitting to exact names if the current code shape suggests a better small local helper design.

## 6. Suggested diagnostic frequency bounds

Future diagnostic bounds should be conservative:

- The lower bound should be low enough for adult low voices / instruments.
- The upper bound should be high enough for normal singing / guide tones.
- Bounds should avoid extreme values that are likely autocorrelation artifacts.

These bounds are not a final scientific standard and are not product settings. Future P13d may start with conservative candidate bounds such as approximately **50–1200 Hz** for diagnostic pitch-frame filtering, subject to source review and synthetic fixture checks.

## 7. Future P13d testing expectations

If P13d touches algorithm behavior, it should include or prepare deterministic temporary synthetic checks using the P13b policy:

- No real audio committed.
- No committed binary WAV unless separately justified.
- Prefer temporary generated synthetic signals.
- Avoid fragile exact equality.
- Use approximate diagnostic ranges.

Recommended minimal future cases:

- Silence.
- Clean A4 sine.
- Low amplitude A4 sine.
- Noisy A4 sine.
- Octave stress case.

## 8. Acceptance criteria for P13d

Future P13d should be considered acceptable only if:

- Algorithm change is tiny and isolated.
- No route behavior changes.
- File / decode / extract actions remain separate.
- **Extract pitch frames** remains gated behind decoded metadata.
- Output remains diagnostic-only.
- Invalid / out-of-range estimates do not pollute frequency summary.
- No note sequence is produced.
- No `TargetPitchCurve` is generated.
- No Practice Mode files are modified.
- No scoring is introduced.
- No upload / cloud / AI behavior is introduced.
- No dependency changes unless separately approved.
- No real audio or `metadata.local.json` is committed.
- Validation commands pass.

## 9. Source review checklist for P13d

Future P13e should review:

- Exact files changed.
- Whether extractor change is isolated.
- Whether state / handlers / gating are unchanged.
- Whether file selection / decode / extract actions are unchanged.
- Whether output copy remains research-only.
- Whether no Practice Mode integration occurred.
- Whether no `TargetPitchCurve`, note segmentation, or scoring appeared.
- Whether synthetic fixtures are temporary / generated only.
- Whether package files remain unchanged unless explicitly approved.

## 10. Manual browser QA checklist for P13f

Future P13f should manually verify:

- Route loads.
- File selection still explicit.
- Decode metadata still explicit.
- **Extract pitch frames** still explicit.
- Gating still works.
- Diagnostic output appears.
- Low-quality / invalid frames do not produce misleading product claims.
- Network panel remains clean if local-only behavior is being revalidated.
- `/practice` smoke check remains unchanged.

## 11. Relationship to P13a and P13b

- P13a identified improvement candidates.
- P13b planned fixture strategy.
- P13c chooses the first improvement direction.
- P13c does not implement the improvement.

## 12. Relationship to P14 / P15 / P16

- P13c does not start note segmentation.
- P13c does not start `TargetPitchCurve` generation.
- P13c does not start Practice Mode integration.
- P14 / P15 / P16 remain future phases.

## 13. Research-only wording

Even after future P13d, allowed wording includes:

- Diagnostic frequency filtering.
- Pitch-frame diagnostic guard.
- Local browser pitch-frame diagnostics.
- Research-only extractor stability improvement.

Avoid wording such as:

- Pitch recognition is live.
- Melody recognized.
- Singing score.
- Correct / wrong singing.
- Practice Mode audio import.
- `TargetPitchCurve` generated.
- APK-ready.
- Product-ready audio import.

## 14. APK / WebView caveat

This algorithm source decision does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 15. Non-goals

P13c does not do:

- Runtime code.
- Route behavior changes.
- UI copy changes.
- Navigation changes.
- Homepage link.
- `/practice` link.
- Feature flag implementation.
- Dev-only guard implementation.
- `package.json` changes.
- `app/research/local-audio-decode` page/component changes.
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
