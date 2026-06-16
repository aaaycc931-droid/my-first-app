# Dev-only Audiveris local quickstart

## Purpose

This guide helps developers reproduce the dev-only local Audiveris PDF test and playback preview flow:

PDF score -> Local Audiveris -> dev API -> notes -> web playback preview.

This workflow is strictly:

- dev-only.
- local-only.
- focused on Windows/local Audiveris usage.
- not production.
- not Vercel.
- not `/api/recognize`.
- not a default provider change.
- not an Audiveris provider.
- not permission to commit real score samples.

Do not commit PDF, MXL, XML, OMR, log, image, generated Audiveris output, or real score sample files to the repository.

## Prerequisites

You need the following on your local machine:

- Node/npm.
- A local Audiveris installation.
- A local PDF score file for manual testing.

Example local Windows paths:

- `D:\Audiveris.exe`
- `D:\omr-test\score.pdf`

These paths are examples only. Keep Audiveris binaries, local PDF scores, and any Audiveris-generated files outside the repo. Do not commit them.

## Start the dev server

From the repo root, start the Next.js dev server in PowerShell with the dev-only flags enabled:

```powershell
$env:NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED = "true"
$env:NEXT_PUBLIC_AUDIVERIS_DEV_FULL_NOTES_ENABLED = "true"
$env:AUDIVERIS_DEV_API_ENABLED = "true"
$env:AUDIVERIS_DEV_API_RETURN_FULL_NOTES = "true"
$env:AUDIVERIS_PATH = "D:\Audiveris.exe"
$env:AUDIVERIS_DEV_API_TIMEOUT_MS = "300000"
npm.cmd run dev
```

You must restart the dev server after changing `NEXT_PUBLIC_*` environment variables. Next.js reads those public environment variables when the dev server starts, so changing them in an already-running shell is not enough.

## Manual UI test

Do not run this as an automated browser test. This is a local manual developer check only.

1. Open the local Next.js dev server URL, usually `http://localhost:3000`.
2. Find the `DEV-ONLY · LOCAL AUDIVERIS · PDF ONLY` panel.
3. Select your local `score.pdf` file, for example `D:\omr-test\score.pdf`.
4. Click `手动调用 Local Audiveris PDF 测试`.
5. Expect the dev panel response summary to show:
   - `noteCount`
   - `source: audiveris`
   - `inputType: pdf`
   - `firstNotes`
6. If both full notes flags are enabled, expect to see `播放完整 Audiveris notes 预览`.

## Expected result for the current developer test score

The following is a developer-reported example, not a committed fixture and not a repository sample:

- `noteCount: 651`
- `source: audiveris`
- `inputType: pdf`
- `firstNotes` displays normally.
- Full notes preview can play.

The PDF used for that report is not in the repo and should not be committed.

## Troubleshooting

### Dev panel not visible

- Check `NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED`.
- Restart the dev server.

### Full notes button not visible

- Check `NEXT_PUBLIC_AUDIVERIS_DEV_FULL_NOTES_ENABLED`.
- Check `AUDIVERIS_DEV_API_RETURN_FULL_NOTES`.
- Restart the dev server.

### API returns 404

- Check `AUDIVERIS_DEV_API_ENABLED`.

### API returns AUDIVERIS_PATH error

- Check `AUDIVERIS_PATH`.
- Confirm it points to your local Audiveris executable, for example `D:\Audiveris.exe`.

### Playback is long

- Full notes playback may take a while.
- Refresh the page or close the tab to stop early.

### Local generated files

- Audiveris temp/generated files must not be committed.
- Keep generated PDF, MXL, XML, OMR, log, image, and real score sample files outside the repo.

## Validation commands

Run these checks before committing documentation updates:

```powershell
npm.cmd run validate:dev-omr-api-boundary
npm.cmd run validate:repository-hygiene
npm.cmd run validate:recognition-boundary
npm.cmd run validate:musicxml-import-ui
npm.cmd run validate:mxl-import
npm.cmd run validate:musicxml
npm.cmd run build
```

## Boundary checklist

Confirm these boundaries remain true:

- `/api/recognize` remains separate.
- The default provider remains `mock`.
- The provider union does not include `audiveris`.
- Full notes are not returned by default.
- Full notes require:
  - frontend flag.
  - server flag.
  - `includeNotes=full`.
- Full notes are capped at 2000 and may be truncated.
