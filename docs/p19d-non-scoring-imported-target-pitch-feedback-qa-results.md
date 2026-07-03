# P19d — Non-scoring imported target pitch feedback QA results

## 1. QA scope

This document records the manual QA result status for the P19c checklist covering non-scoring imported target pitch feedback in `/practice` imported practice lite.

P19d is docs-only. It records expected outcomes, current observed-result placeholders, boundary confirmations to be completed by human browser QA, issues, and follow-up candidates. It does not change runtime behavior, UI, helpers, tests, parser, converter, scoring, `/api/recognize`, upload/cloud/AI/account/database behavior, package/dependency files, audio fixtures, `metadata.local.json`, piano runtime, `/piano`, or the research pitch extraction algorithm.

## 2. Browser / environment

| Field | Recorded value |
| --- | --- |
| QA run status | Not tested yet |
| Tester | Not recorded yet |
| Browser | Not recorded yet |
| Browser version | Not recorded yet |
| OS / device | Not recorded yet |
| Environment | Not recorded yet |
| App URL | Not recorded yet |
| Commit SHA | Not recorded yet |
| DevTools Network panel used | Not tested yet |
| Imported preview source | Not recorded yet |
| Imported sample includes target pitch data | Not recorded yet |
| Imported sample without target pitch data available | Not recorded yet |

Manual browser QA still needs to be completed before this record can claim pass/fail results.

## 3. Preconditions

Before filling in the final QA result, confirm the following preconditions in a real browser:

- `/practice` can be opened in the selected environment.
- A valid imported preview can be prepared through the existing local handoff or manual JSON fallback path.
- At least one imported segment with usable target pitch data is available.
- If possible, at least one imported segment or imported-preview state without usable target pitch data is available.
- DevTools Network panel is open before triggering local pitch estimation or imported feedback states.
- Existing Practice Mode melody step flow, target navigation, and local attempt history are checked before and after the imported feedback checks.

## 4. Manual QA checklist results

| Scenario | Expected behavior | Observed behavior | Result | Notes |
| --- | --- | --- | --- | --- |
| No imported preview / no imported target data | Opening `/practice` without imported preview data keeps the page usable, preserves default Practice Mode content, and does not show score-like imported feedback for missing imported data. | Not tested yet. | Not tested yet | Requires manual browser QA after clearing any imported preview state used by the app. |
| Enter imported practice lite | With a valid imported preview, the user can explicitly enter imported practice lite, the imported practice UI renders, and the feedback area is visible with non-scoring framing. | Not tested yet. | Not tested yet | Requires a browser session with valid imported preview data. |
| no-target-data | When the selected imported segment has no usable target pitch data, the feedback area shows a no-target-data state and does not invent close/above/below feedback. | Not tested yet. | Not tested yet | Requires an imported segment or preview state without usable target pitch data. |
| no-reliable-pitch | When target pitch data exists but no reliable estimated local pitch is available, the feedback area waits for or asks for a reliable pitch estimate instead of scoring the user. | Not tested yet. | Not tested yet | Check before recording or before local pitch estimation produces usable pitch. |
| close | With a reliable estimated pitch close to the selected imported target, the feedback shows descriptive non-scoring close-to-target feedback. | Not tested yet. | Not tested yet | Requires producing or reusing a local pitch estimate close to the target. |
| above target | With a reliable estimated pitch above the selected imported target, the feedback shows descriptive non-scoring above-target feedback. | Not tested yet. | Not tested yet | Requires producing or reusing a local pitch estimate above the target. |
| below target | With a reliable estimated pitch below the selected imported target, the feedback shows descriptive non-scoring below-target feedback. | Not tested yet. | Not tested yet | Requires producing or reusing a local pitch estimate below the target. |
| switching imported segment | After switching selected imported segments, feedback is recalculated or reinterpreted against the newly selected imported segment and does not remain stale. | Not tested yet. | Not tested yet | Check at least two imported segments with different target pitch data if available. |
| forbidden scoring language check | Imported feedback outcomes do not use score-like labels such as Score, Grade, Pass, Fail, Accuracy %, Final result, Assessment, Rating, Rhythm score, or Sight-singing score. | Not tested yet. | Not tested yet | Visual copy review should cover the feedback area and surrounding imported practice lite UI. |
| local attempt history check | Rendering imported feedback states does not create or mutate local attempt history entries. | Not tested yet. | Not tested yet | Record history count/content before and after no-target-data, no-reliable-pitch, close, above, below, and segment switching states where possible. |
| existing melody step flow check | Existing Practice Mode melody display, step flow, target controls, restart flow, and target note playback remain usable before and after imported feedback checks. | Not tested yet. | Not tested yet | Verify the original mock melody flow remains separate from imported practice lite feedback. |
| target navigation check | Existing target navigation remains unchanged, and imported segment switching does not break original target navigation. | Not tested yet. | Not tested yet | Check previous/next target controls and imported segment controls separately. |
| Network panel check | Feedback remains browser-local with no added upload, cloud, AI, account, database, server-storage, or unexpected API behavior. | Not tested yet. | Not tested yet | Keep DevTools Network panel open during imported feedback checks. |
| `/api/recognize` unchanged check | Imported target pitch feedback does not call or alter `/api/recognize`. | Not tested yet. | Not tested yet | Confirm no `/api/recognize` request is triggered by entering lite mode, producing feedback, or switching imported segments. |
| `/research/local-audio-decode` unaffected check | Existing research route file selection, decode metadata, and Extract pitch frames flow remain unaffected by P19 feedback. | Not tested yet. | Not tested yet | Smoke check only; do not retest the full research algorithm as part of P19d. |
| piano runtime / `/piano` unaffected check | P19 feedback does not add or change piano runtime behavior or `/piano`. | Not tested yet. | Not tested yet | If `/piano` exists in the environment, smoke check it separately; if it does not exist, record that no P19d code change created it. |

