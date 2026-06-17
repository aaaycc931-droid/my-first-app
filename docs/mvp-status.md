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
