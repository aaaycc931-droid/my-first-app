# P16g Manual Browser QA Result for Practice Research Target Curve Preview

## QA environment

- QA milestone: P16g Manual Browser QA Result for Practice Research Target Curve Preview.
- Test method: Vercel Preview in a real browser environment.
- Browser: Microsoft Edge.
- Tested pages:
  - `/practice`
  - `/research/local-audio-decode`
- Scope: docs-only result record for the P16 `/practice` research target curve diagnostic preview.
- Out of scope: runtime code changes, `/practice` changes, preview fixture changes, converter changes, feature work, scoring integration, and real audio import integration.

## `/practice` manual browser QA result

| # | Check | Result |
| --- | --- | --- |
| 1 | `/practice` page opens normally. | PASS |
| 2 | Existing mock melody step display appears normally. | PASS |
| 3 | `Step X/N` appears normally. | PASS |
| 4 | Previous / next target controls work normally. | PASS |
| 5 | Restart melody works normally. | PASS |
| 6 | Target note playback works normally. | PASS |
| 7 | Retry / current target controls are unaffected. | PASS |
| 8 | Local attempt history UI still exists. | PASS |
| 9 | Static pitch trend preview still exists. | PASS |
| 10 | Research target curve diagnostic preview section appears normally. | PASS |
| 11 | Preview section is read-only. | PASS |
| 12 | Preview section does not affect current target. | PASS |
| 13 | Preview section does not affect `currentMelodyStepIndex`. | PASS |
| 14 | Preview section does not write to attempt history. | PASS |
| 15 | Preview section does not participate in pitch comparison. | PASS |
| 16 | Preview section does not participate in scoring. | PASS |
| 17 | Preview copy includes `Research-only`, `Static preview`, `Not a formal Practice Mode target`, `Not scoring`, `Not assessment`, and `Does not replace the current mock melody practice flow`. | PASS |
| 18 | Diagnostic confidence displays as `Normal diagnostic confidence` / `Low diagnostic confidence`. | PASS |
| 19 | UI does not describe `targetNoteLabel` as a recognized note. | PASS |
| 20 | UI does not include misleading formal `TargetPitchCurve` integration, Practice Mode audio import, melody recognition, note recognition, score, grade, pass/fail, correct/wrong copy. | PASS |

## Network panel QA result

| # | Check | Result |
| --- | --- | --- |
| 1 | Opening `/practice` did not show an upload request. | PASS |
| 2 | Clicking existing practice controls did not show an upload request. | PASS |
| 3 | No cloud call was observed. | PASS |
| 4 | No AI API call was observed. | PASS |
| 5 | No `/api/recognize` request was observed. | PASS |
| 6 | No account request was observed. | PASS |
| 7 | No database / server-storage request was observed. | PASS |
| 8 | Preview fixture is bundled/static code display with no external fetch observed. | PASS |
| 9 | `favicon.ico` returned 404; this is only a missing site icon and does not affect P16 preview QA. It is not upload/cloud/AI/API/account/database behavior. | PASS with note |
| 10 | Browser extension or browser built-in script requests such as `content_main.js`, `inject.js`, `feedback.js`, and `default_config.content.json` were observed; these are not project-added upload/cloud/AI/API/account/database behavior. | PASS with note |

## `/research/local-audio-decode` smoke result

| # | Check | Result |
| --- | --- | --- |
| 1 | `/research/local-audio-decode` page opens normally. | PASS |
| 2 | File selection / decode metadata / Extract pitch frames flow still exists. | PASS |
| 3 | P16 preview does not affect the research route. | PASS |
| 4 | P16g does not re-declare full audio extraction QA; it records this smoke check only. | PASS |

## P16g conclusion

P16g PASS:

- `/practice` full interactive browser QA completed in a real browser.
- Network panel QA completed.
- Research target curve diagnostic preview remains read-only.
- Existing Practice Mode mock melody flow remains intact.
- No upload/cloud/AI/API/account/database behavior observed.
- No scoring/assessment/formal TargetPitchCurve/recognition claim introduced.
- `/research/local-audio-decode` smoke check passed.

This result also explicitly confirms:

- This is still not formal Practice Mode audio import.
- This is still not formal TargetPitchCurve integration.
- This is still not scoring.
- This is still not Song Learning Mode.
- APK/WebView remains unverified, so this cannot be declared APK-ready.

## Change boundary

This P16g record is docs-only. It changes no runtime behavior, `/practice` UI behavior, preview fixture, Practice Mode flow, research route behavior, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`.
