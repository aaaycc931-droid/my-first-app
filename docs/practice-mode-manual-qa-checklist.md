# Practice Mode manual QA checklist

## 1. Purpose

This document is a manual QA checklist for the current `/practice` browser local-only prototype.

It is intended to help a developer or reviewer walk through the local Practice Mode experience in a browser and confirm that the visible prototype behavior still matches the expected MVP-safe boundaries.

This checklist is:

* not an automated test
* not a formal scoring acceptance test
* not a replacement for future pitch, rhythm, or learning-assessment validation

## 2. Current Practice Mode scope

The current Practice Mode prototype includes:

* mock melody exercise
* Web Audio target playback
* local recording in the browser
* local audio quality analysis
* experimental local pitch estimate
* experimental target-aware pitch comparison
* mock feedback placeholders

## 3. Boundary reminders

Keep these boundaries visible during manual QA:

* Audio is not uploaded.
* No AI API call is made.
* No rhythm evaluation is implemented.
* The pitch estimate and target comparison are not a formal pitch score.
* `/api/recognize` is not used by Practice Mode recording.
* Audiveris is not involved.
* No PDF, MXL, XML, OMR, log, or image fixtures are required.

## 4. Manual QA setup

1. Start the app locally.
2. Open `/practice` in a browser.
3. Use a browser with microphone permission support.
4. Use a short voice or sung-note recording for the recording checks.
5. If microphone permission is denied, confirm the page handles the denial gracefully with a friendly error instead of crashing.

## 5. Target playback checklist

* Page loads.
* Listen to target starts Web Audio playback.
* Active target note indicator changes during playback.
* Stop playback stops playback.
* Repeated Listen / Stop does not leave stuck audio.
* No remote audio dependency is required.

## 6. Local recording checklist

* Start local recording requests microphone permission.
* Stop recording creates a local recorded attempt.
* Play recorded attempt plays local Blob URL audio.
* Clear recording removes the local recording and analysis/pitch state.
* Starting a new recording clears old results.
* Denying microphone permission shows a friendly error.
* Audio is not uploaded.

## 7. Local audio quality analysis checklist

* Analyze local recording is disabled before a recording exists.
* After recording, Analyze local recording runs locally.
* Duration seconds appears.
* Peak level appears.
* RMS level appears.
* Simple level hint appears.
* Too quiet / clipped hints are possible.
* Clear recording removes the audio analysis result.
* Starting a new recording removes the old audio analysis result.

## 8. Experimental pitch estimate checklist

* Estimate pitch locally is disabled before a recording exists.
* After recording, Estimate pitch locally runs locally.
* Estimated frequency appears.
* Nearest note appears.
* Cents offset appears.
* Confidence appears.
* Frames analyzed / valid pitch frames appear.
* Too short / too quiet / no dominant pitch cases show a friendly hint.
* Clear recording removes the pitch estimate.
* Starting a new recording removes the old pitch estimate.
* This is not formal scoring.

## 9. Experimental target-aware pitch comparison checklist

* Target note selector is visible.
* Target options come from mock target notes, for example C4, D4, E4, and G4.
* Target frequency updates when the selected target note changes.
* Before pitch estimate, the comparison area explains that a pitch estimate is needed.
* After pitch estimate, cents from target appears.
* Comparison hint appears, such as:
  * Close to target
  * A little sharp
  * A little flat
  * Far from target
* Changing the selected target note recalculates comparison from the existing `pitchEstimateResult`.
* This compares one selected target note only.
* This is not full melody alignment.
* This is not rhythm evaluation.

## 10. Async cleanup / stale result checklist

* Starting recording while local analysis is running should not show a stale old result afterward.
* Clearing recording while local analysis is running should not show a stale old result afterward.
* Starting recording while pitch estimate is running should not show a stale old result afterward.
* Clearing recording while pitch estimate is running should not show a stale old result afterward.
* Navigating away should not leave obvious stuck audio or stale recording state.

## 11. Mock feedback checklist

* Start mock attempt changes flow state.
* Show mock feedback displays mock pitch/rhythm/AI-style feedback.
* Copy clearly says feedback is mock-only, not real rhythm evaluation, and not an AI API call.
* Retry resets the expected mock flow state.

## 12. Regression boundaries

* Public `/api/recognize` still only supports the image upload mock flow.
* Practice Mode recording does not touch `/api/recognize`.
* Audiveris dev-only route remains separate.
* The default provider remains `mock`.
* The provider union remains `"mock" | "ai" | "musicxml"`.

## 13. Known limitations

* Pitch estimate is experimental.
* Target comparison uses estimated dominant/local pitch against one selected target note.
* This is not a real singing score.
* This is not rhythm evaluation.
* This is not full melody alignment.
* There is no persistent practice history.
* There is no backend storage.
* There is no AI feedback generation.

## 14. Suggested next QA expansion

* Single-note target playback QA.
* Browser compatibility notes.
* Mobile microphone behavior.
* Future rhythm onset QA when implemented.
