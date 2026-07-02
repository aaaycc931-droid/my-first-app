# P15c Research Target Pitch Curve Diagnostic Converter Source Review QA

## Scope

P15c is a docs-only source review QA for the P15b runtime POC converter helper:

- `lib/research/local-audio-decode/research-target-pitch-curve-diagnostics.ts`
- `scripts/test-local-audio-decode-research-target-pitch-curve-diagnostics.ts`
- `docs/local-audio-decode-target-pitch-curve-generation-plan.md`
- `docs/mvp-status.md`

This review checks that the P15b converter remains research-only, pure-helper-only, and synthetic-test-only. P15c does not change runtime code, converter behavior, test logic, UI integration, Practice Mode, formal `TargetPitchCurve` runtime files, scoring, dependencies, package files, audio fixtures, or local metadata.

## Source Review Conclusion

The P15b converter remains an isolated research diagnostic helper. It converts already-derived in-memory `NoteLikeSegmentDiagnostic[]` values into a research-only `ResearchTargetPitchCurveDiagnostic` object for diagnostic review. It is not a formal `TargetPitchCurve` generator, not Practice Mode audio import, not Practice Mode integration, not note recognition, not melody recognition, and not scoring.

## Reviewed Evidence

### Converter helper

- The converter is exported as `convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic` and accepts only `noteLikeSegments: NoteLikeSegmentDiagnostic[]`.
- The helper maps the array in memory and returns a new diagnostic object.
- The source constant is fixed to `"local-audio-decode-note-like-segments"`.
- Output types are explicitly named with `Research...Diagnostic` naming.
- The helper maps each input segment to one output segment, preserves input order through `Array.prototype.map`, and assigns `segmentIndex` from the input order.
- `representativeFrequencyHz` maps directly to `targetFrequencyHz`.
- `nearestNoteName` maps only to optional diagnostic `targetNoteLabel`, and the property is omitted when `nearestNoteName` is `undefined`.
- `diagnosticConfidence`, `frameCount`, and `bridgedNullFrameCount` are preserved as diagnostic fields.
- Summary values are computed only from output segments.
- There is no file I/O, `AudioBuffer` access, browser API access, network call, upload, cloud call, AI API call, interpolation, rhythm scoring, user pitch alignment, note correction, key detection, Practice Mode target replacement, or formal `TargetPitchCurve` construction.

### Synthetic checks

- The synthetic script creates in-memory `NoteLikeSegmentDiagnostic` values only.
- The checks cover empty input, one segment, missing optional label, multiple segments, order preservation, segment index assignment, frequency mapping, optional label mapping, missing label omission, low-confidence preservation, summary counts, total duration, input immutability by JSON snapshot comparison, and research-only source / curve naming.
- The script does not read audio fixtures, decode audio, call browser APIs, integrate with UI routes, call `/practice`, call `/api/recognize`, use recognition providers, score output, or change package dependencies.

## P15c QA Checklist

| # | Check | Result |
| --- | --- | --- |
| 1 | P15b converter is deterministic pure helper. | Pass |
| 2 | Converter only accepts in-memory `NoteLikeSegmentDiagnostic[]`. | Pass |
| 3 | Converter does not read files. | Pass |
| 4 | Converter does not read `AudioBuffer`. | Pass |
| 5 | Converter does not call browser API. | Pass |
| 6 | Converter does not trigger network / upload / cloud / AI API. | Pass |
| 7 | Output type naming remains research-only, including `ResearchTargetPitchCurveDiagnostic`. | Pass |
| 8 | Output is not described as formal `TargetPitchCurve`. | Pass |
| 9 | Output is not described as formal note recognition, melody recognition, Practice Mode result, or scoring result. | Pass |
| 10 | `source` is fixed to `"local-audio-decode-note-like-segments"`. | Pass |
| 11 | Each `NoteLikeSegmentDiagnostic` converts to one research target-curve-like segment. | Pass |
| 12 | `representativeFrequencyHz` maps to `targetFrequencyHz`. | Pass |
| 13 | `nearestNoteName` maps only to optional diagnostic `targetNoteLabel`. | Pass |
| 14 | Missing `nearestNoteName` remains `undefined` / omitted. | Pass |
| 15 | `diagnosticConfidence` is preserved. | Pass |
| 16 | Low-confidence segment remains low confidence and is not wrapped as a formal target note. | Pass |
| 17 | `frameCount` maps to `sourceFrameCount`. | Pass |
| 18 | `bridgedNullFrameCount` is preserved. | Pass |
| 19 | Segment order preserves input order. | Pass |
| 20 | `summary.segmentCount` counts output segment count. | Pass |
| 21 | `summary.lowConfidenceSegmentCount` counts low-confidence segments. | Pass |
| 22 | `summary.totalDurationSeconds` uses the sum of output segment durations. | Pass |
| 23 | Empty input returns an empty research curve diagnostic without throwing. | Pass |
| 24 | Converter does not mutate input. | Pass |
| 25 | Converter does not do pitch interpolation. | Pass |
| 26 | Converter does not do rhythm scoring. | Pass |
| 27 | Converter does not do user pitch alignment. | Pass |
| 28 | Converter does not do note correction. | Pass |
| 29 | Converter does not do key detection. | Pass |
| 30 | Converter does not make a melody recognition claim. | Pass |
| 31 | Converter does not do Practice Mode target replacement. | Pass |
| 32 | Synthetic in-memory tests cover empty / one / multiple / order / frequency mapping / optional label / missing label / low confidence / summary / immutability / research-only naming. | Pass |
| 33 | No `/research/local-audio-decode` UI integration is added by P15b converter work. | Pass |
| 34 | No `/practice` integration is added. | Pass |
| 35 | No formal `TargetPitchCurve` runtime files are modified by this docs-only QA. | Pass |
| 36 | No scoring / grade / pass / fail behavior is added. | Pass |
| 37 | No `/api/recognize` changes are added. | Pass |
| 38 | No recognition provider union changes are added. | Pass |
| 39 | No `package.json` / `package-lock.json` changes are added. | Pass |
| 40 | No dependencies are added. | Pass |
| 41 | No audio fixtures are added. | Pass |
| 42 | No `metadata.local.json` is added. | Pass |
| 43 | No homepage / navigation promotion is added. | Pass |
| 44 | No APK / WebView-ready claim is added. | Pass |

## Non-Goals Confirmed

P15c does not implement or approve any of the following as product behavior:

- Formal `TargetPitchCurve` generation from arbitrary audio.
- Practice Mode audio import.
- Practice Mode integration.
- Scoring, grade, pass, or fail behavior.
- Rhythm assessment.
- User pitch alignment.
- Note correction.
- Key detection.
- Formal note recognition.
- Melody recognition.
- Upload, cloud, network, or AI API processing.
- Homepage, navigation, or release promotion.
- APK / WebView readiness.

## Skipped Real-Audio Validation

`validate:local-real-voice-fixtures` and `validate:local-real-phone-comparison` are intentionally not required for this P15c docs-only source review QA because this PR does not affect real voice fixtures, real phone comparison, Practice Mode pitch engine behavior,真实录音 behavior, fixture behavior, audio decoding, pitch extraction, note-like segmentation, converter runtime behavior, or Practice Mode integration.
