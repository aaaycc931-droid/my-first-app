Warning: truncated output (original token count: 60231)
Total output lines: 919

## P51 — Stage D Manual Draft Measure-Duration Validation Runtime Alpha (2026-07-11)

P51 adds the Stage D acceptance criteria and runtime alpha in one complete vertical slice. The `/practice` default entry remains “本地旋律”. Inside “乐谱预览”, Stage D follows the Stage B manual draft and accepts only the current session-only manual draft. Users must first mark the draft as checked; empty, cleared, invalid, unchecked, or stale drafts show a Chinese disabled reason and cannot be validated.

The pure local validation helper converts half, quarter, and eighth durations to `2`, `1`, and `0.5` quarter-note beats, counts quarter rests equally, derives the required beats from `2/4`, `3/4`, or `4/4`, and validates the fixed two measures separately. The UI shows expected, actual, difference, and complete / underfilled / overfilled state for each measure, plus an overall pass or fail result. This is an explainable measure-duration gate only; it is not recognition accuracy, a score, an official transcription, or a final target.

Validation results store a fingerprint of the checked draft. Adding, editing, or deleting events; changing time signature; changing review state; source replacement or clear; source reconfirmation or detachment; and draft clear or reset make an old result stale. Users can re-run or clear only the validation result. Results remain in current-page React memory, disappear on refresh, and are not written to localStorage, IndexedDB, or a database.

Stage E remains disabled even after a valid result. P51 does not create a practice target, enter practice, score performance, read image pixels, add OCR / OMR, parse PDF, call Audiveris or `/api/recognize`, upload, persist, add accounts, modify parser / converter or piano runtime, or add dependencies. QA level recommendation: strict; focused Stage D tests, Stage B / Stage C regression, production build, remote checks, and browser interaction QA are required before merge.

## P50qa-fix — Mock Draft Clear State and Chinese Label Stabilization (2026-07-11)

P50 / P50fix browser QA passed the core Stage B / Stage C state flow, including mock generation and review, copy-to-manual and overwrite confirmation, identical-metadata image replacement producing new opaque source identities, Stage B / Stage C stale invalidation, decode-failure invalidation, refresh loss, and empty localStorage / IndexedDB. The QA found two small UI/state inconsistencies: clearing an existing mock draft returned `null`, so the visible status became “未生成” instead of the already-defined “已清除”; and the mock summary still exposed the internal English word `stale` in a user-visible label.

P50qa-fix preserves a cleared mock draft sentinel in current-page memory with no events, no checked state, no stale state, and `cleared: true`, so the existing status model now visibly reports “已清除”. Cleared mock drafts remain unusable as current results and cannot be copied to the manual draft. The user-visible label is now “是否已失效”. No OCR / OMR, upload, persistence, `/api/recognize`, validation, practice target, scoring, dependency, parser, converter, piano runtime, Stage D, or Stage E behavior is added. QA level recommendation: light; focused helper regression and build are required before merge.

## P50fix — Post-merge Regression and Source Identity Verification (2026-07-11)

P50fix completed the post-merge safety check for P49 / P50. The focused Stage B manual notation fragment draft regression test was added as `npm run test:local-notation-fragment-draft` and verifies adding notes and rests, the 8-event maximum, editing and deleting, checked invalidation after edits, stale behavior after Stage A source replacement / clear, conversion from stale visual-reference draft to independent manual draft requiring re-check, clear and reset behavior, copying a Stage C mock draft to an unchecked independent Stage B draft, and the continued absence of notation validation or practice target creation.

The source identity review found a real Stage A risk: the previous source id was derived from reusable file metadata (`file.name`, `file.size`, and `file.lastModified`), so two successful local image previews with identical metadata could reuse the same id and fail to make dependent Stage B / Stage C drafts stale. P50fix changes Stage A to create a new opaque session-only source id with `crypto.randomUUID()` only after image preview decode succeeds. Unsupported files, missing file selections, decode failures, and clear continue to send `null`. The id remains in React memory only, is not persisted, is not uploaded, and is not based on filename, MIME type, size, dimensions, lastModified, or other file metadata.

The existing Stage B / Stage C reconciliation remains the stale boundary: Stage B visual-reference drafts compare their stored source id with the current Stage A id and clear `checked` when stale; Stage C mock drafts compare their stored source id with the current Stage A id, clear `checked`, become stale, cannot be used as the current image result, and cannot be copied to Stage B while stale. Source identity tests now cover consecutive successful source id generation with different opaque tokens, including the same-metadata risk by proving ids come from new session tokens rather than file metadata. P50 focused tests still pass.

Runtime fix applied: yes, limited to Stage A source id creation and the resulting stale / checked correctness for dependent Stage B / Stage C drafts. No OCR / OMR, image analysis, upload, `/api/recognize`, persistence, validation gate, practice target, scoring, dependency additions, Stage D, or P51 work was added. Browser QA was not executed in this Codex environment and should still be manually confirmed for selecting two same-metadata images, checking Stage B / Stage C stale UI, clear, and decode failure. QA level recommendation: strict because the fix protects core checked / stale semantics after source replacement.

## P50 — Stage C Mock Recognition Draft Runtime Alpha (2026-07-11)

P50 starts by recording the completed P49 browser manual QA result: the user completed P49 browser QA and reported all tested functions working normally. The `/practice` default entry remains `local-melody` / “本地旋律”. Stage B add, edit, delete, 8-event limit, checked invalidation, stale behavior after image replacement or clear, independent draft conversion, clear, reset, refresh-loss behavior, and disabled future functions all worked normally. The user observed no upload, no `/api/recognize` call, and no persistence. P49 does not need P49fix.

P50 implements Stage C inside the existing `/practice` “乐谱预览” area as a session-only mock recognition draft runtime alpha. It generates a fixed local mock draft only when Stage A currently has a valid image source id. The mock draft is explicitly labeled as “模拟识谱草稿”; the UI states that it comes from fixed sample data, is not a real image recognition result, and that the system has not read or recognized notes from the image. It is only for validating the future recognition-result review flow.

The fixed mock draft uses `4/4`, two measures, five events, P49-compatible note / rest data, at least one rest, and uncertainty labels including relatively clear, uncertain, and possibly missing. The preview displays source type, linked Stage A image source, time signature, measure count, event count, event type / pitch / duration / measure, reliability state and reason, review status, checked state, stale state, and disabled future validation / practice states. Checked only means the user reviewed the current mock draft; it does not mean measure validation passed, real recognition completed, a practice target exists, or practice / scoring is available.

Stage C tracks the Stage A session-only source id used during generation. If the image is replaced, cleared, preview fails, or there is no valid current source, the existing mock draft becomes stale, checked is removed, it cannot be treated as the current image result, and it is not automatically regenerated. Users can mark checked, re-check by returning to unchecked, clear only the mock draft, regenerate a new unchecked mock draft from the current image, and copy the mock events to the Stage B manual draft for editing. Copying is user-initiated only, does not inherit checked state, and requires overwrite confirmation when the manual draft already has events.

P50 does not add real OCR, OMR, image-pixel reading, PDF parsing, `/api/recognize` calls, Audiveris runtime calls, Stage D validation, temporary practice target creation, final targets, official transcription, formal scoring, upload, cloud, account, database, localStorage, IndexedDB, private library persistence, parser / converter changes, piano runtime changes, or new dependencies. QA level recommendation: strict.

## P49 — Stage B Manual Notation Fragment Draft Runtime Alpha (2026-07-11)

P49 implements the Stage B runtime alpha inside the existing `/practice` “乐谱预览” feature area. The default `/practice` entry remains `local-melody`; Stage A local image preview behavior remains browser-local and preview-only. Stage B adds a session-only manual notation fragment draft panel that can be used without an image or with the current Stage A image as a visual reference only. It does not read image pixels, does not perform OCR / OMR, does not call `/api/recognize`, and does not create validation results or practice targets.

The Stage B alpha supports time signatures `2/4`, `3/4`, and `4/4`; pitches C4 through C5; half, quarter, and eighth note durations; quarter rests; measure 1 or 2; note and rest events; and a maximum of 8 events. Users can add notes and rests, edit event type / pitch / duration / measure, delete events, clear the draft, reset the draft, change the time signature, and mark or re-mark the current draft as checked. Editing, deleting, changing time signature, source reconfirmation, and source detachment invalidate the previous checked state.

The preview is intentionally a structured list rather than a full staff renderer. It displays time signature, fixed two-measure scope, event count, event order, event type, pitch when applicable, duration, measure, draft status, checked state, source relationship, future validation availability, and practice-entry availability. Checked means only that the user reviewed the current manual draft; it does not mean measure-duration validation passed, does not mean a formal transcription, does not mean a final target, and does not allow practice entry. Stage D validation and Stage E practice target creation remain disabled with Chinese disabled reasons.

Stage A source relationship is tracked only by a session-local source identifier derived from the currently selected file metadata. If a draft depends on a visual-reference image and that image is replaced or cleared, the draft becomes stale, old checked state is removed, and the user must either reconnect it to the current image or convert it to an independent manual draft before checking again. No localStorage, IndexedDB, upload, database, account, cloud, private library, package, dependency, parser, converter, piano runtime, scoring, final target, or `/api/recognize` changes are included. QA level recommendation: strict.

## P48 — Stage B Manual Notation Fragment Draft Acceptance Criteria (2026-07-11)

P48 is a docs-only acceptance criteria update for Stage B of the sheet-music-to-practice-target route. It adds `docs/stage-b-manual-notation-fragment-draft-acceptance-criteria.md` to define the future “manual notation fragment draft” stage before runtime work begins. Stage B is limited to user-created short notation fragment drafts with preview, edit, delete, clear, reset, checked / stale rules, and future validation / practice disabled reasons.

P48 clarifies that Stage B is not OCR, OMR, automatic recognition, official transcription, final target, practice target, scoring, PDF parsing, upload, cloud, account, database, or persistence. Stage A images may be used only as a visual reference; Stage B must not read, recognize, upload, or describe a draft as an automatic result from the image. If a referenced Stage A image is replaced or cleared, dependent drafts must become stale or require explicit confirmation to continue as independent manual drafts.

P48 records the recommended minimal Stage B scope: time signatures `2/4`, `3/4`, and `4/4`; pitch range C4–C5; half, quarter, and eighth notes; at least quarter rests; 1–2 measures; a maximum of 8 note or rest events; and no dotted rhythms, triplets, slurs, ties, accidentals, complex key signatures, multiple voices, chords, lyrics, ornaments, multiple staves, or complex cross-measure structures. The first preview may be a structured list or simplified timeline rather than a full staff renderer.

P48 defines the Stage B state model: empty, editing, draft, invalid, unchecked, checked, stale, cleared, future-validation-disabled, and future-practice-disabled. It explicitly states that checked only means the user reviewed the current draft; it does not mean the draft passed measure validation, became an official transcription, became a practice target, can be scored, or can enter practice. Stage B hands off to future Stage D validation only; Stage C mock recognition, Stage D validation gate, Stage E session-only temporary practice target creation, and Stage F real OCR / OMR remain separate stages.

P48 changes documentation only and does not modify runtime code, UI, `/practice`, `/api/recognize`, app / components / lib files, tests, parser / converter behavior, piano runtime, packages, dependencies, upload, cloud, account, database, validation gates, practice target creation, scoring, final targets, or official transcription. QA level recommendation: none. Suggested next step: P49 — Stage B Manual Notation Fragment Draft Runtime Alpha.

## P47b — Codex Project Entry Rules Hardening (2026-07-11)

P47b is a docs-only project entry rules hardening update. `AGENTS.md` now records Fast Track + Strict Complete Mode so future stages prioritize one valuable, runnable, testable vertical slice instead of unnecessary low-value splits or repeated docs-only phases, while still avoiding rough implementations and unbounded rewrites.

P47b adds a general feature completeness checklist for future user-facing feature changes, including user purpose, first step, empty / loading / invalid states, disabled reason, preview, automatic-result review / modification / confirmation, clear / reset, stale behavior after source replacement, invalidation of old checked / validation / temporary targets, misleading formal-result copy checks, Simplified Chinese UI, focused tests, build need, QA level recommendation, and browser manual QA need.

