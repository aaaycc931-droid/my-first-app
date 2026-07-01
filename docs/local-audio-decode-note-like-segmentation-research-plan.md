# P14a Note-like Segment Research Decision, Acceptance Criteria, and Implementation Plan

## Summary

P14a is a docs-only planning step for a future isolated note-like segmentation proof of concept on `/research/local-audio-decode`.

The future P14b runtime POC may group guarded and smoothed decoded WAV diagnostic pitch frames into conservative **note-like segments**. These segments are only research diagnostics. Current voiced pitch frames are not formal notes, and P14 must not be described as formal melody recognition, formal note recognition, scoring, or Practice Mode readiness.

## Source decision

Use the smallest isolated pure-helper approach for P14b: transform the existing guarded + smoothed diagnostic pitch-frame sequence into note-like segment diagnostics without importing Practice Mode state, target comparison logic, score logic, rhythm assessment, or any external dependency.

The helper should operate on in-memory frame objects only. It should not decode audio, read files, create audio fixtures, generate `TargetPitchCurve` data, mutate route state directly, or depend on browser APIs. The `/research/local-audio-decode` route may later call this helper after pitch extraction has already produced diagnostic frames, but P14a itself makes no runtime changes.

This decision intentionally favors conservative segmentation and explicit diagnostic naming over aggressive musical interpretation. If a boundary is ambiguous, P14b should split or mark low confidence rather than merge frames into a stronger note claim.

## Input definition

P14b input should be the already-produced diagnostic frame sequence from decoded local WAV pitch extraction on `/research/local-audio-decode`:

- guarded diagnostic pitch frames after the frequency validity guard;
- smoothed diagnostic pitch frames after null-preserving median smoothing, when available;
- a valid / null voiced-unvoiced sequence where valid frames represent reliable diagnostic voiced frequency estimates and null frames represent unvoiced, invalid, low-clarity, or unavailable pitch frames;
- per-frame timing metadata if already available, such as frame start time, frame end time, frame midpoint time, hop duration, or frame duration;
- per-frame diagnostic fields if already available, such as raw frequency, smoothed frequency, clarity, validity reason, or confidence-like diagnostic markers.

P14b should not require real audio files, browser `AudioBuffer` objects, recording input, uploaded files, network calls, or Practice Mode data.

## Output definition

P14b output should be an array of note-like segment objects. The exact TypeScript type can be finalized during implementation, but the POC data shape should include:

```ts
export type NoteLikeSegment = {
  id: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  representativeFrequencyHz: number | null;
  nearestNote?: {
    name: string;
    midi: number;
    centsOffset: number;
  } | null;
  frameCount: number;
  validFrameCount: number;
  bridgedNullFrameCount: number;
  startFrameIndex: number;
  endFrameIndexInclusive: number;
  confidence?: "diagnostic-low" | "diagnostic-medium" | "diagnostic-high";
  diagnostics?: {
    frequencyMinHz?: number | null;
    frequencyMedianHz?: number | null;
    frequencyMaxHz?: number | null;
    frequencyRangeCents?: number | null;
    splitReason?: string | null;
    lowConfidenceReasons?: string[];
  };
};
```

Required segment fields for the POC are:

- start time;
- end time;
- duration;
- representative frequency;
- optional nearest note;
- frame count;
- diagnostic confidence or diagnostic fields when already available.

The output must be labeled **note-like segment diagnostics**, not recognized notes, not melody, not rhythm, not target curves, and not Practice Mode attempts.

## Conservative merge and split rules

P14b should use conservative deterministic rules that are easy to test with synthetic in-memory frame arrays.

### Voiced continuity

- Consecutive valid voiced frames may form a candidate note-like segment.
- Representative frequency should be derived from valid frames only, preferably using median smoothed frequency for robustness.
- Null / invalid / unvoiced frames must not create voiced content.

### Short null gap bridging

