# Dev-only OMR API Design

> Status: Phase 2 skeleton added. The dev-only route exists only as a safety-boundary skeleton; it still does not execute Audiveris, does not implement real OMR, and does not add production behavior.

## Scope and non-goals

This document defines a future boundary for a possible Audiveris-backed OMR API that would be used only for local development experiments.

It is explicitly:

- local/dev-only.
- not implemented for Audiveris execution; Phase 2 is skeleton-only.
- not production.
- not Vercel.
- not `/api/recognize`.
- not a replacement for the default mock recognition flow.
- not permission to commit generated artifacts.

No generated PDF, MXL, XML, OMR, log, image, or real score sample files should be committed as part of this design.

## 1. Current state summary

- The default recognition provider remains `mock`.
- `/api/recognize` remains the image-upload mock main flow.
- MusicXML/MXL import is a dev-only validation entry point.
- Audiveris export is currently a local-only script.
- `musicxml:inspect-local` can inspect local `.mxl`, `.musicxml`, and `.xml` files and output a note count.
- A developer has reported this local path as successful: Audiveris export -> MXL -> inspect -> dev import/playback.

## 2. Future dev-only OMR API goals

A future dev-only OMR API, if added, should meet these goals:

- It is only for local development validation.
- It is not for Vercel or production deployments.
- It does not replace `/api/recognize`.
- It does not change the default mock provider.
- It does not automatically commit, persist, or save generated files into the repository.
- It exists only as a controlled experiment entry point.

## 3. Suggested future API boundary

Phase 2 adds `/api/dev/recognize-audiveris` as a dev-only skeleton route. It establishes the environment-variable gate and response boundary only; it does not execute Audiveris, does not perform OMR, and does not write generated files.

Required future boundary rules:

- The route must be protected by an environment variable gate, for example `AUDIVERIS_DEV_API_ENABLED === "true"`.
- When the environment gate is not enabled, the route must return `404`.
- The route must require `AUDIVERIS_PATH` before attempting any Audiveris work.
- Audiveris execution must run only on the server side.
- Audiveris must never run in the browser.
- `fflate` or any MXL decompression logic must not be moved into `app/page.tsx`.
- The route must not call, modify, wrap, or otherwise couple itself to `/api/recognize`.
- `/api/recognize` must remain the mock-oriented main recognition boundary.

## Dev-only UI entry point

A small manual Audiveris PDF test panel is available on the home page only when `NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED === "true"`. The panel is hidden by default, so leaving the environment variable unset keeps the page behavior unchanged.

This UI entry point is intentionally narrow:

- It is dev-only, local-only, and manual-test-only.
- It is not production and not for Vercel.
- It accepts PDF input only.
- It calls only `POST /api/dev/recognize-audiveris` with multipart field name `file`.
- It does not call, replace, wrap, or affect `/api/recognize`.
- It does not change the default `mock` provider and does not add an Audiveris provider.
- It does not run Audiveris in the browser.
- It does not move MXL decompression or MusicXML extraction into `app/page.tsx`.
- It displays only the response summary fields `noteCount`, `firstNotes`, `source`, and `inputType`; it must not display full logs, local paths, generated file content, or download generated files.

The main upload button remains connected to `/api/recognize`, and the default mock recognition flow remains separate from this dev-only Audiveris UI.

## Developer-reported local dev-only Audiveris UI validation

This section records a developer-reported local-only, dev-only UI validation result for the Audiveris PDF test panel calling the Phase 3 dev-only API. It is not Codex-verified because the Codex cloud environment cannot access the developer's local browser, local `localhost` Next.js dev server, or local Audiveris installation. It is also not production, not Vercel, not `/api/recognize`, not a new Audiveris provider, and not a change to the default `mock` provider.

The developer reported enabling both the dev-only UI and the dev-only API locally with these environment variables:

- `NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED = "true"`
- `AUDIVERIS_DEV_API_ENABLED = "true"`
- `AUDIVERIS_PATH = "D:\Audiveris.exe"`
- `AUDIVERIS_DEV_API_TIMEOUT_MS = "300000"`