P47b also strengthens the required-doc rule for sheet-music work: tasks involving staff notation, sheet preview, notation draft, recognition, OCR / OMR, sheet-music-to-practice-target, or Stage A–F must read `docs/sheet-music-to-practice-target-mvp-plan.md` and the current stage's acceptance criteria document in addition to the general required docs. If the current stage has no acceptance criteria document, Codex must state that explicitly and must not assume its contents.

P47b adds GitHub, Vercel, browser QA, and remote-state honesty rules. Codex must not claim browser QA without an available browser, must not claim GitHub PR / remote branch / merge-state checks without remote access, must not claim Vercel deployments or checks passed without Vercel access, must distinguish local tests from remote checks, must not treat source-level review as browser manual QA, and must mark unavailable checks as not executed with reasons.

P47b does not change runtime code, UI, packages, dependencies, `/practice`, `/api/recognize`, parser / converter behavior, piano runtime, or Stage B runtime. QA level recommendation: none. Next step remains P48.

## P47 — Stage A Manual Browser QA Record and Source Review (2026-07-08)

P47 records the completed manual browser QA result for P46 + P46fix. The user completed local browser QA and confirmed the Stage A sheet music import preview baseline passes. This is a docs-only QA record for future Stage B / C / D / E work; it does not change runtime code.

Manual QA results recorded:

1. Opening `/practice` still defaults to `local-melody` / 本地旋律, not `sheet-music` / 乐谱预览.
2. Clicking the “乐谱预览” navigation item enters the Stage A panel.
3. Selecting PNG / JPG / JPEG images displays a browser-local preview.
4. Metadata displays file name, MIME type, file size, image width, image height, local import status, local-only state, not-ready-for-recognition state, and not-ready-for-practice state.
5. Clicking clear removes the preview and metadata and returns the panel to empty / cleared state.
6. Replacing the image makes the old preview and old metadata no longer count as the current valid source.
7. Selecting unsupported PDF, audio, video, document, or other non-image files shows a Chinese warning and does not generate preview or metadata.
8. DevTools Network confirms that image content is not uploaded.
9. DevTools Network confirms that no upload API is called.
10. DevTools Network confirms that `/api/recognize` is not called.
11. Refreshing the page does not retain the selected image.
12. Application inspection confirms no localStorage or IndexedDB persistence of image content.
13. The page does not show misleading copy such as score, accuracy, final target, official transcription, target ready, 识别完成, 可评分, 已保存, or 已上传.

Stage A boundary confirmations remain unchanged: Stage A is only browser-local image preview. It does not do OCR, OMR, PDF parser runtime, upload, save, account, database, cloud, recognition draft generation, practice target generation, `/practice` practice-flow integration, scoring, final target, or official transcription. It also does not modify `/api/recognize`, parser / converter behavior, piano runtime, P40 temporary targets, local melody guide reference audio, metronome, rhythm, onset, or feedback functions. QA level recommendation: none.

## P46 — Stage A Local Sheet Music Image Import Preview Runtime Alpha (2026-07-08)

P46 implements the Stage A runtime alpha for the sheet-music-to-practice-target input route on `/practice`. It adds a display-only local sheet music image import and preview panel where users can choose a local PNG / JPG / JPEG image, preview it in the browser, inspect file name, MIME type, file size, image width and height, local import status, local-only state, recognition availability, and practice-entry availability. The panel supports clearing and replacing the current image, rejects unsupported files and files over 10 MB, handles image decode failure with a warning, and releases object URLs when files are cleared, replaced, fail to decode, or the panel unmounts.

P46 remains strictly browser-local and session-only. It is image preview only: no OCR, no OMR, no PDF parser runtime, no upload, no persistence, no localStorage / IndexedDB image storage, no recognition draft, no practice target, no scoring, no final target, no official transcription, and no `/practice` practice-flow integration. The new `/practice` navigation entry only displays the Stage A panel; it does not affect the P40 temporary target flow, local melody guide audio import, metronome, rhythm, onset, feedback, parser / converter behavior, `/api/recognize`, piano runtime, accounts, database, cloud, or dependencies. QA level recommendation: standard.

## P45 — Stage A Sheet Music Import Preview Acceptance Criteria (2026-07-08)

P45 is a docs-only / source-review update for Stage A of the sheet-music-to-practice-target route. It adds `docs/stage-a-sheet-music-import-preview-acceptance-criteria.md` to define acceptance criteria before any Stage A runtime work begins. Stage A is limited to browser-local sheet music image import and preview: selecting a local image, showing a local preview, displaying basic file metadata, and supporting clear / replace behavior. It is not OCR, not OMR, not PDF parsing, not recognition, not target generation, not `/practice` integration, not scoring, and not a formal transcription.

P45 documents the required Stage A user flow, UI states, Simplified Chinese copy, supported file rules, metadata requirements, clear / replace / stale behavior, no-upload Network QA checklist, explicit non-goals, and handoff boundaries for later Stage B through Stage F work. It clarifies that PDF support, manual notation drafts, mock recognition drafts, validation / measure checks, temporary practice target creation, and real OCR / OMR integration belong to later stages and must not be pulled into Stage A.

P45 changes documentation only and does not modify runtime code, UI, components, file pickers, OCR, PDF parser, upload, account, database, cloud, scoring, final target, dependencies, `/api/recognize`, `/practice` runtime behavior, parser / converter behavior, or piano runtime. QA level recommendation: none.

## P44 — Sheet Music to Practice Target MVP Staged Plan (2026-07-08)

P44 is a docs-only staged planning update for the sheet-music-to-practice-target input system. It adds `docs/sheet-music-to-practice-target-mvp-plan.md` to clarify that sheet music recognition is a practice-content input capability for the Chinese-user-facing sight-singing and ear-training system, not a standalone OCR tool. The intended output is a previewable, reviewable, modifiable, confirmable practice target draft that can later support sight-singing practice, rhythm practice, future pitch target generation, and non-scoring practice feedback.

P44 documents the future full flow from local sheet image / PDF source, sheet preview, page selection, zoom / pan / rotate / crop, recognition range selection, recognition draft generation, uncertainty marking, source-vs-result review, manual correction, measure-duration validation, temporary sight-singing or rhythm target creation, `/practice` non-scoring practice, and future formal scoring. It explicitly states that early MVP stages implement only small slices and must not attempt the full flow at once.

P44 breaks the route into Stage A local sheet import and preview draft, Stage B manual notation fragment draft, Stage C mock recognition draft, Stage D draft review and measure validation, Stage E conversion to a session-only temporary sight-singing / rhythm practice target, and Stage F future real OCR / OMR integration. Each stage records what the user can do, what the system generates, what remains draft, how review / clear / reset works, whether `/practice` is connected, whether practice entry is allowed, boundaries, forbidden items, QA level, and recommended tests.

P44 also records high-level data and state principles for imported sheet source, preview state, recognition draft, review state, validation state, temporary practice target, and cleared / stale / invalid states. The current boundary remains browser-local, session-only, non-scoring, with no upload, database, persistence, account, cloud, official transcription, final target, formal scoring, public sharing, runtime change, dependency change, `/api/recognize` change, parser / converter change, piano runtime change, or `/practice` runtime behavior change.

## P43b — Codex Project Entry Instructions Update (2026-07-08)

P43b is a docs-only project entry rules update. It updates `AGENTS.md` so future Codex tasks treat the project as a Chinese-user-facing sight-singing and ear-training practice system, with pitch practice, rhythm practice, ear training, sight-singing practice, and practice feedback as the main product body. It also records that sheet music recognition is an input capability for generating practice content rather than a standalone OCR tool, and that private song practice remains a future supplemental material source rather than the current largest product subject.

P43b adds entry instructions requiring Codex to read the relevant product docs before work involving `/practice`, sheet music recognition, sight-singing and ear training, practice feedback, product roadmap, or feature planning. The required docs are `docs/mvp-status.md`, `docs/sight-singing-ear-training-feature-detail-map.md`, and `docs/private-cloud-song-practice-pipeline-plan.md`; if present, future roadmap / final product shape docs should also be read, and missing files must be reported rather than assumed.

P43b records project-wide rules that user-visible UI should default to Simplified Chinese, automatically recognized / generated / analyzed results must go through preview, review, modification / confirmation, and then enter practice, and the current MVP remains browser-local, session-only, diagnostic, non-scoring, with no account, database, cloud, upload, persistent private library, final target, official transcription, source separation, full-song extraction, formal scoring, public sharing, or community.

P43b also adds the requirement that every Codex report include a QA level recommendation: none for docs-only / test-only / no runtime change, light for copy / display / layout changes that do not alter runtime semantics, standard for new UI interaction / navigation state / display paths / buttons, and strict for audio runtime, recording, playback, reset / clear, practice target creation, scoring-like behavior, upload, cloud, account, or core practice-flow changes. P43b changes documentation only and does not modify runtime code, UI, account, database, cloud, upload, scoring, final target, dependencies, `/api/recognize`, parser / converter behavior, piano runtime, or `/practice` runtime behavior.

## P35 — Private Cloud Song Practice Pipeline Plan (2026-07-03)

P35 is a docs-only route and architecture boundary update for the future private cloud song practice pipeline. It adds `docs/private-cloud-song-practice-pipeline-plan.md` to define the product decision that the project will not build community upload, public music sharing, public resource browsing, public download, or public playback of user-uploaded copyrighted audio. Future product direction allows private cloud upload, private user library, private song analysis, private practice drafts, and private practice feedback, but only as a later formal product stage.

The current MVP remains browser-local, non-scoring, no upload, no cloud, no account, and no database. This remains the current implementation boundary for `/practice`: local recording, local pitch estimation, local onset diagnostics, local rhythm diagnostic feedback, and imported target feedback can continue without server upload or persistent cloud storage. P35 clarifies that this is a current MVP boundary, not a permanent product boundary.

The new plan separates three capability stages: Current MVP Boundary, Future Local Import Stage, and Future Private Cloud Stage. It recommends validating local melody guide audio import, local target pitch curve drafts, and practice draft review before implementing private cloud upload runtime. It also documents the future private pipeline: private object storage, audio preprocessing, source separation, vocal melody extraction, rhythm / beat / onset / phrase analysis, practice draft generation, user review, practice mode integration, and deferred formal scoring.

P35 explicitly keeps community features out of scope. It also confirms no runtime, API, parser, converter, scoring, package, dependency, audio fixture, `metadata.local.json`, piano runtime, `/piano`, upload runtime, cloud runtime, AI API, account, database, object storage, or production Audiveris behavior changes were made.

## P32 — Rhythm Diagnostic UX Stabilization and Compact Marker Legend (2026-07-03)

P32 stabilizes the P31 onset timeline diagnostic UI on `/practice`. The timeline now includes a compact marker legend for candidate markers, rhythm target markers, close / early / late / missed / extra feedback chips, the first-onset origin marker, and the threshold reference. The preview also adds a marker-count diagnostic summary near the timeline so users can see candidates, targets, feedback markers, missed markers, extra markers, alignment mode, selected sensitivity preset, and target pattern without inspecting every marker. Dense marker situations use compact C / E / L / M / X / T / O / TH labels with a readable density note instead of expanding into long overlapping chip text.

This extends P31 timeline marker interaction and alignment markers for future human voice and instrument rhythm training diagnostics. It is diagnostic / practice foundation work only. It is not rhythm scoring, not formal rhythm assessment, not full microphone or instrument evaluation, and not sight-singing comprehensive scoring. It does not produce a rhythm score, pass/fail, grade, accuracy percentage, final result, formal assessment, or persistent rhythm history.

P32 does not upload audio, call cloud / AI, add accounts or databases, modify `/api/recognize`, change parser/converter behavior, change production Audiveris behavior, modify audio fixtures or `metadata.local.json`, modify piano runtime or `/piano`, or add package dependencies. Chart libraries, zoom / pan, automatic noise reduction, instrument-specific formal tuning, persistent rhythm history, live microphone scoring, and formal rhythm scoring remain deferred.

## P31 — Onset Timeline Candidate Interaction and Alignment Markers (2026-07-03)

P31 extends the P30 Audio Onset Strength Timeline Preview and the P27/P28 onset rhythm feedback bridge with a user-visible diagnostic explainability slice. `/practice` now links detected onset candidate markers to the candidate list with session-only candidate indexes and click / focus highlighting, so a candidate list item, timeline marker, and onset-derived feedback item can be inspected together without creating persistent IDs or rhythm history.

