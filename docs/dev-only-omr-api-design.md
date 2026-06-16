# Dev-only OMR API Design

> Status: Phase 3 env-gated Audiveris execution added. The route remains local/dev-only, summary-only, PDF-only for this phase, not production, not Vercel, not `/api/recognize`, and not connected to the UI.

## Scope and non-goals

This document defines the boundary for a local development Audiveris-backed OMR API experiment.

It is explicitly:

- local/dev-only.
- not production.
- not Vercel.
- not `/api/recognize`.
- not connected to the homepage UI.
- not a replacement for the default mock recognition flow.
- not a new recognition provider.
- not permission to commit generated artifacts.

No generated PDF, MXL, XML, OMR, log, image, or real score sample files should be committed as part of this design or manual testing.

## 1. Current state summary

- The default recognition provider remains `mock`.
- `/api/recognize` remains the image-upload mock main flow.
- MusicXML/MXL import remains a separate dev-only validation entry point.
- `/api/dev/recognize-audiveris` is an env-gated local/dev-only Audiveris execution route.
- Phase 3 accepts PDF input only to keep the boundary narrow.
- The route reads Audiveris-generated `.mxl` server-side and reuses the existing MXL extraction and MusicXML parser code.
- The response is summary-only and must not include full notes, generated file contents, local paths, temp paths, `.omr` files, or full logs.

## 2. Phase 3 API boundary

Phase 3 keeps `/api/dev/recognize-audiveris` as a controlled local development route with these rules:

- Only `POST` is supported.
- `AUDIVERIS_DEV_API_ENABLED` must be exactly `"true"`; otherwise the route returns `404`.
- `AUDIVERIS_PATH` is required before Audiveris execution starts.
- Audiveris execution is server-side only.
- The route may use `child_process` / `spawn`; no other application file should use that for Audiveris.
- The multipart upload field must be named `file`.
- PDF-only for this phase: `.pdf` filename or `application/pdf` MIME type.
- Uploads are limited to 10 MB.
- Unsupported formats and over-limit uploads return `400` before Audiveris execution.
- A per-request isolated temp directory is created under the system temp directory, outside the repo.
- Cleanup is required after every request and must remove temp input, output, `.mxl`, `.omr`, `.log`, and other generated files by deleting the isolated temp tree.
- Timeout is required with `AUDIVERIS_DEV_API_TIMEOUT_MS`, defaulting to 300000 ms.
- Timeout must terminate the child process and return a sanitized error.
- A conservative same-process concurrency guard is required; when busy, the route returns `429` and does not queue.
- The command shape is `AUDIVERIS_PATH -batch -export -output <tempOutputDir> <tempInputPdf>`.
- Non-zero Audiveris exit and missing `.mxl` return sanitized errors.
- `.mxl` extraction must reuse `extractMusicXMLFromMxl`.
- MusicXML parsing must reuse `parseMusicXML`.

## 3. Response boundary

Successful responses are minimal JSON summaries only, for example:

```json
{
  "devOnly": true,
  "implemented": true,
  "source": "audiveris",
  "inputType": "pdf",
  "noteCount": 12,
  "firstNotes": []
}
```

The response must not include:

- temp paths.
- local absolute paths.
- usernames.
- full Audiveris logs.
- `.omr` files.
- generated file contents.
- the complete notes array.

## 4. Manual local testing examples

These commands are examples for a developer machine with Audiveris installed. Do not commit the input PDF or any generated Audiveris artifacts.

Gate closed should return `404`:

```bash
curl -i -X POST http://localhost:3000/api/dev/recognize-audiveris
```

Gate open but missing `AUDIVERIS_PATH` should return a clear JSON error without execution:

```bash
AUDIVERIS_DEV_API_ENABLED=true npm run dev
curl -i -X POST -F "file=@/path/to/local-test.pdf;type=application/pdf" \
  http://localhost:3000/api/dev/recognize-audiveris
```

Gate open with a local Audiveris binary can be tested manually:

```bash
AUDIVERIS_DEV_API_ENABLED=true \
AUDIVERIS_PATH=/path/to/audiveris \
AUDIVERIS_DEV_API_TIMEOUT_MS=300000 \
npm run dev

curl -i -X POST -F "file=@/path/to/local-test.pdf;type=application/pdf" \
  http://localhost:3000/api/dev/recognize-audiveris
```

Expected successful response shape is summary-only: `devOnly`, `implemented`, `source`, `inputType`, `noteCount`, and `firstNotes`.

## 5. Validation requirements

Validation must confirm:

- The dev Audiveris route exists.
- The route has the `AUDIVERIS_DEV_API_ENABLED` gate and returns `404` when closed.
- The route checks `AUDIVERIS_PATH`.
- Upload size, PDF-only input, system temp directory usage, cleanup, timeout, and concurrency guard are present.
- The route does not return `.omr` files or full logs.
- The response includes `devOnly: true` and `implemented: true`.
- The route does not call `/api/recognize`.
- `/api/recognize` does not reference the Audiveris dev route.
- `app/page.tsx` does not reference the Audiveris dev route or browser-side MXL extraction keywords.
- The default provider remains `mock` and no Audiveris provider exists.
- The repository does not commit PDF/MXL/XML/OMR/log/image samples.

## 6. Phased roadmap

- Phase 0: current local-only export + inspect + dev import/playback was completed and reported successful by a developer.
- Phase 1: write only this dev-only API design document.
- Phase 2: skeleton added; no Audiveris execution.
- Phase 3: env-gated Audiveris execution added with PDF-only input, isolated system temp directory, cleanup, timeout, concurrency guard, and summary-only response.
- Phase 4: developer performs real local Audiveris manual testing and records results without committing samples or generated artifacts.
- Phase 5: only after boundaries are stable, consider whether a formal provider design is needed; the default provider must remain mock unless explicitly changed in a future task.

Across every phase, `/api/recognize` should not be directly polluted with Audiveris, MXL extraction, or dev-only OMR concerns.
