# P15e Research Target Pitch Curve Diagnostic UI Source Review + Manual Browser QA

## Scope

P15e is a docs-only close-out QA step for the P15d research route UI integration. It reviews the P15d source diff and records a real browser manual QA run for `/research/local-audio-decode`.

Allowed files for this PR are limited to this QA document and `docs/mvp-status.md`. P15e does not change runtime code, UI behavior, converter behavior, segmentation helper behavior, test scripts, `/practice`, formal `TargetPitchCurve` runtime files, scoring, package files, dependencies, audio fixtures, or `metadata.local.json`.

Reviewed core files:

- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`
- `lib/research/local-audio-decode/research-target-pitch-curve-diagnostics.ts`
- `lib/research/local-audio-decode/note-like-segment-diagnostics.ts`
- `docs/local-audio-decode-target-pitch-curve-generation-plan.md`
- `docs/mvp-status.md`

## 1. Source Review QA

### Source review conclusion

Pass. P15d only wires the existing P15b `convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic` converter into the isolated `/research/local-audio-decode` research route. The converter input comes from P14d note-like segment diagnostics already derived after the explicit **Extract pitch frames** action. The integration remains research-only and does not change pitch extraction, guarding, smoothing, segmentation, converter semantics, Practice Mode, formal `TargetPitchCurve` runtime behavior, scoring, package files, dependencies, fixtures, metadata, upload/cloud/AI behavior, or release-readiness claims.

### Checklist

| # | Check | Result | Notes |
| --- | --- | --- | --- |
| 1 | P15d only connects P15b `convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic` to `/research/local-audio-decode`. | Pass | The route imports the P15b converter and calls it from local research diagnostics only. |
| 2 | Integration only happens in the research route. | Pass | No `/practice` or production route integration was found in the reviewed diff scope. |
| 3 | Converter input comes from P14d already-generated note-like segment diagnostics. | Pass | `noteLikeSegments` are derived first and then passed to the converter. |
| 4 | No pitch extraction algorithm change. | Pass | P15d adds conversion/display after extraction rather than changing extraction. |
| 5 | No P13d frequency guard change. | Pass | Frequency guard constants/helper usage are not changed by P15d. |
| 6 | No P13i median smoothing change. | Pass | Existing `smoothDiagnosticFrequencies` flow is preserved. |
| 7 | No P13n clarity / voiced-unvoiced guard change. | Pass | Existing validity guard remains the gate for frame estimates. |
| 8 | No P14b segmentation semantics change. | Pass | `deriveNoteLikeSegmentDiagnostics` behavior is not changed. |
| 9 | No P15b converter semantics change. | Pass | Converter remains one input diagnostic segment to one research target-curve-like segment. |
| 10 | No file selection change. | Pass | File input behavior and accepted WAV gating are unchanged. |
| 11 | No decode metadata action change. | Pass | Decode remains explicit and separate from selection/extraction. |
| 12 | No **Extract pitch frames** button behavior change. | Pass | Extraction remains explicit after decoded metadata exists. |
| 13 | No disabled/enabled gating change. | Pass | Extract remains disabled until decoded audio buffer exists and state is ready. |
| 14 | Added UI section is named `Research target pitch curve diagnostics`. | Pass | Section heading matches this exact name. |
| 15 | UI copy states Research-only, not formal `TargetPitchCurve` generation, not Practice Mode integration, and not scoring. | Pass | Boundary copy is explicit in the new section. |
| 16 | Empty state copy is conservative. | Pass | It says no diagnostics are available from current note-like segment diagnostics, without implying product failure or scoring failure. |
| 17 | Curve source, segment count, total duration, low confidence count, target frequency, target note label, diagnostic confidence, source frame count, and bridged null frame count are diagnostic display only. | Pass | They are displayed under the research diagnostic section only. |
| 18 | Target note label is not described as a recognized note. | Pass | It is labeled as a diagnostic target note label. |
| 19 | Diagnostic confidence is not described as score, grade, pass/fail, or correctness. | Pass | It is presented only as diagnostic confidence. |
| 20 | No `/practice` integration. | Pass | No Practice Mode wiring was added. |
| 21 | No Practice Mode audio import. | Pass | UI copy explicitly denies Practice Mode integration/import behavior. |
| 22 | No formal `TargetPitchCurve` generation. | Pass | UI copy explicitly says this is not formal generation. |
| 23 | No formal `TargetPitchCurve` runtime files modified. | Pass | No formal runtime files are part of this docs-only PR. |
| 24 | No scoring / grade / pass / fail. | Pass | Negative boundary copy appears; no scoring behavior was added. |
| 25 | No `/api/recognize` changes. | Pass | No recognize API diff is part of P15d/P15e. |
| 26 | No recognition provider union changes. | Pass | No provider union diff is part of P15d/P15e. |
| 27 | No homepage / navigation promotion. | Pass | Research route remains direct/research-only. |
| 28 | No `package.json` / `package-lock.json` changes. | Pass | No package file changes are intended or committed. |
| 29 | No dependencies. | Pass | No dependency changes are intended or committed. |
| 30 | No real audio fixtures. | Pass | Browser QA used temporary `/tmp` WAV files only. |
| 31 | No `metadata.local.json`. | Pass | None added. |
| 32 | No upload / cloud / AI API. | Pass | Source review and Network panel QA found no such calls. |
| 33 | No APK/WebView-ready claim. | Pass | APK/WebView remains unverified. |

## 2. Manual Browser QA

### Browser QA setup

- Date: 2026-07-02
- Route tested: `http://localhost:3000/research/local-audio-decode`
- Smoke route tested: `http://localhost:3000/practice`
- Browser: headless Chromium driven by Playwright against local Next.js dev server
- Local test audio: temporary generated WAV files under `/tmp`, not committed to the repository
- Network observation: request collection during browser session, checked for upload/cloud/AI/API/account/server-storage patterns

