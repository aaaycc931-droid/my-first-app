# MVP status

## 1. Product identity

This project is a sheet music recognition MVP. Its purpose is to validate a minimal product flow for recognizing sheet music and previewing the resulting notes. It is not a portfolio page.

## 2. Main user-facing flow

The current main user-facing flow is:

* Users upload a JPG or PNG image.
* The main API is `/api/recognize`.
* The upload limit is 10MB.
* The current default recognizer provider is `mock`.
* Recognition results can be displayed on the page as notes and played back.
* Playback now has an explicit stop control for stopping long previews without refreshing the page.
* This main flow is currently not Audiveris and is not real PDF OMR.

Important boundaries for the main flow:

* `/api/recognize` does not accept PDF input.
* `/api/recognize` does not call Audiveris.
* Production and Vercel default deployments do not run Audiveris.

## 3. Dev-only Audiveris local flow

A local dev-only Audiveris flow has been completed for developer validation:

* A local PDF score is used as input.
* Local Audiveris is executed outside the production flow.
* The dev-only API route is `/api/dev/recognize-audiveris`.
* Generated MXL output is written in a temp directory.
* MusicXML is extracted from the generated MXL.
* Notes are parsed from the extracted MusicXML.
* The dev-only UI displays `noteCount`, `source`, `inputType`, and `firstNotes`.
* The dev-only UI can play a `firstNotes` preview.
* The dev-only UI can play a full notes preview when explicit full notes flags are enabled.
* The explicit stop playback control applies to the main mock notes playback, the dev-only `firstNotes` preview, and the dev-only full notes preview.
* The dev-only Audiveris panel copy now states that it is a local developer tool, not production/Vercel, not `/api/recognize`, and that PDF input is only for the dev-only route.

This playback stop control does not change `/api/recognize`, provider behavior, or dev-only Audiveris boundaries.

This Audiveris flow is:

* local-only
* dev-only
* not production
* not Vercel
* not `/api/recognize`
* not a default provider change
* not an Audiveris provider

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

* the server flag is enabled
* the frontend flag is enabled
* the request explicitly opts in with `includeNotes=full`

Even when full notes are enabled, the response returns at most 2000 notes and may be truncated.

## 5. Repository safety boundaries

The repository safety boundaries are:

* the default provider remains `mock`
* the provider union remains `"mock" | "ai" | "musicxml"`
* there is no `audiveris` provider
* no PDF, MXL, XML, OMR, log, image, or sample score files are committed
* Audiveris binaries and local score files stay outside the repository
* generated files stay outside the repository or in temp directories only

## 6. How to demo

### Production/Vercel demo

Production and Vercel demos should only show the main mock recognition flow:

* upload a JPG or PNG image
* display mock notes
* play back the displayed notes

### Local dev demo

For local development setup, see `docs/audiveris-dev-quickstart.md`.

A local developer demo can show the complete dev-only Audiveris flow:

* local PDF input
* Local Audiveris execution
* `noteCount` 651 for the developer-reported local score
* `firstNotes` playback
* full notes playback when the explicit full notes flags are enabled

`score.pdf` is a developer local file and is not stored in this repository.

## Public demo polish

Public demo checklist: see `docs/public-demo-checklist.md`.

Real OMR production architecture plan: see `docs/real-omr-architecture-plan.md`.

OMR sample and fixture strategy: see `docs/omr-sample-fixture-strategy.md`.

Public demo polish is complete for the production-safe MVP page. Production/Vercel demos still use the mock recognition flow only, and Local Audiveris remains dev-only/local-only behind explicit flags. This does not change `/api/recognize`, the provider union, or the default mock provider.

## 7. Current known non-goals

Current known non-goals are:

* production OMR
* hosted Audiveris
* PDF upload to `/api/recognize`
* Audiveris provider in the recognizer union
* committing real score samples
* treating dev-only results as Codex-verified

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

- 2026-06-18: Polished Practice Mode local in-session recent attempt history so repeated successful estimates of the same recording do not create duplicate history entries, while a new recording can still add a new attempt and Clear attempt history only clears local React state. The history remains browser-session-only and is not uploaded, not persisted to a server, not stored in localStorage, IndexedDB, or cookies, not formal scoring, not rhythm evaluation, and not AI-generated. This does not change the pitch estimate algorithm, confidence calculation, target comparison algorithm, providers, default `mock` provider, provider union, package dependencies, `package.json`, `/api/recognize`, PDF handling, or Audiveris behavior.


- 2026-06-18: Added a local-only Practice Mode recent attempt target retry control. Each recent local attempt can switch the selected target note back to that attempt target for another manual practice pass. This only updates local React state: it does not upload audio, persist to a server, write localStorage, IndexedDB, or cookies, add formal scoring, add rhythm evaluation, call AI, change providers, change the default `mock` provider, change the provider union (`"mock" | "ai" | "musicxml"`), change `/api/recognize`, add PDF handling, call Audiveris, add dependencies, or change the pitch estimate algorithm, confidence calculation, or target comparison algorithm.

