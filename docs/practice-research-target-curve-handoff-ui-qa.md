# P16k Manual JSON Handoff UI Source Review + Manual Browser QA

Date: 2026-07-02

Scope: docs-only QA closeout for the P16j manual JSON handoff beta UI between `/research/local-audio-decode` and `/practice`.

Allowed files for this PR are limited to this QA document and `docs/mvp-status.md`. P16k does not change runtime code, `/practice` behavior, `/research/local-audio-decode` behavior, parser behavior, converter behavior, Practice Mode flow, formal `TargetPitchCurve` runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`.

## 1. Source Review QA

### `/research/local-audio-decode` source review

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `/research/local-audio-decode` only adds research-only manual JSON handoff UI. | PASS | Source review found the P16j addition in the existing research diagnostic section as a labeled `Manual diagnostic JSON handoff` block only. |
| 2 | `Copy diagnostic JSON` button only calls clipboard API after explicit user click. | PASS | `navigator.clipboard.writeText(...)` is called only inside `handleCopyDiagnosticJson`, which is wired to the button `onClick`. |
| 3 | `Copy diagnostic JSON` only copies the current `ResearchTargetPitchCurveDiagnostic` JSON. | PASS | The copied string is `researchTargetPitchCurveDiagnosticJson`, derived from `pitchDiagnostics.researchTargetPitchCurve` with `JSON.stringify(..., null, 2)`. |
| 4 | Read-only textarea / fallback JSON is provided. | PASS | The fallback textarea is `readOnly` and displays the same diagnostic JSON string. |
| 5 | Copy success copy is `Copied diagnostic JSON.` | PASS | Source review confirmed the exact success message. |
| 6 | Copy failure copy is `Copy failed. Please copy manually.` | PASS | Source review confirmed the exact failure message. |
| 7 | `/research` UI copy includes Research-only, Manual handoff, Not automatic import, Not upload, Not scoring, and paste into `/practice` research preview only. | PASS | The UI copy says `Research-only manual handoff`, `not automatic import`, `not upload`, `not scoring`, and `Paste this JSON into /practice research preview only`. |
| 8 | `/research` has no auto-navigate to `/practice`. | PASS | No navigation call or route push was found in the handoff UI. |
| 9 | `/research` has no `localStorage` / `sessionStorage`. | PASS | Source search found no storage use in the handoff route. |
| 10 | `/research` has no API call. | PASS | Source review found local file decoding and in-browser diagnostics only, with no `fetch` / API request added for handoff. |
| 11 | `/research` has no upload. | PASS | The reviewed flow reads the selected local file in the browser and does not upload it. |
| 12 | `/research` has no server storage / account / database. | PASS | No account, database, or server-storage code was found. |
| 13 | `/research` does not change file selection. | PASS | Existing file selection handler remains isolated from handoff copy UI. |
| 14 | `/research` does not change decode metadata action. | PASS | Existing decode metadata handler still decodes the selected file locally. |
| 15 | `/research` does not change Extract pitch frames gating. | PASS | Existing `canExtractPitch` gating remains based on decoded buffer readiness and extraction state. |
| 16 | `/research` does not change pitch extraction algorithm. | PASS | The handoff UI consumes `pitchDiagnostics.researchTargetPitchCurve`; it does not alter extraction. |
| 17 | `/research` does not change P13 guards. | PASS | No P13 guard implementation was modified by this docs-only P16k review. |
| 18 | `/research` does not change P14 segmentation semantics. | PASS | No segmentation helper code was modified. |
| 19 | `/research` does not change P15 converter semantics. | PASS | No converter code was modified. |

### `/practice` source review

| # | Check | Result | Evidence |
|---|---|---|---|
| 20 | `/practice` only adds Manual research target curve diagnostic JSON preview panel. | PASS | Source review found a separate manual paste preview section. |
| 21 | Textarea is only for user-manual JSON paste. | PASS | The textarea value is local component state updated only by user input. |
| 22 | `Preview pasted diagnostic JSON` button only calls P16i `parseResearchTargetCurveHandoffJson`. | PASS | The click handler calls `parseResearchTargetCurveHandoffJson(manualResearchTargetCurveJson)`. |
| 23 | Valid input only displays read-only imported diagnostic preview. | PASS | Valid parse result sets preview state to `valid` and renders summary/segment display only. |
| 24 | Invalid input only displays conservative non-scoring error. | PASS | Invalid parse result sets preview state to `invalid` and displays parser message plus `This preview was not updated.` |
| 25 | Error message does not use score / grade / pass / fail / correct / wrong. | PASS | Parser error messages are diagnostic-shape messages and do not grade the user. |
| 26 | Pasted preview displays curve source, segment count, total duration, low confidence count, segments, and diagnostic fields. | PASS | The valid preview renders source, summary fields, segment timing, target frequency, optional diagnostic note label, diagnostic confidence, source frame count, and bridged null frame count. |
| 27 | `diagnosticConfidence` displays as `Normal diagnostic confidence` / `Low diagnostic confidence`. | PASS | `formatDiagnosticConfidenceLabel` maps `low` to low label and all accepted non-low values to normal label. |
| 28 | `targetNoteLabel` is not described as recognized note. | PASS | Manual preview calls it optional diagnostic metadata and says it is not used by current target, pitch comparison, attempt history, or assessment. |
| 29 | Pasted preview is read-only. | PASS | The valid preview is display-only; no edit controls are rendered for imported diagnostic data. |
| 30 | Pasted preview does not replace mock melody targets. | PASS | Mock exercise and current target state remain separate from manual preview state. |
| 31 | Pasted preview does not affect `currentMelodyStepIndex`. | PASS | Manual preview handler does not call `setCurrentMelodyStepIndex`. |
| 32 | Pasted preview does not write attempt history. | PASS | Manual preview handler does not call attempt-history setters. |
| 33 | Pasted preview does not participate in pitch comparison. | PASS | Pitch comparison remains derived from selected mock target and local pitch estimate, not imported diagnostics. |
| 34 | Pasted preview does not participate in scoring. | PASS | No scoring code is introduced or invoked. |
| 35 | Pasted preview does not change previous / next / restart melody. | PASS | Existing melody navigation handlers are separate and unchanged. |
| 36 | Pasted preview does not change target note playback. | PASS | Playback uses mock target notes and remains separate. |
| 37 | Pasted preview does not change pitch estimation. | PASS | Pitch estimation code remains tied to local recording blob only. |
| 38 | Pasted preview does not change target-aware comparison. | PASS | Target-aware comparison still uses `selectedTargetNote`. |
| 39 | Pasted preview does not use `localStorage` / `sessionStorage`. | PASS | No browser storage calls were found. |
| 40 | Pasted preview does not call API. | PASS | The manual preview handler performs local parsing only. |
| 41 | Pasted preview does not upload. | PASS | No upload path exists in the manual preview handler. |
| 42 | Pasted preview does not use account / database / server storage. | PASS | No account, database, or server-storage code was found. |
| 43 | Pasted preview does not declare APK/WebView-ready. | PASS | UI and docs keep APK/WebView unverified. |

### Parser contract confirmation

| # | Check | Result | Evidence |
|---|---|---|---|
| 44 | P16i parser behavior is unchanged. | PASS | P16k is docs-only and did not modify `lib/practice/research-target-curve-handoff-json.ts`. |
| 45 | `high` / `medium` confidence are still rejected. | PASS | Parser accepts only `normal` or `low`; anything else returns `unsupported-confidence`. |
| 46 | `source` still only accepts `local-audio-decode-note-like-segments`. | PASS | Parser compares against `RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE`. |
| 47 | Summary strict validation remains. | PASS | Parser requires `summary.segmentCount` to match `segments.length` and `summary.lowConfidenceSegmentCount` to match low segments. |
| 48 | Invalid JSON does not throw to caller. | PASS | `JSON.parse` is wrapped and returns an `invalid-json` result. |
| 49 | Error wording remains non-scoring. | PASS | Error messages describe diagnostic JSON shape/contract only. |

### General boundary confirmation

| # | Check | Result |
|---|---|---|
| 50 | No formal `TargetPitchCurve` integration. | PASS |
| 51 | No Practice Mode target replacement. | PASS |
| 52 | No scoring / grade / pass / fail added by P16j handoff. | PASS |
| 53 | No user pitch curve alignment. | PASS |
| 54 | No rhythm assessment. | PASS |
| 55 | No sight-singing assessment. | PASS |
| 56 | No Song Learning Mode. | PASS |
| 57 | No `package.json` / `package-lock.json` changes. | PASS |
| 58 | No dependencies. | PASS |
| 59 | No audio fixtures. | PASS |
| 60 | No `metadata.local.json`. | PASS |
| 61 | No `/api/recognize` changes. | PASS |
| 62 | No recognition provider union changes. | PASS |
| 63 | No homepage / navigation promotion. | PASS |

## 2. Manual Browser QA

Manual browser QA was attempted from this container against a local dev-server plan, but the environment could not provide a runnable real browser:

- `npx --yes playwright@1.45.3 install chromium` failed while downloading Chromium with `ERR_SOCKET_CLOSED` from Playwright CDN mirrors.
- `apt-get install -y chromium` installed Ubuntu's snap launcher package, but snapd is not usable in this container; the package reported `System doesn't have a working snapd, skipping` for the Chromium snap.
- `apt-get install -y firefox-esr` failed because no `firefox-esr` package candidate is available in the configured Ubuntu repositories.
- `npx --yes @puppeteer/browsers install chrome@stable` failed with network `ENETUNREACH` while trying to download a browser.