The developer reported opening the local Next.js dev server in a browser. The page displayed the dev-only panel labels `DEV-ONLY · LOCAL AUDIVERIS · PDF ONLY` and `Audiveris PDF 测试面板`. The developer selected the local PDF file `score.pdf` and clicked the independent button labeled `手动调用 Local Audiveris PDF 测试`.

The developer reported that the dev-only UI displayed a successful summary from `/api/dev/recognize-audiveris`, including:

- `noteCount: 651`
- `source: audiveris`
- `inputType: pdf`
- `firstNotes` displayed normally, with examples such as E5, D5, A4, and other leading notes

The developer also reported that the main recognition result area still showed the not-uploaded state and did not go through the main flow. This indicates that the main `/api/recognize` upload flow was not replaced by the dev-only UI.

This developer-reported local UI validation indicates only that:

- The dev-only UI can call `/api/dev/recognize-audiveris`.
- The developer's local Audiveris API execution succeeded.
- The UI displays only summary fields.
- The UI did not display full logs, local paths, or generated files.

This validation remains developer-reported, local-only, dev-only, not Codex-verified, not production, not Vercel, not `/api/recognize`, not a default mock provider change, and not an Audiveris provider. No generated PDF, MXL, XML, OMR, log, image, or real score sample artifacts are committed by this documentation note.

## 4. File and safety boundaries

A future implementation must define and validate file and safety boundaries before executing Audiveris.

Required considerations:

- Upload size limit: define a strict maximum request and input file size before enabling execution.
- Supported input formats: confirm whether PDF, PNG, and JPG should be allowed after validating real Audiveris CLI behavior.
- Temporary directory strategy: use an isolated temporary working directory outside the repository.
- Output cleanup strategy: remove generated `.mxl`, `.omr`, and `.log` files after the request or after a bounded debugging window.
- Local path privacy: do not leak local absolute paths in API responses.
- Repository hygiene: do not place generated artifacts in the repository.
- Response content: do not return `.omr` files or full log contents in the response.
- Timeout strategy: either reuse `AUDIVERIS_EXPORT_TIMEOUT_MS` or define a separate dev API timeout variable.
- Concurrency limit: avoid running multiple Audiveris processes at the same time unless a safe queue or lock exists.

## 5. Validation required before future implementation

Before any future dev-only OMR API implementation, validation must confirm:

- Main `/api/recognize` code does not contain Audiveris, `fflate`, MXL, or extractor-related keywords.
- The default provider is still `mock`.
- `app/page.tsx` does not import `fflate`, `unzipSync`, or `mxlExtractor`.
- The new dev API is protected by an environment variable gate.
- The repository does not commit PDF, MXL, XML, OMR, log, image, or real score sample files.

## 6. Phased roadmap

- Phase 0: current local-only export + inspect + dev import/playback has been completed and reported successful by a developer.
- Phase 1: write only this dev-only API design document.
- Phase 2: skeleton added. It is still no Audiveris execution, still not production, still not Vercel, still not `/api/recognize`, and still not connected to UI.
- Phase 3: consider env-gated Audiveris execution only after safety, cleanup, timeout, and repository hygiene boundaries are validated.
- Phase 4: add an env-gated local manual Audiveris PDF UI entry point for dev-only testing without changing `/api/recognize` or the default `mock` provider.
- Phase 5: only after boundaries and cleanup strategy are stable, consider a formal provider design.

Across every phase, `/api/recognize` should not be directly polluted with Audiveris, MXL extraction, or dev-only OMR concerns.

## 7. Open questions

- What are the real Audiveris CLI support boundaries for PDF, PNG, and JPG inputs?
- What path differences need handling across Windows, macOS, and Linux?
- What output file naming rules does Audiveris use for different input names and formats?
- How should multi-page PDF input behave?
- What should the default timeout value be?
- How should local paths in logs be redacted?
- Is a separate temporary working directory required for every request?
- Should the dev API restrict execution to one Audiveris process at a time?

## Developer-reported local Phase 2 skeleton validation

