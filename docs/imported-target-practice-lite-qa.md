# P18c Imported Target Practice Lite Source Review + Manual Browser QA

Date: 2026-07-02

Scope: docs-only source review plus user-completed real browser / Vercel Preview manual QA and DevTools Network panel QA for the P18b imported target practice lite runtime.

This document records QA results only. It does not change runtime code, `/practice`, `/research/local-audio-decode`, parser behavior, converter behavior, scoring, pitch comparison, attempt history, piano runtime, `/piano`, upload/cloud/AI/API/account/database behavior, package files, dependencies, audio fixtures, or `metadata.local.json`.

## 1. Source Review QA

All items below are PASS.

| # | Check | Result |
|---:|---|---|
| 1 | P18b runtime only modifies `/practice`. | PASS |
| 2 | `importedPracticeLiteActive` defaults to `false`. | PASS |
| 3 | `selectedImportedSegmentIndex` defaults to `null`. | PASS |
| 4 | Only clicking 「使用导入预览练习」 enters imported practice lite. | PASS |
| 5 | Imported preview cannot enter lite mode when absent. | PASS |
| 6 | Invalid imported preview cannot enter lite mode. | PASS |
| 7 | Entering lite mode defaults to the first segment. | PASS |
| 8 | User can switch segments. | PASS |
| 9 | `selectedImportedSegment` is a local derived result, suitable for future piano components to read target pitch. | PASS |
| 10 | Clicking 「退出导入练习预览」 only exits lite state. | PASS |
| 11 | Clicking 「清除导入预览」 removes `sessionStorage`, exits lite, clears selected segment, and clears imported preview. | PASS |
| 12 | Imported preview data changes exit lite mode and reset selected segment. | PASS |
| 13 | `importedPracticeLiteActive` does not change `currentMelodyStepIndex`. | PASS |
| 14 | `importedPracticeLiteActive` does not replace mock melody targets. | PASS |
| 15 | `importedPracticeLiteActive` does not write attempt history. | PASS |
| 16 | `importedPracticeLiteActive` does not trigger pitch comparison. | PASS |
| 17 | `importedPracticeLiteActive` does not trigger scoring. | PASS |
| 18 | Original previous / next / restart controls are not broken. | PASS |
| 19 | Original target playback is not broken. | PASS |
| 20 | Local attempt history UI is not broken. | PASS |
| 21 | Manual pasted JSON fallback is not broken. | PASS |
| 22 | P16i parser contract is unchanged. | PASS |
| 23 | `parseResearchTargetCurveHandoffJson` is not modified. | PASS |
| 24 | Parser is not bypassed. | PASS |
| 25 | Raw `sessionStorage` JSON is not directly trusted. | PASS |
| 26 | Source still accepts only `local-audio-decode-note-like-segments`. | PASS |
| 27 | `diagnosticConfidence` still allows only `normal` or `low`. | PASS |
| 28 | `high` / `medium` are still rejected. | PASS |
| 29 | Invalid JSON is not thrown to the caller. | PASS |
| 30 | No converter behavior changes. | PASS |
| 31 | No formal `TargetPitchCurve` runtime integration. | PASS |
| 32 | No formal Practice Mode audio import. | PASS |
| 33 | No scoring files. | PASS |
| 34 | No package / dependency changes. | PASS |
| 35 | No audio fixtures changes. | PASS |
| 36 | No `metadata.local.json` changes. | PASS |
| 37 | No `/api/recognize` changes. | PASS |
| 38 | No upload / cloud / AI / API / account / database behavior. | PASS |
| 39 | No piano runtime. | PASS |
| 40 | No `/piano` route. | PASS |
| 41 | No MIDI. | PASS |
| 42 | No recording management. | PASS |
| 43 | No APK-ready claim. | PASS |
| 44 | User-visible copy is Chinese. | PASS |
| 45 | No misleading score / grade / pass / fail / correct / wrong / 正式评分 / 通过 / 失败 / 正确 / 错误 copy. | PASS |

## 2. Manual Browser QA Result

Environment: real browser on Vercel Preview, completed by the user.

All items below are PASS.

