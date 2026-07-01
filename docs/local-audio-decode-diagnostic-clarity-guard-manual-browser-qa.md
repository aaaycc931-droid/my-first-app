# P13p Manual Browser QA for Diagnostic Clarity Guard

## 1. Purpose

This document records P13p manual browser QA coverage for the P13n / P13o diagnostic clarity / voiced-unvoiced guard on `/research/local-audio-decode`.

P13p is docs-only. It does not write runtime code, change UI copy meaning, change gating, connect Practice Mode, perform note segmentation, generate `TargetPitchCurve`, or add scoring.

## 2. QA result

- Result: Pass for the documented manual browser QA scope.
- Route tested: `/research/local-audio-decode`.
- Related guard: P13n diagnostic clarity / voiced-unvoiced guard.
- Review baseline: P13o source review QA.
- File used: local-only WAV selected from the tester machine; not committed.
- Practice Mode smoke route: `/practice`.
- Network panel: inspected during the research route flow.
- APK / WebView status: not verified; do not claim APK-ready behavior.

## 3. Manual browser checklist

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | `/research/local-audio-decode` page can open normally. | Pass | Research route loaded in the browser without a route-level error. |
| 2 | Local WAV file selection works normally. | Pass | A local WAV was selectable through the browser file picker; the file was not uploaded or committed. |
| 3 | Decode metadata action works normally. | Pass | Decode metadata completed and displayed decoded metadata. |
| 4 | **Extract pitch frames** stays disabled before decoded metadata exists. | Pass | The extract action remained gated before the decode metadata step. |
| 5 | **Extract pitch frames** can run after decoded metadata exists. | Pass | After decoded metadata was present, the extract action could be executed. |
| 6 | Diagnostic output can display normally. | Pass | Pitch-frame diagnostic output appeared after extraction. |
| 7 | Low-clarity / invalid frames should not create a misleading `0 Hz` summary. | Pass | The diagnostic summary did not present invalid or low-clarity frames as a misleading `0 Hz` voiced-frequency result. |
| 8 | No formal scoring copy appears: score / grade / pass / fail / correct / wrong. | Pass | No formal assessment wording was observed in the research flow. |
| 9 | Page does not claim melody recognition, `TargetPitchCurve` generation, or Practice Mode audio import. | Pass | The page remained research-only and did not expand product claims. |
| 10 | Network panel shows no upload, cloud call, or AI API call. | Pass | No WAV upload, cloud assessment request, or AI API request was observed. |
| 11 | `/practice` smoke check is normal. | Pass | Practice Mode opened normally, confirming this P13 line did not visibly affect `/practice`. |
| 12 | APK / WebView remains unverified. | Pass | No APK / WebView validation was performed; APK-ready behavior must not be claimed. |

## 4. Diagnostic clarity guard conclusion

The browser flow remained usable after the P13n diagnostic clarity / voiced-unvoiced guard. The research route still supports the intended local-only sequence:

1. Open `/research/local-audio-decode`.
2. Select a local WAV.
3. Decode metadata.
4. Run **Extract pitch frames** only after decoded metadata exists.
5. Inspect research-only diagnostic output.

The diagnostic output remained diagnostic-only. Low-clarity or invalid frames were not observed to produce a misleading `0 Hz` voiced-frequency summary.

## 5. Product boundary conclusion

P13p confirmed the research route did not present itself as any of the following:

- formal pitch scoring;
- grade, pass, fail, correct, or wrong assessment;
- melody recognition;
- note segmentation;
- `TargetPitchCurve` generation;
- Practice Mode audio import;
- Practice Mode result generation;
- APK-ready flow.

## 6. Network panel conclusion

The browser Network panel did not show upload, cloud assessment, AI API, or server-side recognition traffic during the tested local WAV decode and pitch-frame diagnostic flow.

This remains a manual browser observation only. It should not be expanded into a claim about Android WebView, packaged APK behavior, or future routes.

## 7. Practice Mode smoke conclusion

The `/practice` route opened normally during smoke checking. No Practice Mode regression was observed from the P13 diagnostic clarity / voiced-unvoiced guard line.

This smoke check does not mean `/research/local-audio-decode` is connected to Practice Mode. It remains separate and research-only.

## 8. Out-of-scope items

P13p does not validate or implement:

- runtime code changes;
- UI copy meaning changes;
- gating changes;
- Practice Mode audio import;
- note segmentation;
- `TargetPitchCurve` generation;
- scoring;
- `/api/recognize` behavior;
- package or dependency changes;
- audio fixture changes;
- `metadata.local.json`;
- APK / WebView readiness.

## 9. Skipped validations

`validate:local-real-voice-fixtures` and `validate:local-real-phone-comparison` were skipped for this P13p docs-only PR because the change only records manual browser QA documentation and does not alter real-voice fixtures, phone-comparison fixtures, pitch benchmark inputs, runtime pitch estimation code, or package dependencies.

## 10. Final status

P13p passes as a docs-only manual browser QA record for the P13 diagnostic clarity / voiced-unvoiced guard. `/research/local-audio-decode` remains a research-only local browser diagnostic route, and APK / WebView readiness remains unverified.
