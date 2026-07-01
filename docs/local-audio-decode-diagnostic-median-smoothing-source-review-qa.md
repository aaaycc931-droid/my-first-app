# P13j Diagnostic Median Smoothing Source Review QA

## 1. Purpose

This document records the P13j docs-only source review QA for the P13i runtime diff: **P13i Tiny Isolated Diagnostic Median Smoothing Implementation**.

P13j does not implement code. It does not modify runtime behavior, route behavior, UI copy, file selection, decode behavior, **Extract pitch frames** behavior, disabled / enabled gating, the pitch extraction algorithm, Practice Mode, `TargetPitchCurve` generation, note segmentation, scoring, upload / cloud / AI behavior, dependencies, real audio, WAV fixtures, `metadata.local.json`, or APK / WebView claims.

## 2. Review result

- Result: Pass.
- Reviewed change: P13i Tiny Isolated Diagnostic Median Smoothing Implementation.
- Scope: `/research/local-audio-decode` pitch-frame diagnostics only.
- Review type: source review QA.
- No runtime code changes in P13j.

## 3. Files reviewed

P13i files reviewed:

- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.
- `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.
- `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.
- Documentation updates, including `docs/local-audio-decode-second-pitch-improvement-source-decision.md` and `docs/mvp-status.md`.

No unexpected P13i changes were found:

- No `app/research/local-audio-decode/page.tsx` change.
- No `app/practice/page.tsx` change.
- No homepage / navigation file change.
- No `/api/recognize` change.
- No `package.json` / `package-lock.json` change.
- No WAV fixture committed.
- No real audio committed.
- No `metadata.local.json` committed.

## 4. Helper purity review

Reviewed `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.

Confirmed:

- `smoothDiagnosticFrequencies` is pure.
- No browser API is used by the helper module.
- No network behavior is used by the helper module.
- No storage behavior is used by the helper module.
- No upload behavior is used by the helper module.
- No AI API behavior is used by the helper module.
- No external dependency is used by the helper module.
- P13d constants remain unchanged:
  - `DIAGNOSTIC_MIN_FREQUENCY_HZ = 50`.
  - `DIAGNOSTIC_MAX_FREQUENCY_HZ = 1200`.
- `isValidDiagnosticFrequencyEstimate` still rejects:
  - non-finite values.
  - non-positive values.
  - values below 50 Hz.
  - values above 1200 Hz.
- Summary filtering still uses only valid diagnostic frequencies.
- Summary returns null min / median / max when no valid diagnostic estimates remain.

Confirmed the helper does not do:

- note segmentation.
- `TargetPitchCurve` generation.
- scoring.
- melody recognition.
- formal pitch recognition.
- Practice Mode result generation.

## 5. Smoothing behavior review

Confirmed smoothing behavior:

- Smoothing only applies to valid diagnostic frequency estimates.
- The current frame must be valid; otherwise output remains `null` / invalid-excluded.
- Previous and next frames must both be valid for the 3-frame median to apply.
- Edge frames are preserved or handled without inventing values.
- Null / invalid / unvoiced frames are preserved.
- Smoothing does not create voiced pitch from silence.
- Smoothing does not smooth across unvoiced gaps.
- Out-of-range values remain excluded.
- Invalid values are not included in the smoothing window.
- `0 Hz` is not used as a fallback.
- Smoothing remains diagnostic-only.

## 6. LocalAudioDecodeFileInputShell integration review

Reviewed runtime component integration in `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.

Confirmed:

- The component only imports / uses the smoothing and summary helpers for the diagnostic extraction / summary path.
- File selection behavior is unchanged.
- Decode metadata behavior is unchanged.
- **Extract pitch frames** behavior is unchanged except that diagnostic smoothing is applied inside the extraction / summary path.
- Disabled / enabled gating is unchanged.
- No automatic decoding was added.
- No automatic pitch extraction was added.
- No route behavior changed.
- No UI copy changed.
- No layout changed.
- No state-machine expansion was found.
- No new upload / cloud / AI / network / storage logic was added.
- No Practice Mode integration was added.

Additional checks:

- No new or modified `useState`, `useEffect`, `useMemo`, or `useCallback` was found beyond the existing component state / memoization surface.
- No handler behavior changed except applying diagnostic smoothing inside extraction / summary.
- Invalid / out-of-range estimates still do not enter the valid voiced frequency list.
- Min / median / max use guarded + smoothed valid diagnostic frequencies only.
- No misleading `0 Hz` summary is produced when no valid estimates remain.
- Analyzed duration and frame count semantics are preserved.
- Voiced / unvoiced counts remain diagnostic only.

