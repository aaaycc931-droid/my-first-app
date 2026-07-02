# Practice Research Target Curve Preview Browser QA Recovery Guide

## 1. Current QA Gap

P16b added a static read-only research target curve diagnostic preview to `/practice`.

P16c and P16e completed source review, HTTP smoke checks, and search-based checks for the P16 Practice preview work. Those checks are useful, but they do not replace a real interactive browser pass.

The following QA remains incomplete:

- Full interactive browser QA for `/practice`.
- Browser DevTools Network panel QA for `/practice`.
- Browser DevTools Network panel smoke QA for `/research/local-audio-decode` after the P16 preview work.

The gap exists because the current Codex container does not have a usable browser executable. Playwright Chromium installation was blocked by the environment, and available Ubuntu browser packages could not provide a working browser for the needed interactive QA.

Until this guide is executed in a real browser environment and the result is recorded, do not declare **Practice preview full browser QA pass**.

## 2. Required Environment

Run the recovery QA in an environment with:

- A local development machine that can run at least one real browser:
  - Chrome,
  - Chromium,
  - Edge, or
  - Firefox.
- A working Next.js development server.
- Browser DevTools with a usable Network panel.
- Access to these local routes:
  - `http://127.0.0.1:3000/practice`
  - `http://127.0.0.1:3000/research/local-audio-decode`

## 3. Pre-checks

Before starting manual browser QA, confirm all of the following:

1. P16b is merged.
2. P16d is merged.
3. P16e is merged.
4. Active fixture/runtime `diagnosticConfidence` values use only `normal` and `low`.
5. The `/practice` preview remains static and read-only.
6. No scoring, target replacement, attempt-history write, or pitch-comparison integration has been added for the preview.

## 4. Manual `/practice` Browser QA Checklist

1. Start the local app.
2. Open `http://127.0.0.1:3000/practice` in a real browser.
3. Confirm the page loads normally without browser console or visible page errors.
4. Confirm the existing mock melody step display appears normally.
5. Confirm the `Step X/N` display appears normally.
6. Click previous / next target controls and confirm the current target changes normally.
7. Click restart melody and confirm the flow returns to the initial step.
8. Click target note playback and confirm the original playback control remains usable.
9. Confirm retry / current target controls still exist and are not affected by the preview.
10. Confirm the local attempt history UI still exists.
11. Confirm the static pitch trend preview still exists.
12. Confirm the Research target curve diagnostic preview section displays normally.
13. Confirm the preview section has no buttons.
14. Confirm interacting near or around the preview section does not change the current target.
15. Confirm the preview section does not change `currentMelodyStepIndex`.
16. Confirm the preview section does not write to attempt history.
17. Confirm the preview section does not participate in pitch comparison.
18. Confirm the preview section does not participate in scoring.
19. Confirm preview copy includes all of the following boundaries:
    - `Research-only`
    - `Static preview`
    - `Not a formal Practice Mode target`
    - `Not scoring`
    - `Not assessment`
    - `Does not replace current mock melody practice flow`
20. Confirm diagnostic confidence wording displays as:
    - `Normal diagnostic confidence`
    - `Low diagnostic confidence`
21. Confirm the UI does not describe `targetNoteLabel` as a recognized note.
22. Confirm the UI does not include misleading copy for formal `TargetPitchCurve` integration, Practice Mode audio import, melody recognition, note recognition, score, grade, pass/fail, correct/wrong, or equivalent assessment claims.

## 5. `/research/local-audio-decode` Smoke QA

1. Open `http://127.0.0.1:3000/research/local-audio-decode` in the same real browser environment.
2. Confirm the page loads normally.
3. Confirm the file selection, decode metadata, and **Extract pitch frames** flow still exists.
4. Confirm the P16 Practice preview did not affect this research route.
5. Do not repeat full audio extraction QA as part of P16f unless a later task explicitly asks for it.

## 6. Network Panel QA Checklist

Use browser DevTools Network panel in a real browser.

1. Open DevTools and select the Network panel.
2. Clear existing Network panel entries.
3. Open `http://127.0.0.1:3000/practice`.
4. Click existing Practice controls, including previous / next, restart, target note playback, retry / current target controls, and any existing non-preview controls.
5. Observe whether any upload request is made.
6. Observe whether any cloud call is made.
7. Observe whether any AI API call is made.
8. Observe whether any `/api/recognize` request is made.
9. Observe whether any account request is made.
10. Observe whether any database or server-storage request is made.
11. Confirm the preview fixture behaves as bundled/static code display and does not trigger an external fetch.
12. Clear existing Network panel entries.
13. Open `http://127.0.0.1:3000/research/local-audio-decode`.
14. Confirm no P16 preview-added upload, cloud, AI, API, account, database, or server-storage behavior appears on that route.

## 7. Pass Criteria

Record P16 full browser QA pass only if all of the following are true:

1. `/practice` opens normally in a real browser.
2. The existing mock melody flow works normally.
3. The preview section displays normally.
4. The preview section is read-only.
5. The preview does not change the current target.
6. The preview does not write attempt history.
7. The preview does not participate in pitch comparison.
8. The preview does not participate in scoring.
9. Diagnostic confidence displays with normal / low diagnostic wording.
10. Network panel shows no upload, cloud, AI, API, account, database, or server-storage behavior caused by the preview.
11. `/research/local-audio-decode` smoke check is normal.
12. No misleading scoring, recognition, or formal `TargetPitchCurve` copy appears.

## 8. Fail Criteria

If any of the following happen, open a follow-up fix PR before adding new functionality:

1. `/practice` page errors.
2. Previous / next / restart behavior is affected by the preview.
3. Target playback is affected by the preview.
4. Attempt history is written by the preview.
5. The preview participates in pitch comparison.
6. Score, grade, pass, fail, correct, wrong, or equivalent assessment copy appears.
7. Recognized note or formal melody recognition copy appears.
8. Active `diagnosticConfidence` values regress to `high` or `medium`.
9. Network panel shows upload, cloud, AI, API, account, database, or server-storage requests caused by the preview.
10. `/research/local-audio-decode` is affected by P16 preview changes.

## 9. Recommended Follow-up

After this manual recovery QA is completed, create a docs-only follow-up:

**P16g Manual Browser QA Result for Practice Research Target Curve Preview**

P16g should record the real browser QA result. If QA passes, future work can consider the next planned step. If QA fails, fix the issue first before expanding functionality.

## 10. Non-goals

This guide does not implement or change:

- Runtime code.
- `/practice` behavior.
- Preview fixture behavior.
- Scoring.
- Target replacement.
- Real audio import.
- Cross-route handoff.
- Storage or persistence.
- Upload, cloud, or AI behavior.
- APK/WebView-ready claims.
