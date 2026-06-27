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

- 2026-06-26: Added P4d sustained pitch instability diagnostic prototype fields for generated in-memory benchmark reporting: frame frequency range in cents, first-half median frequency, second-half median frequency, first-to-second-half drift in cents, and a clearly documented 50-cent diagnostic-only instability threshold. The frequency-drift exploratory case now reports `sustainedPitchInstabilityObserved=true` while remaining exploratory and non-blocking. This does not change nearest-note selection, current estimated frequency aggregation, Practice Mode UI workflow, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, existing blocking gates, benchmark tolerance, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, PDF upload, Audiveris, AI API usage, audio upload, or real voice datasets.
- 2026-06-26: Consolidated the current P3a through P4d pitch benchmark and diagnostic status for P4e. Current blocking coverage remains limited to generated in-memory clean sine, robustness, and no-pitch regression gates. Higher noise, frequency drift, vibrato, mixed harmonics, and P4d sustained pitch instability fields remain exploratory/reporting-only and non-blocking. Frequency drift remains a pitch drift / unstable sustained pitch diagnostic candidate rather than a pitch correctness case, and P4d instability fields do not participate in validation pass/fail. This is docs-only and does not change the pitch estimator algorithm, Practice Mode UI workflow, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, blocking gates, tolerance, blocking target frequencies, frequency drift input, `/api/recognize`, recognition provider union, PDF upload, Audiveris, AI API usage, audio upload, or real voice datasets.

- 2026-06-26: Added P5a real voice dataset design documentation for future real singing pitch robustness evaluation. This is docs-only and does not collect recordings, commit real audio files, add audio fixtures, upload audio, connect AI APIs, connect external datasets, change the pitch estimator algorithm, change Practice Mode UI workflow, add formal scoring, add grade/pass/fail labels, add rhythm evaluation, add sight-singing assessment, change blocking gates, relax tolerance, promote exploratory synthetic cases, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris. Current pitch evaluation remains non-production-grade and based on synthetic regression gates plus exploratory diagnostics only.

- 2026-06-26: Added P5b local real voice fixture convention documentation and a placeholder metadata example under `local-fixtures/real-voice/`. This is local-only developer experiment scaffolding and does not commit real audio, add audio fixtures, upload audio, connect AI APIs, connect external datasets, change the pitch estimator algorithm, change Practice Mode UI workflow, add formal scoring, add grade/pass/fail labels, add rhythm evaluation, add sight-singing assessment, change blocking gates, relax tolerance, promote exploratory cases, connect real voice fixtures to CI, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

- 2026-06-26: Added P5c opt-in local real voice metadata validation via `npm run validate:local-real-voice-fixtures`. The script only checks the ignored local metadata file `local-fixtures/real-voice/metadata.local.json` against the P5b text metadata convention and exits successfully when the file is absent. It is not part of CI or `npm run validate:local`, does not read audio, does not upload data, does not call the network or AI APIs, and does not change the pitch estimator, Practice Mode UI workflow, scoring, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, blocking gates, tolerances, `/api/recognize`, recognition providers, PDF upload, or Audiveris behavior.

- 2026-06-26: Added P5d local real voice `metadata.local.json` authoring guide documentation. This is docs-only and explains how to copy the committed placeholder metadata example to an ignored local file, fill non-identifying local-only metadata fields, avoid personal identifiers, avoid committing local metadata or real recordings, and manually run `npm run validate:local-real-voice-fixtures` as an opt-in, local-only, non-blocking, non-CI check. It does not add scripts, commit real audio, add audio fixtures, commit real `metadata.local.json`, upload audio, connect AI APIs, connect external datasets, change the pitch estimator, change Practice Mode UI workflow, add formal scores, add grades, add pass/fail labels, add rhythm evaluation, add sight-singing assessment, change blocking gates, relax tolerance, promote exploratory cases, add real voice validation to CI or `npm run validate:local`, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

