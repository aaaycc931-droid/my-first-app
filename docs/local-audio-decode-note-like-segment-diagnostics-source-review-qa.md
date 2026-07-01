# P14c Note-like Segment Diagnostics Source Review QA

## Summary

P14c is a docs-only source review QA record for the P14b isolated note-like segment diagnostics runtime POC.

The review confirms that P14b remains a research-only, pure-helper, synthetic-test-only diagnostic utility. It does not convert decoded pitch frames into formal notes, recognized notes, melody recognition results, `TargetPitchCurve` data, Practice Mode behavior, or scoring output.

## Reviewed sources

- `lib/research/local-audio-decode/note-like-segment-diagnostics.ts`
- `scripts/test-local-audio-decode-note-like-segment-diagnostics.ts`
- `docs/local-audio-decode-note-like-segmentation-research-plan.md`
- `docs/mvp-status.md`

## Source review conclusion

PASS: P14b remains an isolated research diagnostic POC.

- `deriveNoteLikeSegmentDiagnostics` is a deterministic pure helper over an in-memory array.
- The helper accepts only `DiagnosticPitchFrame[]` objects and returns `NoteLikeSegmentDiagnostic[]` objects.
- The helper does not read files, decode audio, inspect `AudioBuffer`, call browser APIs, trigger network behavior, upload data, call AI APIs, use server storage, or depend on route / UI / Practice Mode state.
- The synthetic test script uses only in-memory frame arrays and does not introduce real audio fixtures or metadata files.
- The reviewed docs keep the output framed as note-like segment diagnostics, not formal recognition or scoring.

## Helper purity and input boundary

Confirmed:

1. `deriveNoteLikeSegmentDiagnostics` is deterministic for the same `DiagnosticPitchFrame[]` input.
2. The helper is a pure transformation: it computes segment diagnostics and returns them without side effects.
3. The helper only accepts in-memory `DiagnosticPitchFrame[]` data.
4. The accepted input shape remains:
   - `timeSeconds`
   - `frequencyHz: number | null`
   - optional `clarity`
5. The helper does not read files.
6. The helper does not read or require an `AudioBuffer`.
7. The helper does not call browser APIs.
8. The helper does not trigger network, upload, cloud, or AI API behavior.
9. Null, invalid, unvoiced, non-finite, non-positive, or otherwise unusable frames cannot create voiced pitch.

## Output naming and product boundary

Confirmed:

1. The output type remains named `NoteLikeSegmentDiagnostic`.
2. The output is documented as note-like segment diagnostics.
3. The reviewed source and status language must not treat the output as formal `notes`.
4. The output is not a recognized-notes list.
5. The output is not melody recognition.
6. The output is not `TargetPitchCurve` generation.
7. The output is not a scoring result, grade, pass, fail, correctness judgment, or Practice Mode assessment.
8. `nearestNoteName` is only an optional diagnostic nearest-note label.
9. `nearestNoteName` is not a formal recognized note result.
10. `splitReason` is only a diagnostic / debug field.
11. `splitReason` is not a formal scoring explanation.
12. Short voiced islands may only be discarded or marked with low diagnostic confidence; they must not be packaged as formal notes.

## Segmentation behavior reviewed

Confirmed:

1. Continuous valid voiced frames can form one note-like segment diagnostic.
2. At most one null / invalid / unusable frame may be bridged.
3. Two or more consecutive unusable frames must split segments.
4. The bridge-null behavior only connects existing valid voiced material on both sides; it cannot independently form a segment.
5. The pitch-jump split threshold is the 120-cent research diagnostic threshold.
6. The 120-cent threshold is not a formal music recognition, note-boundary, melody-recognition, or scoring standard.
7. `representativeFrequencyHz` uses the median of valid voiced frequencies.
8. `minFrequencyHz`, `medianFrequencyHz`, and `maxFrequencyHz` use valid voiced frequencies only.
9. Invalid / null / unvoiced frames do not enter representative, min, median, or max frequency summaries.
10. Null-only input returns no segment diagnostics.

## Synthetic test coverage reviewed

Confirmed that the synthetic in-memory test script covers:

- clean continuous voiced frames;
- a 1-frame null bridge;
- a 2-frame null split;
- pitch-jump splitting;
- short voiced island low confidence;
- null-only input returning empty diagnostics;
- invalid / null frames excluded from representative frequency;
- valid-frequency-only min / median / max summaries;
- no segment creation from null / invalid / unvoiced frames.

The tests remain synthetic and in-memory only. They do not use WAV files, MP3 files, phone recordings, browser audio decoding, route UI interaction, Practice Mode state, target curves, scoring data, server calls, or external fixtures.

## Negative scope confirmation

P14c confirms P14b did not introduce and P14c does not introduce:

- real audio fixtures;
- committed WAV / MP3 / recording files;
- `metadata.local.json`;
- `package.json` changes;
- `package-lock.json` changes;
- dependency changes;
- `/practice` changes;
- `/api/recognize` changes;
- recognition-provider changes;
- `LocalAudioDecodeFileInputShell` UI route integration;
- homepage navigation changes;
- `TargetPitchCurve` generation;
- Practice Mode pitch-engine integration;
- scoring, grade, pass, fail, correctness, or assessment behavior;
- upload, cloud, account, persistence, or AI API behavior;
- APK-ready or WebView-ready claims.

## Skipped real-audio validations

`validate:local-real-voice-fixtures` and `validate:local-real-phone-comparison` are intentionally not required for this P14c docs-only source review QA because this PR does not involve real voice fixtures, real phone comparison, Practice Mode pitch engine behavior, true recordings, fixture behavior, route audio decoding behavior, or any runtime pitch extraction changes.

## Final QA decision

P14c passes as a docs-only source review QA record.

The P14b helper remains research-only, pure, deterministic, isolated from UI / Practice Mode / scoring / target-curve generation, and covered only by synthetic in-memory checks. The reviewed output remains note-like segment diagnostics and must not be promoted to formal note recognition or melody recognition without a separate future design, implementation, and QA step.
