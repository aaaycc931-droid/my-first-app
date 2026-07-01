# P13o Diagnostic Clarity Guard Source Review QA

## 1. Purpose

This document records the P13o docs-only source review QA for the P13n runtime diff: **Diagnostic Clarity / Voiced-Unvoiced Guard Implementation**.

P13o does not implement code. It does not modify runtime behavior, route behavior, UI copy meaning, file selection, decode metadata, **Extract pitch frames** behavior, disabled / enabled gating, the pitch extraction algorithm, Practice Mode, `TargetPitchCurve` generation, note segmentation, scoring, dependencies, real audio, WAV fixtures, `metadata.local.json`, or APK / WebView readiness claims.

## 2. Review result

- Result: **Pass**.
- Reviewed change: P13n Diagnostic Clarity / Voiced-Unvoiced Guard Implementation.
- Scope: `/research/local-audio-decode` pitch-frame diagnostics only.
- Review type: source review QA.
- P13o runtime changes: **none**.
- APK / WebView status: **unverified**; this review must not be used to claim APK-ready behavior.

## 3. Files reviewed

P13n source areas reviewed:

- `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.
- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.
- `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.
- P13n documentation/status context, including `docs/mvp-status.md`.

No unexpected P13n changes were found in these boundary areas:

- No `app/practice/page.tsx` change.
- No `/api/recognize` change.
- No recognition provider union change.
- No `package.json` or `package-lock.json` change.
- No WAV fixture committed.
- No real audio committed.
- No `metadata.local.json` committed.

## 4. Diagnostic clarity threshold review

Confirmed:

- `DIAGNOSTIC_MIN_CLARITY = 0.62` is present.
- The 0.62 clarity threshold is a **research diagnostic threshold** for local pitch-frame diagnostics.
- The threshold is not a formal pitch recognition standard.
- The threshold is not a singing accuracy standard.
- The threshold is not a Practice Mode scoring threshold.
- The threshold is not a grade / pass / fail rule.

## 5. Helper behavior review

Reviewed `lib/research/local-audio-decode/pitch-frame-diagnostics.ts`.

Confirmed:

- `isReliableDiagnosticClarity` performs only numeric clarity reliability checking.
- `isReliableDiagnosticClarity` requires finite numeric clarity.
- `isReliableDiagnosticClarity` requires clarity greater than or equal to `DIAGNOSTIC_MIN_CLARITY`.
- `isReliableDiagnosticClarity` does not inspect frequency.
- `isReliableDiagnosticClarity` does not do note segmentation, target-curve generation, scoring, melody recognition, or Practice Mode work.
- `isValidDiagnosticVoicedFrame` requires both frequency validity and clarity reliability.
- `isValidDiagnosticVoicedFrame` keeps P13d frequency validity as part of voiced-frame eligibility.
- Low-clarity candidates are not valid diagnostic voiced frames.

## 6. P13d frequency guard preservation review

Confirmed P13d diagnostic frequency bounds remain unchanged:

- `DIAGNOSTIC_MIN_FREQUENCY_HZ = 50`.
- `DIAGNOSTIC_MAX_FREQUENCY_HZ = 1200`.

Confirmed invalid estimates remain rejected:

- Non-finite values are rejected.
- Non-positive values are rejected.
- Values below 50 Hz are rejected.
- Values above 1200 Hz are rejected.
- Out-of-range estimates do not enter valid diagnostic frequency summaries.

## 7. P13i smoothing preservation review

Reviewed `smoothDiagnosticFrequencies` behavior.

Confirmed:

- It still accepts `Array<number | null>`.
- `null` frames remain `null`.
- Invalid frames remain excluded as `null`.
- Low-clarity frames become `null` before smoothing because they fail `isValidDiagnosticVoicedFrame` in the extraction path.
- The current frame must be a valid diagnostic frequency to be smoothed.
- Previous and next frames must both be valid diagnostic frequencies for the 3-frame median smoothing window.
- Smoothing does not cross `null`, invalid, unvoiced, or low-clarity gaps.
- Smoothing does not create a voiced pitch from unvoiced frames.
- Smoothing does not create a voiced pitch from low-clarity frames.
- The P13i tiny 3-frame median behavior was not broadened into note segmentation, target curve generation, or scoring.