## 7. Algorithm scope review

Confirmed P13i only implements:

- conservative diagnostic 3-frame median smoothing.
- smoothing over valid diagnostic frequencies only.
- preservation of null / unvoiced / invalid frames.
- valid-only diagnostic summary path.

Confirmed P13i does not implement:

- note segmentation.
- `TargetPitchCurve` generation.
- scoring.
- melody recognition.
- formal pitch recognition.
- octave correction.
- window / hop size changes.
- confidence calibration system.
- new external pitch library.
- Practice Mode integration.

P13i did not change broader extraction behavior beyond guarded diagnostic smoothing; no follow-up is needed from source review.

## 8. Synthetic check review

Reviewed `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.

Confirmed:

- Uses generated / in-memory values only.
- No WAV fixture is committed.
- No real audio is committed.
- No `metadata.local.json` is committed.
- No external dependency is used.
- No `package.json` change is required.
- P13d guard tests still pass.
- Tests cover stable clean values.
- Tests cover one-frame valid outlier reduction.
- Tests cover null preservation.
- Tests cover no smoothing across unvoiced gaps.
- Tests cover invalid / out-of-range exclusion.
- Tests cover no pitch creation from silence.
- Tests cover smoothed diagnostic summary behavior.
- Tests avoid product claims and scoring language.

## 9. Product boundary review

Confirmed P13i remains:

- research-only.
- local browser pitch-frame diagnostics.
- diagnostic smoothing / diagnostic frame stability improvement.
- not formal pitch recognition.
- not melody recognition.
- not an audio import product feature.
- not Practice Mode audio import.
- not singing score.
- not `TargetPitchCurve` generation.
- not note segmentation.
- not APK-ready.

## 10. Practice Mode boundary review

Confirmed:

- `app/practice/page.tsx` is untouched.
- `currentMelodyStepIndex` is untouched.
- Record / Estimate is untouched.
- Attempt history is untouched.
- Target playback is untouched.
- Static pitch trend preview is untouched.
- No Practice Mode scoring was added.
- No Practice Mode import link was added.

## 11. Local-only / network boundary review

Confirmed:

- No upload / cloud / AI / server storage code was added.
- No account requirement was added.
- No network request was added.
- No file persistence was added.
- No real audio was committed.

## 12. Dependency / package boundary review

Confirmed:

- No dependencies were added.
- No `package.json` changes were made.
- No `package-lock.json` changes were made.
- No new external pitch library was added.

## 13. Known caveats

- 3-frame median smoothing is a research diagnostic stability improvement only.
- Smoothing is not note segmentation.
- Smoothing is not `TargetPitchCurve` generation.
- Smoothing is not formal pitch recognition.
- Smoothing can reduce isolated jitter but may blur rapid real pitch changes.
- Source review does not replace manual browser QA.
- Source review does not prove APK / WebView readiness.

## 14. Result and follow-up

P13i is acceptable as a tiny isolated diagnostic smoothing improvement.

Recommended next step: P13k Manual Browser QA for P13i smoothing behavior.

Do not jump to note segmentation, `TargetPitchCurve`, Practice Mode integration, or scoring.

## 15. Non-goals

P13j does not do:

- runtime code.
- route behavior changes.
- UI copy changes.
- navigation changes.
- homepage link.
- `/practice` link.
- feature flag implementation.
- dev-only guard implementation.
- `package.json` changes.
- `app/research/local-audio-decode` page / component changes.
- `app/practice/page.tsx` changes.
- file input behavior changes.
- decode behavior changes.
- **Extract pitch frames** behavior changes.
- disabled / enabled gating changes.
- automatic decoding.
- automatic pitch extraction.
- pitch extraction algorithm changes.
- synthetic WAV generation.
- committed WAV fixtures.
- new test scripts.
- waveform analysis implementation.
- smoothing implementation changes.
- octave correction.
- note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- live chart rendering.
- converter changes.
- MusicXML parser.
- MIDI import.
- accompaniment playback.
- source separation.
- vocal separation.
- Song Learning Mode implementation.
- cloud upload.
- cloud assessment.
- GPT / AI API.
- formal score.
- rhythm evaluation.
- sight-singing assessment.
- estimator changes in `/practice`.
- Pitchy Practice Mode integration.
- comparison harness changes.
- benchmark gate / tolerance changes.
- `/api/recognize` changes.
- recognition provider union changes.
- PDF upload.
- Audiveris.
- dependency changes.
- real audio commits.
- `metadata.local.json` commits.
- APK-ready claim.