Therefore this P16k document does **not** claim a completed real-browser QA pass or DevTools Network panel pass. The following checklist remains the required manual browser QA script to run on Vercel Preview or on a local dev server with a working browser.

### `/research/local-audio-decode` manual browser QA script

| # | Check | Result |
|---|---|---|
| 1 | Page opens normally. | NOT COMPLETED in this container |
| 2 | File selection / decode metadata / Extract pitch frames flow still exists. | NOT COMPLETED in this container |
| 3 | Use a local WAV or existing test flow to generate Research target pitch curve diagnostics. | NOT COMPLETED in this container |
| 4 | Research target pitch curve diagnostics section displays. | NOT COMPLETED in this container |
| 5 | `Copy diagnostic JSON` button appears. | NOT COMPLETED in this container |
| 6 | Clicking `Copy diagnostic JSON` shows `Copied diagnostic JSON.` or fallback JSON can be copied manually. | NOT COMPLETED in this container |
| 7 | Read-only JSON fallback displays. | NOT COMPLETED in this container |
| 8 | Page does not auto-navigate to `/practice`. | NOT COMPLETED in this container |
| 9 | Page has no upload / scoring / automatic import misleading copy. | NOT COMPLETED in this container |

### `/practice` manual browser QA script

| # | Check | Result |
|---|---|---|
| 10 | Page opens normally. | NOT COMPLETED in this container |
| 11 | Existing mock melody step display is normal. | NOT COMPLETED in this container |
| 12 | `Step X/N` is normal. | NOT COMPLETED in this container |
| 13 | Previous / next target controls are normal. | NOT COMPLETED in this container |
| 14 | Restart melody is normal. | NOT COMPLETED in this container |
| 15 | Target note playback is normal. | NOT COMPLETED in this container |
| 16 | Retry / current target controls are unaffected. | NOT COMPLETED in this container |
| 17 | Local attempt history UI still exists. | NOT COMPLETED in this container |
| 18 | Static pitch trend preview still exists. | NOT COMPLETED in this container |
| 19 | Existing static Research target curve diagnostic preview still exists. | NOT COMPLETED in this container |
| 20 | Manual research target curve diagnostic JSON preview panel displays. | NOT COMPLETED in this container |
| 21 | Paste valid JSON copied from `/research`. | NOT COMPLETED in this container |
| 22 | Click `Preview pasted diagnostic JSON`. | NOT COMPLETED in this container |
| 23 | Valid pasted JSON displays read-only imported diagnostic preview. | NOT COMPLETED in this container |
| 24 | Imported preview does not affect current target. | NOT COMPLETED in this container |
| 25 | Imported preview does not affect `currentMelodyStepIndex`. | NOT COMPLETED in this container |
| 26 | Imported preview does not write attempt history. | NOT COMPLETED in this container |
| 27 | Imported preview does not participate in pitch comparison. | NOT COMPLETED in this container |
| 28 | Imported preview does not participate in scoring. | NOT COMPLETED in this container |
| 29 | Invalid JSON displays conservative non-scoring error. | NOT COMPLETED in this container |
| 30 | `high` / `medium` `diagnosticConfidence` JSON is rejected. | NOT COMPLETED in this container |
| 31 | UI has no score / grade / pass / fail / correct / wrong misleading wording for the handoff preview. | NOT COMPLETED in this container |
| 32 | UI has no formal Practice Mode target, formal `TargetPitchCurve` integration, Practice Mode audio import, recognized note, or melody recognition misleading wording for the handoff preview. | NOT COMPLETED in this container |

