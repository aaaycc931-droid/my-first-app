# Public demo checklist

Use this checklist when showing the current production-safe MVP page in public. The goal is to demonstrate the upload, display, and playback flow clearly without presenting the mock demo as real OMR or production Audiveris functionality.

## Demo scope

The public demo is a mock recognition flow. It uses the current production-safe MVP path to validate the user experience around uploading an image, receiving mock notes, viewing the result, adjusting playback speed, and listening to playback.

## What to open

Open one of the following:

- The production/Vercel deployment.
- A local development page at `http://localhost:3000`.

## What to upload

Upload a `JPG` or `PNG` image only.

The public upload limit is 10MB.

## What to click

Click the `开始识别` button to start the mock recognition flow.

## What to show

Show the production-safe MVP interactions:

- Mock notes returned by the recognition flow.
- BPM control for changing playback speed.
- Playback of the displayed notes.
- `停止播放` for stopping playback without refreshing the page.

## What to say

Say that this is an MVP used to validate the upload, display, and playback chain.

It is safe to explain that the current public flow is intended to prove the product interaction before connecting real recognition.

## What not to say

Do not describe the public demo as real OMR.

Do not describe the public demo as production Audiveris.

Do not imply that production/Vercel currently performs real sheet music recognition.

## Audiveris boundary

Audiveris is local dev-only in this repository. It is controlled by explicit environment flags and is not part of the public production flow.

Do not present local Audiveris validation as a production feature.

## PDF boundary

The public `/api/recognize` route currently does not process PDF uploads.

For public demos, use `JPG` or `PNG` input only.

## Safety checklist

Before and after a demo-related change, confirm that the repository does not include real sheet music or generated recognition artifacts:

- Do not commit real score samples.
- Do not commit generated PDF, MXL, XML, OMR, log, image, or sample score files.
- Keep local Audiveris inputs, outputs, binaries, and generated files outside the repository.

## Troubleshooting

If the local page looks old, download the latest ZIP again or clear the local `.next` cache, then rebuild or restart the local development server.