The onset rhythm feedback bridge now exposes session-only marker metadata for target rhythm events and feedback timeline labels. Quarter-note and eighth-note target markers are generated from the current rhythm target pattern; feedback markers can represent close, early, late, missed, and extra categories, including missed targets without an onset candidate and extra onsets without a matched target. First-onset alignment diagnostics now include first onset / first target / offset information plus an origin marker note that explains the first detected onset alignment and warns that this mode can hide late-start behavior.

P31 is diagnostic / practice foundation work for future human voice and instrument rhythm training debugging. It improves explainability between browser-local onset detection, target rhythm events, and non-scoring rhythm feedback. It is not rhythm scoring, not formal rhythm assessment, not full microphone or instrument evaluation, and not a final result. It does not produce a rhythm score, grade, pass/fail result, accuracy percentage, formal assessment result, or persistent rhythm history. It does not upload audio, call cloud / AI, add accounts or databases, modify `/api/recognize`, change parser/converter behavior, change audio fixtures or `metadata.local.json`, modify piano runtime or `/piano`, or add package dependencies. Instrument-specific tuning, automatic noise reduction, live microphone scoring, persistent rhythm history, and formal scoring remain deferred.

## P30 — Audio Onset Strength Timeline Preview (2026-07-03)

P30 extends the P26 browser-local audio onset detector and the P29 sensitivity diagnostics with a lightweight onset strength timeline preview. The detector now returns session-only timeline preview data for each retained frame point, including time, frame index, onset strength, RMS energy, threshold, above-threshold state, sensitivity preset, and detected-candidate markers. The preview is safely limited / downsampled for UI rendering and reports when it is downsampled. This reuses the detector's existing energy / strength / threshold calculations rather than introducing a separate scoring path.

`/practice` now displays an Audio Onset Strength Timeline Preview after running detection on the latest local recording. The visualization is a dependency-free div-based diagnostic preview: bars show onset strength, a dashed threshold reference shows the selected preset threshold, and candidate markers show detected onset positions. It also shows the selected sensitivity preset, onset count, duration, and copy explaining that sensitive / balanced / conservative can change candidate detection. Empty state copy explains that users must detect onsets from the latest local recording before timeline data is available.

P30 is diagnostic / practice foundation work for future human voice and instrument rhythm training debugging. It is not rhythm scoring, not formal assessment, not full microphone or instrument evaluation, and not a final result. It does not produce a rhythm score, grade, pass/fail result, accuracy percentage, formal assessment result, or persistent rhythm history. It does not upload audio, call cloud / AI, add accounts or databases, modify `/api/recognize`, change parser/converter behavior, change audio fixtures or `metadata.local.json`, modify piano runtime or `/piano`, or add package dependencies. Instrument-specific tuning, automatic noise reduction, live microphone scoring, persistent rhythm history, and formal scoring remain deferred.

# MVP status

## P43 — 视唱练耳系统功能细节设计标准与功能地图 (2026-07-08)

P43 is a docs-only product design update. It adds `docs/sight-singing-ear-training-feature-detail-map.md` and repositions the final product as a Chinese-user-facing sight-singing and ear-training practice system, with pitch, rhythm, ear training, sight-singing, and practice feedback as the main body. Sheet music recognition is clarified as a future score-to-practice-target input system, not a standalone OCR tool, while private song practice remains a future supplemental source of personalized practice material.

P43 defines the mandatory design standard that all automatically generated, automatically recognized, or automatically analyzed results must go through preview, review, modification / confirmation, and only then enter practice. This applies to score recognition results, target pitch curve drafts, private song analysis results, rhythm analysis results, phrase analysis results, generated practice targets, and future formal scoring targets.

P43 lists the subject functions of the sight-singing and ear-training system: practice content generation and import, pitch practice, rhythm practice, sight-singing practice, ear-training practice, practice feedback, practice target review and correction, practice records and progress tracking, private song practice supplementation, and account / private data systems. It also records detailed requirements for score recognition, feedback, current MVP boundaries, future enhancement directions, and explicit non-goals.

P43 changes documentation only and does not modify runtime code, UI, account, database, cloud, upload, scoring, final target, correction editor, package dependencies, `/api/recognize`, parser / converter behavior, or piano runtime.

## P41a — Future Product Requirements Roadmap Update (2026-07-08)

P41a is a docs-only future product roadmap update. It records that a future formal product needs a user login / account system, while the current Practice Mode MVP remains browser-local, session-only, and without account, database, cloud, upload, login UI, auth API, user table, session / token code, or payment / membership runtime.

The future account system is a required product capability for private practice workflows only: private song library, private cloud song analysis, practice draft saving, practice record sync, multi-device sync, membership / permission / quota management, and user data deletion / export. The account system is not a community account system and must not automatically introduce public profiles, following, comments, direct messages, public uploads, public sharing, or a public resource library.

P41a does not choose an auth implementation. Email, phone number, WeChat login, or other login methods remain future research topics. Before any account work begins, the project needs a separate auth / account architecture plan covering identity, privacy, security, data ownership, deletion / export, membership boundaries, and how account-gated private cloud features stay separate from community features.

P41a changes documentation only and does not modify runtime code, `/api/recognize`, parser / converter behavior, piano runtime, upload / cloud runtime, auth code, database schema, account UI, payment / membership runtime, package dependencies, or generated artifacts.

## P40b — 临时检查草稿练习目标 UX 稳定化 (2026-07-08)

P40b stabilizes the user-facing UX around the P40 temporary reviewed-draft practice target on `/practice`. The empty state now explains that no temporary target exists until the user imports local melody guide audio, generates a local target pitch curve draft, reviews a valid selection, and explicitly creates the temporary target. The creation area now gives clearer Simplified Chinese disabled/ready reasons and states that regeneration, review reset, clearing audio, or selecting new audio can clear or invalidate the target.

The temporary target panel now emphasizes the current target source, checked frame range, current-session/browser-local lifetime, non-scoring diagnostic purpose, clear action, and cleanup conditions. Boundary copy clarifies that the target is not a final target, not official transcription, not scoring, not accuracy/grade/pass/fail, and not a formal song analysis result. Warnings remain display-only and are presented as reliability/boundary explanations.

P40b does not change P40 gating, target creation semantics, helper return semantics, final target behavior, official transcription, scoring, correction editing, pitch frame editing, persistent target/library behavior, upload/cloud/account/database behavior, `/api/recognize`, parser/converter behavior, piano runtime, or package dependencies.

## P28 — Audio Onset Alignment Modes for Non-scoring Rhythm Feedback (2026-07-03)

P28 adds Audio Onset Alignment Modes to the P27 audio onset rhythm feedback bridge. The helper now supports both `recording-start` alignment and a new `first-onset` research / practice alignment option. `recording-start` keeps the P27 behavior: detected onset times are interpreted relative to the latest local recording start and target rhythm events begin at 0ms. `first-onset` maps the first detected onset to the first target event, then applies the optional session latency offset through the existing rhythm tap feedback helper, so recordings with leading silence or a late user start can be inspected with less whole-take offset. The helper returns diagnostic alignment metadata including alignment mode, alignment offset, first onset time, first target time, adjusted onset time, warnings, and a diagnostic summary.

`/practice` now exposes a lightweight alignment selector for onset-based rhythm feedback: Recording start and First detected onset. The copy explains that Recording start assumes the recording starts on the target timeline, First detected onset aligns the first detected onset to the first target event, and first-onset can hide late-start recording offset because it changes timing interpretation. This remains diagnostic practice feedback for future voice / instrument rhythm training, not a formal result. State is session-only UI state.

Strict P28 boundaries:

- P28 is diagnostic / practice feedback only, not rhythm scoring, not formal rhythm assessment, not complete voice / instrument rhythm evaluation, and not sight-singing comprehensive scoring.
- P28 does not produce pass/fail, grade, accuracy percentage, formal score, final result, or assessment.
- P28 does not add upload, cloud processing, AI API, account, database, server storage, or persistent rhythm history.
- P28 does not modify `/api/recognize`, parser/converter behavior, production Audiveris behavior, audio fixtures, `metadata.local.json`, piano runtime, or `/piano`.
- Instrument-specific tuning, noise handling, microphone-specific formal assessment, formal scoring, and comprehensive sight-singing scoring remain deferred.

## P26 — Browser-local Audio Onset Detection Foundation (2026-07-03)

P26 adds a Browser-local Audio Onset Detection Foundation for future voice and instrument rhythm training. The new reusable helper accepts decoded samples / `Float32Array` plus `sampleRate`, frames the audio, computes RMS energy, derives onset strength from energy changes, applies an adaptive diagnostic threshold plus a minimum onset gap, and returns onset candidates with frame/time/strength/energy/threshold/diagnostic confidence metadata. `/practice` now includes a lightweight research panel that can run onset detection against the latest browser-local recording and display onset count, detected onset times, metadata, warnings, and limitations.

P26 is foundation work for future human voice rhythm training, piano, guitar / plucked instruments, percussion, other short-attack instruments, future audio-based rhythm feedback, future rhythm scoring research, and future sight-singing rhythm alignment. It is not formal scoring or assessment.

Strict P26 boundaries:

- P26 is not rhythm scoring, not formal rhythm assessment, not complete voice/instrument rhythm evaluation, and not sight-singing comprehensive scoring.
- P26 does not produce pass/fail, grade, accuracy percentage, score, or final assessment. Diagnostic confidence only describes onset-candidate strength relative to the local detector threshold.
- P26 is browser-local: no upload, cloud processing, AI API, account, database, server storage, or persistent rhythm history is added.
- P26 does not modify `/api/recognize`, parser/converter behavior, production Audiveris behavior, audio fixtures, `metadata.local.json`, piano runtime, or `/piano`.
- Instrument-specific onset tuning, noise reduction, microphone-specific assessment, and connecting detected onsets to rhythm feedback matching are deferred to future stages such as P27.
- Current limitations remain explicit: human voice, flute, violin, legato passages, weak attacks, and noisy environments may be harder to detect and are not guaranteed suitable for formal evaluation.

## P25 — Tap Latency Calibration Foundation (2026-07-03)

P25 adds a lightweight Tap Latency Calibration Foundation for `/practice`. It serves future rhythm feedback reliability by estimating a browser-session tap offset against quarter-note metronome targets after count-in. The calibration is session-only React state, is not saved to account, database, localStorage, IndexedDB, cookies, or persistent history, and can optionally adjust Rhythm Practice Alpha tap feedback offsets for the current session.

Strict P25 boundaries:

- This is not rhythm scoring, not formal assessment, and not sight-singing comprehensive scoring.
- It does not produce pass/fail, grade, accuracy percentage, formal score, or final assessment.
- It uses browser-local input timestamps and Web Audio click targets only.
- It does not add microphone onset detection, instrument onset detection, audio hardware round-trip measurement, audio upload, cloud, AI, account, database, or saved calibration profiles.
- It does not modify `/api/recognize`, parser/converter behavior, production Audiveris behavior, audio fixtures, `metadata.local.json`, piano runtime, or `/piano`.
- Microphone/instrument onset calibration is deferred to a separate future stage.

## 1. Product identity

This project is a sheet music recognition MVP. Its purpose is to validate a minimal product flow for recognizing sheet music and previewing the resulting notes. It is not a portfolio page.

## 产品原则：用户便捷交互体验第一优先级

用户便捷的交互体验是本项目的第一优先级。项目最终不是为了展示技术链路，而是为了让中文用户能够低理解成本、低操作负担地完成视唱练耳练习。

未来所有功能设计都必须优先满足：

1. 操作步骤尽可能少。
2. 用户不需要理解 JSON、诊断数据结构、内部类型名或开发者概念。
3. 用户不应该在多个页面之间手动复制复杂数据，除非这是开发/调试备用入口。
4. 主流程应尽量一键完成，例如「发送到练习页预览」「开始练习」「清除导入预览」。
5. 用户可见文案应面向中文用户，当前阶段优先使用中文，不需要中英双语。
6. 所有研究性边界说明也要用中文表达，例如：这是研究预览，不是正式评分；不替换当前练习旋律；不上传音频；不写入练习历史；不参与音高评分。
7. 技术安全边界不能以牺牲用户体验为代价。JSON copy/paste 可以保留为开发/调试 fallback，但不能作为普通用户主路径。
8. 每个未来 PR 都应检查是否增加了用户操作负担；如果增加了，必须说明原因，并优先考虑更简单的交互方案。

