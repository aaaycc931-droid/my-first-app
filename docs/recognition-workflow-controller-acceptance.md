# Recognition workflow controller acceptance

## Scope

This slice extracts the /recognize page's image, MusicXML, and dev-only
Audiveris file/async orchestration into a pure controller with an injectable API
client, preview port, and playback-invalidation effects. The page keeps DOM
file-input wiring, JSX, BPM state, and note playback scheduling.

The only intentional runtime hardening is fail-closed source replacement:

- replacing a valid image or MusicXML source clears the shared recognized-note
  result and invalidates the old preview/playback;
- a late success or error from an older image or MusicXML request cannot update
  the state for a newer source;
- a late dev-only Audiveris response cannot update a newer PDF summary;
- disposing the controller revokes the current object URL once and prevents all
  later async state writes.

## Compatibility boundary

The existing endpoint, POST method, FormData field names, MusicXML extension and
2 MB checks, PDF-only dev gate, feature flags, default `mock` provider, Chinese
error copy, and main-result isolation for Audiveris remain unchanged. The
controller does not parse MusicXML, execute Audiveris, or add a production OMR
provider.

## Automated evidence

`test:recognition-workflow-controller` covers initial no-IO state, preview URL
replacement/disposal, busy guards, image success/failure, MusicXML extension,
empty-file and 2 MB boundaries, cross-flow stale responses, Audiveris summary
isolation, full-notes flag forwarding, and disposal after deferred completion.
The existing recognition fail-closed and static boundary validators remain
required.

This is automated controller evidence only. Browser manual QA, Android
WebView/real-device testing, real OMR, third-party MusicXML interoperability,
screen-reader/keyboard/contrast/reflow testing, teacher review, target-user QA,
and EXT-A–EXT-E evidence remain `NOT_EXECUTED`.

QA level recommendation: `strict`.
