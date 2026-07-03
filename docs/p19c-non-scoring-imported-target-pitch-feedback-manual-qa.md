# P19c — Non-scoring imported target pitch feedback manual browser QA

## Scope

This checklist prepares manual browser QA for the P19b `/practice` imported practice lite pitch feedback UI.

P19c is docs-only. It does not change runtime code, UI, helper logic, tests, parser, converter, scoring, `/api/recognize`, upload/cloud/AI/account/database behavior, dependencies, audio fixtures, `metadata.local.json`, piano runtime, `/piano`, or the research pitch extraction algorithm.

## Product boundary to confirm

The imported target pitch feedback is a local, non-scoring interpretation of the current estimated pitch against the currently selected imported target segment. It is intended to help a user understand whether a local pitch estimate is close to, above, or below the imported target pitch.

It must remain:

- browser-local;
- non-scoring;
- not formal assessment;
- not rhythm scoring;
- not sight-singing comprehensive scoring;
- not persisted to local attempt history;
- not connected to upload, cloud, AI, account, or database services;
- separate from `/api/recognize`, `/research/local-audio-decode`, piano runtime, and `/piano`.

## QA setup

### Expected behavior

Use a local development browser session for `/practice`. If available, prepare one imported preview with target pitch data and one imported preview or selected imported segment without usable target pitch data.

### What to verify

- The browser can open `/practice` normally.
- The imported practice lite area can be reached using the existing imported preview flow.
- DevTools Network panel is open before recording or estimating pitch so unexpected requests can be observed.
- Existing Practice Mode melody step flow, target navigation, and local attempt history are checked before and after imported feedback checks.

### What must not happen

- Do not use this checklist to validate formal scoring accuracy.
- Do not treat close/above/below feedback as a score, grade, pass/fail result, accuracy percentage, final result, assessment, rating, rhythm score, or sight-singing score.
- Do not update code while running this QA. If a problem is found, record it under pass/fail notes or follow-up candidates.

### Manual QA pass/fail notes

Record browser, OS, commit SHA, whether `npm run dev` or a deployed preview was used, and whether imported sample data included target pitch data.

## Checklist

### 1. `/practice` with no imported preview / no imported target data

#### Expected behavior

Opening `/practice` without imported preview data should keep the page usable and should not require imported target pitch feedback to render a score-like result.

#### What to verify

- Open `/practice` in a fresh browser tab or after clearing any local imported preview state used by the app.
- Confirm the default Practice Mode content remains available.
- Confirm there is no crash, hydration error, or blocking error caused by missing imported preview data.

#### What must not happen

- The page must not show score-like imported feedback for missing imported data.
- The page must not require upload/cloud/AI/account/database access.
- The page must not alter `/api/recognize` behavior.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 2. Imported practice lite shows the feedback area

#### Expected behavior

After entering imported practice lite with imported target data available, a visible pitch feedback area should appear with copy such as `Pitch feedback` / `Non-scoring feedback`.

#### What to verify

- Enter imported practice lite through the existing imported preview path.
- Confirm the imported practice lite UI renders.
- Confirm the pitch feedback area is visible and clearly labeled as non-scoring.

#### What must not happen

- The area must not be labeled as formal scoring.
- The area must not replace or break the existing imported segment controls.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 3. No target pitch data state

#### Expected behavior

When the selected imported segment has no target pitch data, the feedback area should show the no-target-data state/copy.

#### What to verify

- Select or load an imported segment that does not expose usable target pitch data.
- Confirm the feedback area displays no-target-data guidance.
- Confirm the user can still navigate segments or leave imported practice lite.

#### What must not happen

- The UI must not invent target pitch feedback.
- The UI must not show close/above/below when no target pitch data exists.
- The UI must not show score, grade, pass/fail, accuracy percentage, final result, assessment, rating, rhythm score, or sight-singing score.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 4. Target pitch exists but no reliable estimated pitch yet

#### Expected behavior

When the selected imported segment has target pitch data but no reliable local estimated pitch is available yet, the feedback area should show the no-reliable-pitch state/copy.

#### What to verify

