# P16c Practice Read-only Research Target Curve Preview QA

Date: 2026-07-02

Scope: docs-only QA closeout for the P16b `/practice` read-only research target curve diagnostic preview.

Reviewed source files:

- `app/practice/page.tsx`
- `lib/practice/research-target-curve-preview.example.ts`
- `docs/practice-research-target-curve-integration-plan.md`
- `docs/mvp-status.md`

This QA does not change runtime code, `/practice` behavior, the preview fixture, converter behavior, scoring behavior, dependencies, package files, audio fixtures, or `metadata.local.json`.

## 1. Source Review QA

| # | Check | Result | Evidence / notes |
|---:|---|---|---|
| 1 | P16b only adds a read-only research target curve diagnostic preview section to `/practice`. | Pass | The P16b runtime integration imports `researchTargetCurvePreviewExample` and renders one new `Research target curve diagnostic preview` section in `app/practice/page.tsx`; no source changes were found in research route, API, scoring, package, audio fixture, or metadata files for this QA. |
| 2 | Preview uses a synthetic / fake / hand-authored / non-audio-derived example fixture. | Pass | The fixture source string says it is synthetic, fake, hand-authored, non-audio-derived example data. The `/practice` copy repeats the same boundary. |
| 3 | Fixture is not from a real WAV. | Pass | The fixture source string explicitly says it is not from WAV. |
| 4 | Fixture is not from a user recording. | Pass | The fixture source string explicitly says it is not from user recording. |
| 5 | Fixture is not from `metadata.local.json`. | Pass | The fixture source string explicitly says it is not from `metadata.local.json`. |
| 6 | Fixture does not read files. | Pass | `lib/practice/research-target-curve-preview.example.ts` exports static object data only; no `fs`, `File`, `Blob`, `fetch`, or file input usage is present. |
| 7 | Fixture does not read storage. | Pass | No `localStorage` / `sessionStorage` / storage read exists in the fixture. The rendered copy says the preview does not read storage. |
| 8 | Fixture does not call API. | Pass | No `fetch`, XHR, route handler call, or API client exists in the fixture. The rendered copy says the preview does not read APIs. |
| 9 | Fixture does not upload. | Pass | No upload code exists in the fixture. The rendered copy says the preview does not use uploads. |
| 10 | Fixture does not access database/account. | Pass | No account, persistence, database, or server storage access exists in the fixture. The rendered copy says the preview does not use database or account data. |
| 11 | Preview section has no buttons. | Pass | The new section renders explanatory text, list items, a summary, and a table only; no `button` element appears inside the preview section. |
| 12 | Preview section has no event handlers. | Pass | The preview section does not define `onClick`, `onChange`, `onSubmit`, `onMouse*`, `onKey*`, or other event handlers. |
| 13 | Preview section has no state setters. | Pass | The preview section only reads `researchTargetCurvePreviewExample`; it does not call React state setters. |
| 14 | Preview section has no storage writes. | Pass | No `localStorage.setItem`, `sessionStorage.setItem`, IndexedDB, cookie, or persistence write appears in the preview section. |
| 15 | Preview section has no API calls. | Pass | No `fetch`, XHR, server action, or API route call appears in the preview section. |
| 16 | Preview section has no attempt-history writes. | Pass | Attempt-history writes remain in the existing recording / pitch-estimate flow; the preview only maps static preview segments for display. |
| 17 | Preview explicitly displays boundary copy: Research-only, Static preview, Not a formal Practice Mode target, Not scoring, Not assessment, and Does not replace the current mock melody practice flow. | Pass | These labels are rendered in the preview boundary list. |
| 18 | Preview only displays diagnostic fields: curve source, segment count, total duration, low-confidence segment count, segment index, start / end / duration, target frequency, optional diagnostic target note label, diagnostic confidence, source frame count, and bridged null frame count. | Pass | The section summary and table are limited to those diagnostic display fields. |
| 19 | `targetNoteLabel` is not described as a recognized note. | Pass | The preview footnote says the diagnostic target note label is optional fake preview data and is not a recognized note. |
| 20 | `diagnosticConfidence` is not described as score, grade, pass/fail, or correctness. | Pass | The column is labeled diagnostic confidence; source review found no preview wording that turns it into a score, grade, pass/fail, correctness, correct, or wrong result. |
| 21 | Low-confidence segment preserves low-confidence display. | Pass | Low-confidence count is displayed, low-confidence rows use a distinct background, and `diagnosticConfidence === "low"` renders the literal `low` value. |
| 22 | If fixture or docs mention high / medium / low confidence, confirm code type has not introduced incompatible `"high"` / `"medium"` values if the actual type should remain `"normal" | "low"`. | Finding | P16b currently defines `diagnosticConfidence: "high" | "medium" | "low"` in both the P16a plan shape and the P16b preview fixture, and the fixture uses `"high"`, `"medium"`, and `"low"`. This QA therefore cannot confirm a `"normal" | "low"`-only type contract. No runtime code was changed in P16c because this is docs-only QA. |
| 23 | Existing mock melody targets are unchanged. | Pass | `mockExercise.targetNotes`, `melodySteps`, and note frequencies remain the existing mock melody source for Practice Mode. |
| 24 | `currentMelodyStepIndex` is unchanged. | Pass | Existing state declaration and existing previous / next / restart handlers remain separate from the preview section. |
| 25 | Step X/N display logic is unchanged. | Pass | Step display continues to derive from `currentMelodyStepIndex + 1` and `melodySteps.length`. |
| 26 | Previous / next / restart melody behavior is unchanged. | Pass | Existing handlers still call `setCurrentMelodyStepIndex` only for the mock melody flow. |
| 27 | Target note playback is unchanged. | Pass | Existing target-note playback still uses the current mock melody target frequency and oscillator path; preview segments are not passed into playback. |
| 28 | Local attempt history is unchanged. | Pass | Existing attempt history is still built from local pitch estimate attempts. Preview segments are not appended. |
| 29 | Pitch estimation behavior is unchanged. | Pass | P16b preview rendering does not modify `estimateLocalPitch` imports, calls, parameters, or result handling. |
| 30 | Target-aware comparison behavior is unchanged. | Pass | Existing comparison still uses the current mock melody target note / frequency, not preview segments. |
| 31 | Retry control is unchanged. | Pass | Retry controls remain wired to existing practice attempt handlers and mock melody step indexes. |
| 32 | Existing static pitch trend preview is unchanged. | Pass | The existing static pitch trend preview remains present before the new research preview section. |
| 33 | Research preview segments are not written to attempt history. | Pass | The preview maps segments to table rows only. |
| 34 | Research preview segments do not participate in pitch comparison. | Pass | Pitch comparison reads the attempted mock melody step target; the preview segment list is display-only. |
| 35 | Research preview segments do not participate in scoring. | Pass | There is no formal scoring path, and the preview boundary says it is not scoring / not assessment. |
| 36 | No score / grade / pass / fail / correct / wrong wording is introduced by the preview as a result label. | Pass with note | The preview boundary includes `Not scoring`; it does not present score / grade / pass / fail / correct / wrong result wording. Existing non-preview Practice Mode copy elsewhere already states there is no formal score / grade / pass / fail. |
| 37 | No `/research/local-audio-decode` changes. | Pass | No P16c change touches the research route; source review did not find P16b changes in the research route files. |
| 38 | No formal `TargetPitchCurve` runtime files modified. | Pass | Source review found no formal runtime target-curve file modification for this QA. |
| 39 | No `/api/recognize` changes. | Pass | Source review found no `/api/recognize` modification for this QA. |
| 40 | No recognition provider union changes. | Pass | Source review found no provider union modification for this QA. |
| 41 | No `package.json` / `package-lock.json` changes. | Pass | Package files are not modified by P16c. |
| 42 | No dependencies. | Pass | P16c adds documentation only and no dependency changes. |
| 43 | No audio fixtures. | Pass | No audio fixture files are added or modified. |
| 44 | No `metadata.local.json`. | Pass | No `metadata.local.json` is added or modified. |
| 45 | No upload / cloud / AI API. | Pass | Source review found no upload, cloud, AI API, or `/api/recognize` calls in the preview path. |
| 46 | No account / persistence / database. | Pass | Source review found no account, persistence, database, or server-storage access in the preview path. |
| 47 | No APK/WebView-ready claim. | Pass | P16b/P16c documentation keeps APK/WebView readiness unverified and does not claim APK-ready status. |