### Manual browser QA conclusion

Pass. The research route opened, stayed idle on initial load, accepted local WAV selection, decoded metadata only after the explicit button click, kept pitch extraction disabled until decoded metadata existed, extracted diagnostic pitch frames after the explicit extraction click, displayed pitch-frame diagnostics, displayed note-like segment diagnostics, displayed the new `Research target pitch curve diagnostics` section, and displayed segment summary/rows for the generated voiced WAV. `/practice` smoke checking remained normal. APK/WebView remains unverified and is not claimed APK-ready.

### Manual browser checklist

| # | Check | Result | Notes |
| --- | --- | --- | --- |
| 1 | Page opens normally. | Pass | `/research/local-audio-decode` loaded successfully. |
| 2 | Initial state has no automatic decode, extract, segment, or target curve diagnostic generation. | Pass | Initial **Extract pitch frames** was disabled and no diagnostic sections were present before actions. |
| 3 | Local WAV file selection works. | Pass | A temporary local WAV could be selected and browser file metadata appeared. |
| 4 | Decode metadata action works. | Pass | Decoded metadata appeared only after pressing **Decode metadata**. |
| 5 | **Extract pitch frames** is disabled before decoded metadata exists. | Pass | Button was disabled on initial load and after selection-before-decode. |
| 6 | **Extract pitch frames** can execute after decoded metadata exists. | Pass | Button became enabled after decode and extraction completed. |
| 7 | Pitch-frame diagnostic output displays normally. | Pass | `Pitch frame diagnostics` section appeared after extraction. |
| 8 | `Note-like segment diagnostics` section displays normally. | Pass | Section appeared after extraction. |
| 9 | `Research target pitch curve diagnostics` section displays normally. | Pass | New section appeared after extraction. |
| 10 | With curve segments, segment count, summary, and segment rows display normally. | Pass | Generated voiced WAV produced curve segment rows and summary fields. |
| 11 | If there are no curve segments, empty state copy is conservative. | Pass | Source review confirms the empty copy is conservative; browser run with voiced WAV exercised the populated state. |
| 12 | UI copy has no misleading product claim for formal generation, Practice Mode import/integration, formal note recognition, melody recognition, score, grade, or pass/fail. | Pass | These phrases appear only as negative boundary copy such as `Not ...` / `no ...`; no product claim was observed. |
| 13 | Network panel shows no upload, cloud call, AI API call, `/api/recognize` request, account request, or server-storage request. | Pass | Observed requests stayed local to the Next.js dev server; no `/api/recognize` request and no external request were observed. |
| 14 | `/practice` smoke check is normal and confirms Practice Mode was not affected. | Pass | `/practice` loaded without application error during the same browser QA session. |
| 15 | APK/WebView remains unverified. | Pass | No APK/WebView-ready claim is made. |

### Network panel conclusion

Pass. During the tested browser session, no upload, cloud call, AI API call, `/api/recognize` request, account request, or server-storage request was observed. The only observed requests were local development-server page/static requests.

### `/practice` smoke check conclusion

Pass. `/practice` loaded in the browser smoke check and did not show an application error. This confirms P15d/P15e did not introduce an observed Practice Mode regression in this QA session.

## Skipped real-audio validations

`validate:local-real-voice-fixtures` and `validate:local-real-phone-comparison` are intentionally skipped for P15e because this PR is docs-only QA and does not affect real voice fixtures, real phone comparison, Practice Mode pitch engine behavior, real recording behavior, or fixture behavior.
