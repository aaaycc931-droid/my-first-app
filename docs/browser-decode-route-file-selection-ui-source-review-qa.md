# P10y File Selection UI Source Review QA

## Purpose

P10y is a docs-only/source-review QA pass for the P10x isolated WAV-first local file-selection UI shell on `/research/local-audio-decode`.

This QA note documents that the route remains a file-selection-only research surface. Browser decoding is still not implemented, and selecting a file must not be treated as decoding, playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, or Practice Mode integration.

Related references:

- P10v plan: `docs/browser-decode-route-file-input-plan.md`.
- P10w acceptance criteria: `docs/browser-decode-route-file-input-acceptance-criteria.md`.
- P10x implementation status: `docs/mvp-status.md`.

## Source review scope

Reviewed files and repository boundaries:

- `app/research/local-audio-decode/page.tsx`.
- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.
- `app/page.tsx`.
- `app/practice/page.tsx`.
- `app/api/recognize/route.ts`.
- `package-lock.json`.
- Repository file list for real audio files and `metadata.local.json`.

No application source files, route files, API files, dependencies, lockfiles, real audio fixtures, or local metadata files were changed for P10y.

## Source review findings

- `app/research/local-audio-decode/page.tsx` remains a server component: it has no top-level `"use client"` directive and only imports the isolated child component.
- `"use client"` appears in the isolated file input child component at `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx` for local browser selection state.
- `app/practice/page.tsx` is unchanged by this PR.
- `app/api/recognize/route.ts` is unchanged by this PR.
- The research route remains unlinked from the homepage and `/practice`; source review found no link to `/research/local-audio-decode` from `app/page.tsx` or `app/practice/page.tsx`.
- The UI only stores browser-provided `File` metadata: `name`, `size`, `type`, and `lastModified`.
- The UI does not read WAV binary bytes.
- The UI does not inspect WAV headers.
- The UI does not use `FileReader`.
- The UI does not call `file.arrayBuffer()`.
- The UI does not create object URLs.
- The UI does not create `AudioContext` or `webkitAudioContext`.
- The UI does not call `decodeAudioData`.
- The UI does not add playback.
- The UI does not add waveform rendering.
- The UI does not add pitch tracking.
- The UI does not generate `TargetPitchCurve` data.
- The UI does not upload anything or call any API route.
- The UI does not add cloud, AI, accounts, storage, or server processing.
- No real audio files were added.
- No `metadata.local.json` file was added.
- `package-lock.json` was not changed.

## Manual QA notes

Manual browser QA was not performed in this P10y pass because the requested scope is docs-only/source-review-only and this PR intentionally does not run or modify the file-selection UI behavior.

Manual QA status for the requested checks:

- Opening `/research/local-audio-decode`: not performed in browser for P10y.
- Canceling the file picker: not performed in browser for P10y.
- Selecting a small `.wav` file: not performed in browser for P10y; no real audio fixtures were added.
- Selecting an obvious non-WAV file: not performed in browser for P10y.
- Clearing/resetting selected file state: not performed in browser for P10y.
- Confirming boundary copy remains visible: verified by source review only in `app/research/local-audio-decode/page.tsx` and `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`.

## Boundary confirmation

P10y confirms by source review that the route remains research-only and file-selection-only. It does not implement or approve browser decoding, WAV byte/header inspection, `AudioContext`, `decodeAudioData`, playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, Practice Mode integration, upload, cloud, AI, accounts, storage, server processing, APK readiness, real audio fixtures, or local metadata fixtures.

## Intentionally skipped validation commands

The following commands were intentionally skipped because P10y is docs-only/source-review-only, no real audio fixtures were added, and these checks target real-voice, real-phone, local melody-guide fixture, or WAV-header fixture workflows outside this PR's scope:

- `npm run validate:local-real-voice-fixtures`.
- `npm run validate:local-real-phone-comparison`.
- `npm run validate:local-melody-guide-fixtures`.
- `npm run validate:local-melody-guide-wav-headers`.
- `npm run test:local-melody-guide-validator`.
- `npm run test:local-melody-guide-wav-header-inspector`.

## Recommended next step

Keep `/research/local-audio-decode` isolated. If a later PR adds actual browser decoding, require a separate acceptance plan and QA pass before introducing `AudioContext`, `decodeAudioData`, binary reads, playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, or any Practice Mode integration.
