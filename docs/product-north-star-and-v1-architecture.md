# Product North Star and V1 Architecture

## Purpose

This document expands the long-term product definition from the current Sheet Music Recognition MVP into a Sight-Singing & Ear-Training Learning Platform. It is a planning document only: it does not change runtime behavior, does not implement new features, and does not expand the current MVP boundary in this PR.

The current MVP must remain small, explainable, and safe. Future work should open one product or technical boundary at a time.

## Product North Star

The final product should be a Sight-Singing & Ear-Training Learning Platform that helps musicians learn from real notation, listen actively, sing accurately, and improve over time.

The core long-term goals are:

- Accurate sheet music recognition.
- Accurate pitch evaluation.
- Rhythm and sight-singing assessment.
- Adaptive ear-training curriculum.
- Enjoyable long-term learning experience.

The product should eventually feel less like a one-off recognition tool and more like a daily learning companion: users bring in music, practice with immediate feedback, understand their weak spots, and receive useful next-step exercises.

## Product Promise

The long-term product promise is:

1. A user can upload or choose a score.
2. The system can generate focused practice material from that score.
3. The user can listen, sing, record, evaluate, and retry.
4. The system can identify pitch, rhythm, reading, and listening problems.
5. The system can recommend the next exercise based on the user's current weaknesses.

This promise is aspirational. The current MVP does not yet provide formal scoring, production OMR, rhythm evaluation, server-side audio upload, or adaptive curriculum.

## Core User Loops

### Score-to-practice loop

1. User uploads, imports, or selects a score.
2. System extracts a safe practice representation.
3. System creates exercises such as single notes, intervals, short melodies, or rhythm fragments.
4. User starts practicing from generated material.

### Sight-singing loop

1. User sees a note, interval, or short melody.
2. User listens to a reference when appropriate.
3. User sings the target.
4. Local evaluation estimates pitch and, later, timing.
5. User receives clear feedback and retries.

### Ear-training loop

1. User hears a note, interval, scale, chord, rhythm, or short melody.
2. User identifies, sings back, or transcribes the target.
3. System evaluates the response.
4. System adjusts difficulty and review schedule.

### Progress loop

1. Each practice attempt creates a lightweight history entry.
2. The system summarizes strengths, weak areas, and recent activity.
3. The next practice session prioritizes appropriate review.
4. User sees enough progress to stay motivated.

## V1 Scope

V1 should remain focused and browser-local where possible. The intended V1 scope is:

- Browser-local single-note practice.
- Interval practice.
- Short melody sight-singing.
- MusicXML/MXL import based exercise generation.
- Local pitch evaluation.
- Simple progress and history.

V1 should avoid production OMR, formal scoring claims, server-side audio upload, and broad curriculum automation until the underlying evaluation and benchmark strategy is stronger.

## OMR Strategy

The OMR path should stay conservative because recognition accuracy is hard to claim without ground truth and repeatable benchmarks.

Short-term strategy:

- The public recognition flow remains mock.
- Dev-only Audiveris remains local-only.
- MusicXML/MXL import is the safer first path for generating exercises.
- Do not directly connect Audiveris to `/api/recognize`.
- Do not make `/api/recognize` accept PDF files.
- Do not change the default provider away from `mock`.
- Keep the recognition provider union constrained to `"mock" | "ai" | "musicxml"`.

Medium-term strategy:

- Design a worker-based OMR architecture before introducing production OMR.
- Keep heavy recognition work isolated from the public request path.
- Add explicit job status, timeouts, artifact handling, and failure states before user-facing OMR expansion.

Long-term strategy:

- High-accuracy OMR requires a correction UI, benchmark dataset, ground-truth MusicXML, and repeatable accuracy reporting.
- Product claims should be based on benchmark results, not isolated demo success.

## Pitch Evaluation Strategy

The project already has an experimental local pitch estimate direction. That work is useful for exploration, but it is not formal scoring.

The next stages should be:

1. Single-note stable pitch evaluation.
2. Confidence and no-pitch handling.
3. Interval evaluation.
4. Melody note segmentation.
5. Target alignment.
6. Rhythm onset detection.
7. Full sight-singing evaluation.

Pitch feedback should be introduced gradually. Early UI should communicate uncertainty, avoid overclaiming, and prefer actionable feedback over numeric authority.

## Learning System Strategy

The learning system should grow from simple exercises into an adaptive curriculum. Future exercise families include:

- Single notes.
- Intervals.
- Scales.
- Chords.
- Rhythm.
- Melody dictation.
- Sight singing.
- Adaptive review.
- Progress tracking.

The curriculum should stay explainable. A user should understand why a practice item appears, what skill it targets, and how it connects to recent mistakes.

## Data Model Direction

This section describes future data model direction only. It does not introduce schemas, migrations, storage, or runtime code in this PR.

Potential future concepts:

- `PracticeExercise`: a generated or selected practice item with targets, difficulty, source, and skill tags.
- `PracticeAttempt`: one user attempt, including timing, local evaluation summary, retry count, and completion state.
- `PitchEvaluationResult`: pitch estimate, confidence, target comparison, stability, and no-pitch state.
- `RhythmEvaluationResult`: future onset, duration, alignment, and timing feedback.
- `ScoreSource`: uploaded, imported, generated, sample, or library score metadata.
- `RecognizedScore`: normalized notation extracted from an OMR or import pipeline.
- `UserProgress`: aggregate history, streaks, completed exercises, and skill-level trends.
- `WeaknessProfile`: inferred weak areas such as unstable intonation, interval confusion, rhythm timing, or reading errors.

These concepts should be added only when a concrete MVP feature needs them.

## Accuracy Strategy

Accuracy claims require evidence before product language can rely on them.

- OMR accuracy needs ground-truth score data.
- Pitch accuracy needs controlled test recordings.
- Rhythm accuracy needs alignment benchmarks.
- Future PRs should add benchmark documentation before claiming accuracy improvements.
Future pitch evaluation benchmark plan: see `docs/pitch-evaluation-benchmark-plan.md`.

Accuracy work should separate product goals from validated measurements. A feature can be useful while still being experimental, but the UI and docs must label it honestly.

## Roadmap

1. Phase 1: local single-note practice.
2. Phase 2: interval and short melody practice.
3. Phase 3: MusicXML-generated exercises.
4. Phase 4: pitch and rhythm evaluation.
5. Phase 5: progress tracking and adaptive curriculum.
6. Phase 6: production OMR pipeline.
7. Phase 7: polished public beta.

Each phase should be delivered through small PRs that preserve the current public runtime boundary until the next boundary is intentionally opened.

## Non-goals for Current MVP

The current MVP explicitly does not include:

- Production Audiveris.
- PDF support on `/api/recognize`.
- Audio upload.
- AI API calls.
- Formal score claims.
- Recognition provider changes.
- Rhythm evaluation implementation.
- New dependencies for this planning step.

## PR Discipline

Every future PR should follow these rules:

- Open only one product or technical boundary at a time.
- Every Codex task must read `AGENTS.md` before making changes.
- Every PR must check provider, API, and repository hygiene.
- Before actual merge, check GitHub mergeability and Vercel status.
- Docs-only PRs must not change runtime behavior.
