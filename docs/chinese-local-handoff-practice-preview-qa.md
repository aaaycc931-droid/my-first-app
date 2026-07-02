# P16n Chinese one-click local handoff source review and manual browser QA

Date: 2026-07-02

Scope: docs-only source review plus user-reported manual browser QA for the P16m Chinese browser-local handoff from `/research/local-audio-decode` to `/practice`.

This document records review and QA results only. It does not introduce runtime code, UI behavior changes, parser changes, converter changes, scoring, target replacement, audio import, dependencies, package-file changes, audio fixtures, or metadata changes.

## 1. Source Review QA

### `/research/local-audio-decode` handoff source review

| # | Check | Result |
|---:|---|---|
| 1 | P16m only adds the one-click local handoff entry in `/research/local-audio-decode`. | PASS |
| 2 | 「发送到练习页预览」 is only shown or enabled when `ResearchTargetPitchCurveDiagnostic` exists. | PASS |
| 3 | `sessionStorage` write only happens after the user clicks 「发送到练习页预览」. | PASS |
| 4 | The `sessionStorage` key is `practiceResearchTargetCurveDiagnosticPreview`. | PASS |
| 5 | Successful write redirects to `/practice`. | PASS |
| 6 | Write failure displays conservative Chinese error copy. | PASS |
| 7 | There is no automatic `sessionStorage` write. | PASS |
| 8 | There is no `localStorage`. | PASS |
| 9 | There is no upload. | PASS |
| 10 | There is no API call. | PASS |
| 11 | There is no cloud or AI call. | PASS |
| 12 | There is no account, database, or server storage. | PASS |
| 13 | File selection is unchanged. | PASS |
| 14 | Decode metadata action is unchanged. | PASS |
| 15 | Extract pitch frames gating is unchanged. | PASS |
| 16 | Pitch extraction algorithm is unchanged. | PASS |
| 17 | P13 guards are unchanged. | PASS |
| 18 | P14 segmentation semantics are unchanged. | PASS |
| 19 | P15 converter semantics are unchanged. | PASS |
| 20 | Copy/paste JSON fallback remains, but is marked as a developer/debug backup entry. | PASS |

### `/practice` source review

| # | Check | Result |
|---:|---|---|
| 21 | `/practice` reads `sessionStorage` on page load. | PASS |
| 22 | `/practice` re-validates data with P16i `parseResearchTargetCurveHandoffJson`. | PASS |
| 23 | Valid data only displays 「本地导入的练习目标预览」. | PASS |
| 24 | Missing data shows a conservative empty state or no imported preview. | PASS |
| 25 | Invalid data shows a Chinese non-scoring error. | PASS |
| 26 | 「清除导入预览」 removes `sessionStorage` and clears imported preview page state. | PASS |
| 27 | Imported preview does not replace mock melody targets. | PASS |
| 28 | Imported preview does not affect `currentMelodyStepIndex`. | PASS |
| 29 | Imported preview does not write attempt history. | PASS |
| 30 | Imported preview does not participate in pitch comparison. | PASS |
| 31 | Imported preview does not participate in scoring. | PASS |
| 32 | Imported preview does not change previous / next / restart melody behavior. | PASS |
| 33 | Imported preview does not change target note playback. | PASS |
| 34 | Imported preview does not change pitch estimation. | PASS |
| 35 | Imported preview does not change target-aware comparison. | PASS |
| 36 | Imported preview does not declare formal audio import. | PASS |
| 37 | Imported preview does not declare formal `TargetPitchCurve`. | PASS |
| 38 | Imported preview does not declare APK-ready status. | PASS |
| 39 | Manual paste panel remains labeled 「手动粘贴诊断 JSON（开发/调试）」. | PASS |
| 40 | Parser behavior is unchanged. | PASS |
| 41 | `high` / `medium` confidence remain rejected. | PASS |
| 42 | `source` still only accepts `local-audio-decode-note-like-segments`. | PASS |
| 43 | Summary strict validation remains. | PASS |
| 44 | Invalid JSON is not thrown to the caller. | PASS |
| 45 | Error wording remains non-scoring. | PASS |
| 46 | `docs/mvp-status.md` already records “用户便捷交互体验第一优先级”. | PASS |
| 47 | Homepage and P16-related user-visible copy are oriented toward Chinese users. | PASS |
| 48 | JSON copy/paste is no longer the normal-user main flow. | PASS |
| 49 | There is no formal `TargetPitchCurve` integration. | PASS |
| 50 | There is no scoring / grade / pass / fail. | PASS |
| 51 | There is no user pitch alignment. | PASS |
| 52 | There is no rhythm assessment. | PASS |
| 53 | There is no sight-singing assessment. | PASS |
| 54 | There is no Song Learning Mode. | PASS |
| 55 | There are no `package.json` / `package-lock.json` changes. | PASS |
| 56 | There are no dependencies. | PASS |
| 57 | There are no audio fixtures. | PASS |
| 58 | There is no `metadata.local.json`. | PASS |
| 59 | There are no `/api/recognize` changes. | PASS |
| 60 | There are no recognition provider union changes. | PASS |

## 2. Manual Browser QA Result

The user completed this QA in a real browser against a Vercel Preview. All checks passed.

### Homepage

