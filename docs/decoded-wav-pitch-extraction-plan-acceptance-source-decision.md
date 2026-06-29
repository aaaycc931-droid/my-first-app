# P12a Decoded WAV Pitch Extraction Plan, Acceptance Criteria, and Source Decision

## Summary

P12a is a docs-only planning step for the next isolated research increment after P11a, P11b, and P11c: extracting exploratory pitch-frame metadata from a successfully decoded local WAV `AudioBuffer` on `/research/local-audio-decode`.

This is not an implementation PR. It does not add pitch extraction, does not read `AudioBuffer` channel data, and does not change the existing decode route.

## Related context

- P11a added an isolated browser `decodeAudioData` metadata-only proof of concept on `/research/local-audio-decode`.
- P11b recorded source-review QA confirming the POC remained metadata-only, browser-local, research-only, and isolated from Practice Mode.
- P11c recorded user-performed manual browser QA passing outside Codex.

P12a plans the next smallest safe step: a future P12b proof of concept that analyzes decoded WAV data only after successful decode and only after a separate explicit user action.

## Why pitch extraction must remain isolated to `/research/local-audio-decode`

Pitch extraction from decoded local WAV files is still research work. Keeping it isolated to `/research/local-audio-decode` protects the Browser Local Practice Mode MVP from accidentally becoming a product audio import feature before the boundaries, data shape, QA expectations, and user copy are proven.

The isolated route is the correct place for P12b because it already exists as a local browser decode research surface and has already been reviewed as separate from `/practice`, `/api/recognize`, upload flows, server processing, and product import claims.

## Why this is not Practice Mode integration

P12b must not modify Practice Mode. The decoded `AudioBuffer`, pitch frames, summary metrics, and diagnostics must not be passed to `/practice`, converted into a Practice Mode attempt, compared against current melody steps, or used for score, pass/fail, grade, target retry, recent attempt history, or feedback state.

Practice Mode remains a separate Browser Local Practice Mode MVP flow. P12b only explores whether a decoded local WAV can produce basic pitch-frame diagnostics inside the research route.

## Why this is not a product audio import flow

P12b must not claim product audio import support. A local WAV selected in the research route is only a temporary browser-local input for an explicit diagnostic experiment. The future implementation must not add upload, cloud processing, server processing, persistence, accounts, storage, real audio fixtures, MP3 support, source separation, accompaniment-to-melody inference, or Song Learning Mode claims.

The POC must stay limited to small local WAV files chosen by the user during a research session.

## Proposed future P12b implementation shape

A future P12b implementation should keep the current decode interaction and add one separate explicit action after successful decode:

1. User selects a small WAV file.
2. File selection records only file summary state and does not decode.
3. User clicks **Decode metadata**.
4. Browser `decodeAudioData` runs and stores decoded metadata plus a route-local decoded buffer reference only if needed for the explicit research action.
5. User clicks a separate action such as **Extract pitch frames**.
6. Only after that click may the POC read decoded `AudioBuffer` channel data for exploratory pitch-frame extraction.
7. The route displays research metadata only.

Expected research output should be limited to diagnostic fields such as:

- analyzed duration
- frame count
- voiced frame count
- estimated frequency min / median / max, if available
- no-pitch frame count, if available
- simple diagnostic text

The output must not include a formal score, pass/fail result, grade, Practice Mode attempt, `TargetPitchCurve`, or product-ready claim.

## Reuse versus isolated adapter decision

The repository already has local pitch-estimation work for Practice Mode and synthetic validation. However, P12b should avoid coupling the research decode route directly to Practice Mode concepts.

Acceptable implementation options for P12b are:

- Reuse the smallest existing pitch-estimation primitive if it is already UI-independent and can accept plain channel data or a small in-memory buffer without importing Practice Mode UI/state concepts.
- Add a tiny isolated adapter under the research route or a clearly research-scoped utility if the existing code is too coupled to Practice Mode attempt state, target comparison, confidence copy, or scoring-like presentation.

The adapter, if needed, should be minimal and should translate decoded channel data into exploratory frame diagnostics only. It should not introduce a new dependency, new lockfile changes, playback nodes, waveform rendering, target curve generation, or Practice Mode data mutation.

## Source decision

Choose the smallest safe implementation path for P12b: reuse existing pitch-estimation primitives only if they can be called as pure local analysis helpers without importing Practice Mode state, target-note comparison, attempt history, scoring copy, or UI behavior. If that boundary is not clean, create a tiny research-only adapter that wraps the primitive and returns only diagnostic pitch-frame summary metadata for `/research/local-audio-decode`.

This source decision intentionally favors isolation over reuse if reuse would blur product boundaries. The P12b source review should verify imports and data flow before merge.

## Acceptance criteria for future P12b

- File selection alone does not decode.
- Decode alone does not extract pitch.
- Pitch extraction only happens after clicking a separate explicit action.
- Pitch extraction remains isolated to `/research/local-audio-decode`.
- The decoded `AudioBuffer` is not passed to `/practice`.
- No Practice Mode files are modified.
- No scoring language is introduced.
- Any pitch output is labeled exploratory or diagnostic.
- Large-file and unsupported-file risks are documented in UI copy or error states.
- Manual browser QA is performed before merge.
- The POC does not generate a `TargetPitchCurve`.
- The POC does not connect audio to an output destination.
- The POC does not add playback or waveform/sample visualization.

## Manual QA expectations for future P12b

Manual browser QA should be performed before merging P12b and should record at least:

- Opening `/research/local-audio-decode` succeeds.
- Selecting a small valid WAV does not decode automatically.
- Clicking **Decode metadata** decodes metadata only and does not extract pitch automatically.
- Clicking **Extract pitch frames** after successful decode displays exploratory diagnostic pitch metadata.
- Selecting an unsupported file keeps decode and pitch extraction unavailable or shows a clear error state.
- Large-file risk copy or error handling is visible or documented in the UI.
- No playback occurs.
- No waveform or sample visualization appears.
- No Practice Mode state changes occur.
- Refreshing or clearing the research route clears temporary local decoded/pitch state.

## Source review checklist for future P12b

Before merging P12b, reviewers should confirm:

- `app/practice/page.tsx` is unchanged.
- `/api/recognize` is unchanged.
- No Practice Mode attempt, target, history, feedback, score, grade, or pass/fail code is imported into the research route.
- No decoded `AudioBuffer` or pitch-frame data is passed outside `/research/local-audio-decode`.
- No `AudioBufferSourceNode`, `.connect(audioContext.destination)`, object URL playback, `<audio>` playback, analyser visualization, canvas waveform, or sample visualization is added.
- No `TargetPitchCurve` generation is added.
- No upload, cloud, AI, account, storage, persistence, server processing, real audio fixture, `metadata.local.json`, dependency, or lockfile change is added.
- Any existing pitch primitive reuse is pure local analysis and does not pull in Practice Mode UI/state concepts.
- If a research-only adapter is added, it is small, route-scoped or clearly research-scoped, and returns diagnostic metadata only.

## Strict future boundaries

P12b must not add:

- playback
- connection to audio destination
- waveform visualization
- sample visualization
- `TargetPitchCurve` generation
- `/practice` integration
- `/api/recognize` integration
- upload
- cloud processing
- AI
- accounts
- storage
- server processing
- real audio fixtures
- `metadata.local.json`
- APK-ready claims
- MP3 support
- source separation
- accompaniment-to-melody inference
- Song Learning Mode claims