## 2. Manual Practice Browser QA

Manual browser QA status: **environment-limited partial pass**.

A real browser click-through was attempted with Playwright Chromium against local `next dev`, but browser installation was blocked by the environment: `npx playwright install chromium` failed because the Playwright CDN download returned `403 Domain forbidden`. Ubuntu `chromium` / `firefox` apt packages in this container are snap launchers and could not provide a runnable browser because snapd is unavailable in the container. Therefore, this P16c record includes source-backed and HTTP smoke observations, but does **not** claim a completed full real-browser interactive click-through.

Observed with local `next dev` and HTTP route smoke checks:

| # | Check | Result | Evidence / notes |
|---:|---|---|---|
| 1 | `/practice` page can open. | Pass by HTTP smoke | Local route returned renderable content during smoke checking. Full real-browser completion remains blocked by missing browser binary. |
| 2 | Existing mock melody step display is present. | Pass by source review | Existing mock melody title, target notes, and current target section remain in `app/practice/page.tsx`. |
| 3 | Step X/N displays normally. | Pass by source review | Step display still uses the existing mock melody step index and total count. |
| 4 | Previous target / next target controls work. | Not fully completed in browser | Source wiring is unchanged, but real click-through could not be completed because no runnable browser binary was available. |
| 5 | Restart melody works. | Not fully completed in browser | Source wiring is unchanged, but real click-through could not be completed because no runnable browser binary was available. |
| 6 | Target note playback works. | Not fully completed in browser | Source wiring is unchanged, but real browser audio click-through could not be completed because no runnable browser binary was available. |
| 7 | Retry / current target controls are unaffected. | Pass by source review | Retry and current target handlers remain wired to existing mock melody flow. |
| 8 | Existing attempt history UI still exists. | Pass by source review | Existing recent practice attempt history section remains in `app/practice/page.tsx`. |
| 9 | New research target curve diagnostic preview section displays. | Pass by source review / HTTP smoke | Preview markup is present in `/practice`; full visual browser verification remains environment-limited. |
| 10 | Preview section is read-only. | Pass by source review | No buttons, event handlers, state setters, storage writes, or API calls appear in the preview section. |
| 11 | Preview section does not affect current target. | Pass by source review | Preview reads only the static example fixture and is not wired into current target state. |
| 12 | Preview section does not affect `currentMelodyStepIndex`. | Pass by source review | Preview has no setter calls and does not read/write the melody step index except through normal page rendering context. |
| 13 | Preview section does not write attempt history. | Pass by source review | Preview segments are mapped to table rows only. |
| 14 | Preview section does not participate in pitch comparison. | Pass by source review | Existing comparison uses the mock melody attempted step. |
| 15 | Page has no score / grade / pass / fail / correct / wrong misleading result copy from the preview. | Pass with note | The preview says `Not scoring` / `Not assessment`; existing non-preview copy elsewhere states there is no formal score / grade / pass / fail. |
| 16 | Page has no formal Practice Mode target, formal TargetPitchCurve integration, Practice Mode audio import, recognized note, or melody recognition misleading claim. | Pass | The preview says it is not a formal Practice Mode target and the footnote says the label is not a recognized note. No Practice Mode audio import or melody recognition claim was found. |
| 17 | Low-confidence segment display remains low-confidence. | Pass | Low-confidence count and `low` segment value are preserved. |
| 18 | `/research/local-audio-decode` page can open. | Pass by HTTP smoke | Local route returned renderable content during smoke checking. Full real-browser completion remains blocked by missing browser binary. |
| 19 | `/research/local-audio-decode` original file/decode/extract flow is not affected by this PR. | Pass by source review | P16c does not touch research route files; P16b preview is isolated to `/practice`. |
| 20 | APK/WebView remains unverified; do not claim APK-ready. | Pass | This QA does not make an APK/WebView-ready claim. |