## 2. Main user-facing flow

The current main user-facing flow is:

- Users upload a JPG or PNG image.
- The main API is `/api/recognize`.
- The upload limit is 10MB.
- The current default recognizer provider is `mock`.
- Recognition results can be displayed on the page as notes and played back.
- Playback now has an explicit stop control for stopping long previews without refreshing the page.
- This main flow is currently not Audiveris and is not real PDF OMR.

Important boundaries for the main flow:

- `/api/recognize` does not accept PDF input.
- `/api/recognize` does not call Audiveris.
- Production and Vercel default deployments do not run Audiveris.

## 3. Dev-only Audiveris local flow

A local dev-only Audiveris flow has been completed for developer validation:

- A local PDF score is used as input.
- Local Audiveris is executed outside the production flow.
- The dev-only API route is `/api/dev/recognize-audiveris`.
- Generated MXL output is written in a temp directory.
- MusicXML is extracted from the generated MXL.
- Notes are parsed from the extracted MusicXML.
- The dev-only UI displays `noteCount`, `source`, `inputType`, and `firstNotes`.
- The dev-only UI can play a `firstNotes` preview.
- The dev-only UI can play a full notes preview when explicit full notes flags are enabled.
- The explicit stop playback control applies to the main mock notes playback, the dev-only `firstNotes` preview, and the dev-only full notes preview.
- The dev-only Audiveris panel copy now states that it is a local developer tool, not production/Vercel, not `/api/recognize`, and that PDF input is only for the dev-only route.

This playback stop control does not change `/api/recognize`, provider behavior, or dev-only Audiveris boundaries.

This Audiveris flow is:

- local-only
- dev-only
- not production
- not Vercel
- not `/api/recognize`
- not a default provider change
- not an Audiveris provider

## 4. Required dev-only flags

The dev-only Audiveris flow is controlled by explicit flags:

```text id="t8mo4a"
NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED
NEXT_PUBLIC_AUDIVERIS_DEV_FULL_NOTES_ENABLED
AUDIVERIS_DEV_API_ENABLED
AUDIVERIS_DEV_API_RETURN_FULL_NOTES
AUDIVERIS_PATH
AUDIVERIS_DEV_API_TIMEOUT_MS
```

Full notes are not returned by default. Returning full notes requires all of the following:

- the server flag is enabled
- the frontend flag is enabled
- the request explicitly opts in with `includeNotes=full`

Even when full notes are enabled, the response returns at most 2000 notes and may be truncated.

## 5. Repository safety boundaries

The repository safety boundaries are:

- the default provider remains `mock`
- the provider union remains `"mock" | "ai" | "musicxml"`
- there is no `audiveris` provider
- no PDF, MXL, XML, OMR, log, image, or sample score files are committed
- Audiveris binaries and local score files stay outside the repository
- generated files stay outside the repository or in temp directories only

## 6. How to demo

### Production/Vercel demo

Production and Vercel demos should only show the main mock recognition flow:

- upload a JPG or PNG image
- display mock notes
- play back the displayed notes

### Local dev demo

For local development setup, see `docs/audiveris-dev-quickstart.md`.

A local developer demo can show the complete dev-only Audiveris flow:

- local PDF input
- Local Audiveris execution
- `noteCount` 651 for the developer-reported local score
- `firstNotes` playback
- full notes playback when the explicit full notes flags are enabled

`score.pdf` is a developer local file and is not stored in this repository.

## Public demo polish

Public demo checklist: see `docs/public-demo-checklist.md`.

Real OMR production architecture plan: see `docs/real-omr-architecture-plan.md`.

OMR sample and fixture strategy: see `docs/omr-sample-fixture-strategy.md`.

Public demo polish is complete for the production-safe MVP page. Production/Vercel demos still use the mock recognition flow only, and Local Audiveris remains dev-only/local-only behind explicit flags. This does not change `/api/recognize`, the provider union, or the default mock provider.

## 7. Current known non-goals

Current known non-goals are:

- production OMR
- hosted Audiveris
- PDF upload to `/api/recognize`
- Audiveris provider in the recognizer union
- committing real score samples
- treating dev-only results as Codex-verified

## 8. Suggested next productization steps

These are candidates only and are not implemented here:

1. Decide whether real OMR should be hosted or remain local-only.
2. Add a production-safe architecture plan before connecting any real OMR to `/api/recognize`.
3. Improve UI copy and demo flow for the public mock MVP.
4. Keep dev-only Audiveris strictly behind explicit flags.

- 2026-06-17: Practice Mode skeleton started with mock-only front-end placeholders; no recording, scoring, AI, or real pitch/rhythm evaluation.

- 2026-06-17: Practice Mode now includes target playback and an interactive mock attempt/feedback/retry flow; still no recording, real scoring, AI API calls, or real pitch/rhythm evaluation.

- 2026-06-18: Added a Practice Mode manual QA checklist for the browser local-only `/practice` prototype; this is docs-only and does not change recording, scoring, provider, API, Audiveris, or dependency behavior.

- 2026-06-18: Added a pitch evaluation benchmark plan for future accuracy validation; this is docs-only and does not change pitch estimate algorithms, scoring, rhythm evaluation, AI API calls, audio upload, providers, or dependencies.

- 2026-06-18: Added `npm run validate:synthetic-pitch-benchmark` for the default synthetic pitch benchmark suite using generated in-memory buffers only; this does not change UI, pitch algorithms, target comparison, scoring, audio upload, AI API calls, default provider, provider union, or dependencies.

- 2026-06-18: Updated `npm run validate:synthetic-pitch-benchmark` to be baseline-safe: no-pitch behavior is the blocking validation gate, while known-frequency pitch results are currently exploratory/non-blocking and do not establish any product accuracy claim.

- 2026-06-18: Improved Practice Mode no-pitch / quiet recording feedback for the experimental local pitch estimate. The UI now separates too-short recordings from no-usable-pitch-frame cases and gives retry guidance while keeping the behavior local-only. This does not change the pitch estimate algorithm, target comparison thresholds, formal scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, package dependencies, `/api/recognize`, or Audiveris boundaries.

- 2026-06-18: Polished Practice Mode confidence display copy for the experimental local pitch estimate. Confidence is now explained as valid pitch frames divided by analyzed frames and explicitly not a score, grade, or proof of pitch accuracy. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, formal scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, package dependencies, `/api/recognize`, or Audiveris boundaries.

- 2026-06-18: Improved `npm run validate:synthetic-pitch-benchmark` exploratory diagnostics for A4/C4/G4/E4 known-frequency pitch cases. The command now reports concise target frequency, estimated frequency, cents error, nearest note, confidence, and frame-count details while keeping known-frequency pitch failures exploratory/non-blocking and no-pitch cases blocking. This does not change UI, pitch algorithms, confidence calculation, target comparison, formal scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, package dependencies, `/api/recognize`, or Audiveris boundaries.

- 2026-06-18: Documented the current synthetic pitch benchmark baseline results in `docs/pitch-evaluation-benchmark-results.md` after running `npm run validate:synthetic-pitch-benchmark`. This is docs-only and does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, validation behavior, formal scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, package dependencies, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Improved the experimental local pitch estimator with a small synthetic benchmark-guided autocorrelation peak selection change for sine-wave subharmonic / octave-down errors. This remains an experimental local pitch estimate, not formal scoring and not production accuracy proof. The change does not modify UI, rhythm evaluation, AI API behavior, audio upload behavior, provider behavior, default `mock` provider, provider union, package dependencies, `/api/recognize`, Audiveris behavior, target comparison, benchmark tolerances, or benchmark case targets.

- 2026-06-18: Hardened `npm run validate:synthetic-pitch-benchmark` so the default A4/C4/G4/E4 synthetic known-frequency pitch cases are now blocking regression cases and any regression fails validation, while the silent sustained and too-short no-pitch cases remain blocking. This is a synthetic regression gate only, not production accuracy proof, not formal scoring, and not proof of real singing accuracy. The change does not modify the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, dependencies, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Expanded synthetic pitch benchmark coverage with generated in-memory extended exploratory diagnostics for A3/C3/E3/C5/A5 while keeping A4/C4/G4/E4 synthetic pitch cases and no-pitch cases as blocking gates. Extended diagnostics are non-blocking and guide future estimator work only; they are not production accuracy proof, formal scoring, product failure claims, or real singing accuracy claims. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, dependencies, `package.json`, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Expanded the blocking synthetic pitch regression gate from A4/C4/G4/E4 to include the PR #116 passing A3/C3/E3/C5/A5 generated in-memory synthetic cases. The silent sustained and too-short no-pitch cases remain blocking. This is a synthetic regression gate only, not production accuracy proof, not formal scoring, and not proof of real singing accuracy. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, dependencies, `package.json`, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Added generated in-memory synthetic pitch robustness diagnostics for quiet amplitude, short duration, and deterministic light-noise A4/C4 variants. These diagnostics are exploratory/non-blocking and guide future estimator work only; the clean sine A3/C3/E3/A4/C4/E4/G4/C5/A5 pitch cases and silent sustained plus too-short no-pitch cases remain blocking. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, scoring, formal scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, dependencies, `package.json`, `/api/recognize`, Audiveris behavior, or repository audio/sample fixture boundaries.

- 2026-06-18: Added a blocking synthetic pitch robustness regression gate by promoting the six PR #118 passing generated in-memory A4/C4 quiet-amplitude, short-duration, and deterministic light-noise robustness cases. The clean sine A3/C3/E3/A4/C4/E4/G4/C5/A5 pitch cases remain blocking, and the silent sustained plus too-short no-pitch cases remain blocking. This is not production accuracy proof, not formal scoring, and does not prove real singing accuracy. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, dependencies, `package.json`, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Added `npm run validate:local` as a validation ergonomics only aggregate local validation entry. It runs the existing synthetic pitch benchmark, dev OMR API boundary, repository hygiene, recognition boundary, MusicXML import UI, MXL import, MusicXML fixture validation, and build commands in sequence. This is no behavior change and no dependency change: it does not change algorithm behavior, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, package behavior beyond scripts, `/api/recognize`, or Audiveris behavior.

- 2026-06-18: Added Practice Mode local in-session recent attempt history for successful experimental local pitch estimates. The history is browser state only, keeps the most recent 5 attempts, and can be cleared with a local Clear attempt history button. This does not upload audio, does not persist to a server, does not use localStorage, IndexedDB, or cookies, does not add formal scoring, does not add rhythm evaluation, does not call AI, does not add dependencies, does not change provider behavior, keeps the default provider as `mock`, keeps the provider union as `"mock" | "ai" | "musicxml"`, does not change `/api/recognize`, does not add PDF handling, and does not call Audiveris. It also does not change the pitch estimate algorithm, confidence calculation, or target comparison algorithm.

- 2026-06-18: Polished Practice Mode local in-session recent attempt history so repeated successful estimates of the same recording do not create duplicate history entries, while a new recording can still add a new attempt and Clear attempt history only clears local React state. The history remains browser-session-only and is not uploaded, not persisted to a server, not stored in localStorage, IndexedDB, or cookies, not formal scoring, not rhythm evaluation, and not AI-generated. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, providers, default `mock` provider, provider union, package dependencies, `package.json`, `/api/recognize`, PDF handling, or Audiveris behav…30231 tokens truncated…or. The QA notes one source-review finding: P16b currently defines and displays `diagnosticConfidence` values as `"high" | "medium" | "low"`, so this docs-only QA cannot confirm a `"normal" | "low"`-only contract without a later runtime follow-up. Real browser and Network panel click-through were attempted with Playwright Chromium, but the container could not install or launch a browser because the Playwright browser download was blocked by `403 Domain forbidden` and Ubuntu browser packages were snap launchers without working snapd. P16c changes no runtime behavior, `/practice` UI behavior, preview fixture, Practice Mode flow, research route, formal `TargetPitchCurve` runtime files, converter behavior, scoring, dependencies, package files, audio fixtures, real recordings, or `metadata.local.json`; APK/WebView remains unverified and cannot be claimed APK-ready.

