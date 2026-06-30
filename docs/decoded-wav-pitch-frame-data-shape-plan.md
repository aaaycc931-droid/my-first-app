# P12f decoded WAV pitch frame data shape plan

## 1. Purpose

This document plans a future research-only decoded WAV pitch frame diagnostic data shape for the isolated `/research/local-audio-decode` proof of concept.

P12f is documentation-only. It does not implement runtime code, route behavior changes, pitch extraction algorithm changes, Practice Mode integration, note segmentation, scoring, or `TargetPitchCurve` generation.

## 2. Current status

The current P12b decoded WAV pitch-frame extraction proof of concept remains intentionally narrow:

- `/research/local-audio-decode` is an isolated research route.
- File selection, browser decode metadata, and pitch-frame extraction are separate user actions.
- Pitch extraction output is research diagnostics, such as analyzed duration, frame count, voiced frame count, unvoiced frame count, and optional minimum / median / maximum frequency estimates.
- There is no Practice Mode integration.
- There is no `TargetPitchCurve` generation.
- There is no formal pitch recognition.
- There is no scoring.
- There is no APK-ready claim.

## 3. Why a data shape plan is needed

The decoded WAV pitch-frame extraction POC can already produce basic diagnostics, but future work must not jump directly from raw frame diagnostics to `TargetPitchCurve` generation or product claims.

A planned intermediate shape is needed to:

- Define frame-level diagnostic fields before any implementation expands the output.
- Distinguish voiced, unvoiced, low-confidence, and invalid frames.
- Preserve the research-only boundary around decoded WAV pitch-frame experiments.
- Avoid treating raw frame diagnostics as melody recognition.
- Avoid treating exploratory frequency estimates as formal pitch recognition or scoring.

## 4. Future top-level result shape

A future research-only result object could be shaped like this:

```ts
type DecodedWavPitchFrameResearchResult = {
  sourceType: "decoded-wav-pitch-frame-research";
  route: "/research/local-audio-decode";
  analyzedDurationSeconds: number;
  frameCount: number;
  voicedFrameCount: number;
  unvoicedFrameCount: number;
  frameHopMs: number;
  frequencySummary: DecodedWavPitchFrameFrequencySummary;
  frames: DecodedWavPitchFrameDiagnostic[];
  warnings: DecodedWavPitchFrameWarning[];
  createdForResearchOnly: true;
  shouldCreateFormalScore: false;
  shouldCreateTargetPitchCurve: false;
};
```

This is only a plan. P12f does not implement this object, does not change the current diagnostic output, and does not add runtime code.

## 5. Future frame shape

Each future diagnostic frame could contain:

```ts
type DecodedWavPitchFrameDiagnostic = {
  frameIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  estimatedFrequencyHz: number | null;
  confidence: number | null;
  frameState: "voiced" | "unvoiced" | "low-confidence" | "invalid";
};
```

Frame-level constraints:

- `estimatedFrequencyHz` can be empty when no reliable estimate exists.
- `unvoiced` and `low-confidence` frames should not be forced into notes.
- `invalid` frames should remain diagnostic warnings or exclusions, not musical events.
- `confidence` is a research diagnostic value and is not a formal score, grade, pass/fail result, rhythm result, or sight-singing assessment.

## 6. Future frequency summary shape

A future frequency summary could contain:

```ts
type DecodedWavPitchFrameFrequencySummary = {
  minFrequencyHz: number | null;
  medianFrequencyHz: number | null;
  maxFrequencyHz: number | null;
  voicedFrameMedianHz: number | null;
  voicedFrameRangeHz: {
    min: number | null;
    max: number | null;
  };
};
```

These values are diagnostic summaries only. They must not be used as a formal score, must not imply pitch recognition accuracy, and must not be described as melody recognition.

## 7. Future warnings / diagnostics

Future warning identifiers could include:

- `too-few-voiced-frames`
- `high-unvoiced-ratio`
- `unstable-frequency`
- `possible-noise`
- `possible-polyphonic-content`
- `unsupported-input-risk`
- `short-duration`
- `long-duration`

These warnings are research hints only. They are not formal judgments, correctness labels, scoring outcomes, Practice Mode feedback, or APK readiness checks.

## 8. Relationship to TargetPitchCurve

P12f does not generate a `TargetPitchCurve`.

Pitch frame diagnostics are not a `TargetPitchCurve`. Any future `TargetPitchCurve` generation from decoded audio must be handled by a separate source decision, separate acceptance criteria, separate implementation PR, and separate QA.

No Practice Mode target curve should be created from P12f.

## 9. Relationship to note segmentation

P12f does not perform note segmentation.

It does not generate a note sequence, does not identify a melody, and does not infer rhythm. Frame-level diagnostic data is not the same thing as notes.

## 10. Relationship to Practice Mode

P12f does not integrate with `/practice`.

It does not change:

- `currentMelodyStepIndex`
- Record / Estimate behavior
- attempt history
- static pitch trend preview behavior
- scoring, pass, or fail behavior
- Practice Mode UI
- Practice Mode runtime state

## 11. Privacy / local-only boundary

The future data shape remains bounded by the same local-only research expectations:

- User-selected local file only.
- No upload.
- No cloud processing.
- No AI API.
- No server storage.
- No account requirement.
- No public sharing.
- No real audio committed.
- No `metadata.local.json` committed.

## 12. Product claim boundary

This plan must not be described as any of the following:

- formal audio import
- formal pitch recognition
- melody recognition
- arbitrary song analysis
- source separation
- vocal separation
- accompaniment-to-melody inference
- `TargetPitchCurve` generation
- Practice Mode support
- scoring
- APK-ready support

## 13. Android APK / WebView caveat

Current browser research and data shape planning do not prove APK readiness. Future Android APK / WebView packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, and performance.

## 14. Future recommended sequence

Recommended future sequence:

1. P12g Pitch Frame Data Shape Source Review QA, docs-only.
2. P12h Pitch Frame Diagnostic Output Copy Plan, docs-only.
3. P12i optional tiny implementation only if separately approved.
4. Later separate source decision for note segmentation.
5. Much later separate source decision for `TargetPitchCurve` generation.

## 15. Non-goals

P12f does not do any of the following:

- runtime code
- route behavior changes
- pitch extraction algorithm changes
- automated tests
- `package.json` changes
- `app/research/local-audio-decode/page.tsx` changes
- `app/practice/page.tsx` changes
- file input changes
- automatic decoding
- automatic pitch extraction
- waveform rendering
- note segmentation
- `TargetPitchCurve` generation
- Practice Mode integration
- live chart rendering
- converter changes
- MusicXML parser changes
- MIDI import
- accompaniment playback
- source separation
- vocal separation
- Song Learning Mode implementation
- cloud upload
- cloud assessment
- GPT / AI API
- formal score
- rhythm evaluation
- sight-singing assessment
- estimator changes
- Pitchy Practice Mode integration
- comparison harness changes
- benchmark gate / tolerance changes
- `/api/recognize` changes
- recognition provider union changes
- PDF upload
- Audiveris
- dependency changes
- real audio commits
- `metadata.local.json` commits
- APK-ready claim
