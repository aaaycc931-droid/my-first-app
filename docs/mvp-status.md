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