| # | Check | Result |
|---:|---|---|
| 1 | `/practice` opens normally with no imported preview. | PASS |
| 2 | Original mock melody flow works. | PASS |
| 3 | Previous / next / restart work. | PASS |
| 4 | Target playback works. | PASS |
| 5 | Local attempt history UI works. | PASS |
| 6 | `/research/local-audio-decode` can complete the original flow. | PASS |
| 7 | Clicking 「发送到练习页预览」 navigates to `/practice` normally. | PASS |
| 8 | `/practice` shows 「本地导入的练习目标预览」. | PASS |
| 9 | Valid imported preview shows 「使用导入预览练习」. | PASS |
| 10 | Clicking it enters 「导入练习预览」. | PASS |
| 11 | First segment is selected by default. | PASS |
| 12 | Segment list displays normally. | PASS |
| 13 | Each segment displays target pitch, time range, duration, and diagnostic confidence. | PASS |
| 14 | Currently selected segment has a clear indicator. | PASS |
| 15 | Clicking another segment switches selection. | PASS |
| 16 | Current imported segment details update with selection. | PASS |
| 17 | Clicking 「退出导入练习预览」 exits lite state. | PASS |
| 18 | Imported preview remains after exit. | PASS |
| 19 | Imported practice lite can be entered again after exit. | PASS |
| 20 | Clicking 「清除导入预览」 removes imported preview. | PASS |
| 21 | Clicking 「清除导入预览」 also exits imported practice lite. | PASS |
| 22 | Clearing removes `sessionStorage` preview data. | PASS |
| 23 | Clearing does not leave a stale selected segment. | PASS |
| 24 | Manual pasted JSON fallback remains visible and usable as a development/debug entry. | PASS |
| 25 | No scoring copy appears. | PASS |
| 26 | No misleading formal audio import, formal scoring, or formal practice target replacement copy appears. | PASS |
| 27 | Chinese copy has no obvious leftover English. | PASS |

## 3. Network Panel QA Result

Environment: real browser DevTools Network panel on Vercel Preview, observed by the user.

All items below are PASS.

| # | Check | Result |
|---:|---|---|
| 1 | Opening `/practice` did not show P18b-added upload/cloud/AI/API/account/database requests. | PASS |
| 2 | Clicking 「使用导入预览练习」 did not show an upload request. | PASS |
| 3 | Clicking 「使用导入预览练习」 did not show cloud / AI API / account / database / server-storage requests. | PASS |
| 4 | Switching imported segment did not show upload/cloud/AI/API/account/database requests. | PASS |
| 5 | Clicking 「退出导入练习预览」 did not show upload/cloud/AI/API/account/database requests. | PASS |
| 6 | Clicking 「清除导入预览」 did not show upload/cloud/AI/API/account/database requests. | PASS |
| 7 | Previous / next / restart / target playback did not trigger P18b-added network behavior. | PASS |
| 8 | No `/api/recognize` request was observed. | PASS |
| 9 | Imported practice lite is browser-local state plus validated `sessionStorage` preview flow and does not go through the server. | PASS |

## 4. Conclusion

P18c PASS:

- Imported Target Practice Lite runtime QA completed.
- 「使用导入预览练习」 works.
- 「导入练习预览」 works.
- Segment list and segment selection work.
- Current imported segment details update correctly.
- 「退出导入练习预览」 works.
- 「清除导入预览」 exits lite mode and clears imported preview.
- Existing mock melody flow remains intact.
- Existing target playback remains intact.
- No attempt history writes.
- No pitch comparison integration.
- No scoring.
- No formal `TargetPitchCurve` integration.
- No formal Practice Mode audio import.
- No piano runtime.
- No `/piano` route.
- No upload/cloud/AI/API/account/database behavior observed.
- Chinese UI remains clear.
- This remains internal research practice preview, not user-facing release.

Explicit non-claims:

- This is still not formal scoring.
- This is still not formal sight-singing assessment.
- This is still not formal Practice Mode audio import.
- This is still not Song Learning Mode.
- This is still not APK-ready.
- This is still not an external user-facing release.
