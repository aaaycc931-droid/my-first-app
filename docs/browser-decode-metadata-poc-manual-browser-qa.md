# P11c Decode Metadata POC Manual Browser QA Record

## Summary

P11c records a user-performed manual browser QA pass for the P11a isolated browser `decodeAudioData` metadata-only proof of concept on `/research/local-audio-decode`.

This is a docs-only QA record. The QA was performed by the user outside Codex and reported as passing. Codex did not rerun an interactive browser file-picker session for this note.

## Related QA context

- P11a added the isolated browser `decodeAudioData` metadata-only proof of concept on `/research/local-audio-decode`.
- P11b added docs-only/source-review QA in `docs/browser-decode-metadata-poc-source-review-qa.md` and explicitly documented that manual browser QA was not performed in Codex.
- P11c records the follow-up user-performed manual browser QA result.

## Manual QA record

Result: Passed, based on the user-reported manual browser QA performed outside Codex.

The user reported the following checks as completed successfully:

- Opened `/research/local-audio-decode` successfully.
- Selected a small valid WAV file.
- Confirmed no decode happened immediately after file selection.
- Clicked **Decode metadata**.
- Confirmed decoded metadata appeared.
- Confirmed decoded metadata was limited to duration, sample rate, channel count, and frame count / length.
- Confirmed no audio playback occurred.
- Selected an obvious non-WAV file and confirmed decode was unavailable.
- Used clear/reset and confirmed selected file and decoded metadata were cleared.
- Confirmed boundary copy remained visible.

## Boundary confirmation

P11c does not expand the P11a proof of concept. The route remains an isolated research-only metadata decode POC.

P11c confirms this is not:

- A Practice Mode feature.
- A product audio import flow.
- APK-ready.

P11c does not add or approve:

- Playback.
- Waveform analysis.
- Sample visualization.
- Pitch tracking.
- `TargetPitchCurve` generation.
- `/practice` integration.
- `/api/recognize` integration.
- Upload behavior.
- Cloud processing.
- AI behavior.
- Accounts.
- Storage.
- Server processing.
- Persistence.
- Real audio fixtures.
- `metadata.local.json`.

## Implementation scope

This P11c update is docs-only. It does not modify runtime behavior, application routes, Practice Mode, `/api/recognize`, dependencies, lockfiles, fixtures, or local metadata files.

## Validation notes

Requested validation for this docs-only PR:

```bash
npm run validate:local
git diff --check
npx tsc --noEmit --pretty false
```

The following opt-in/local fixture checks are intentionally not part of this P11c docs-only validation unless explicitly run separately, because P11c does not add real audio fixtures, melody guide fixtures, WAV fixture headers, or local `metadata.local.json` data:

```bash
npm run validate:local-real-voice-fixtures
npm run validate:local-real-phone-comparison
npm run validate:local-melody-guide-fixtures
npm run validate:local-melody-guide-wav-headers
npm run test:local-melody-guide-validator
npm run test:local-melody-guide-wav-header-inspector
```

## Recommended next step

Keep `/research/local-audio-decode` isolated as a research-only metadata POC. Before any productization, create a separate plan and acceptance criteria for the next smallest step, with the no-playback, no-upload, no-Practice-Mode-integration, and no-`/api/recognize` boundaries reviewed explicitly.
