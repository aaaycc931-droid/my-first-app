# P11b Decode Metadata POC Source Review QA

## Summary

P11b is a docs-only/source-review QA pass for the P11a isolated browser `decodeAudioData` metadata-only proof of concept on `/research/local-audio-decode`.

The reviewed implementation remains research-only, metadata-only, local browser-only, and isolated from Practice Mode. This review does not approve playback, waveform analysis, pitch tracking, `TargetPitchCurve` generation, upload/cloud processing, or Practice Mode integration.

## Files reviewed

- `app/research/local-audio-decode/page.tsx`
- `app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx`
- `app/page.tsx`
- `app/practice/page.tsx`
- `app/api/recognize/route.ts`
- `package.json`
- `package-lock.json`
- Repository paths checked for committed real audio or `metadata.local.json`

## Source review findings

### Decode trigger and file-selection boundary

- Confirmed: file selection alone does not call `file.arrayBuffer()`.
  - `handleFileChange` only reads the browser-provided `File` reference and stores a summary of `name`, `size`, `type`, and `lastModified`.
  - The only `selectedFile.arrayBuffer()` call in the POC appears inside `handleDecodeMetadata`.
- Confirmed: file selection alone does not create `AudioContext`.
  - `handleFileChange` does not reference `AudioContext`.
  - `new AudioContextConstructor()` appears only inside `handleDecodeMetadata`.
- Confirmed: decode only happens after clicking **Decode metadata**.
  - The button uses `onClick={handleDecodeMetadata}`.
  - The button is disabled unless an accepted WAV file is selected and the state is `ready-to-decode`.
- Confirmed: non-WAV selection remains pre-decode.
  - Rejected files set `selectedFile` to `null`, set a rejection reason, and return to `not-ready`, so `canDecode` remains false.

### AudioContext lifecycle

- Confirmed: `AudioContext` is scoped to explicit decode attempts.
- Confirmed: `AudioContext` is closed after success and failure.
  - `audioContext` is initialized as `null`, assigned only during `handleDecodeMetadata`, and closed in `finally` if it exists and is not already closed.
  - Cleanup is best-effort; a close failure is swallowed only after the route has already avoided playback node creation.

### Decoded output boundary

- Confirmed: decoded output is metadata-only.
  - The POC stores and displays only `durationSeconds`, `sampleRate`, `numberOfChannels`, and `frameCount` from the decoded `AudioBuffer`.
- Confirmed: there is no playback.
  - Source review found no `<audio>` element, no `AudioBufferSourceNode`, no `start()`, no transport/play controls for decoded files, and copy explicitly says no playback.
- Confirmed: decoded audio is not connected to destination.
  - Source review found no `.connect(audioContext.destination)`, `.destination`, or Web Audio destination connection in the research route files.
- Confirmed: there are no playback nodes in the research route.
  - Source review found no `createBufferSource`, `createMediaElementSource`, oscillator, gain, analyser, or source node creation for decoded audio.
- Confirmed: there is no object URL.
  - Source review found no `URL.createObjectURL` or `revokeObjectURL` in the research route files.
- Confirmed: there is no waveform rendering or sample visualization.
  - Source review found no canvas/SVG waveform rendering, no sample iteration, no `getChannelData`, and no analyser visualization in the research route files.
- Confirmed: there is no pitch tracking.
  - Source review found no pitch-estimator imports, Pitchy integration, frequency estimation, note estimation, or microphone/recording pipeline in the research route files.
- Confirmed: there is no `TargetPitchCurve` generation.
  - Source review found no target curve generation, target segment conversion, melody guide conversion, or Practice Mode target data mutation in the research route files.

### Isolation from existing product flows

- Confirmed: `app/practice/page.tsx` is unchanged by this P11b docs-only PR.
- Confirmed: `/api/recognize` is unchanged by this P11b docs-only PR.
- Confirmed: the route remains isolated and unlinked.
  - Source review found no link to `/research/local-audio-decode` from `app/page.tsx` or `app/practice/page.tsx`.
- Confirmed: no upload, cloud, AI, accounts, storage, server processing, or persistence was added.
  - The POC uses only browser-local file selection state and browser-local decode metadata extraction.
  - Source review found no `fetch`, upload form action, storage API, account/auth integration, database call, server route, or persistence API added for the POC.
- Confirmed: no real audio files or `metadata.local.json` were added.
- Confirmed: `package-lock.json` was not changed by this P11b docs-only PR.
- Confirmed: no dependency or script change was made for P11b.

## Manual QA notes

Manual browser QA was not performed in Codex for P11b. This PR is source-review-only documentation, and the container session did not perform interactive browser file-picker testing with a real local WAV file.

Manual QA status for the requested checks:

- Opening `/research/local-audio-decode`: not performed in browser for P11b.
- Selecting a small valid WAV: not performed in browser for P11b.
- Confirming no automatic decode after selection: not performed in browser; confirmed by source review only.
- Clicking **Decode metadata**: not performed in browser for P11b.
- Confirming metadata appears: not performed in browser; confirmed by source review only for the render path.
- Confirming no playback: not performed in browser; confirmed by source review only.
- Selecting a non-WAV and confirming decode is unavailable: not performed in browser; confirmed by source review only.
- Clear/reset clears decoded metadata: not performed in browser; confirmed by source review only.
- Boundary copy remains visible: not performed in browser; confirmed by source review only in the route and shell source.

## Boundary confirmation

P11b confirms by source review that P11a remains an isolated browser decode metadata POC only. It does not add or approve:

- Playback.
- Audio destination connections.
- Playback nodes.
- Object URLs.
- Waveform rendering or sample visualization.
- Pitch tracking.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- `/api/recognize` integration.
- Upload, cloud, AI, account, storage, server-processing, or persistence behavior.
- Real audio fixtures.
- `metadata.local.json`.
- Dependency or lockfile changes.
- APK-ready claims.

## Testing

Validation commands requested for this P11b PR:

```bash
npm run validate:local
git diff --check
npx tsc --noEmit --pretty false
```

## Recommended next step

Run an explicit manual browser QA pass outside Codex with a small known-good local WAV and a non-WAV file, then record the results in a follow-up QA note before any further expansion beyond metadata-only decoding.
