# Practice learning system plan

## Product vision

The future product should not be only a sheet music recognizer. The long-term goal is to evolve the current Sheet Music Recognition MVP into a combined **Sheet Music Recognition + Practice Learning System**.

In that product direction, users should be able to start from recognized or imported music, generate focused practice tasks, complete sight-singing and ear-training exercises, and receive pitch and rhythm feedback. Recognition provides the musical source material; practice, assessment, and feedback turn that source material into a learning tool.

## Learning loop

The intended learning loop is:

1. Select or recognize music.
2. Generate a practice task.
3. Listen to the target.
4. Sing, clap, or play the target.
5. Record the attempt.
6. Evaluate pitch and rhythm.
7. Give feedback.
8. Repeat with adjusted difficulty.

## Music source inputs

Potential music source inputs include:

* Mock notes for MVP-safe UI and practice-flow validation.
* MusicXML/MXL import for structured notation input.
* Future AI-assisted recognition for opt-in recognition experiments.
* Future real OMR for production recognition when the architecture is ready.
* Future manual correction and editing so learners can fix recognition results before practicing.

## Practice modes

Potential practice modes include:

* Single note pitch practice.
* Interval practice.
* Short melody sight-singing.
* Rhythm clapping.
* Measure loop practice.
* Difficult passage practice.
* Call-and-response practice.

## Pitch evaluation concept

Pitch evaluation can start from a microphone recording and use pitch tracking to compare detected pitch with target notes. The evaluation should consider:

* Microphone recording as the input source.
* Pitch tracking over time.
* Comparing detected pitch with target notes.
* Cents deviation from the expected pitch.
* Pitch stability during each target note.
* Attack accuracy at the start of a note.
* Sustained note drift across longer notes.
* A final pitch score and learner-readable feedback.

## Rhythm evaluation concept

Rhythm evaluation can use microphone or tap input and compare detected events with the expected beat grid. The evaluation should consider:

* Microphone or tap input.
* Onset detection for performed events.
* Beat grid alignment against the target rhythm.
* Timing deviation for each expected event.
* Early or late feedback.
* Missing or extra events.
* A rhythm stability score.

## Integrated practice + assessment

Practice should not be a standalone feature, and assessment should not be a standalone feature. Each exercise should have a target, a recorded attempt, a score, feedback, and a recommended next step.

The system should support repeated practice and progress tracking over time. A learner should be able to retry the same target, compare attempts, and gradually receive adjusted tasks as performance improves.

## AI-assisted learning feedback

AI can support learning feedback after basic deterministic evaluation exists. Possible AI-assisted uses include:

* Explaining errors in learner-friendly language.
* Summarizing practice performance across an attempt or session.
* Recommending the next practice step.
* Converting recognition results into exercises that fit the learner's level.

AI should not replace the basic evaluation algorithms in the early product. Pitch and rhythm scoring should first come from clear, inspectable evaluation logic, with AI layered on top for explanation, summarization, and recommendations.

## Suggested data models

Initial planning data models include:

* `PracticeExercise`
* `PracticeSession`
* `PracticeAttempt`
* `TargetNote`
* `PitchEvaluationResult`
* `RhythmEvaluationResult`
* `LearningFeedback`

## UI concepts

Potential UI concepts include:

* Practice mode page.
* Target notes display.
* Playback controls.
* Metronome / BPM control.
* Record button.
* Pitch feedback display.
* Rhythm feedback display.
* Retry / next exercise actions.

## Recommended implementation order

A safe implementation order is:

1. Documentation and data contracts.
2. Practice mode UI skeleton using mock notes.
3. Target playback and exercise generation.
4. Browser audio recording prototype.
5. Pitch detection prototype.
6. Rhythm onset prototype.
7. Evaluation result UI.
8. AI feedback layer.
9. Integration with real recognition later.

## Boundary relaxation plan

The current recognition and repository restrictions are not permanent product limitations. They should be relaxed one boundary at a time through dedicated, reviewable changes.

Real recognition should be feature-flagged first. AI recognition should be opt-in first. `/api/recognize` production behavior should not be changed without a dedicated architecture PR.

## Non-goals for this PR

This PR does not:

* Implement recording.
* Implement pitch evaluation.
* Implement rhythm evaluation.
* Integrate AI.
* Integrate real OMR.
* Modify `/api/recognize`.
* Modify provider behavior.
* Commit sample files.

Practice Mode skeleton started: added a mock-only /practice page to validate the future recognition + practice + assessment flow without recording, scoring, AI, or real evaluation.