## 8. Extraction and summary path review

Reviewed `LocalAudioDecodeFileInputShell` diagnostic extraction path.

Confirmed:

- Low-clarity candidates return `null` from the frame estimator.
- Low-clarity candidates do not enter the valid voiced list.
- Low-clarity candidates do not enter the smoothed diagnostic frequency list as numeric values.
- Low-clarity candidates do not pollute min / median / max summary.
- `summarizeDiagnosticFrequencies` computes min / median / max only from valid diagnostic frequencies.
- When no valid diagnostic frequencies remain, the summary values stay `null` rather than reporting misleading `0 Hz` values.
- Voiced / unvoiced counts remain diagnostic-only metadata.
- The integration remains tiny and research-only inside the local audio decode research shell.

## 9. UI, gating, and route boundary review

Confirmed P13n did not change:

- UI copy meaning or content.
- File selection behavior.
- Decode metadata behavior.
- **Extract pitch frames** button behavior.
- Disabled / enabled gating.
- Route behavior.
- `/api/recognize`.
- Recognition provider union.
- Practice Mode.
- `/practice` integration.
- Note segmentation.
- `TargetPitchCurve` generation.
- Scoring, grade, pass, or fail behavior.

## 10. Synthetic in-memory check review

Reviewed `scripts/test-local-audio-decode-pitch-diagnostic-guard.ts`.

Confirmed the checks use generated / in-memory values only and cover:

- Clarity threshold inclusivity at `DIAGNOSTIC_MIN_CLARITY`.
- Low-clarity rejection below the threshold.
- Non-finite clarity rejection.
- Low-clarity candidate exclusion from valid voiced summary.
- Out-of-range frequency rejection.
- Invalid / non-finite / non-positive estimate rejection from summary.
- Low-clarity summary exclusion.
- Preservation of P13i clean smoothing behavior.
- Null frame preservation.
- No smoothing across unvoiced gaps.
- No smoothing across a low-clarity gap.
- No pitch creation from silence.
- Valid-only smoothed summary behavior.

Confirmed the script does not require:

- Real audio.
- WAV fixtures.
- `metadata.local.json`.
- New dependencies.
- `package.json` changes.
- `package-lock.json` changes.

## 11. Dependency and fixture boundary review

Confirmed:

- No dependencies were added.
- No `package.json` change was required by P13n.
- No `package-lock.json` change was required by P13n.
- No WAV fixture was added.
- No real audio was added.
- No metadata.local.json was added.

## 12. Product boundary review

Confirmed P13n remains:

- Research-only.
- Local-only.
- Diagnostic-only.
- A voiced / unvoiced diagnostic clarity guard for local decoded WAV pitch-frame diagnostics.
- Not formal pitch recognition.
- Not Practice Mode audio import.
- Not note segmentation.
- Not `TargetPitchCurve` generation.
- Not scoring.
- Not a grade / pass / fail system.
- Not APK-ready.

## 13. Known caveats

- Source review QA does not replace manual browser QA.
- Source review QA does not validate real singing accuracy.
- Source review QA does not validate device microphone behavior.
- Source review QA does not validate APK / WebView behavior.
- The diagnostic clarity threshold can reject low-clarity pitch-like candidates, but it is still only a research diagnostic reliability gate.

## 14. Result and follow-up

Because this review passes, P13n is acceptable as a tiny isolated diagnostic clarity / voiced-unvoiced guard for `/research/local-audio-decode` pitch-frame diagnostics.

Recommended follow-up, if needed, is manual browser QA for the research shell only. Do not jump to Practice Mode integration, note segmentation, `TargetPitchCurve` generation, scoring, real audio fixtures, dependencies, or APK-ready claims.
