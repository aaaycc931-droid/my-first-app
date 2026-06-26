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
* local in-session recent attempt history for successful pitch estimates
* fixed melody step practice flow driven by browser React state

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
* Too-short recording case shows friendly retry guidance:
  * what happened: recording ended before enough local audio was available
  * what to try next: try recording a longer sustained note
  * what to try next: hold one note for about 1 second or more
* Quiet / no-usable-pitch recording case shows friendly retry guidance:
  * what happened: no clear, steady usable pitch frames were found
  * what to try next: sing or play a louder, steadier single note
  * what to try next: move closer to the microphone
  * what to try next: avoid background noise
* Pitch estimate failure UI still explains this is an experimental local pitch estimate.
* Pitch estimate failure UI still says there is no formal score, no rhythm evaluation, no audio upload, and no AI API call.
* Clear recording removes the pitch estimate.
* Starting a new recording removes the old pitch estimate.
* This is not formal scoring.

## 9. Confidence display checklist

* Successful pitch estimate UI explains confidence as valid pitch frames / analyzed frames.
* Confidence is presented as an experimental local estimate signal.
* Confidence is not called a score, grade, pass/fail result, or proof of pitch accuracy.
* Confidence status labels use non-scoring language such as more, limited, or low usable pitch frames.
* Frames analyzed and valid pitch frames remain visible next to the confidence explanation.
* The UI still says there is no formal score, no rhythm evaluation, audio is not uploaded, and no AI API call is made.

## 10. Melody step practice flow checklist

* Current melody step progress is visible as Step 1 / N style copy.
* The current target note is derived from the fixed melody step list.
* Previous step is visible.
* Next step is visible.
* Restart melody is visible.
* Previous step clamps at the first melody step instead of wrapping.
* Next step clamps at the last melody step instead of wrapping.
* Restart melody returns to Step 1.
* Switching melody steps recalculates the current target note for comparison.
* Switching melody steps does not automatically play audio.
* Switching melody steps does not automatically start recording.
* Switching melody steps does not automatically estimate pitch.
* Melody step state is local React state only.
* No audio is uploaded.
* No AI API call is made.
* This is not formal scoring.
* This is not rhythm evaluation.

## 11. Experimental target-aware pitch comparison checklist

* Current melody step target note is visible.
* Melody step target notes come from the fixed mock melody steps, for example C4, D4, E4, and G4.
* Target frequency updates when the current melody step changes.
* Before pitch estimate, the comparison area explains that a pitch estimate is needed.
* After pitch estimate, cents from target appears.
* Comparison hint appears, such as:
  * Close to target
  * A little sharp
  * A little flat
  * Far from target
* Changing the current melody step recalculates comparison from the existing `pitchEstimateResult`.
* Previous step switches to the previous fixed melody step and clamps at Step 1.
* Next step switches to the next fixed melody step and clamps at the final step.
* Previous step, Next step, and Restart melody do not automatically play audio, start recording, estimate pitch, or add an attempt history entry.
* Selected target note playback button is visible.
* Selecting C4/D4/E4/G4 and clicking Play selected target note plays a short single target tone.
* Repeated selected target note playback does not leave stuck audio.
* Stop playback / cleanup still works after selected target note playback.
* Selected target note playback uses browser Web Audio only and no remote audio dependency.
* This compares one selected target note only.
* This is not full melody alignment.
* This is not rhythm evaluation.

## 12. Single-note practice loop checklist

* Single-note practice loop card is visible.
* It shows the selected target note and target frequency.
* It reflects recording ready / no recording state.
* It reflects pitch estimate ready / not estimated / needs a clearer local recording state.
* It reflects comparison ready / waiting state.
* It does not claim formal scoring.
* It keeps local-only / no upload / no AI / no rhythm boundaries visible.

## 13. Recent local attempt history checklist