## 50. P16d Practice Preview Diagnostic Confidence Contract Alignment

- 2026-07-02: P16d aligns the `/practice` read-only research target curve diagnostic preview fixture with the P15b research-only diagnostic confidence contract. Active fixture values now use only `normal` and `low` diagnostic confidence, UI labels render them as Normal diagnostic confidence and Low diagnostic confidence, and the low-confidence segment keeps its low-confidence display. The fixture is constrained with P15b research-only diagnostic types so TypeScript can prevent future `high` / `medium` diagnostic confidence values in the active preview fixture. This runtime cleanup does not change existing mock melody targets, `currentMelodyStepIndex`, Step X/N display, previous / next / restart melody controls, target note playback, attempt history, pitch estimation, target-aware comparison, retry controls, Practice Mode target replacement, scoring / grade / pass / fail behavior, `/research/local-audio-decode`, formal `TargetPitchCurve` runtime files, `/api/recognize`, recognition providers, package files, audio fixtures, real recordings, or `metadata.local.json`.

## 51. P16e Practice Preview Diagnostic Confidence Contract Source Review QA

- 2026-07-02: Added P16e docs-only source review QA for the P16d `/practice` research target curve diagnostic preview confidence contract...

## 52. P16f Practice Browser QA Recovery Plan / Manual QA Guide

- 2026-07-02: Added P16f docs-only browser QA recovery guidance for the P16 `/practice` read-only research target curve diagnostic preview...

## 53. P16g Manual Browser QA Result for Practice Research Target Curve Preview

- 2026-07-02: Added P16g docs-only manual browser QA result for the P16 `/practice` research target curve diagnostic preview. P16g records that the user completed full interactive `/practice` manual browser QA in Microsoft Edge on Vercel Preview; existing mock melody display, `Step X/N`, previous / next target controls, restart melody, target note playback, retry / current target controls, local attempt history, and static pitch trend preview all passed; the research target curve diagnostic preview displayed correctly, remained read-only, did not affect the current target or `currentMelodyStepIndex`, did not write attempt history, did not participate in pitch comparison or scoring, used the expected research-only / static-preview / non-assessment copy, showed Normal / Low diagnostic confidence, and did not introduce misleading recognized-note, formal TargetPitchCurve integration, Practice Mode audio import, melody recognition, note recognition, score, grade, pass/fail, or correct/wrong claims. P16g also records Network panel QA with no upload, cloud, AI API, `/api/recognize`, account, database, or server-storage behavior observed; notes that `favicon.ico` 404 and browser extension / built-in script requests are not project-added upload/cloud/AI/API/account/database behavior; and records a `/research/local-audio-decode` smoke check confirming the page opens and file selection / decode metadata / Extract pitch frames flow still exists. This docs-only result does not change runtime behavior, `/practice` UI behavior, preview fixture, Practice Mode flow, research route, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`; it is still not formal Practice Mode audio import, not formal TargetPitchCurve integration, not scoring, not Song Learning Mode, and APK/WebView remains unverified and cannot be claimed APK-ready.

## 54. P16h Practice Research Target Curve Handoff Source Decision + Acceptance Criteria + Implementation Plan

- 2026-07-02: Added P16h docs-only handoff planning for a future safe, explicit, research-only path from `/research/local-audio-decode` `ResearchTargetPitchCurveDiagnostic` output to a `/practice` read-only preview. P16h selects Option A: explicit manual JSON copy/paste handoff, because `/research` already generates the diagnostic, `/practice` already displays a same-family diagnostic preview shape, manual copy/paste is safer than automatic handoff, requires no account / database / server storage / upload / cloud / AI API behavior, preserves the local research-only boundary, and can remain read-only without replacing mock melody targets. The future P16i direction is limited to a possible **Copy diagnostic JSON** button in the research route and a research-only paste/import preview panel in `/practice`, with conservative validation for the P15b-like input contract, `diagnosticConfidence` restricted to `normal | low`, expected research `source`, finite segment numbers, positive finite `targetFrequencyHz`, invalid-input isolation from mock melody flow, and no attempt history, pitch comparison, scoring, storage, network, or cross-route persistence. P16h explicitly defers automatic handoff, `localStorage` / `sessionStorage`, URL payloads, server storage, account/database persistence, upload/cloud/AI handoff, Practice Mode target replacement, formal `TargetPitchCurve` integration, Practice Mode audio import, scoring / grade / pass / fail, user pitch alignment, rhythm assessment, sight-singing assessment, Song Learning Mode, and APK/WebView-ready claims. This docs-only planning change does not alter runtime behavior, `/practice` UI behavior, research route UI behavior, the preview fixture, Practice Mode flow, formal `TargetPitchCurve` runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`.

## 55. P16i Manual JSON Handoff Contract Parser + Synthetic Tests

- 2026-07-02: P16i adds an isolated deterministic pure helper for future manual `ResearchTargetPitchCurveDiagnostic` JSON handoff parsing and validation. The helper accepts only pasted JSON text as a string and returns an explicit result union with either a validated research-only diagnostic or a conservative non-scoring error code/message. Validation is strict: only the `local-audio-decode-note-like-segments` source is accepted; `segments` must be an array; `summary` must exist; segment numeric fields must be finite; `targetFrequencyHz` must be positive; frame counts must be non-negative; `diagnosticConfidence` must be only `normal` or `low`; `high` and `medium` are rejected; optional `targetNoteLabel` must be a string; `summary.segmentCount` must match `segments.length`; `summary.lowConfidenceSegmentCount` must match the segment low-confidence count; and `summary.totalDurationSeconds` must be finite and non-negative. Synthetic tests cover empty input, invalid JSON, missing fields, unsupported source, valid empty / one-segment / multi-segment diagnostics, confidence acceptance/rejection, invalid numbers, optional note labels, summary mismatches, return-copy isolation, and non-scoring error wording. P16i does not add `/practice` UI, `/research` UI, a copy button, paste panel, storage, target replacement, scoring, real audio import, package changes, audio fixtures, or `metadata.local.json` changes.

## 56. P16j Accelerated Manual JSON Handoff UI Beta Slice

- 2026-07-02: P16j adds the minimal research-only manual JSON handoff beta UI. `/research/local-audio-decode` now shows a **Copy diagnostic JSON** button and read-only JSON fallback after the existing explicit research target pitch curve diagnostic exists, with copy that states the handoff is manual, research-only, not automatic import, not upload, not scoring, and only for the `/practice` research preview. `/practice` now includes a **Manual research target curve diagnostic JSON preview** panel that accepts pasted JSON, runs the unchanged P16i `parseResearchTargetCurveHandoffJson` helper on an explicit button click, and displays either a conservative non-scoring parser message or a read-only imported diagnostic preview with source, summary, segment timing, target frequency, optional diagnostic target note label, Normal / Low diagnostic confidence, source frame count, and bridged null frame count. P16j does not use localStorage, sessionStorage, APIs, upload, cloud, AI calls, account data, database data, or server storage; does not replace current mock melody targets; does not affect `currentMelodyStepIndex`, target note playback, pitch estimation, target-aware comparison, scoring, assessment, or attempt history; does not change P13 guards, P14 segmentation semantics, P15 converter semantics, P16i parser semantics, formal TargetPitchCurve runtime files, package files, audio fixtures, `metadata.local.json`, homepage navigation, or `/api/recognize`; and does not claim APK/WebView readiness.

## 57. P16k Manual JSON Handoff UI Source Review + Manual Browser QA

- 2026-07-02: Added P16k docs-only source review and attempted manual browser QA documentation for the P16j manual JSON handoff beta UI. Source review confirms `/research/local-audio-decode` only adds a research-only manual diagnostic JSON copy/fallback UI, clipboard access occurs only after explicit `Copy diagnostic JSON` click, the copied value is the current `ResearchTargetPitchCurveDiagnostic` JSON, fallback JSON is read-only, success/failure copy remains `Copied diagnostic JSON.` / `Copy failed. Please copy manually.`, and the route still has no auto-navigation, storage, API call, upload, account, database, server storage, file-selection change, decode-metadata change, Extract pitch frames gating change, pitch extraction algorithm change, P13 guard change, P14 segmentation change, or P15 converter change. Source review also confirms `/practice` only adds the Manual research target curve diagnostic JSON preview panel, paste preview uses the unchanged P16i parser, valid JSON renders a read-only imported diagnostic preview, invalid JSON renders conservative non-scoring parser feedback, and the preview does not replace mock melody targets, affect `currentMelodyStepIndex`, write attempt history, participate in pitch comparison or scoring, change previous / next / restart melody controls, target note playback, pitch estimation, target-aware comparison, storage, upload, API, account, database, server storage, parser behavior, converter behavior, Practice Mode flow, formal `TargetPitchCurve` runtime files, dependencies, package files, audio fixtures, or `metadata.local.json`. Real browser and Network panel QA were attempted from the container but could not be completed because Playwright Chromium download failed with `ERR_SOCKET_CLOSED`, Ubuntu Chromium is a snap launcher without usable snapd in the container, `firefox-esr` has no apt candidate, and Puppeteer browser download failed with `ENETUNREACH`; therefore P16k records a source-review pass but does not claim full browser/Network PASS. This remains not formal Practice Mode audio import, not formal `TargetPitchCurve` integration, not scoring, not assessment, not Song Learning Mode, and not APK/WebView-ready.

## 58. P16l Manual Browser QA Result for Manual JSON Handoff Beta