- Select an imported segment with target pitch data.
- Before recording or local pitch estimation, inspect the feedback area.
- Confirm it asks for or waits for a reliable local pitch estimate instead of scoring the user.

#### What must not happen

- The UI must not show close/above/below before there is a reliable estimated pitch.
- The UI must not write a feedback-only item into local attempt history.
- The UI must not call upload/cloud/AI/account/database services.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 5. Recorded/local pitch estimate can show close, above target, and below target

#### Expected behavior

After recording or running local pitch estimation, the feedback area should be able to display non-scoring interpretations for:

- close;
- above target;
- below target.

#### What to verify

- With an imported segment containing target pitch data selected, produce or reuse local pitch estimates that should be close to the target, above the target, and below the target.
- Confirm the feedback copy changes according to the local estimated pitch relative to the selected target pitch.
- Confirm the feedback remains descriptive and non-scoring.

#### What must not happen

- The UI must not display score, grade, pass, fail, accuracy %, final result, assessment, rating, rhythm score, or sight-singing score.
- The UI must not claim formal pitch accuracy.
- The UI must not persist the imported feedback result to local attempt history.

#### Manual QA pass/fail notes

- Pass/fail:
- Close notes:
- Above-target notes:
- Below-target notes:

### 6. Switching imported segments reinterprets existing estimated pitch

#### Expected behavior

When the selected imported segment changes, the feedback should be recalculated or reinterpreted against the current selected segment target pitch, using the existing reliable estimated pitch if one is available.

#### What to verify

- Produce a reliable local estimated pitch in imported practice lite.
- Switch to another imported segment with different target pitch data.
- Confirm the feedback updates to reflect the new selected segment.
- Switch back to the original segment and confirm the feedback updates again.

#### What must not happen

- Feedback must not remain stale for the previous selected segment.
- Segment navigation must not be broken by the feedback area.
- Switching segments must not create extra local attempt history entries by itself.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 7. Score-like language is absent

#### Expected behavior

The imported target pitch feedback UI should avoid formal assessment language.

#### What to verify

Search visually in the imported feedback area and surrounding imported practice lite UI for these forbidden score-like labels:

- `Score`;
- `Grade`;
- `Pass`;
- `Fail`;
- `Accuracy %`;
- `Final result`;
- `Assessment`;
- `Rating`;
- `Rhythm score`;
- `Sight-singing score`.

#### What must not happen

- None of the above labels should appear as imported feedback outcomes.
- The UI should not imply that imported pitch feedback is formal grading or comprehensive sight-singing evaluation.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 8. Feedback does not write to local attempt history

#### Expected behavior

Imported target pitch feedback should not create or mutate local attempt history entries merely because feedback is displayed.

#### What to verify

- Note the current local attempt history count before entering imported practice lite or before producing imported feedback.
- Trigger no-target-data, no-reliable-pitch, close, above-target, and below-target feedback states where possible.
- Confirm the history count and existing history contents do not change solely because imported feedback was rendered.

#### What must not happen

- Feedback-only state changes must not append history rows.
- Switching imported segments must not append history rows.
- No imported feedback result should be stored as a score-like history result.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 9. Existing Practice Mode melody step flow is not broken

#### Expected behavior

The original Practice Mode melody step flow should still work independently of imported target pitch feedback.

#### What to verify

- Use Previous step, Next step, and Restart melody controls.
- Confirm the current step and target note update as before.
- Confirm recording and local pitch estimation still work for the original melody step flow.

#### What must not happen

- Imported feedback must not replace the original melody target state.
- Melody step controls must not be disabled or redirected unexpectedly.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 10. Target navigation is not broken

#### Expected behavior

Existing target navigation behavior should remain unchanged.

#### What to verify

- Navigate forward and backward through targets or segments using the existing controls.
- Confirm target labels, selected target state, and playback behavior remain coherent.
- Confirm imported segment navigation still selects the intended current segment.

#### What must not happen

- Feedback must not desynchronize selected target display from selected segment display.
- Feedback must not trigger unexpected playback, recording, or estimation.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 11. Local attempt history original behavior is not broken

#### Expected behavior

Existing local attempt history should keep its prior behavior, including browser-local state and existing clear/retry controls.