- 2026-06-26: Added P5e local real voice PR reviewer checklist documentation for future review of local real voice changes. This is docs-only and helps reviewers confirm that future PRs do not commit real audio, audio fixtures, real `metadata.local.json`, or personally identifiable information; do not connect local real voice validation to CI or `npm run validate:local`; do not change the pitch estimator algorithm, Practice Mode UI workflow, scores, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, blocking gates, tolerances, target frequencies, `/api/recognize`, recognition providers, PDF upload, Audiveris, upload behavior, AI APIs, or external datasets; and continue to keep local real voice work local-only, opt-in, non-blocking, and outside CI.

- 2026-06-26: Added P6a Practice Mode UX copy and boundary polish for `/practice`. The page now more clearly presents Browser Local Only Practice Mode, the melody step-by-step flow, Step X / N and Current target note meaning, Play target → Record → Estimate order, current-step-only pitch comparison, temporary local-only recent attempts, and the fact that step changes do not auto-play, auto-record, auto-estimate, or add attempt history. This is copy/light layout polish only and does not change the pitch estimator algorithm, benchmark gates, tolerance, Practice Mode core workflow, melody step navigation behavior, attempt history data logic, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, user accounts, persistence, audio upload, AI API usage, `/api/recognize`, recognition provider union, PDF upload, or Audiveris behavior.

- 2026-06-26: Added P6b Practice Mode manual QA pass documentation for the P6a `/practice` UX copy and manual QA checklist. This records a source-backed review of the Browser Local Only Practice Mode copy, melody step loop, current-step target comparison, local-only recent attempts, and boundary language. Browser and microphone interaction could not be completed in this container because no browser runtime was available, so those items are explicitly documented as not completed and recommended for follow-up. This is docs-only and does not change the pitch estimator algorithm, benchmark gates, tolerance, Practice Mode core workflow, melody step navigation behavior, attempt history data logic, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, user accounts, persistence, audio upload, AI API usage, `/api/recognize`, recognition provider union, PDF upload, or Audiveris behavior.

- 2026-06-26: Added P6c Practice Mode Chinese copy localization for `/practice`. User-visible Practice Mode headings, guidance, buttons, local-only boundary language, pitch comparison labels, and recent local attempt copy are now natural Chinese while preserving the same browser-local-only meaning: no audio upload, no AI API call, no persistence, no formal scoring, no rhythm evaluation, and no sight-singing assessment. This is copy/documentation only and does not change the pitch estimator algorithm, benchmark gates, tolerance, Practice Mode core workflow, melody step navigation behavior, attempt history data logic, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, user accounts, persistence, audio upload, AI API usage, `/api/recognize`, recognition provider union, PDF upload, or Audiveris behavior.

- 2026-06-26: Added P6d Practice Mode Chinese browser QA addendum documentation for the P6c localized `/practice` page. This records local browser confirmation that the Chinese interface opens and displays correctly, the `浏览器本地练习模式` and boundary copy are visible, melody step progress and current target note behavior are correct, target playback does not auto-record or auto-estimate, step navigation clamps correctly, restart returns to Step 1, step changes do not auto-play/record/estimate, Record/Estimate remain local, estimates compare only against the current step target note, recent local attempts show Step # / target note / estimated note, retrying a target returns to the stored step without automatic side effects, clearing history only clears local attempt history, no formal score/grade/pass/fail implication was found, and no residual English or mixed-language QA issue was found. This is docs-only and does not change Practice Mode implementation, pitch estimator algorithm, benchmark gates, tolerance, core workflow, melody step navigation behavior, attempt history data logic, formal scoring, grade/pass/fail labels, rhythm evaluation, sight-singing assessment, persistence, audio upload, AI API usage, `/api/recognize`, recognition provider union, PDF upload, or Audiveris behavior.