| # | Check | Result |
|---:|---|---|
| 1 | Homepage opens normally. | PASS |
| 2 | Main user-visible homepage copy is Chinese. | PASS |
| 3 | Upload-area copy is Chinese. | PASS |
| 4 | Practice Mode entry copy is Chinese. | PASS |
| 5 | Recognition-result area copy is Chinese. | PASS |
| 6 | No obvious full-sentence English user copy remains. | PASS |

### `/research/local-audio-decode`

| # | Check | Result |
|---:|---|---|
| 7 | Page opens normally. | PASS |
| 8 | Top hero / warning / boundary explanation copy is Chinese. | PASS |
| 9 | Original file / decode / Extract pitch frames flow still exists. | PASS |
| 10 | Research target curve diagnostics display normally. | PASS |
| 11 | 「发送到练习页预览」 appears. | PASS |
| 12 | Clicking 「发送到练习页预览」 automatically redirects to `/practice`. | PASS |
| 13 | `sessionStorage` handoff succeeds. | PASS |
| 14 | Copy JSON fallback is still available but is not the main flow. | PASS |
| 15 | Page has no automatic upload / API / scoring / formal import misleading copy. | PASS |

### `/practice`

| # | Check | Result |
|---:|---|---|
| 16 | Page opens normally. | PASS |
| 17 | 「本地导入的练习目标预览」 displays normally. | PASS |
| 18 | Imported preview is read-only. | PASS |
| 19 | Imported preview shows segment count, total duration, target frequency, diagnostic confidence, and other diagnostic fields. | PASS |
| 20 | Diagnostic confidence displays in Chinese: 「普通诊断置信度」 and 「低诊断置信度」. | PASS |
| 21 | 「清除导入预览」 works normally. | PASS |
| 22 | After clearing, `sessionStorage` preview data is removed. | PASS |
| 23 | Original mock melody Step X/N remains normal. | PASS |
| 24 | Previous / next controls remain normal. | PASS |
| 25 | Restart melody remains normal. | PASS |
| 26 | Target note playback remains normal. | PASS |
| 27 | Retry / current target controls are unaffected. | PASS |
| 28 | Local attempt history UI still exists. | PASS |
| 29 | Imported preview does not affect the current target. | PASS |
| 30 | Imported preview does not affect `currentMelodyStepIndex`. | PASS |
| 31 | Imported preview does not write attempt history. | PASS |
| 32 | Imported preview does not participate in pitch comparison. | PASS |
| 33 | Imported preview does not participate in scoring. | PASS |
| 34 | Manual pasted JSON panel remains available as a developer/debug fallback. | PASS |
| 35 | User-visible P16 handoff / preview copy is Chinese. | PASS |
| 36 | There is no misleading score / grade / pass / fail / correct / wrong copy. | PASS |
| 37 | There is no misleading copy for formal audio import, formal `TargetPitchCurve`, formal melody recognition, or formal practice target replacement. | PASS |

## 3. Network Panel QA Result

The user observed the browser DevTools Network panel during the Vercel Preview QA. All checks passed.

| # | Check | Result |
|---:|---|---|
| 1 | Opening the homepage did not show any P16-added upload / cloud / AI / API / account / database request. | PASS |
| 2 | Opening `/research/local-audio-decode` did not show an upload request. | PASS |
| 3 | Clicking 「发送到练习页预览」 did not show an upload request. | PASS |
| 4 | Clicking 「发送到练习页预览」 did not show a cloud / AI API / account / database / server-storage request. | PASS |
| 5 | Redirecting to `/practice` did not show an upload request. | PASS |
| 6 | `/practice` reading `sessionStorage` did not trigger a network handoff. | PASS |
| 7 | Clicking 「清除导入预览」 did not show an upload / cloud / AI / API / account / database request. | PASS |
| 8 | Clicking practice controls did not show P16m-added upload / cloud / AI / API / account / database requests. | PASS |
| 9 | No `/api/recognize` request was observed. | PASS |
| 10 | The one-click local handoff is a browser-local `sessionStorage` flow and does not go through the server. | PASS |

## 4. Conclusion

P16n PASS:

- Chinese one-click browser-local handoff QA completed.
- `/research` → `sessionStorage` → `/practice` flow works.
- 「发送到练习页预览」 main flow is usable.
- `/practice` successfully displays 「本地导入的练习目标预览」.
- 「清除导入预览」 works.
- Manual JSON copy/paste is now a developer/debug fallback, not the main user flow.
- Chinese UX is improved for the homepage, `/research`, and P16 handoff / preview areas.
- Existing `/research` flow remains intact.
- Existing Practice Mode mock melody flow remains intact.
- No storage beyond explicit `sessionStorage` handoff.
- No `localStorage`.
- No upload / cloud / AI / API / account / database behavior observed.
- No target replacement, scoring, pitch comparison integration, attempt-history writes, or formal `TargetPitchCurve` integration introduced.
- User convenience is recorded as a long-term product priority.

Explicit non-goals remain:

- This is still not formal Practice Mode audio import.
- This is still not formal `TargetPitchCurve` integration.
- This is still not scoring.
- This is still not assessment.
- This is still not Song Learning Mode.
- APK/WebView remains unverified and must not be declared APK-ready.
