# Real OMR architecture plan

## Current state

The current public flow is a mock recognition flow. It is intended to validate the MVP user journey of uploading a score image, receiving note-like recognition results, rendering those results, and previewing playback without claiming that production OMR is already available.

## Current production boundary

The production-facing `/api/recognize` boundary only handles JPG/PNG image uploads. It does not handle PDF input and does not call Audiveris. This boundary should remain intentionally narrow until a production-safe real OMR architecture is designed, implemented, and validated.

## Current dev-only capability

Local Audiveris exists only as a local dev-only PDF proof of concept. It is useful for developer validation of a possible real OMR path, but it is not part of the production flow, not part of the public MVP flow, and not a default recognizer provider.

## Why not direct Audiveris in `/api/recognize`

A local Audiveris binary should not be connected directly to the production `/api/recognize` route because that would mix an experimental local proof of concept with the public synchronous API boundary. Direct execution would introduce production risks around binary availability, runtime limits, file handling, cleanup, concurrent jobs, failure isolation, and observability. It would also blur the current MVP contract that `/api/recognize` accepts image input for the mock flow and does not provide production PDF OMR.

## Recommended future architecture

A future real OMR implementation should use an isolated production architecture based on workers, a queue, temporary storage, and asynchronous jobs. The API should create and track OMR jobs, while an isolated worker or external OMR service performs expensive recognition work outside the request/response path. Results should be normalized before they are exposed to the frontend.

Recommended components:

* A frontend upload entry point that sends an allowed file type to the backend.
* An API layer that validates input, creates an OMR job, and returns a job identifier.
* Temporary object storage for uploaded source files and generated intermediate artifacts.
* A queue that decouples API requests from OMR execution.
* A containerized worker or external OMR service that performs OMR in an isolated runtime.
* A result store that saves a safe structured notes payload, a MusicXML summary, or both.
* Job status endpoints that let the frontend poll for progress and final results.

## Suggested future flow

1. The frontend uploads a file.
2. The API validates the upload, creates a job, stores the source file in temporary storage, and returns a job ID.
3. A worker receives the queued job and executes OMR in an isolated runtime.
4. The worker saves the result as safe structured notes, a MusicXML summary, or both, rather than exposing raw local artifacts directly.
5. The frontend queries job status and retrieves the final normalized result when the job completes.

## Deployment considerations

Vercel serverless functions are not a good fit for directly running a local Audiveris binary. Real OMR should use a container/worker environment or an external OMR service that is designed for long-running and resource-intensive processing.

A production design should include:

* Timeout limits for uploads, jobs, and worker execution.
* Concurrency controls so large OMR jobs cannot exhaust shared runtime capacity.
* Cleanup rules for temporary inputs, generated files, and failed jobs.
* Storage boundaries for source files, intermediate artifacts, and normalized results.
* Observability for job lifecycle events, worker failures, queue depth, latency, and cleanup failures.

## File and artifact safety

Repository safety remains part of the architecture boundary:

* Do not commit real score samples.
* Do not commit PDF, MXL, XML, OMR, log, image, or generated artifact files.
* Production files should use temporary storage and an explicit cleanup strategy.
* Generated artifacts should not become source-controlled fixtures unless a future licensing and sample strategy explicitly permits it.

## Provider boundary

This plan does not add an Audiveris provider. The default provider remains `mock`, and the provider union remains exactly:

```ts
"mock" | "ai" | "musicxml"
```

Future real OMR work should preserve this boundary until a separate implementation PR intentionally changes it with tests, migration notes, and production safety review.

For sample and fixture handling, see `docs/omr-sample-fixture-strategy.md`.

## Future decision points

Future productization should decide:

* Whether to use a hosted OMR service or a self-hosted worker.
* Whether the public API should remain synchronous for image-only MVP flows or become asynchronous for real OMR jobs.
* Whether to support image-only real OMR first and defer PDF support until later.
* What licensing and sample strategy is acceptable for test files and validation fixtures.
* Whether the normalized result format should be structured notes, MusicXML, or both.

## Non-goals for this PR

This PR does not:

* Implement real OMR.
* Modify `/api/recognize`.
* Modify the UI.
* Add any runtime dependency.
* Commit test scores or generated files.