## 5. Observed behavior

Not tested yet. No actual browser observations have been recorded in this repository for P19d.

After manual browser QA, record concise observations for:

- default `/practice` without imported preview;
- imported practice lite entry;
- feedback area initial copy;
- no-target-data and no-reliable-pitch states;
- close, above-target, and below-target feedback states;
- segment switching behavior;
- existing mock melody step flow and target navigation;
- local attempt history behavior.

## 6. Network panel observations

Not tested yet. Network panel observations must be collected during real browser QA.

When completed, record whether any requests were observed for:

- upload or cloud storage;
- AI APIs or model services;
- account or database services;
- server storage;
- `/api/recognize`;
- unexpected project API routes.

Browser extension requests, favicon requests, and development-framework requests should be distinguished from app-added product behavior.

## 7. Non-scoring boundary confirmation

Not tested yet.

The P19d QA record should only mark this boundary as passed after confirming the imported feedback copy and behavior remain descriptive practice hints, not formal score, grade, pass/fail, accuracy percentage, final result, assessment, rating, rhythm score, or sight-singing score.

## 8. Local attempt history confirmation

Not tested yet.

Manual QA must confirm that imported feedback-only state changes do not append, remove, or mutate local attempt history entries, including during no-target-data, no-reliable-pitch, close, above-target, below-target, and imported segment switching states.

## 9. Existing Practice Mode flow confirmation

Not tested yet.

Manual QA must confirm that original Practice Mode melody step flow remains available and unchanged, including existing target display, previous/next navigation, restart behavior, target note playback, retry/current target controls where present, and local attempt history UI.

## 10. `/api/recognize` boundary confirmation

Not tested yet.

Manual QA must confirm that P19 imported target pitch feedback does not call `/api/recognize`, does not change recognition-provider behavior, and does not rely on upload/cloud/AI recognition behavior.

## 11. `/research/local-audio-decode` boundary confirmation

Not tested yet.

Manual QA must smoke check that `/research/local-audio-decode` remains available and that its existing local file selection, decode metadata, and Extract pitch frames flow are not affected by P19 feedback documentation or runtime from prior phases.

## 12. Piano runtime / `/piano` boundary confirmation

Not tested yet.

Manual QA must confirm that no P19 feedback behavior adds or changes piano runtime behavior. If `/piano` exists in the tested build, smoke check that it is unaffected. If `/piano` does not exist, record that P19d did not create it.

## 13. Issues found

No issues have been found in P19d because manual browser QA has not been run yet.

Use this section after browser QA to record issues without changing runtime code during P19d. Classify each issue as one of:

- copy-only follow-up;
- UI-copy follow-up;
- runtime follow-up;
- QA data/setup issue;
- environment limitation.

## 14. Potential follow-ups

Potential follow-ups to consider after manual browser QA:

- Fill in this result record with actual browser, OS, environment, commit SHA, and imported sample details.
- If no-target-data cannot be produced from available samples, add a future QA fixture or documented setup path rather than changing runtime in P19d.
- If close/above/below states are hard to reproduce manually, add a future docs-only reproducibility note or a future dedicated QA helper plan, without changing P19d runtime.
- If copy implies scoring, create a future copy-only or UI-copy task.
- If feedback writes local attempt history or triggers unexpected network/API behavior, create a future runtime follow-up and keep this P19d record marked Needs follow-up.
- If `/research/local-audio-decode`, `/api/recognize`, piano runtime, or `/piano` behavior appears affected, record the observation here and handle the fix in a separate scoped task.

## 15. Final QA conclusion

P19d currently provides the manual QA result record structure for P19c, but real browser QA has not been completed yet.

Current conclusion: **Not tested yet**.

This document does not claim that P19 imported target pitch feedback has passed manual browser QA. A human browser QA run is still required before changing the final conclusion to Pass or Needs follow-up.