- 2026-06-18: Added local-only Practice Mode target navigation controls for Previous target and Next target. These controls only update local React state for the selected target note and wrap through the existing target note options. This does not upload audio, persist to a server, write localStorage, IndexedDB, or cookies, add formal scoring, add rhythm evaluation, call AI, change providers, change the default `mock` provider, change the provider union (`"mock" | "ai" | "musicxml"`), change `/api/recognize`, add PDF handling, call Audiveris, add dependencies, or change the pitch estimate algorithm, confidence calculation, target comparison algorithm, target note option source, playback behavior, attempt history max 5 behavior, duplicate-estimate history behavior, Practice this target again behavior, or Clear attempt history behavior.

- 2026-06-20: Upgraded Practice Mode from free target-note practice to a browser local-only Melody Step Practice Flow. `/practice` now uses a fixed melody step list, local React state for the current step, derives the current target note from that step, shows Step X / N progress, and provides Previous step, Next step, and Restart melody controls. Step navigation clamps at the first and last melody steps and does not automatically play audio, start recording, or estimate pitch. This does not upload audio, call AI APIs, add formal scoring, add rhythm evaluation, change `/api/recognize`, change the recognition provider union, add PDF upload, connect Audiveris, or change the pitch estimator / recording cleanup protections.

- 2026-06-20: Added P2 Melody Attempt History details to Practice Mode. Recent local attempts now store the melody step id/index/number captured at estimate time, display Step #, target note, and estimated note, and use the stored step index for Practice this target again so repeated target-note names are not ambiguous. This remains browser local React state only, keeps the most recent 5 attempts, preserves duplicate prevention for repeated estimates of the same recording, and Clear attempt history only clears local React state. This does not upload audio, call AI APIs, add persistence, add user accounts, add formal scoring, add grade/pass/fail, add rhythm evaluation, add sight-singing assessment, change `/api/recognize`, change the recognition provider union, add PDF upload, connect Audiveris, or change the pitch estimator / P1 melody step navigation.

- 2026-06-20: Expanded the generated in-memory synthetic pitch benchmark with P3a exploratory/non-blocking diagnostics for higher noise, frequency drift, vibrato, and mixed harmonics. Existing clean sine, robustness, and no-pitch cases remain blocking; no tolerance was relaxed, no blocking target frequency changed, and exploratory observations do not affect `npm run validate:synthetic-pitch-benchmark` exit status. This does not change the pitch estimator algorithm, UI, scoring, rhythm evaluation, AI API calls, audio upload, providers, default `mock` provider, provider union, `/api/recognize`, PDF upload, or Audiveris behavior.

- 2026-06-21: Added P3b exploratory synthetic pitch benchmark diagnostics. The validation output now reports frame-level pitch min/median/max plus explicit frequency drift and vibrato condition relationships for generated in-memory exploratory cases. This is diagnostic output only: exploratory cases remain non-blocking, existing clean sine/robustness/no-pitch gates remain unchanged, no tolerance was relaxed, no pitch estimator algorithm changed, and there is still no real voice dataset, AI API call, audio upload, `/api/recognize` change, recognition provider union change, PDF upload, or Audiveris integration.

- 2026-06-21: Added P4a pitch estimator frame aggregation outlier robustness. The experimental local pitch estimator now applies a minimal dominant rounded-MIDI-cluster filter before aggregating per-frame candidates. Existing clean sine, robustness, and no-pitch synthetic benchmark gates remain blocking, exploratory cases remain non-blocking, no tolerance was relaxed, no blocking target frequency changed, and no exploratory input case was changed. This does not rewrite the pitch estimator, add formal pitch scoring, add rhythm evaluation, add sight-singing assessment, upload audio, add a real voice dataset, call AI APIs, change `/api/recognize`, change the recognition provider union, add PDF upload, connect Audiveris, change Practice Mode UI workflow, or change P1/P2 melody flow/history behavior.

- 2026-06-21: Clarified P4b frequency-drift exploratory benchmark semantics by adding generated benchmark metadata/output for drift start, midpoint / expected median, end, and cents offsets against each reference. Frequency drift remains exploratory and non-blocking, and this does not claim production accuracy or formal pitch scoring. This does not change the pitch estimator algorithm, benchmark tolerance, blocking target frequencies, `/api/recognize`, provider union, PDF upload, Audiveris, AI API usage, audio upload, real voice datasets, rhythm evaluation, sight-singing assessment, Practice Mode UI workflow, or P1/P2 melody flow/history behavior.


- 2026-06-25: Added the P4c frequency drift semantics decision. The existing generated 440.00Hz → 466.16Hz exploratory drift case is now documented as a pitch drift / unstable sustained pitch diagnostic candidate for sustained pitch / single target note practice, not as correct ending-pitch matching, production pitch accuracy, formal scoring, grade, pass, or fail. It remains exploratory-only and non-blocking. Future work may detect and surface sustained-pitch instability separately from the nearest-note estimate. This is docs-only and does not change the pitch estimator algorithm, Practice Mode UI workflow, validation pass/fail logic, existing blocking gates, benchmark tolerance, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, PDF upload, Audiveris, AI API usage, audio upload, real voice datasets, rhythm evaluation, or sight-singing assessment.
