# P13e Pitch Diagnostic Guard Source Review QA

## 1. Purpose

This document records the P13e docs-only source review QA for the P13d runtime diff: **Tiny Isolated Pitch Extraction Diagnostic Guard**.

P13e does not implement code, modify runtime behavior, change the pitch extraction algorithm, add tests, generate audio, connect Practice Mode, or make product-readiness claims. It only reviews source boundaries for the P13d diagnostic guard.

## 2. Review result

- Result: **Pass**.
- Reviewed change: P13d Tiny Isolated Pitch Extraction Diagnostic Guard.
- Scope: `/research/local-audio-decode` pitch-frame diagnostics only.
- Review type: source review QA.
- P13e runtime changes: **none**.

## 3. Files reviewed

P13d files reviewed:

- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.
- `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.
- `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.
- Documentation updates in `docs/local-audio-decode-pitch-extraction-algorithm-source-decision.md` and `docs/mvp-status.md`.

No unexpected P13d changes were found in these boundary areas:

- No `app/research/local-audio-decode/page.tsx` change.
- No `app/practice/page.tsx` change.
- No homepage or navigation file change.
- No `/api/recognize` change.
- No `package.json` or `package-lock.json` change.
- No WAV fixture committed.
- No real audio committed.
- No `metadata.local.json` committed.

## 4. Helper review

Reviewed helper: `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.

Confirmed:

- The helper is pure.
- It uses no browser API.
- It uses no network request.
- It uses no storage.
- It performs no upload.
- It calls no AI API.
- It adds no dependency.
- Constants are research diagnostic bounds only.
- `DIAGNOSTIC_MIN_FREQUENCY_HZ = 50`.
- `DIAGNOSTIC_MAX_FREQUENCY_HZ = 1200`.
- Non-finite values are invalid.
- Non-positive values are invalid.
- Values below the diagnostic minimum are invalid.
- Values above the diagnostic maximum are invalid.
- Summary generation filters invalid values before computing frequency stats.
- Summary generation returns `null` min / median / max when no valid diagnostic estimates remain.

Confirmed the helper does not perform:

- Note segmentation.
- `TargetPitchCurve` generation.
- Scoring.
- Melody recognition.
- Formal pitch recognition.
- Practice Mode result generation.

## 5. `LocalAudioDecodeFileInputShell` review

Reviewed runtime component: `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.

Confirmed:

- The component only imports and uses the diagnostic guard/helper for pitch-frame diagnostics.
- File selection behavior remains unchanged.
- Decode metadata behavior remains unchanged.
- **Extract pitch frames** behavior remains an explicit separate action.
- Disabled / enabled gating remains unchanged.
- No automatic decoding was added.
- No automatic pitch extraction was added.
- No route behavior changed.
- No UI copy changed as part of P13e.
- No layout changed as part of P13e.
- No state-machine expansion was added by P13e.
- No upload, cloud, AI, network, or storage logic was added.
- No Practice Mode integration was added.

Detailed source checks:

- No new or modified `useState`, `useEffect`, `useMemo`, or `useCallback` behavior was found beyond the existing diagnostic integration shape.
- Handler behavior remains limited to applying diagnostic frequency validity during extraction.
- Invalid and out-of-range estimates do not enter the valid voiced frequency list.
- Min / median / max are computed from valid diagnostic frequencies only.
- No misleading `0 Hz` summary is produced when no valid estimates remain.
- Analyzed duration and frame count semantics are preserved.
- Voiced / unvoiced counts remain diagnostic only.

## 6. Algorithm scope review

Confirmed P13d only implements:

- Conservative diagnostic frequency bounds.
- Validity filtering.
- Diagnostic voiced / unvoiced guard behavior.
- Valid-only frequency summary.

Confirmed P13d does not implement:

- Smoothing or median filtering across frames.
- Octave correction.
- Window or hop size change.
- New external pitch library.
- Confidence calibration system.
- Note segmentation.
- `TargetPitchCurve` generation.
- Scoring.

The lag search remains bounded by the same diagnostic minimum and maximum frequency constants and does not rewrite the extractor broadly. No broader algorithm change requiring follow-up was found.

## 7. Synthetic check review

Reviewed script: `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.

Confirmed:

- It uses generated / in-memory values only.
- No WAV fixture is committed.
- No real audio is committed.
- No `metadata.local.json` is committed.
- No external dependency is used.
- No `package.json` change is required.
- Checks cover empty / silence-like summary behavior.
- Checks cover a clean A4-like generated signal or valid diagnostic frequency.
- Checks cover out-of-range filtering.
- Checks cover non-finite and invalid filtering.
- Checks avoid product claims and scoring language.

## 8. Product boundary review

Confirmed P13d remains:

- Research-only.
- Local browser pitch-frame diagnostics.
- A diagnostic frequency guard.
- Not formal pitch recognition.
- Not melody recognition.
- Not an audio import product feature.
- Not Practice Mode audio import.
- Not a singing score.
- Not `TargetPitchCurve` generation.
- Not APK-ready.

## 9. Practice Mode boundary review

Confirmed:

- `app/practice/page.tsx` is untouched.
- `currentMelodyStepIndex` is untouched.
- Record / Estimate behavior is untouched.
- Attempt history is untouched.
- Target playback is untouched.
- Static pitch trend preview is untouched.
- No Practice Mode scoring was added.
- No Practice Mode import link was added.

## 10. Local-only / network boundary review

Confirmed:

- No upload, cloud, AI, or server storage code was added.
- No account requirement was added.
- No network request was added.
- No file persistence was added.
- No real audio was committed.

## 11. Dependency / package boundary review

Confirmed:

- No dependencies were added.
- No `package.json` changes were made.
- No `package-lock.json` changes were made.
- No new external pitch library was added.

## 12. Known caveats

- The 50–1200 Hz bounds are research diagnostic candidate bounds, not a formal vocal range or scoring standard.
- Confidence calibration remains future work beyond the existing autocorrelation clarity threshold.
- Source review does not replace manual browser QA.
- Source review does not prove APK/WebView readiness.

## 13. Result and follow-up

Because this review passes, P13d is acceptable as a tiny isolated diagnostic guard for `/research/local-audio-decode` pitch-frame diagnostics.

Recommended next step: **P13f Manual Browser QA for P13d guard behavior**.

Do not jump to note segmentation, `TargetPitchCurve`, Practice Mode integration, or scoring.

## 14. Non-goals

P13e does not do any of the following:

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
- Smoothing implementation.
- Octave correction.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- MusicXML parser changes.
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
- Audiveris integration.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
- APK-ready claim.
