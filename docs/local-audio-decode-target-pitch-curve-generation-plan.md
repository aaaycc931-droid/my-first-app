# P15a Local Audio Decode Target Pitch Curve Generation Plan

## Scope

P15a is a docs-only planning step for a future conservative conversion from P14 note-like segment diagnostics into a normalized, target-like pitch curve diagnostic structure.

This plan is intentionally narrow. It does not implement runtime code, does not implement a converter, does not connect to `/practice`, does not connect to scoring, and does not claim formal music recognition.

## 1. Source Decision

### Selected option

**Option A — isolated converter from note-like segment diagnostics to research-only `TargetPitchCurve`-like diagnostic structure.**

The future P15b implementation should convert already-derived P14 `NoteLikeSegmentDiagnostic[]` values into a research-only target-curve-like diagnostic object. It should not read audio directly and should not present the output as a formal `TargetPitchCurve` for product scoring.

### Rationale

1. P14 output already includes start / end / duration values, representative frequency, nearest note label, frame count, and diagnostic confidence.
2. A future P15b can start as an isolated converter without connecting to UI or `/practice`.
3. The output can be research-only target-curve-like data, avoiding a premature claim that arbitrary audio has produced a formal `TargetPitchCurve`.
4. The converter can be tested with synthetic in-memory segment arrays.
5. The converter does not need real audio, new dependencies, or package file changes.

### Deferred work

- Direct Practice Mode integration.
- Formal `TargetPitchCurve` generation from arbitrary audio.
- MusicXML runtime converter changes.
- Note segmentation algorithm changes.
- Scoring.
- Rhythm assessment.
- Time alignment with a user pitch curve.
- Song Learning Mode.
- APK / WebView-ready claim.

## 2. Input Definition

A future P15b converter should accept only in-memory P14 `NoteLikeSegmentDiagnostic[]` input. It should not read WAV files, inspect `AudioBuffer`, call browser APIs, or depend on `/practice` state.

Candidate input fields include:

- `startTimeSeconds`
- `endTimeSeconds`
- `durationSeconds`
- `representativeFrequencyHz`
- `nearestNoteName` / nearest note label
- `voicedFrameCount`
- `bridgedNullFrameCount`
- `diagnosticConfidence`
- `minFrequencyHz`
- `medianFrequencyHz`
- `maxFrequencyHz`

## 3. Output Definition

A future P15b output should use a research-only name, such as:

```ts
ResearchTargetPitchCurveDiagnostic
```

The output should not be named as the formal production `TargetPitchCurve` unless the type or documentation clearly states that it is only a diagnostic / research approximation.

Recommended top-level fields:

- `curveId`
- `source: "local-audio-decode-note-like-segments"`
- `generatedAt` only if it does not create unstable tests; otherwise omit it.
- `segments`
- `summary`

Recommended segment fields:

- `segmentIndex`
- `startTimeSeconds`
- `endTimeSeconds`
- `durationSeconds`
- `targetFrequencyHz`
- `targetNoteLabel?`
- `diagnosticConfidence`
- `sourceFrameCount`
- `bridgedNullFrameCount`

Recommended summary fields:

- `segmentCount`
- `totalDurationSeconds`
- `lowConfidenceSegmentCount`

## 4. Conversion Rules

A future P15b converter should stay conservative:

1. Convert each note-like segment into exactly one target-curve-like segment.
2. Use `representativeFrequencyHz` as `targetFrequencyHz`.
3. Treat nearest note label only as an optional diagnostic label.
4. Preserve `diagnosticConfidence: "low"` segments as low-confidence diagnostics; do not package them as formal target notes.
5. Preserve very short or low-quality segments at first, but mark or keep them as low-confidence diagnostics when applicable. Do not silently promote them into formal notes.
6. Do not perform pitch interpolation.
7. Do not perform rhythm scoring.
8. Do not align against a user pitch curve.
9. Do not perform note correction.
10. Do not perform key detection.
11. Do not claim melody recognition.
12. Do not replace Practice Mode targets.

## 5. Acceptance Criteria for P15b

