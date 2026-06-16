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
- Phase 4: add local manual testing steps and documentation.
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