- 2026-07-02: Added P16l docs-only manual browser QA result for the P16j manual JSON handoff beta flow. P16l records that the user completed supplemental real-browser QA on Vercel Preview in Microsoft Edge / Chrome, with browser version not recorded. `/research/local-audio-decode` opened normally, preserved file selection / decode metadata / Extract pitch frames flow, displayed Research target pitch curve diagnostics, showed Copy diagnostic JSON, supported copied state or read-only fallback JSON copying, did not automatically navigate to `/practice`, did not show upload / scoring / automatic import misleading copy, and did not regress the existing research route flow. `/practice` opened normally, preserved existing mock melody step display, Step X/N, previous / next / restart controls, target note playback, retry / current target controls, local attempt history UI, static pitch trend preview, and the existing static Research target curve diagnostic preview; the Manual research target curve diagnostic JSON preview panel displayed normally, accepted valid pasted JSON for a read-only imported diagnostic preview, showed segment count / total duration / target frequency and Normal / Low diagnostic confidence fields, showed conservative non-scoring errors for invalid JSON, did not crash, and did not affect current target, `currentMelodyStepIndex`, attempt history, pitch comparison, or scoring. Network panel QA observed no upload, cloud, AI API, `/api/recognize`, account, database, or server-storage behavior; the manual JSON handoff remains a browser-local copy/paste flow. This docs-only result changes no runtime behavior, `/practice` UI behavior, `/research` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`. It is still not formal Practice Mode audio import, not formal TargetPitchCurve integration, not scoring, not assessment, not Song Learning Mode, and APK/WebView remains unverified and cannot be claimed APK-ready.

- 2026-07-02: P16n recorded the Chinese one-click browser-local handoff source review plus user-completed real-browser Vercel Preview manual QA and Network panel QA in `docs/chinese-local-handoff-practice-preview-qa.md`. This is docs-only and confirms the `/research/local-audio-decode` → explicit `sessionStorage` key `practiceResearchTargetCurveDiagnosticPreview` → `/practice` preview flow, the Chinese 「发送到练习页预览」 main flow, the `/practice` 「本地导入的练习目标预览」 display, and 「清除导入预览」 behavior. It also records that manual JSON copy/paste is now a developer/debug fallback, Chinese UX is improved for the homepage, `/research`, and P16 handoff / preview areas, and the user convenience principle remains a long-term product priority. P16n does not change runtime behavior, `/practice` UI behavior, `/research` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal `TargetPitchCurve` runtime files, scoring, dependencies, package files, audio fixtures, or `metadata.local.json`; it does not modify `/api/recognize`, recognition provider unions, local real voice fixtures, real phone comparison behavior, target replacement, pitch comparison integration, attempt-history writes, assessment, Song Learning Mode, upload, cloud, AI, account, database, server storage, `localStorage`, or any package/dependency behavior.

## 59. P17a Complete Product Vision + Piano System Roadmap

- 2026-07-02: Added P17a docs-only complete product vision and piano system roadmap in `docs/complete-product-vision-and-piano-system-roadmap.md`. P17a redefines the long-term product direction away from rushing a half-finished MVP to ordinary users and records that the current P16 state is an internal research prototype / internal alpha rather than a complete user product. It sets the long-term positioning as a Chinese sight-singing and ear-training platform with piano-assisted learning, formally makes Piano System / 钢琴系统 a long-term core module, and records planning for embedded Practice piano access, a future standalone `/piano` page, sound/timbre planning, piano learning modes, recording management, MIDI external-device support, and piano accompaniment. It also records current real capabilities, current missing core capabilities, external-application copyright/product boundaries, P18-P27 roadmap recommendations, pre-release claims that must not be marketed, and the recommendation that the next step is not a user guide, external promotion, or release documentation. This is docs-only and does not change runtime behavior, `/practice` UI behavior, `/research` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, `metadata.local.json`, `/api/recognize`, target replacement, real voice fixtures, real phone comparison behavior, or any upload / cloud / AI / account / database behavior.

## 60. P18a Imported Target Practice Lite Detailed Implementation Plan

- 2026-07-02: Added P18a docs-only imported target practice lite implementation plan in `docs/imported-target-practice-lite-implementation-plan.md`. P18a selects Option A: explicit imported practice lite mode, where local imported targets do not automatically replace the original mock melody flow and users must explicitly click 「使用导入预览练习」 in a future P18b runtime change before an imported preview can become a temporary practice target. The plan records why imported target practice lite should precede scoring, accompaniment, recording management, and piano runtime work; recommends the future P18b `/practice` runtime scope for entering/exiting imported practice lite, listing imported segments, selecting one temporary imported segment, and preserving the original mock melody controls; defines future state names `importedPracticeLiteActive` and `selectedImportedSegmentIndex`; preserves the P16i parser input contract, including `source: local-audio-decode-note-like-segments`, `diagnosticConfidence: normal | low`, strict summary validation, invalid JSON isolation, and no direct trust in raw `sessionStorage` JSON; and documents Piano System compatibility boundaries for future P20/P21 connection without implementing piano runtime now. This is docs-only and does not change runtime behavior, `/practice` UI behavior, `/research/local-audio-decode` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, `metadata.local.json`, `/api/recognize`, upload/cloud/AI/account/database behavior, real voice fixtures, real phone comparison behavior, or Piano System runtime.

## 61. P18b Imported Target Practice Lite Runtime

- 2026-07-02: P18b introduces an explicit imported practice lite runtime in `/practice`. From a validated local imported preview, the user can explicitly enter 「导入练习预览」 with 「使用导入预览练习」, select one imported segment as a temporary research practice preview target, switch between imported segments, and exit with 「退出导入练习预览」. The runtime keeps the original mock melody flow available and does not replace the mock melody target, change the mock melody step controls, write attempt history, perform pitch comparison, perform scoring, introduce piano runtime, add a `/piano` route, or introduce upload / cloud / AI / API / account / database behavior. The feature continues to rely on the existing P16i parser contract for imported preview validity and does not change parser or converter behavior.

## 62. P18c Imported Target Practice Lite Source Review + Manual Browser QA

- 2026-07-02: Added P18c docs-only source review plus user-completed real-browser Vercel Preview manual QA and DevTools Network panel QA result in `docs/imported-target-practice-lite-qa.md`. P18c records that the P18b imported target practice lite runtime passes source review for explicit entry through 「使用导入预览练习」 only, default selection of the first imported segment, segment switching, local derived `selectedImportedSegment`, lite-only exit through 「退出导入练习预览」, full clearing through 「清除导入预览」, parser-validated `sessionStorage` preview handling, unchanged P16i parser contract, unchanged converter behavior, and no direct trust in raw `sessionStorage` JSON. Manual browser QA confirms `/practice` opens normally without imported preview, the original mock melody flow, previous / next / restart controls, target playback, local attempt history UI, `/research/local-audio-decode` handoff, imported preview display, imported practice lite entry/exit, segment list, selected segment details, clear behavior, and manual pasted JSON fallback all work. Network panel QA records no P18b-added upload, cloud, AI, API, account, database, server-storage, or `/api/recognize` behavior. This is docs-only and does not change runtime behavior, `/practice` UI behavior, `/research` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, `metadata.local.json`, `/api/recognize`, piano runtime, `/piano` route, upload/cloud/AI/account/database behavior, attempt-history writes, pitch comparison, formal Practice Mode audio import, Song Learning Mode, APK-ready status, or external user-facing release status.

## 63. P19a Non-scoring Imported Target Pitch Feedback Plan

- 2026-07-02: Added P19a docs-only planning for non-scoring imported target pitch feedback in `docs/non-scoring-imported-target-pitch-feedback-plan.md`. P19a selects Option A: non-scoring pitch feedback for the current P18 selected imported segment, where future feedback is shown only after an explicit recording or local estimation trigger and remains a low-pressure practice hint rather than formal scoring, pass/fail, correct/wrong, grade, official assessment, or sight-singing evaluation. The plan records why non-scoring feedback should precede formal scoring, rhythm assessment, and piano-assisted practice; recommends a future P19b `/practice` imported practice lite scope that reuses existing local pitch estimation if feasible, targets only `selectedImportedSegment`, displays estimated pitch and safe cents difference when available, handles no-pitch / close / slightly-high / slightly-low / low-confidence-target categories, and never writes attempt history, changes mock melody target-aware comparison, uploads audio, calls AI/cloud APIs, or writes account/database data. It also documents threshold policy as research-only practice hints rather than formal scoring infrastructure, preserves the P16i parser and P18b selected-segment input contract, keeps `high` / `medium` confidence rejected, plans future feedback state reset rules, records Piano System compatibility boundaries without adding piano runtime or `/piano`, and defines P19b QA expectations. This is docs-only and does not change runtime behavior, `/practice` UI behavior, `/research` UI behavior, parser behavior, converter behavior, Practice Mode flow, formal TargetPitchCurve runtime files, scoring, dependencies, package files, audio fixtures, `metadata.local.json`, `/api/recognize`, upload/cloud/AI/account/database behavior, piano runtime, or `/piano` route.

## P19b non-scoring imported target pitch feedback runtime slice

P19b adds a small Practice Mode runtime slice for imported target pitch feedback. When imported practice lite has a selected imported segment and the existing local pitch estimate provides usable estimated pitch data, `/practice` now shows lightweight directional practice feedback: above target, below target, close to target, no reliable pitch detected, or imported target pitch data unavailable. The helper is intentionally local to Practice Mode support code and returns non-scoring messages only.

Boundaries preserved: this does not add formal scoring, rhythm scoring, sight-singing comprehensive scoring, grades, pass/fail decisions, upload/cloud/AI/account/database behavior, parser or converter changes, `/api/recognize` changes, package/dependency changes, audio fixtures, `metadata.local.json`, piano runtime, or `/piano` changes. Existing mock melody step flow, target navigation, and local attempt history remain separate from this imported feedback slice.

- 2026-07-03: Added P19c manual browser QA checklist for non-scoring imported target pitch feedback on `/practice`. This is docs-only and does not change runtime, UI, helpers, tests, scoring, parser/converter, `/api/recognize`, upload/cloud/AI/account/database behavior, dependencies, audio fixtures, `metadata.local.json`, piano runtime, `/piano`, or research pitch extraction behavior.

- 2026-07-03: Added P19d docs-only manual QA result record for P19c non-scoring imported target pitch feedback in `docs/p19d-non-scoring-imported-target-pitch-feedback-qa-results.md`. The record captures QA scope, browser/environment fields, preconditions, checklist result rows for no imported preview, imported practice lite entry, no-target-data, no-reliable-pitch, close, above-target, below-target, segment switching, forbidden scoring language, local attempt history, existing melody step flow, target navigation, Network panel, `/api/recognize`, `/research/local-audio-decode`, and piano runtime / `/piano` boundaries. Because no actual browser QA was run for P19d, all result fields are explicitly marked Not tested yet and require future human browser QA before pass/fail claims. This is docs-only and does not change runtime, UI, helpers, tests, parser/converter behavior, scoring, `/api/recognize`, upload/cloud/AI/account/database behavior, package/dependency files, audio fixtures, `metadata.local.json`, piano runtime, `/piano`, or the research pitch extraction algorithm.

## 64. P20a Fast Track Practice MVP Landing Slice: Segment Feedback Clarity

- 2026-07-03: P20a adds a small user-visible `/practice` imported practice lite clarity slice for non-scoring imported target pitch feedback. The feedback panel now explicitly states that it uses the latest local pitch estimate together with the currently selected imported segment, recommends recording again after switching segments for the clearest result, and reiterates that it is practice feedback, not a score. The slice also keeps the no-history boundary copy focused on a saved result rather than a formal evaluation. A focused test now checks the helper categories and the presence of the new segment-switching clarity copy in `/practice`. Boundaries preserved: no formal scoring, grade, pass/fail, accuracy percentage, rhythm scoring, sight-singing comprehensive scoring, parser or converter change, `/api/recognize` change, upload/cloud/AI/account/database behavior, package/dependency change, audio fixture change, `metadata.local.json` change, piano runtime or `/piano` change, or research pitch extraction algorithm change. Existing mock melody step flow, target navigation, and local attempt history remain separate from imported practice lite feedback.

## P20b Imported Segment Feedback Freshness Indicator

- 2026-07-03: P20b adds a small `/practice` imported practice lite freshness indicator for non-scoring imported target pitch feedback. The page now records the selected imported segment identity that was current when the latest local pitch estimate was produced, using a local runtime key from the parser-provided segment index, rendered list index, start/end time, and target frequency. If the user switches to a different imported segment after that estimate, the imported feedback panel keeps the estimate visible but shows a lightweight warning that the segment changed after the latest local pitch estimate and recommends recording again for clearer feedback on the selected segment. The warning remains non-scoring practice feedback only and does not clear pitch estimates, write local attempt history, add formal scoring, add grade/pass/fail/accuracy results, add rhythm scoring, add sight-singing comprehensive scoring, change parser or converter behavior, change `/api/recognize`, add upload/cloud/AI/account/database behavior, change packages/dependencies, add audio fixtures, change `metadata.local.json`, change piano runtime or `/piano`, or change the research pitch extraction algorithm. Existing mock melody step flow, target navigation, and local attempt history remain separate from imported practice lite feedback.

- 2026-07-03: P22 Metronome Foundation added a reusable browser-local metronome foundation for future rhythm training. The foundation includes pure config/grid helpers for BPM duration, 2/4, 3/4, and 4/4 beat metadata, strong/weak beat detection, bar/beat numbering, and a Web Audio lookahead scheduler used by a lightweight `/practice` metronome panel. This is not rhythm scoring, not formal assessment, and does not create pass/fail, grade, or accuracy percentage results. It does not upload audio, does not call cloud or AI services, does not add account/database behavior, does not persist rhythm history, does not change `/api/recognize`, does not change parser/converter behavior, does not change audio fixtures or `metadata.local.json`, and does not change the piano runtime or `/piano`. Future rhythm training can call this foundation for count-in, tap-based practice, beat grids, and alignment metadata; human voice and instrument rhythm evaluation still need separate follow-up stages for tap input, onset detection, latency calibration, and non-scoring/scoring rhythm feedback research.

- 2026-07-03: P23 Count-in + Subdivision Foundation extended the P22 metronome foundation for future rhythm training. The metronome config/grid/scheduler now supports disabled/1-bar/2-bar count-in metadata, clear `count-in` versus `practice` beat phases, count-in strong/weak beat metadata, and quarter/eighth/sixteenth subdivision metadata with subdivision indexes, tick roles, and BPM-based scheduled times. `/practice` adds a lightweight non-scoring count-in and subdivision selector in the metronome panel; the Web Audio scheduler remains browser-local and only plays beat-level clicks while subdivision audio playback remains deferred. P23 is foundation work for future recording pre-roll, tap-based rhythm practice, sight-singing beat preparation, rhythm feedback, and rhythm scoring research; it is not rhythm scoring, not formal assessment, and does not create pass/fail, grade, or accuracy percentage results. It does not add microphone onset detection, tap evaluation, audio upload, cloud processing, AI APIs, accounts, databases, persistent rhythm history, `/api/recognize` changes, parser/converter changes, piano runtime or `/piano` changes, audio fixture changes, `metadata.local.json` changes, or production Audiveris behavior changes.

## P24 Tap-based Rhythm Practice Alpha

- 2026-07-03: Added P24 Tap-based Rhythm Practice Alpha on `/practice`. It uses the P22/P23 metronome, count-in, and subdivision foundation for a browser-local tap practice loop, while the first target pattern is intentionally limited to a simple quarter-note pulse. Users can start, stop, reset, tap with the on-screen button, and tap with the spacebar during the practice phase after any configured count-in.
- P24 feedback is non-scoring practice guidance only. The rhythm helper uses local timestamps, quarter-note target events, a close tolerance of ±80ms, and a match window of ±180ms to label session-only feedback as `close`, `early`, `late`, `missed`, `extra`, `not-started`, or `waiting-for-taps`. These thresholds are Alpha guidance constants, not formal assessment standards.
- P24 does not add rhythm scoring, pass/fail, grade, accuracy percentage, final assessment, formal sight-singing scoring, persistent rhythm history, microphone onset detection, latency calibration, audio upload, cloud processing, AI calls, user accounts, or database storage.
- P24 does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, production Audiveris behavior, piano runtime, or `/piano`. Browser keyboard/button latency may affect tap timestamps; latency calibration and microphone onset detection are deferred to future P25/P26 research.

## P24b Eighth-note Tap Rhythm Practice Pattern

- 2026-07-03: P24b extends the P24 tap-based rhythm practice alpha with a selectable target pattern on `/practice`: `Quarter-note pulse` for one tap per beat and `Eighth-note pulse` for two taps per beat. The rhythm target helper now has explicit non-scoring pattern types and generates target metadata with target index, beat number, subdivision index, scheduled time, pattern type, and practice phase.
- P24b reuses the existing BPM, meter, count-in, beat-level Web Audio metronome, and P24 alpha feedback thresholds. The current close tolerance remains ±80ms and the match window remains ±180ms for alpha practice feedback only; these constants are not formal rhythm scoring standards, not assessment thresholds, and not latency calibration.
- P24b feedback remains session-only, non-scoring practice guidance. The log can show the selected pattern and feedback categories `close`, `early`, `late`, `missed`, and `extra`, but it does not create a rhythm score, pass/fail result, grade, accuracy percentage, final assessment, formal sight-singing scoring, or persistent rhythm history.
- P24b does not add microphone onset detection, audio upload, cloud processing, AI calls, user accounts, database storage, parser/converter changes, `/api/recognize` changes, production Audiveris behavior changes, audio fixture changes, `metadata.local.json` changes, piano runtime changes, or `/piano` changes. Subdivision audio playback remains deferred: eighth-note pulse is a tap target pattern, not a new subdivision click mode.

## P27 Audio Onset to Non-scoring Rhythm Feedback Bridge

- 2026-07-03: P27 adds a reusable `Audio Onset to Non-scoring Rhythm Feedback Bridge` helper that converts P26 browser-local onset candidates into tap-like rhythm events and compares them against the P24/P24b quarter-note or eighth-note target rhythm patterns. The bridge currently supports the safe `recording-start` alignment mode: onset times are treated as milliseconds relative to the start of the latest local recording, and target rhythm events are generated from 0ms. It returns diagnostic categories `close`, `early`, `late`, `missed`, and `extra`, plus matched/missed/extra counts, warnings, alignment metadata, and a non-scoring boundary string.
- `/practice` now shows a lightweight research/practice UI near the Audio Onset Detection Foundation panel for using detected onsets as rhythm feedback input. The UI displays the selected target pattern, `recording-start` alignment assumption, onset-derived feedback summary, feedback item list, optional session latency estimate application, and limitations that recording timing must align with the target timeline, feedback is diagnostic practice guidance only, there is no pass/fail, grade, or accuracy percentage, no upload / cloud / AI occurs, and voice or sustained instruments may need future tuning.
- P27 is foundation work for future human voice and instrument rhythm training. It is not rhythm scoring, not formal rhythm assessment, not microphone live onset scoring, not full sight-singing comprehensive scoring, and not a final assessment. It does not create a score, grade, pass/fail result, accuracy percentage, formal assessment result, or persistent rhythm history.
- P27 does not add upload, cloud, AI, account, database, server storage, parser changes, converter changes, `/api/recognize` changes, production Audiveris behavior changes, audio fixture changes, `metadata.local.json` changes, piano runtime changes, or `/piano` changes. First-onset alignment, instrument-specific tuning, stronger noise handling, live microphone onset feedback, and formal rhythm assessment remain deferred future directions.

## P29 Audio Onset Sensitivity + Alignment Diagnostics Panel

- 2026-07-03: P29 extends the P26/P27/P28 browser-local audio onset rhythm foundation with a small user-visible diagnostic slice on `/practice`. The audio onset detector now supports session-only sensitivity presets (`balanced`, `sensitive`, and `conservative`) through explicit detection options and returns diagnostic metadata for the selected preset, threshold multiplier, minimum onset gap, minimum energy/strength, calculated threshold, average strength, strength deviation, and max strength. Balanced remains the default behavior, sensitive is intended to detect weaker onset candidates with higher false-positive risk, and conservative is intended to reduce extra candidates while possibly missing weak onsets.
- `/practice` now includes an onset sensitivity selector in the Audio Onset Detection Foundation panel. Users can change the preset and explicitly re-run browser-local detection on the latest local recording; no audio is uploaded, no cloud or AI call is made, and the selected preset is not persisted to localStorage, IndexedDB, account, database, or persistent rhythm history. The UI copy states that this is diagnostic, not scoring, and that voice and sustained instruments may still need future tuning.
- The onset-based rhythm feedback bridge now exposes and displays clearer alignment diagnostics: alignment mode, alignment offset, first onset time when available, first target time when available, and latency offset applied. First-onset mode explicitly warns that it can hide late-start behavior. Latency calibration remains a temporary session-only offset and continues to be compatible with the onset feedback bridge.
- P29 is a diagnostic / practice foundation for future human voice and instrument rhythm training. It is not rhythm scoring, not formal rhythm assessment, not complete voice or instrument rhythm evaluation, not live microphone scoring, and not full sight-singing comprehensive scoring. It does not produce a rhythm score, pass/fail, grade, accuracy percentage, final assessment, or persistent rhythm history.
- P29 does not add upload, cloud, AI, account, database, or server-storage behavior; does not change `/api/recognize`; does not change parser or converter behavior; does not change production Audiveris behavior; does not change audio fixtures or `metadata.local.json`; does not add package dependencies; and does not change piano runtime or `/piano`. Instrument-specific tuning, automatic noise reduction, live microphone scoring, and formal rhythm scoring remain deferred.

## P33 Practice Rhythm Diagnostics Component Extraction

- 2026-07-03: P33 extracts the `/practice` audio onset rhythm diagnostic timeline preview into `components/practice/AudioOnsetTimelinePreview.tsx` as a presentational component. The extracted component owns the timeline preview rendering, threshold reference, target markers, feedback marker chips, first-onset origin marker, compact marker legend, marker density summary display, and candidate marker focus callbacks, while `/practice` continues to own all runtime state, detection results, sensitivity preset state, alignment mode state, rhythm feedback derivation, focused candidate state, and event handlers.
- This is a maintainability refactor only. It preserves existing browser-local audio onset detection helper semantics, audio onset rhythm feedback matching semantics, rhythm practice alpha behavior, latency calibration behavior, metronome foundation behavior, and imported pitch feedback behavior. It does not add formal rhythm scoring, pass/fail, grades, accuracy percentages, microphone/instrument formal assessment, persistent rhythm history, upload/cloud/AI/account/database behavior, parser or converter changes, `/api/recognize` changes, audio fixture changes, `metadata.local.json` changes, piano runtime changes, `/piano` changes, or package dependencies.

## P34 Audio Onset Rhythm Feedback Panel Extraction

- 2026-07-03: P34 extracts the `/practice` audio onset rhythm feedback bridge panel into `components/practice/AudioOnsetRhythmFeedbackPanel.tsx` as a presentational component. The extracted panel owns the existing non-scoring feedback bridge display only: target-pattern/alignment copy, recording-start and first-onset alignment controls, onset/matched/missed/extra summary, alignment diagnostics, non-scoring boundary copy, feedback item list with candidate focus callbacks, and warning copy. `/practice` continues to own runtime state and derivation for selected sensitivity preset, audio onset alignment mode, focused onset candidate index, audio onset detection result, onset rhythm feedback result, rhythm target pattern, latency calibration state, and recording state.
- P34 is a maintainability refactor only. It preserves existing user-visible behavior, browser-local audio onset detection helper semantics, audio onset rhythm feedback matching semantics, rhythm practice alpha behavior, latency calibration behavior, metronome foundation behavior, imported pitch feedback behavior, and the P33 `AudioOnsetTimelinePreview` boundary. It does not add formal rhythm scoring, pass/fail, grades, accuracy percentages, microphone/instrument formal assessment, persistent rhythm history, upload/cloud/AI/account/database behavior, parser or converter changes, `/api/recognize` changes, audio fixture changes, `metadata.local.json` changes, piano runtime changes, `/piano` changes, or package dependencies.

## P36 Local Melody Guide Audio Import Foundation

- 2026-07-03: P36 adds a browser-local `Local Melody Guide Audio Import` runtime foundation on `/practice`. Users can select a local melody guide audio file, the browser reads and decodes it with `AudioContext.decodeAudioData`, and the page displays session-only selected-file metadata plus decoded duration, sample rate, channel count, decode status, warnings, and clear/reset behavior. The helper normalizes safe file summaries, file size labels, decoded metadata, status, and warnings for empty/invalid file metadata and for full mixed songs being deferred.
- P36 is browser-local import only. Audio stays in the browser for this MVP; it does not upload files, does not add private cloud runtime, does not add cloud processing, does not add account or database behavior, does not write persistent history, and does not add any server route or object storage behavior.
- P36 is not source separation, not full-song vocal melody extraction, not target pitch curve generation yet, not formal scoring, not rhythm scoring, and not sight-singing comprehensive scoring. It prepares a visible, testable source foundation for P37 Local Target Pitch Curve Draft.
- P36 does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, production Audiveris behavior, piano runtime, or `/piano`. It does not add dependencies; the only package change is a focused local melody guide import test script.

## P36b Local Melody Guide Import Panel Extraction and Source Contract Stabilization

- 2026-07-03: P36b extracts the `/practice` Local Melody Guide Audio Import UI into a presentational `LocalMelodyGuideAudioImportPanel` component while keeping the browser-local decode handler, selected-source state, decode error state, file input ref, and clear/reset runtime ownership in `/practice`. This is a maintainability refactor only and preserves P36 user-visible behavior: local file selection, browser decode status, selected file metadata, decoded duration/sample-rate/channel-count display, warnings, browser-local/no-upload/no-cloud/no-account/database/not-scoring boundary copy, clear/reset, best-source guidance, and the "No target pitch curve generation until P37" copy.
- P36b stabilizes the `LocalMelodyGuideAudioSource` contract for P37 by documenting that the serializable helper result carries file name/type/size, decoded metadata, decode status, warnings, a local-only boundary flag, and an `analysisReady` flag that indicates session-only decoded audio availability for future analysis. P36b still does not store `AudioBuffer` / PCM in the serializable helper result; P37 may add separate session-only PCM/channel data state if needed for local target pitch curve drafting.
- P36b does not generate a target pitch curve, does not do source separation, does not do full-song vocal melody extraction, does not add scoring, does not write persistent history, and does not add upload, cloud, private storage, account, database, community, AI API, or private cloud runtime behavior.
- P36b does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, production Audiveris behavior, piano runtime, or `/piano`. It adds no dependency and does not modify package scripts. It prepares a cleaner source boundary for P37 Local Target Pitch Curve Draft.

## P37 Local Target Pitch Curve Draft from Melody Guide

- 2026-07-03: P37 adds a browser-local `Local Target Pitch Curve Draft` vertical slice on `/practice` based on the P36/P36b local melody guide audio import. After a local guide is selected and decoded with browser `AudioContext.decodeAudioData()`, `/practice` stores first-channel decoded PCM in a separate `LocalMelodyGuideDecodedAudio` runtime state that is session-only and used only for draft analysis. The serializable `LocalMelodyGuideAudioSource` helper result remains metadata/status/warnings/local-only/analysis-ready only and still does not store `AudioBuffer`, PCM, channel data, or samples.
- P37 adds `lib/practice/localTargetPitchCurveDraft.ts`, a lightweight dependency-free autocorrelation diagnostic helper that accepts channel data plus sample rate and returns draft pitch frames, duration, frame count, voiced/unvoiced counts, frequency min/median/max, warnings, and diagnostics. The helper is intentionally diagnostic and non-scoring: it does not return score, grade, pass/fail, accuracy percentage, final assessment, formal transcription, official melody, source separation, or full-song vocal extraction.
- `/practice` now shows a `Local Target Pitch Curve Draft` panel near the Local Melody Guide Audio Import panel. Users can generate a draft only after decoded local guide audio is available, then review status, frame count, voiced/unvoiced count, duration, frequency summary, first-frame preview, and warnings. UI copy explicitly states browser-local only, no upload, no cloud processing, session-only decoded PCM/channel data, draft only, not scoring, best for clean vocal guide/humming/single melody instrument, and full mixed songs deferred to future private cloud song analysis.
- P37 does not upload audio, does not write localStorage/IndexedDB/database/private storage, does not add cloud/account/database/private cloud runtime, does not change `/api/recognize`, does not change parser/converter behavior, does not change audio fixtures or `metadata.local.json`, does not change piano runtime or `/piano`, and does not add dependencies. P38 may consider review/correction UI or safe practice-target integration, but P37 does not connect the draft to the existing imported target practice flow or formal target flow.

## P37b Local Target Pitch Curve Draft Panel Extraction and Draft Contract Stabilization

- 2026-07-03: P37b extracts the `/practice` Local Target Pitch Curve Draft UI into `components/practice/LocalTargetPitchCurveDraftPanel.tsx` as a presentational component. `/practice` still owns the session-only decoded PCM/channel state, local melody guide decode handler, clear/reset behavior, and generate-draft handler; the panel receives the draft result, analysis-ready state, disabled state, and generate callback through props only.
- P37b is a maintainability refactor and does not change P37 pitch extraction semantics or intended user flow. The generate button, status cards, frame count, voiced/unvoiced count, duration, frequency min/median/max diagnostics, first-frame preview, draft warnings, and browser-local/no-upload/no-cloud/session-only/draft-only/not-scoring/not-final-target/not-official-transcription boundary copy remain visible.
- P37b stabilizes the P38 draft contract by documenting that draft frames are estimated and diagnostic, frame frequency may be `null`, voiced/unvoiced and confidence are diagnostic hints only, confidence is not a score, frequency summary is draft metadata, and the output is not an official transcription or final target. The helper now marks returned drafts as `draftOnly: true` and `needsReview: true` so P38 can consume draft frames for review/correction without treating them as final practice targets.
- P37b does not connect the draft to imported target practice flow, does not add a review/correction editor, does not add source separation, does not add full-song vocal melody extraction, does not add upload/cloud/private storage/account/database/community/AI runtime, does not write persistent history, and does not add scoring, formal transcription, official melody generation, rhythm scoring, or sight-singing comprehensive scoring.
- P37b does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, production Audiveris behavior, piano runtime, or `/piano`. It adds no dependency and does not modify package scripts. It prepares P38 review/correction or safe practice integration by making the draft boundary easier to consume and verify.

## P38 Local Target Pitch Curve Draft Review Preview

- 2026-07-03: P38 adds a browser-local `Local Target Pitch Curve Draft Review Preview` vertical slice on `/practice` based on the P37/P37b draft contract. The new review helper summarizes an existing draft without changing extraction behavior: draft existence/status, `draftOnly`, `needsReview`, frame count, voiced/unvoiced counts, voiced coverage, first and last voiced frame times, frequency min/median/max, an estimated pitch range label, warnings, and review-preview diagnostics.
- The `/practice` UI now includes a dedicated review preview panel after the draft generation panel. It is session-only and browser-local, and it explains that review is required before any practice integration. It also states that the preview is draft only, not a final target, not an official transcription, not scoring, not connected to imported target practice flow, not uploaded, and not cloud processed.
- P38 is review preview foundation only. It does not add a correction editor, manual pitch editing, draggable controls, approve-as-final-target action, imported target practice flow integration, final target generation, official transcription generation, source separation, full-song vocal melody extraction, formal scoring, rhythm scoring, sight-singing comprehensive scoring, persistent history, upload, cloud runtime, private storage, account, database, community behavior, or AI API behavior.
- P38 does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, production Audiveris behavior, piano runtime, or `/piano`. It adds no dependency; the package change is a focused local target pitch curve review preview test script only.
- Follow-up route remains intentionally staged: P39 may consider minimal review/correction controls, and P40 may consider safe reviewed-draft practice integration. P38 does not implement P39 or P40 behavior.

## P39 Local Target Pitch Curve Draft Minimal Review Controls

- 2026-07-05: P39 adds minimal review controls for the browser-local Local Target Pitch Curve Draft on `/practice`. The new helper computes session-only review selections for the full draft, voiced span, and manual frame range, including clamping, reversed-range fallback, no-voiced-frame fallback, selected frame count, selected voiced frame count, selected voiced coverage, selected first/last voiced frame, selected frequency min/median/max, selected duration, warnings, and preservation of `draftOnly` / `needsReview`.
- The `/practice` UI now renders a presentational review controls panel near the P38 review preview. `/practice` continues to own decoded PCM state, draft generation state, review selection state, and handlers. Clearing the local melody guide, selecting a new guide, or regenerating the draft resets the session-only review controls safely.
- P39 remains selected-range diagnostics only. It does not connect the draft to the Practice target flow, does not create a reviewed final target, does not create an official transcription, does not add scoring, does not add a correction editor, and does not provide pitch-frame editing, drag-to-edit timeline behavior, note segmentation, phrase segmentation, waveform editing, or playback alignment.
- P39 remains browser-local and session-only. The review controls and helper boundary copy explicitly keep the selected range out of upload/cloud/account/database paths. It does not upload audio, does not add cloud processing, does not add account/database/object-storage behavior, does not add persistent reviewed-draft history, does not add source separation, does not add full-song vocal melody extraction, and does not add dependencies.
- P39 does not modify `/api/recognize`, parser/converter behavior, audio fixtures, `metadata.local.json`, piano runtime, or production Audiveris behavior. The only package change is a focused local target pitch curve draft review controls test script.

## P40 Safe Reviewed Draft Practice Integration Alpha

- 2026-07-05: P40 adds an explicit browser-local `/practice` action, “Use selected review range as temporary practice target,” which converts only the current P39 reviewed selected range into a temporary session-only reviewed draft practice target alpha. The target stores selected frame range diagnostics, selected voiced coverage, draft-derived reference frequency from the selected median frequency, frequency min/median/max, duration, and boundary warnings.
- `/practice` continues to own all state. The new target is clearable and is cleared when the local melody guide is cleared, a new guide file is selected, the draft is regenerated, review controls are reset, or the selected range becomes invalid. Creating it does not auto-play, auto-record, auto-estimate pitch, persist data, or write localStorage, IndexedDB, account, database, object storage, or a target library.
- P40 includes a minimal non-scoring diagnostic pitch comparison in the temporary target panel when a latest local pitch estimate exists. It displays latest estimated pitch, temporary reviewed reference pitch, cents difference, and diagnostic category only. It remains non-scoring and explicitly not accuracy, not a grade, and not pass/fail.
- P40 does not create a final target, does not create an official transcription, does not add scoring, does not add a persistent reviewed target or target library, does not add upload/cloud/account/database/API behavior, does not modify `/api/recognize`, does not add source separation/full-song extraction/phrase or note segmentation/editor/timeline/rhythm alignment/formal melody alignment, does not change parser/converter behavior, does not change piano runtime, and does not add dependencies.
- 2026-07-05: User-reported real-browser QA on a Vercel Preview passed for the P40 core flow: `/practice` opened, local melody guide audio imported, the local target pitch curve draft generated, P39 review controls switched, the P40 action became clickable after selecting `Full draft`, the temporary reviewed draft practice target panel appeared, clear behavior worked, and local-guide/new-file/regenerate/reset/invalid-range cleanup behaved normally or safely. QA also confirmed no observed final target, official transcription, scoring, accuracy grade, pass/fail, persistent target/library, cloud/upload/account/database behavior, source separation, full-song extraction, or automatic playback/recording/pitch-estimation/scoring behavior. See `docs/p40-manual-browser-qa.md`.
- The same QA found a product follow-up: `/practice` still has substantial English user-visible UI copy. Because the product is aimed at Chinese users, the next product step should prioritize Chinese UI copy unification and recording a project language rule before new feature work.

## P40fix 中文 UI 文案统一与项目语言规则

- 2026-07-05: P40fix 只统一 `/practice` 用户可见 UI 文案与记录项目语言规则，不进入 P40b 或任何功能扩展。
- 项目默认面向中文用户；用户可见 UI 文案默认必须使用简体中文。
- 英文只允许用于代码、类型名、开发者内部说明、必要技术标识，以及不可避免的技术缩写或数据标识（例如 BPM、Hz、ms、Web Audio、localStorage、IndexedDB）。
- 未来新增功能不得继续加入英文用户可见 copy，除非用户明确要求。
- P40fix 不改变 P40 target creation semantics，不改变 P40 gating，不改变 helper semantics，不新增功能，不新增 dependency，不新增 scoring、final target、official transcription、cloud/upload/account/database/API 行为。

## P41 Practice Mode 功能导航与主显示区基础

- 2026-07-08: P41 为 `/practice` 增加轻量功能导航与主显示区基础，新增“本地旋律”“节拍与节奏”“起音诊断”“练习反馈”四个简体中文导航按钮。点击按钮只切换当前页面主显示区内容，不改变路由，不写入 localStorage，也不持久化当前功能视图。
- `/practice` 仍然 owning 现有运行时状态，包括 decoded PCM、本地旋律 guide、draft、review selection、temporary reviewed draft practice target、rhythm state、onset state、calibration state、录音与音高估计状态。P41 只移动显示分组，不把状态迁移到全局 store。
- 本地旋律组包含本地旋律参考音频导入、目标音高曲线草稿、草稿检查预览、草稿检查控制，以及 P40 临时检查草稿练习目标入口和面板。节拍与节奏组包含节拍器、点击式节奏练习与延迟校准。起音诊断组包含音频起音检测、起音强度时间线与起音节奏反馈。练习反馈组包含录音、音高估计、导入目标音高反馈、练习历史和现有静态/研究反馈区域。
- P41 不改变任何 helper 的输入输出语义，不改变 P40 临时目标 gating 或 creation semantics，不新增评分、final target、official transcription、correction editor、pitch frame editing、drag timeline、persistent target/library、upload/cloud/account/database、source separation、full-song extraction、dependency、`/api/recognize`、parser/converter、piano runtime 或 `/piano` 行为。

## P42 Practice Mode 功能导航轻量稳定化

- 2026-07-08: P42 对 `/practice` 的 Practice Mode 功能导航做轻量稳定化：优化四个功能区的简体中文说明，强化当前 active tab 的“正在显示”状态，并在导航与功能区标题中提示切换功能区只切换主显示区，不清除当前会话数据、不写入 localStorage、不改变路由。
- P42 为每个功能区增加简短中文说明：本地旋律明确仍按“本地音频导入 → 生成目标音高曲线草稿 → 检查选区 → 创建临时练习目标”推进；节拍与节奏、起音诊断、练习反馈继续定位为非评分诊断工具。
- P42 只调整 copy、当前状态展示和轻量功能区 empty/state guidance；`/practice` 仍然 owning decoded PCM、本地旋律 guide、draft、review selection、temporary reviewed draft practice target、rhythm state、onset state、calibration state、录音与音高估计状态。切换导航不会清空这些状态，也不会持久化导航 state。
- P42 不新增账号、登录、auth API、数据库、云端、上传、会员系统、评分、final target、official transcription、correction editor、pitch frame editing、drag timeline、persistent target/library、source separation、full-song extraction 或 dependency；不修改 `/api/recognize`、parser/converter、piano runtime；不改变 P40 gating、P40 target creation semantics 或 helper semantics。
