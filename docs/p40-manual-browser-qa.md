# P40 Manual Browser QA

Date: 2026-07-05

Scope: user-reported real-browser QA for the merged P40 safe reviewed-draft practice integration alpha on the Vercel Preview `/practice` page.

This document records QA results only. It does not introduce runtime behavior, UI behavior changes, parser changes, converter changes, scoring, persistence, upload/cloud/account/database behavior, dependencies, audio fixtures, or metadata changes.

## 1. Manual Browser QA Result

The user completed this QA in a real browser against a Vercel Preview. The P40 core flow passed.

| # | Check | Result |
|---:|---|---|
| 1 | `/practice` opened successfully. | PASS |
| 2 | Local melody guide audio import succeeded. | PASS |
| 3 | `Local Target Pitch Curve Draft` generation succeeded. | PASS |
| 4 | P39 review controls could be switched. | PASS |
| 5 | After switching to `Full draft`, the P40 action became clickable. | PASS |
| 6 | Clicking `Use selected review range as temporary practice target` showed the P40 temporary reviewed draft practice target panel. | PASS |
| 7 | The panel displayed source, selected frame range, selected voiced coverage, duration, reference frequency, frequency min / median / max, and created-in-session time. | PASS |
| 8 | `clear temporary target` worked normally. | PASS |
| 9 | Clearing the local guide, selecting a new file, regenerating the draft, resetting review controls, and invalid selected range cleanup were tested and behaved normally or were handled safely. | PASS |

## 2. Boundary QA Result

The same browser QA did not observe any of the following out-of-scope behaviors:

| # | Boundary | Result |
|---:|---|---|
| 1 | Final target creation. | PASS |
| 2 | Official transcription creation. | PASS |
| 3 | Scoring. | PASS |
| 4 | Accuracy grade. | PASS |
| 5 | Pass/fail result. | PASS |
| 6 | Persistent target or target library. | PASS |
| 7 | Cloud, upload, account, or database behavior. | PASS |
| 8 | Source separation. | PASS |
| 9 | Full-song extraction. | PASS |
| 10 | Automatic playback, recording, pitch estimation, or scoring behavior. | PASS |

## 3. QA Conclusion

P40 manual browser QA passed.

P40 core flow is valid:

`P39 reviewed selection → explicit user action → temporary browser-local session-only non-scoring diagnostic practice target`.

## 4. Product Follow-up Found During QA

The QA also found a product issue: the `/practice` page still contains a large amount of English user-visible UI copy. Because the project is aimed at Chinese users, the next product step should prioritize Chinese UI copy unification and a documented project language rule before continuing with new feature work.