## 3. Network Panel QA

Real DevTools Network panel QA was also blocked by the missing runnable browser in this container. The following checks remain required for a complete P16k browser QA pass:

| # | Check | Result |
|---|---|---|
| 1 | Opening `/research/local-audio-decode` shows no upload request. | NOT COMPLETED in this container |
| 2 | Clicking `Copy diagnostic JSON` shows no upload request. | NOT COMPLETED in this container |
| 3 | Clicking `Copy diagnostic JSON` shows no cloud / AI API / account / database / server-storage request. | NOT COMPLETED in this container |
| 4 | Opening `/practice` shows no upload request. | NOT COMPLETED in this container |
| 5 | Clicking `Preview pasted diagnostic JSON` shows no upload request. | NOT COMPLETED in this container |
| 6 | Clicking `Preview pasted diagnostic JSON` shows no cloud call. | NOT COMPLETED in this container |
| 7 | No AI API call is observed. | NOT COMPLETED in this container |
| 8 | No `/api/recognize` request is observed. | NOT COMPLETED in this container |
| 9 | No account request is observed. | NOT COMPLETED in this container |
| 10 | No database / server-storage request is observed. | NOT COMPLETED in this container |
| 11 | Manual JSON handoff is browser-local copy/paste flow and does not trigger network handoff. | NOT COMPLETED in this container |

## 4. Conclusion

P16k source review result:

- `/research` copy diagnostic JSON UI source review passed.
- `/practice` paste diagnostic JSON preview UI source review passed.
- Parser contract source review passed.
- General boundary source review passed.
- P16k remains docs-only and introduces no runtime changes.

P16k browser/Network result:

- Full manual browser QA was attempted but **not completed** in this container because no runnable real browser could be installed or launched.
- Network panel QA was attempted but **not completed** for the same environment reason.
- The manual JSON handoff beta flow remains source-reviewed as: `/research` copy JSON → `/practice` paste JSON → read-only imported preview.
- A final PASS for full browser QA and Network panel QA still requires running the checklist above in a working browser environment such as Vercel Preview or a local dev server with Chrome/Edge/Firefox.

Boundary statements:

- This is still not formal Practice Mode audio import.
- This is still not formal `TargetPitchCurve` integration.
- This is still not scoring.
- This is still not assessment.
- This is still not Song Learning Mode.
- APK/WebView remains unverified and cannot be claimed APK-ready.