- 2026-06-27: Added P7b pitch engine and real-time feedback evaluation matrix documentation for future local phone feedback and opt-in cloud deep assessment. The recommended short-term path is to keep the current estimator as the baseline and later compare it against Pitchy/Pitchfinder-style browser baselines; cloud deep assessment candidates include CREPE, RMVPE, SwiftF0-style lightweight models, aubio, pYIN, and Essentia, all requiring license review and real mobile recording validation before stronger claims. The documentation also clarifies that local feedback should use cents relative to the current target note and distinguish pitch correctness from sustained pitch instability. This is docs-only and does not install dependencies, connect any new pitch engine or model, change the pitch estimator algorithm, change Practice Mode UI workflow, implement real-time recording, implement cloud assessment, call GPT or AI APIs, upload audio, add accounts, add persistence, add formal scores, add grades/pass/fail, add rhythm evaluation, add sight-singing assessment, change benchmark gates, relax tolerance, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

- 2026-06-27: Added P7c docs-only local pitch engine comparison benchmark design. The current in-repository autocorrelation estimator remains the baseline for future comparisons against possible Pitchy, Pitchfinder, and later cloud-model candidates. This does not install dependencies, connect external pitch engines, change the pitch estimator, modify Practice Mode UI workflow, implement real-time recording, add a trend chart, upload audio, add persistence, add formal scoring, change benchmark gates or tolerance, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris.

- 2026-06-27: Added P7d pitch engine comparison harness skeleton with `npm run validate:pitch-engine-comparison`. The harness defines a common reporting shape and currently registers only the current in-repository autocorrelation estimator adapter. It reuses generated synthetic benchmark cases for reporting-only baseline comparison output while keeping existing benchmark gates, tolerances, validation blocker logic, no-pitch behavior, and exploratory case status unchanged. This does not install dependencies, connect Pitchy, Pitchfinder, CREPE, RMVPE, or SwiftF0, execute real phone recording benchmarks, claim conservatory-grade accuracy, change the pitch estimator algorithm, change Practice Mode UI workflow, implement real-time recording, add a pitch trend chart, implement cloud assessment, call GPT or AI APIs, upload audio, add accounts, add persistence, add formal scores, add grades/pass/fail, add rhythm evaluation, add sight-singing assessment, modify `/api/recognize`, modify the recognition provider union, add PDF upload, or connect Audiveris. P7e may consider one browser-local candidate adapter after separate review.

- 2026-06-27: Added P7f Pitchy / McLeod Pitch Method comparison adapter to the P7d pitch engine comparison harness. The current in-repository autocorrelation estimator remains the baseline, Pitchy is comparison-only, and Practice Mode UI/workflow plus production user pages are unchanged. `pitchy@4.1.0` and direct dependency `fft.js@4.0.4` declare MIT license in installed package metadata; Pitchy is ESM-only and is loaded by the validation harness with dynamic import. The comparison output now reports `in-repo-autocorrelation` and `pitchy-mcleod` rows, remains reporting-only, does not change benchmark gates or tolerance, does not promote exploratory cases, and is not professional accuracy proof, formal scoring, or conservatory-grade assessment. There is still no real phone recording benchmark, no mobile Safari or Android Chrome real-device performance conclusion, no audio upload, no AI API use, no user accounts, no persistence, no `/api/recognize` change, no recognition provider union change, no PDF upload, and no Audiveris change.

## P7g pitch engine comparison anomaly status

P7g adds reporting-only anomaly flags to the local pitch engine comparison harness. This is documentation and validation infrastructure only: it does not change Practice Mode, `/api/recognize`, the recognition provider union, persistence, user accounts, cloud assessment, formal scoring, rhythm evaluation, sight-singing assessment, benchmark gates, or benchmark tolerance.

The MVP must not claim improved pitch accuracy because Pitchy is connected as a comparison candidate. P7g explicitly preserves raw engine errors and labels obvious anomalies, including the P7f Pitchy exploratory vibrato caveat where Pitchy produced roughly 1.00Hz / -10534.80 cents. Real phone recording tests are still required before any production pitch-engine decision.