* Recent local attempts section is visible on `/practice`.
* Empty state says to record an attempt to see recent local pitch feedback.
* A successful local pitch estimate adds one attempt summary to the local list.
* Repeated Estimate pitch locally clicks for the same recording do not append duplicate attempt history entries.
* Recording a new attempt and successfully estimating pitch adds a new attempt history entry.
* Attempt summary shows Step #, target note, estimated note, estimated frequency Hz, cents from target, confidence frame coverage, and a brief non-score feedback label such as close to target, a little sharp, a little flat, or far from target.
* The Step # and target note in each attempt summary are captured from the current melody step at estimate time and do not change if the user later navigates to another step.
* Too-short or no-usable-pitch estimate errors do not add successful attempt history entries.
* Consecutive successful local pitch estimates keep only the most recent 5 attempt summaries.
* Clicking an attempt's Practice this target again control switches back to that attempt's stored melody step instead of looking up the first matching target note.
* Practice this target again does not automatically start recording, does not automatically play the target note, does not automatically estimate pitch, and does not add a new attempt history entry.
* Practice this target again does not upload audio, does not save anything to a server or browser storage, and does not score, grade, or evaluate rhythm.
* Clear attempt history clears only the visible local attempt list.
* After Clear attempt history, estimating the current recording again can add one local attempt entry again.
* Clear attempt history does not upload audio, does not delete anything from a server, and does not persist anything.
* Copy clearly says attempts are local to this browser session.
* Copy clearly says audio is not uploaded.
* Copy clearly says this is not a score or grade.
* Copy clearly says rhythm is not evaluated.
* No localStorage, IndexedDB, or cookies are required for the history.

## 14. Async cleanup / stale result checklist

* Starting recording while local analysis is running should not show a stale old result afterward.
* Clearing recording while local analysis is running should not show a stale old result afterward.
* Starting recording while pitch estimate is running should not show a stale old result afterward.
* Clearing recording while pitch estimate is running should not show a stale old result afterward.
* Navigating away should not leave obvious stuck audio or stale recording state.

## 15. Mock feedback checklist

* Start mock attempt changes flow state.
* Show mock feedback displays mock pitch/rhythm/AI-style feedback.
* Copy clearly says feedback is mock-only, not real rhythm evaluation, and not an AI API call.
* Retry resets the expected mock flow state.

## 16. Regression boundaries

* Public `/api/recognize` still only supports the image upload mock flow.
* Practice Mode recording does not touch `/api/recognize`.
* Audiveris dev-only route remains separate.
* The default provider remains `mock`.
* The provider union remains `"mock" | "ai" | "musicxml"`.

## 17. Known limitations

* Pitch estimate is experimental.
* Target comparison uses estimated dominant/local pitch against the current melody step target note.
* This is not a real singing score.
* This is not rhythm evaluation.
* This is not full melody alignment.
* There is local in-session recent attempt history for successful pitch estimates only.
* Melody step practice is local React state only and clamps at the first/last step.
* There is no persistent practice history.
* There is no backend storage.
* There is no AI feedback generation.

## 17. Suggested next QA expansion

* Single-note target playback QA.
* Browser compatibility notes.
* Mobile microphone behavior.
* Future rhythm onset QA when implemented.

## 24. P6a UX copy and boundary polish checklist

* `/practice` visibly identifies the page as Browser Local Only Practice Mode.
* Copy explains that the current flow is melody step-by-step practice, not a formal assessment system.
* Copy explains that Step X / N is the current position in the fixed melody.
* Copy explains that Current target note comes from the current melody step.
* Copy explains that Previous step, Next step, and Restart melody only change the selected melody step.
* Copy explains that changing steps does not automatically play a target note, start recording, estimate pitch, or add an attempt history entry.
* Copy recommends the lightweight order: Play target, Record, then Estimate pitch locally.
* Copy explains that local pitch estimation is compared only with the current step target note.
* Copy states that the comparison is not a formal score, grade, pass, or fail.
* Copy states that rhythm and sight-singing assessment are not included.
* Recent local attempts copy states that attempts are temporary local browser-session state only.
* Recent local attempts copy states that attempts are not uploaded, not saved to a server, and not stored in browser storage.
* This checklist update does not require changing the pitch estimator algorithm, benchmark gates, tolerance, Practice Mode core workflow, melody step navigation behavior, attempt history data logic, `/api/recognize`, recognition provider union, PDF upload, Audiveris, persistence, audio upload, or AI API behavior.

## 25. P6b Practice Mode manual QA pass — 2026-06-26

### QA environment