A future P15b runtime PR should meet these minimum acceptance criteria:

1. Add a deterministic pure converter helper.
2. Accept only in-memory `NoteLikeSegmentDiagnostic[]` input.
3. Output a research-only target-curve-like diagnostic structure.
4. Use synthetic in-memory tests.
5. Cover these test cases:
   - Empty input returns an empty curve diagnostic.
   - One segment converts to one curve segment.
   - Multiple segments preserve order.
   - A low-confidence segment remains low-confidence.
   - Nearest note label remains an optional diagnostic label.
   - Summary counts `segmentCount`, `lowConfidenceSegmentCount`, and `totalDurationSeconds`.
6. Do not read files.
7. Do not read `AudioBuffer`.
8. Do not call browser APIs.
9. Do not connect to the `/research/local-audio-decode` UI unless a future separate P15d / P15e explicitly scopes that work.
10. Do not connect to `/practice`.
11. Do not generate formal scoring.
12. Do not add dependencies.
13. Do not modify `package.json` or `package-lock.json`.
14. Do not commit real audio fixtures.
15. Do not commit `metadata.local.json`.
16. Do not claim APK / WebView readiness.

## 6. Non-goals

P15 explicitly does not include:

- Formal `TargetPitchCurve` generation from arbitrary audio.
- Practice Mode audio import.
- Practice Mode integration.
- Scoring, grade, pass, or fail behavior.
- Rhythm assessment.
- Sight-singing assessment.
- Melody recognition.
- Note recognition claim.
- Upload, cloud, or AI API behavior.
- Source separation.
- Vocal separation.
- APK-ready claim.

## 7. Implementation Plan for Future P15b

1. Add a small pure helper near the existing research local-audio-decode diagnostics code, without touching Practice Mode runtime files.
2. Define a research-only output type such as `ResearchTargetPitchCurveDiagnostic`.
3. Map each input diagnostic segment to one output diagnostic curve segment while preserving ordering and low-confidence state.
4. Compute only simple deterministic summary values from the in-memory input.
5. Add synthetic in-memory tests for the acceptance criteria above.
6. Keep UI integration deferred to a separately scoped future PR.
7. Keep all product claims research-only and diagnostic-only until separate validation proves a production use case.

## 8. P15b Implementation Note

P15b adds the first isolated runtime POC for this plan: `convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic` converts only in-memory `NoteLikeSegmentDiagnostic[]` values into a research-only `ResearchTargetPitchCurveDiagnostic` object.

The converter preserves input order, maps each input segment to exactly one research target-curve-like segment, uses `representativeFrequencyHz` as `targetFrequencyHz`, maps `nearestNoteName` only to optional diagnostic `targetNoteLabel`, preserves `diagnosticConfidence`, and computes only `segmentCount`, `lowConfidenceSegmentCount`, and summed `totalDurationSeconds`.

P15b remains isolated research-only. It does not read files, inspect `AudioBuffer`, call browser APIs, upload data, call cloud or AI APIs, integrate with `/research/local-audio-decode`, integrate with `/practice`, generate a formal `TargetPitchCurve`, perform formal note or melody recognition, interpolate pitch, correct notes, detect key, assess rhythm, score, add dependencies, change package files, commit audio fixtures, commit `metadata.local.json`, or claim APK / WebView readiness.

## 9. P15d Implementation Note

P15d wires the P15b research-only converter into the existing `/research/local-audio-decode` diagnostic UI after the explicit **Extract pitch frames** action. It reuses the P14 note-like segment diagnostics that the route already derives from guarded and smoothed diagnostic pitch frames, then displays the resulting `ResearchTargetPitchCurveDiagnostic` in a small diagnostics-only section.

The P15d UI remains research-only. It is not formal `TargetPitchCurve` generation, not Practice Mode integration, not Practice Mode audio import, not formal note recognition, not melody recognition, and not scoring. P15d does not alter file selection, decode metadata, Extract pitch frames gating, the pitch extraction algorithm, P13d / P13i / P13n guards, P14b segmentation semantics, or P15b converter semantics.
