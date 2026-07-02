# P16a Practice Integration Source Decision + Acceptance Criteria + Implementation Plan

## Scope

P16a is a docs-only planning step for a future safe Practice Mode integration path for the P15 research target pitch curve diagnostic output.

P16a does not write runtime code, does not modify `/practice`, does not connect real audio import, does not replace the existing mock melody practice flow, does not add scoring, and does not create formal `TargetPitchCurve` generation.

## 1. Source Decision

### Decision

Choose **Option A — read-only research target curve diagnostic preview in `/practice`, without replacing existing practice targets**.

### Rationale

1. P15 output is still a research-only diagnostic structure, not a formal `TargetPitchCurve`.
2. The existing `/practice` mock melody target flow must not be broken.
3. The first Practice Mode-facing step should only be a read-only preview; it should not replace the current target, history, attempt loop, or scoring.
4. `/practice` can first display a clearly labeled research-only imported target preview.
5. This validates UI and data-shape compatibility while avoiding the misleading impression that the diagnostic output is a formal practice target.
6. No upload, cloud, AI, or API behavior is needed.
7. No new dependencies are needed.
8. No package file changes are needed.

## 2. P16 Allowed Direction

A future P16b may consider adding a **research-only imported target curve preview section** to `/practice`.

That section may:

- Display a read-only summary of research target curve diagnostic data.
- Validate whether `/practice` UI can safely carry the diagnostic data shape.
- Use clear boundary copy that avoids any formal Practice Mode claim.

That section must not:

- Replace mock melody targets.
- Affect `currentMelodyStepIndex`.
- Write to attempt history.
- Participate in pitch comparison.
- Participate in scoring.
- Change target note playback.
- Change the existing practice flow.

The section must clearly display all of the following labels or equivalent copy:

- Research-only.
- Imported target curve diagnostic preview.
- Not formal Practice Mode target.
- Not scoring.
- Not assessment.

## 3. P16 Disallowed Direction

The following directions are explicitly deferred and not allowed in P16:

- Direct replacement of Practice Mode target notes.
- Formal Practice Mode audio import.
- Automatic handoff from `/research` to `/practice`, unless later separately planned.
- Scoring, grade, pass, or fail behavior.
- User pitch curve alignment.
- Rhythm assessment.
- Sight-singing assessment.
- Melody recognition.
- Note recognition claims.
- Production Song Learning Mode.
- Account, persistence, or database work.
- Upload, cloud, or AI API behavior.
- APK/WebView-ready claims.

## 4. Input Definition

Future P16b input may only come from a P15 `ResearchTargetPitchCurveDiagnostic`-like data shape.

This input is not:

- A formal `TargetPitchCurve`.
- Reliable melody extraction from arbitrary audio.
- A recognized-note result.
- A scoring target.

This input is only:

- A research diagnostic preview input.
- A conservative target-curve-like diagnostic shape derived from research note-like segment diagnostics.

Suggested minimal data shape:

```ts
type PracticeResearchTargetCurveDiagnosticPreviewInput = {
  curveId: string;
  source: string;
  summary: {
    segmentCount: number;
    totalDurationSeconds: number;
    lowConfidenceSegmentCount: number;
  };
  segments: Array<{
    segmentIndex: number;
    startTimeSeconds: number;
    endTimeSeconds: number;
    durationSeconds: number;
    targetFrequencyHz: number;
    targetNoteLabel?: string;
    diagnosticConfidence: "high" | "medium" | "low";
    sourceFrameCount: number;
    bridgedNullFrameCount: number;
  }>;
};
```

## 5. UI Acceptance Criteria for Future P16b

If future P16b modifies `/practice`, it must satisfy all of the following criteria:

1. Only add a read-only research preview.
2. Do not change the existing mock melody practice flow.
3. Do not change `currentMelodyStepIndex` behavior.
4. Do not change previous, next, or restart melody behavior.
5. Do not change target note playback.
6. Do not change local attempt history.
7. Do not change pitch estimation behavior.
8. Do not change target-aware comparison behavior.
9. Do not add score, grade, pass, or fail behavior.
10. Do not display research target curve diagnostic segments as formal practice notes.
11. Do not display `targetNoteLabel` as a recognized note.
12. Preserve low-confidence display for low-confidence segments.
13. Keep empty state conservative.
14. Make UI copy explicitly research-only.
15. `/practice` smoke check must pass.
16. `/research/local-audio-decode` smoke check must pass.
17. Do not add dependencies.
18. Do not modify `package.json` or `package-lock.json`.
19. Do not commit audio fixtures.
20. Do not commit `metadata.local.json`.
21. Do not claim APK/WebView readiness.

## 6. Possible P16b Implementation Shape

Recommended future P16b shape: minimal UI integration only.

A future P16b may:

- Add a static read-only research preview section to `/practice`.
- Use a hand-authored research target curve diagnostic example fixture.
- Keep that example fixture synthetic, fake, and non-audio-derived.

A future P16b must not:

- Automatically write real WAV-derived output into `/practice`.
- Add cross-route persistence.
- Add `sessionStorage` or `localStorage`, unless separately planned later.
- Add upload behavior.
- Add an API.
- Add a database.
- Add account storage.

Recommended reason: this validates whether `/practice` can safely present a research target curve diagnostic preview without creating the false impression that arbitrary audio can already be imported as a formal practice target.

## 7. Manual QA Expectation for Future P16b

Future P16b must be manually checked for all of the following:

- `/practice` loads.
- Existing practice controls still work.
- Existing mock melody step display still works.
- New research preview section appears.
- Preview section is read-only.
- Preview section does not affect the current target.
- Preview section does not affect attempt history.
- No score, grade, pass, or fail wording appears in the preview.
- `/research/local-audio-decode` still loads.
- Network panel shows no upload, cloud, or AI request.

## 8. Non-goals

P16a and the recommended P16b path explicitly do not include:

- Formal Practice Mode audio import.
- Formal `TargetPitchCurve` integration.
- Formal scoring.
- User pitch alignment.
- Rhythm assessment.
- Sight-singing assessment.
- Song Learning Mode.
- Melody recognition.
- Note recognition claims.
- Upload, cloud, or AI behavior.
- Account, persistence, or database work.
- APK-ready claims.

## 9. P16b Implementation Note

P16b adds the first runtime step from this plan: a read-only research target curve diagnostic preview section on `/practice`.

The preview uses a synthetic, fake, hand-authored, non-audio-derived example fixture. It is not sourced from a WAV file, user recording, `metadata.local.json`, storage, upload, API, database, or account data. The fixture exists only to verify that the Practice page can safely render a P15-like diagnostic data shape without changing the existing practice target loop.

P16b intentionally does not replace the existing mock melody targets, does not change `currentMelodyStepIndex`, does not change previous / next / restart behavior, does not change target note playback, does not write research segments into local attempt history, does not participate in pitch comparison, and does not add formal target replacement, scoring, assessment, melody recognition, note recognition, rhythm assessment, sight-singing assessment, or Song Learning Mode behavior.