This section records a developer-reported local-only manual validation result for the Phase 2 `/api/dev/recognize-audiveris` skeleton. It is not Codex-verified because the Codex cloud environment cannot access the developer's local `localhost` dev server. It is also not production, not Vercel, not `/api/recognize`, and not evidence that real OMR or Audiveris execution has been implemented.

The developer reported starting the Next.js dev server locally and manually validating the `/api/dev/recognize-audiveris` skeleton with these results:

- With the gate closed:
  - `AUDIVERIS_DEV_API_ENABLED` was not enabled.
  - `POST /api/dev/recognize-audiveris` returned `404`.
- With the gate open but `AUDIVERIS_PATH` missing:
  - `AUDIVERIS_DEV_API_ENABLED = "true"`.
  - `AUDIVERIS_PATH` was not set.
  - `POST /api/dev/recognize-audiveris` returned `500`.
  - The response included `AUDIVERIS_PATH is required for dev-only Audiveris API.`
- With the gate open and a Windows Audiveris path configured:
  - `AUDIVERIS_DEV_API_ENABLED = "true"`.
  - `AUDIVERIS_PATH = "D:\Audiveris.exe"`.
  - `POST /api/dev/recognize-audiveris` returned `501`.
  - The response kept skeleton-only semantics, including `implemented: false` and `reason: "skeleton only"`.

The developer also reported that no Audiveris execution logs were observed during these three checks and that no new `.mxl`, `.omr`, or `.log` files were generated. The local dev server may have used port `3001` because `3000` was occupied; that is only local Next.js dev server behavior and does not change the API boundary conclusion.

This developer-reported result only indicates that the Phase 2 skeleton local behavior matched the expected 404, 500, and 501 boundaries. It does not mean real OMR is implemented. `/api/recognize` remains separate and must not be connected to Audiveris by this skeleton-only work. The default provider should remain `mock`, and no generated artifacts should be committed.

## Developer-reported local Phase 3 Audiveris execution validation

This section records a developer-reported local-only, dev-only manual validation result for Phase 3 Audiveris execution. It is not Codex-verified because the Codex cloud environment cannot access the developer's local Audiveris installation or local `localhost` Next.js dev server. It is also not production, not Vercel, not `/api/recognize`, not connected to UI, not a new Audiveris provider, and not a change to the default `mock` provider.

The developer reported enabling the Phase 3 dev-only API in a local Next.js dev server with these environment variables:

- `AUDIVERIS_DEV_API_ENABLED = "true"`
- `AUDIVERIS_PATH = "D:\Audiveris.exe"`
- `AUDIVERIS_DEV_API_TIMEOUT_MS = "300000"`

The developer reported sending a multipart request to `POST /api/dev/recognize-audiveris` with local PDF input `D:\omr-test\score.pdf` using field name `file` and content type `application/pdf`.

The developer reported that the response was successful and included:

- HTTP `200`
- `devOnly: true`
- `implemented: true`
- `source: "audiveris"`
- `inputType: "pdf"`
- `noteCount: 651`
- `firstNotes` containing the first parsed notes

The developer reported that this local result validates the dev-only route's local execution path: the route successfully called the developer's local Audiveris installation, server-side code read the MXL produced by Audiveris, `extractMusicXMLFromMxl` extracted MusicXML from that MXL, and `parseMusicXML` parsed notes from the extracted MusicXML.

The developer also reported that temporary cleanup passed: running `Get-ChildItem "$env:TEMP" -Directory -Filter "audiveris-dev-api-*"` produced no output. The developer reported that a PowerShell repository search for `.mxl`, `.omr`, `.log`, `.pdf`, `.xml`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.tif`, `.tiff`, `.bmp`, and `.heic` files, excluding `node_modules` and `.next`, also produced no output.

The developer reported that `validate:repository-hygiene` could not run on the developer's machine because Git was not available there and failed with `spawnSync git ENOENT`. That is a developer-machine environment issue and does not represent a repository hygiene failure.

This result must continue to be treated as local/dev-only and developer-reported only. It is not production, not Vercel, not Codex-verified, not `/api/recognize`, and not connected to UI. The default provider remains `mock`; no Audiveris provider is added by this validation note; and no generated PDF, MXL, XML, OMR, log, image, or real score sample artifacts are committed.
