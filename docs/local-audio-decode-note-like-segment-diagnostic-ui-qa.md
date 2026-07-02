# P14e Note-like Segment Diagnostic UI Source Review + Manual Browser QA

Date: 2026-07-02

P14e is a docs-only QA record for the P14d research-route UI integration. It reviews the source diff and records a real browser manual QA pass for `/research/local-audio-decode` and a `/practice` smoke check.

## Scope and boundaries

- Reviewed core files:
  - `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`
  - `lib/research/local-audio-decode/note-like-segment-diagnostics.ts`
  - `docs/mvp-status.md`
- Reviewed P14d diff range: `099b6f1..424bded`.
- P14d changed only:
  - `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`
  - `docs/mvp-status.md`
- P14e changes only documentation:
  - `docs/local-audio-decode-note-like-segment-diagnostic-ui-qa.md`
  - `docs/mvp-status.md`

P14e does not change runtime code, helper behavior, tests, UI behavior, Practice Mode, `TargetPitchCurve` generation, scoring, package files, dependencies, audio fixtures, real recordings, or `metadata.local.json`.

## 1. Source Review QA

| # | Check | Result | Evidence / conclusion |
|---:|---|---|---|
| 1 | P14d only wires the P14b `deriveNoteLikeSegmentDiagnostics` helper into `/research/local-audio-decode`. | Pass | The P14d runtime diff imports the existing helper and types, derives `noteLikeSegments`, and renders them in the research shell only. |
| 2 | Integration only occurs in the research route. | Pass | The only runtime file changed by P14d is `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`. |
| 3 | Helper input comes from already-smoothed diagnostic frequency frames. | Pass | `diagnosticFrames` are built from `smoothedFrequencies` after `smoothDiagnosticFrequencies(frameFrequencies)`, then passed to `deriveNoteLikeSegmentDiagnostics`. |
| 4 | No pitch extraction algorithm change. | Pass | The autocorrelation frame estimator, frame size, hop size, and extraction loop are unchanged by P14d. |
| 5 | No P13d frequency guard change. | Pass | P14d does not modify `pitch-frame-diagnostics` constants or valid-frequency helper behavior. |
| 6 | No P13i median smoothing change. | Pass | P14d continues to call `smoothDiagnosticFrequencies(frameFrequencies)` and does not modify smoothing implementation. |
| 7 | No P13n clarity / voiced-unvoiced guard change. | Pass | P14d does not alter `isValidDiagnosticVoicedFrame` usage inside the local pitch estimator or clarity helper behavior. |
| 8 | No P14b segmentation semantics change. | Pass | The helper file is unchanged by P14d; the UI consumes helper output only. |
| 9 | No file selection change. | Pass | File input accept list, WAV rejection logic, and `handleFileChange` behavior are unchanged. |
| 10 | No decode metadata action change. | Pass | `handleDecodeMetadata` remains the separate explicit decode action. |
| 11 | No **Extract pitch frames** button behavior change. | Pass | `handleExtractPitchFrames` remains the explicit extraction action; P14d adds derived display data after extraction. |
| 12 | No disabled/enabled gating change. | Pass | `canDecode` and `canExtractPitch` gating remain unchanged. |
| 13 | New UI section is named only `Note-like segment diagnostics`. | Pass | The added section heading uses that exact name. |
| 14 | UI copy clearly says Research-only, not formal note recognition, not melody recognition, and not scoring. | Pass | The section copy states: `Research-only. Not formal note recognition. Not melody recognition. Not scoring.` |
| 15 | Empty state copy is conservative and does not imply recognition failure or scoring failure. | Pass | Empty state says no note-like segment diagnostics are available from the current extracted pitch frames. |
| 16 | Segment count, timing, representative frequency, nearest note label, voiced frame count, bridged null frame count, and diagnostic confidence are diagnostic display only. | Pass | P14d presents these fields inside the research-only diagnostic section and does not feed them into product state. |
| 17 | Nearest note label is not described as a recognized note. | Pass | The UI label is `Nearest note label`, not recognized note. |
| 18 | Diagnostic confidence is not described as score, grade, pass/fail, or correctness. | Pass | The UI label is `Diagnostic confidence` and the boundary copy says the output is not scoring. |
| 19 | No `/practice` integration. | Pass | No `app/practice/page.tsx` changes in P14d; manual smoke check also found `/practice` normal. |
| 20 | No `TargetPitchCurve` generation. | Pass | No target-curve files changed; route copy continues to say no `TargetPitchCurve` generation. |
| 21 | No scoring / grade / pass / fail behavior. | Pass | No scoring files changed; UI copy uses these words only as negative boundary language, not as results. |
| 22 | No `/api/recognize` changes. | Pass | P14d changed no API route files. |
| 23 | No recognition provider union changes. | Pass | P14d changed no recognition provider files. |
| 24 | No homepage / navigation promotion. | Pass | P14d changed no homepage or navigation files. |
| 25 | No `package.json` / `package-lock.json` changes. | Pass | Package files were not changed. |
| 26 | No dependencies. | Pass | No dependency file changes were made. |
| 27 | No real audio fixtures. | Pass | No audio fixtures were committed. The manual QA WAV was generated under `/tmp` only. |
| 28 | No `metadata.local.json`. | Pass | No local metadata file was committed. |
| 29 | No upload / cloud / AI API. | Pass | Source review found no upload/cloud/AI code path; browser Network panel confirmed only local Next.js route/static chunk requests. |
| 30 | No APK/WebView-ready claim. | Pass | P14d status and UI boundaries continue to say APK/WebView readiness is unverified / not APK-ready. |