#### What to verify

- Create a normal local practice attempt in the original Practice Mode flow.
- Confirm the recent attempt appears as before.
- Use any existing clear or retry controls and confirm they behave as before.

#### What must not happen

- Imported feedback must not persist to server storage, localStorage, IndexedDB, cookies, account storage, or database storage.
- Imported feedback must not change the maximum history behavior or duplicate-prevention behavior.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 12. Network panel shows no new upload/cloud/AI/account/database requests

#### Expected behavior

Imported target pitch feedback should remain local-only.

#### What to verify

- Open DevTools Network panel before interacting with imported practice lite.
- Record and estimate pitch locally if the browser permits microphone access.
- Inspect requests made during feedback rendering and segment switching.
- Confirm no new upload, cloud, AI, account, analytics-like, or database request appears because of imported feedback.

#### What must not happen

- No audio upload should occur.
- No AI inference request should occur.
- No account, authentication, or database write should occur.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 13. `/api/recognize` behavior is unchanged

#### Expected behavior

P19b imported target pitch feedback should not change `/api/recognize` behavior.

#### What to verify

- Use the existing recognition flow separately from imported pitch feedback.
- Confirm accepted input types, mock/default provider behavior, and response shape remain consistent with the current MVP boundary.
- Confirm imported feedback interactions do not trigger `/api/recognize` unexpectedly.

#### What must not happen

- `/api/recognize` must not receive imported feedback audio.
- `/api/recognize` must not become a scoring endpoint.
- `/api/recognize` must not gain PDF, cloud, AI, account, or database coupling as part of this feature.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 14. `/research/local-audio-decode` is not affected

#### Expected behavior

The research local audio decode route should continue to behave as an independent research surface.

#### What to verify

- Open `/research/local-audio-decode`.
- Confirm existing local audio decode UI still renders.
- If using a known local test file manually, confirm the route still follows its existing local research behavior.

#### What must not happen

- Imported practice feedback must not appear as formal scoring on the research page.
- Research pitch extraction behavior must not be changed by P19c.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

### 15. Piano runtime and `/piano` are not affected

#### Expected behavior

Piano runtime and `/piano` should remain outside the imported target pitch feedback scope.

#### What to verify

- Open `/piano` if the route is available in the current branch.
- Confirm the existing piano UI/runtime behavior still loads as before.
- Confirm imported practice feedback interactions do not affect piano state or playback.

#### What must not happen

- P19c must not introduce piano runtime changes.
- `/piano` must not show imported target pitch feedback unless a future scoped feature explicitly adds it.

#### Manual QA pass/fail notes

- Pass/fail:
- Notes:

## Potential issue to verify manually

- Confirm whether the close/above/below labels remain understandable to users as non-scoring guidance and are not visually styled like grading badges.
- Confirm whether switching imported segments after a reliable estimate updates feedback immediately enough to avoid the impression of stale feedback.
- Confirm whether no-target-data and no-reliable-pitch copy is clear when users move between imported and default practice contexts.
- Confirm whether local attempt history remains unchanged when imported feedback reinterprets an existing estimated pitch for multiple segments.

## Known limitations

- This checklist does not prove pitch accuracy.
- This checklist does not validate rhythm timing, rhythm scoring, or sight-singing comprehensive scoring.
- Manual close/above/below coverage may require carefully chosen target segments or repeated recordings.
- Browser microphone permission, device input quality, ambient noise, and local pitch estimator limitations can affect whether a reliable estimated pitch is available.
- Network panel verification is manual and should be repeated in the target browser/environment before product demos.

## Future follow-up candidates

- Add a small browser QA result document after manual verification is completed.
- Add clearer user-facing copy if manual QA finds that non-scoring feedback is confused with formal scoring.
- Consider a future automated UI smoke test only if it can stay within local-only and non-scoring boundaries.
- Consider future imported segment fixtures for manual QA instructions, without adding audio fixtures or changing parser/converter scope in P19c.
- Revisit formal scoring only in a separately scoped future phase with explicit product requirements.

## Final P19c boundary confirmation

P19c is documentation only. It prepares browser QA for P19b and does not implement new runtime behavior.