## 3. Network Panel QA

Network panel QA status: **environment-limited partial pass**.

A real browser Network panel / Playwright request observer run was attempted but could not complete because this container lacks a runnable browser. Source review confirms the preview fixture is bundled static code and does not contain any fetch/upload/cloud/AI/API/account/database/server-storage behavior.

| # | Check | Result | Evidence / notes |
|---:|---|---|---|
| 1 | Opening `/practice` shows no upload request. | Pass by source review; browser panel blocked | Preview source contains no upload code. Real browser Network panel could not be completed. |
| 2 | No cloud call observed. | Pass by source review; browser panel blocked | Preview source contains no cloud call. Real browser Network panel could not be completed. |
| 3 | No AI API call observed. | Pass by source review; browser panel blocked | Preview source contains no AI API call. Real browser Network panel could not be completed. |
| 4 | No `/api/recognize` request observed. | Pass by source review; browser panel blocked | Preview source contains no `/api/recognize` call. Real browser Network panel could not be completed. |
| 5 | No account request observed. | Pass by source review; browser panel blocked | Preview source contains no account request. Real browser Network panel could not be completed. |
| 6 | No server-storage/database request observed. | Pass by source review; browser panel blocked | Preview source contains no persistence / database request. Real browser Network panel could not be completed. |
| 7 | Preview fixture is bundled/static code display and does not trigger external fetch. | Pass | The fixture is a static exported object imported by `/practice`. |
| 8 | Opening `/research/local-audio-decode` shows no P16b-added upload/cloud/AI/API behavior. | Pass by source review; browser panel blocked | P16b did not modify the research route, and P16c is docs-only. Real browser Network panel could not be completed. |

## Skipped checks

- `npm run validate:local-real-voice-fixtures` skipped because this PR is docs-only QA and does not involve real voice fixtures, real recordings, fixture behavior, or Practice Mode pitch-engine behavior.
- `npm run validate:local-real-phone-comparison` skipped because this PR is docs-only QA and does not involve real phone comparison, real recordings, fixture behavior, or Practice Mode pitch-engine behavior.