### Source review conclusion

Pass. P14d is a small research-route-only UI integration of the existing P14b helper. The helper receives already-guarded and already-smoothed diagnostic frames, P14b segmentation semantics are unchanged, and no Practice Mode, target-curve, scoring, package, fixture, upload/cloud/AI, or APK-ready boundary was expanded.

## 2. Manual Browser QA

### Browser QA setup

- Browser automation used for real browser execution: Playwright Chromium 1.55.0 in headless mode.
- App URL: `http://localhost:3000/research/local-audio-decode`.
- Smoke route: `http://localhost:3000/practice`.
- Local manual-test WAVs: `/tmp/p14e-tone.wav` and `/tmp/p14e-silence.wav`, generated outside the repository as short mono WAV files. They were not committed and are not fixtures.
- Dev server command: `npm run dev`.

### Manual browser checks

| # | Check | Result | Observation |
|---:|---|---|---|
| 1 | Page opens normally. | Pass | `/research/local-audio-decode` loaded successfully. |
| 2 | Initial state has no automatic decode, extract, or segment. | Pass | Initial **Extract pitch frames** button was disabled, and no segment output appeared before user actions. |
| 3 | Local WAV file selection works. | Pass | Selecting `/tmp/p14e-tone.wav` displayed selected browser file metadata. |
| 4 | Decode metadata action works. | Pass | Clicking **Decode metadata** produced the `Decoded metadata only` state/output. |
| 5 | **Extract pitch frames** remains disabled before decoded metadata exists. | Pass | Initial disabled state was `true`. |
| 6 | **Extract pitch frames** can execute after decoded metadata exists. | Pass | After decode, disabled state was `false`; clicking it produced diagnostics. |
| 7 | Pitch-frame diagnostic output displays normally. | Pass | Diagnostic pitch-frame output and frame-count fields appeared. |
| 8 | New `Note-like segment diagnostics` section displays normally. | Pass | The section appeared after pitch extraction. |
| 9 | If derived segments exist, segment count and segment rows display normally. | Pass | The synthetic 440 Hz WAV produced a segment count and segment row display. |
| 10 | If no segments exist, empty state copy displays normally. | Pass | A generated silent WAV showed segment count `0` and the conservative empty-state copy. |
| 11 | UI copy has no misleading formal note recognition, melody recognition, `TargetPitchCurve`, Practice Mode assessment, score, grade, or pass/fail result claim. | Pass | Boundary terms appeared only as negative disclaimers such as not formal note recognition, not melody recognition, not scoring, no `TargetPitchCurve`, and not Practice Mode state/input. |
| 12 | Network panel shows no upload, cloud call, or AI API call. | Pass | Observed requests were only local Next.js document/static/chunk/hot-update URLs for `/research/local-audio-decode` and `/practice`. |
| 13 | `/practice` smoke check is normal. | Pass | `/practice` opened successfully in the same browser session. |
| 14 | APK/WebView remains unverified; no APK-ready claim. | Pass | Browser QA was desktop/headless Chromium only and does not verify APK/WebView readiness. |

### Network panel observation

Observed browser requests:

- `http://localhost:3000/research/local-audio-decode`
- local `/_next/static/...` CSS/chunk/hot-update assets for the research route
- `http://localhost:3000/practice`
- local `/_next/static/...` CSS/chunk assets for `/practice`

No WAV upload, cloud endpoint, AI API endpoint, `/api/recognize` request, account request, or server-storage request was observed.

### Manual browser QA conclusion

Pass. The voiced WAV manual run exercised the segment-row path, and a generated silent WAV exercised the zero-segment empty-state path. The route opens, selection/decode/extract remains explicit, pitch diagnostics display, note-like segment diagnostics display, Network panel stayed local-only, and `/practice` opened normally.

## 3. Skipped checks

The following checks were intentionally skipped for P14e:

- `npm run validate:local-real-voice-fixtures`
- `npm run validate:local-real-phone-comparison`

Reason: this PR is docs-only QA and does not involve real voice fixtures, real phone comparison, Practice Mode pitch engine changes, real recordings, fixture behavior, runtime code, helper behavior, or test-script behavior.
