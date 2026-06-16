# Dev-only OMR API Design

> Status: design-only. This document is not an implementation plan for this task, and no API, provider, route, dependency, generated artifact, or production behavior is added by this change.

## Scope and non-goals

This document defines a future boundary for a possible Audiveris-backed OMR API that would be used only for local development experiments.

It is explicitly:

- local/dev-only.
- not implemented.
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

A possible future route could be `/api/dev/recognize-audiveris`, but that path is only a design suggestion. This task does not implement the route.

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
- Phase 2: add a dev-only API skeleton, but do not execute Audiveris.
- Phase 3: add dev-only Audiveris execution behind an environment gate.
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