* Branch: `p6b-practice-mode-manual-qa-pass`.
* Base available in this container: current local `work` history at commit `7fe3107` because no `origin` remote is configured in the container.
* Method completed in this environment: source-backed manual QA review of the current `/practice` implementation and copy after P6a.
* Browser runtime limitation: no Chromium, Chrome, Firefox, or Playwright browser runtime was available in this container, so interactive browser-only and microphone-only checks could not be truthfully completed here.
* Scope of this PR: documentation only. No Practice Mode implementation, pitch estimator, benchmark gate, tolerance, workflow, API, provider, PDF, Audiveris, persistence, upload, or AI behavior was changed.

### P6b checklist results

| Check | Result | Notes |
| --- | --- | --- |
| Page clearly displays Browser Local Only Practice Mode | Confirmed by source review | `/practice` renders the Browser Local Only Practice Mode label in the page header. |
| Copy explains no upload / no AI API / no persistence / no formal score | Confirmed by source review | Header and local recording copy state no upload, no persistence, no AI API call, and no formal score. |
| Copy avoids grade / pass / fail implications | Confirmed by source review | P6a copy explicitly says no grade/pass/fail, and comparison copy says it is not a formal score. Benchmark internals still use pass/fail terms outside the `/practice` user-facing page. |
| Melody step practice loop is visible | Confirmed by source review | The page renders a Melody step practice loop section with fixed melody-step guidance. |
| Step X / N is shown | Confirmed by source review | The current step indicator renders `Step {currentMelodyStepIndex + 1} / {melodySteps.length}`. |
| Current target note matches current step | Confirmed by source review | `selectedTargetNote` is derived from `currentMelodyStep.targetNote`. |
| Play target only plays target note and does not auto-record or auto-estimate | Confirmed by source review; browser audio not executed | The target playback handler only starts Web Audio playback for the selected target note. No recording or estimate handler is called from step playback. |
| Previous step clamps at first step | Confirmed by source review; browser click not executed | Step movement uses min/max clamping and the Previous step button is disabled on the first step. |
| Next step clamps at last step | Confirmed by source review; browser click not executed | Step movement uses min/max clamping and the Next step button is disabled on the last step. |
| Restart melody returns to Step 1 | Confirmed by source review; browser click not executed | Restart sets `currentMelodyStepIndex` to `0`. |
| Switching step does not auto-play / auto-record / auto-estimate | Confirmed by source review; browser click not executed | Step navigation only updates local melody-step state. |
| Record / Estimate remains local | Confirmed by source review; microphone not executed | Recording uses browser media APIs and estimate uses local recorded audio state. No upload path was identified in this QA pass. |
| Estimate compares only against current step target note | Confirmed by source review; microphone not executed | Estimate captures the current melody step at estimate time and computes comparison against that target note. |
| Recent local attempts show Step # / Target note / Estimated note | Confirmed by source review; browser attempt not created | Attempt cards render Step #, Target note, and Estimated note fields. |
| Practice this target again returns to stored step without auto-play, auto-record, or auto-estimate | Confirmed by source review; browser click not executed | The handler only sets `currentMelodyStepIndex` from the stored attempt step index. |
| Clear attempt history only clears local React state | Confirmed by source review; browser click not executed | The control calls `setAttemptHistory([])`. |
| Page copy avoids score / grade / pass / fail hints | Confirmed by source review | User-facing copy repeatedly says the flow is not a formal score, not a grade, and not pass/fail. |

### Items not completed in this environment

The following checks require an actual browser runtime and, for recording checks, microphone permission. They were not completed in this container and should be repeated by a human reviewer before treating this as a full browser QA sign-off:

* Audibly verifying Play target output.
* Confirming Play target does not trigger browser recording or local estimate through real browser interaction.
* Clicking Previous step, Next step, Restart melody, Practice this target again, and Clear attempt history in a real browser.
* Recording a real local attempt with microphone permission.
* Running Estimate pitch locally against a recorded attempt.
* Verifying Recent local attempts after a successful real browser estimate.
* Confirming denied microphone permission copy in a real browser.

### P6b result summary

No Practice Mode boundary regressions were found in the source-backed manual QA review. The QA pass is documented with the explicit limitation that browser and microphone interaction could not be completed in this environment.

### Issues found

* No product issues found from source-backed review.
* QA environment issue: this container did not provide a browser runtime for interactive `/practice` or microphone checks.

### Recommended next step

Repeat the unchecked browser and microphone items in a local desktop browser with microphone access, then append a short browser-confirmed addendum to this checklist if all interactions match the source-backed expectations.