- Bridging should be allowed only for a very short null gap inside otherwise stable voiced material.
- Recommended initial limit: bridge at most 1 null frame, or at most a tiny duration threshold derived from existing frame timing if frame duration is explicit.
- Bridged null frames must be counted in diagnostics.
- Bridging must not cross long silence, multiple consecutive null frames, unsupported frames, or route/file boundaries.
- If in doubt, split rather than bridge.

### Pitch jump split

- A clear pitch jump should split a segment.
- Recommended initial split threshold: a jump greater than roughly 80 cents between neighboring valid smoothed frequencies, or a similarly conservative threshold chosen during implementation and documented in code comments/tests.
- The threshold is a research diagnostic heuristic, not a music-theory rule and not a formal note boundary detector.
- Pitch jumps around a bridged null gap should be evaluated using the nearest valid frequency before and after the gap.

### Short voiced islands

- Very short voiced islands should not be treated as confident note-like segments.
- Recommended initial behavior: discard candidate islands with fewer than 2 valid frames, or include them only when marked `diagnostic-low` with a `too-few-valid-frames` reason.
- P14b should choose one behavior and cover it with synthetic tests.
- The POC must not convert short islands into formal note detections.

## P14b minimum acceptance criteria

P14b should be accepted only if all of the following remain true:

- Implements a pure helper for note-like segmentation.
- Uses synthetic in-memory tests only.
- Adds no real audio fixtures.
- Adds no committed WAV / MP3 / recording files.
- Adds no dependency.
- Makes no package file changes.
- Makes no `/practice` changes.
- Does not modify Practice Mode attempt history, target comparison, feedback, scoring, recording, or playback behavior.
- Does not change `/api/recognize`.
- Does not add upload, cloud, AI, account, persistence, or server processing.
- Does not generate `TargetPitchCurve` data.
- Does not claim APK / WebView readiness.
- Labels output as note-like segment diagnostics only.

## Implementation plan for P14b

1. Add a small pure helper in a research-scoped location that accepts an array of diagnostic frame objects and segmentation options.
2. Define minimal input and output types near the helper or in an existing research utility module.
3. Implement candidate building from consecutive valid frames.
4. Add conservative 1-frame null-gap bridging only when both sides are valid and pitch-stable.
5. Add pitch-jump splitting using a documented cents threshold.
6. Add short-island handling by either dropping too-short candidates or marking them `diagnostic-low`.
7. Compute segment start/end/duration from frame timing fields.
8. Compute representative frequency from valid frames only.
9. Optionally compute nearest note with existing pure frequency-to-note logic if it is already dependency-free and UI-independent.
10. Add synthetic in-memory tests covering stable voiced frames, null splitting, allowed short-gap bridging, disallowed long-gap bridging, pitch-jump splitting, and short voiced islands.
11. Keep route UI integration deferred unless explicitly approved in a later PR; if included later, route copy must say note-like diagnostics only.

## Explicit non-goals

P14 is not:

- formal note recognition;
- melody recognition;
- rhythm assessment;
- `TargetPitchCurve` generation;
- Practice Mode integration;
- scoring, grading, pass/fail, correctness, or assessment;
- audio upload;
- cloud processing;
- AI processing;
- APK-ready or WebView-ready release work;
- source separation;
- vocal separation;
- product audio import;
- proof of real singing accuracy.

## Review checklist for P14b

Before P14b is merged, reviewers should confirm:

- The implementation is a pure helper with deterministic synthetic tests.
- No package files or lockfiles changed.
- No real audio fixtures were added.
- `/practice` is unchanged.
- `/api/recognize` is unchanged.
- Output names and UI/doc copy use `note-like segment` language, not formal notes or melody recognition.
- Null frames are preserved as unvoiced/invalid gaps and do not create voiced content.
- Short gap bridging is conservative and diagnostically counted.
- Pitch jumps split segments.
- Short voiced islands are discarded or clearly marked low confidence.
- No `TargetPitchCurve`, scoring, upload, cloud, AI, or APK-ready claim was introduced.
