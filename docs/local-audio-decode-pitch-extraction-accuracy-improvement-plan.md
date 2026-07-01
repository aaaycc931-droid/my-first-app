# P13a Pitch Extraction Accuracy Improvement Plan

## 1. Purpose

This document plans future accuracy, stability, and diagnostic-quality improvements for decoded WAV pitch-frame extraction in `/research/local-audio-decode`.

P13a is docs-only. It does not implement code, change the pitch extraction algorithm, change route behavior, change UI copy, change file selection, change decode behavior, change Extract pitch frames behavior, change disabled / enabled gating, add runtime code, connect `/practice`, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or commit real audio.

## 2. Current baseline

The current baseline is:

- isolated route: `/research/local-audio-decode`
- local browser WAV decode research flow
- file selection, decode metadata, and Extract pitch frames are separate actions
- Extract pitch frames is gated behind decoded metadata
- tiny local diagnostic pitch-frame extractor
- output includes analyzed duration, frame count, voiced / unvoiced counts, and optional minimum / median / maximum frequency summary
- research-only diagnostic output

The current baseline is not:

- formal pitch recognition
- melody recognition
- note segmentation
- `TargetPitchCurve` generation
- Practice Mode integration
- scoring
- APK-ready feature

## 3. Known limitations to investigate

The following are potential limitations to research. P13a does not claim these are already confirmed defects in the current extractor:

- octave errors
- unstable estimates on noisy input
- low-confidence voiced frames
- silence / breath / transient handling
- vibrato handling
- frequency drift handling
- short note handling
- repeated note handling
- low-frequency / high-frequency bounds
- frame window size tradeoffs
- frame hop size tradeoffs
- median / smoothing strategy
- confidence calibration
- sample rate differences
- mono / stereo channel handling
- clipping or very low volume handling
- browser decode differences
- mobile / WebView uncertainty

## 4. Accuracy improvement candidates

These candidates are planning options only. P13a does not implement any of them.

### Candidate A: Frequency bounds and confidence thresholds

- Define a safe minimum / maximum frequency range.
- Avoid obvious invalid estimates.
- Keep nullable `estimatedFrequencyHz` for unvoiced / low-confidence frames.
- Risk: thresholds that are too strict may drop valid notes.

### Candidate B: Frame-level smoothing / median filtering

- Reduce frame-to-frame jitter.
- Keep research diagnostics visible.
- Risk: smoothing may hide real pitch changes.

### Candidate C: Voiced / unvoiced classification refinement

- Improve silence and low-confidence handling.
- Avoid treating every noisy frame as voiced.
- Risk: may misclassify soft singing.

### Candidate D: Octave error guard

- Detect sudden 2x / 0.5x jumps.
- Compare neighboring frames.
- Risk: may incorrectly suppress true leaps.

### Candidate E: Window / hop size review

- Compare responsiveness versus stability.
- Short windows respond faster but may be unstable.
- Longer windows stabilize but may blur short notes.

### Candidate F: Known synthetic fixture evaluation

- Use synthetic WAVs or generated signals for controlled tests.
- Commit no real audio.
- Useful for repeatable regression checks.

### Candidate G: Manual local-only real voice evaluation

- Use ignored local fixtures only.
- Commit no audio.
- Commit no `metadata.local.json`.
- Record results only as local / manual notes if needed.

## 5. Recommended first improvement path

A conservative P13 path should be:

1. P13b: Pitch Extraction Test Fixture Plan, docs-only.
2. P13c: Pitch Extraction Algorithm Source Decision, docs-only.
3. P13d: Tiny isolated algorithm improvement.
4. P13e: Source Review QA.
5. P13f: Manual Browser QA.

P13a does not directly implement algorithm changes.

## 6. Acceptance criteria for future P13d implementation

A future implementation PR that changes the algorithm should satisfy all of these criteria:

- isolated to `/research/local-audio-decode` or a local helper used only by the research route
- no Practice Mode integration
- no `TargetPitchCurve` generation
- no note segmentation
- no scoring
- no upload / cloud / AI
- no real audio committed
- no package dependency unless separately approved
- output remains diagnostic
- old QA boundaries preserved
- tests or fixtures are synthetic / local-only
- docs updated with limitations

## 7. Test strategy plan

Future testing should be layered.

### Synthetic tests

- clean sine
- silence
- low amplitude
- noisy sine
- vibrato-like signal
- frequency drift
- octave-jump stress case
- mixed harmonics
- short notes / repeated tone simulation

### Manual browser QA

- local small WAV
- decode metadata
- Extract pitch frames
- verify diagnostic output remains research-only
- verify no upload / cloud / AI via Network panel when needed

### Source review QA

- confirm algorithm changes are isolated
- confirm no Practice Mode changes
- confirm no `TargetPitchCurve` / note segmentation / scoring
- confirm no dependency changes unless approved

## 8. Data shape compatibility

Future improvements should preserve or cautiously extend the P12f data shape:

- `frameIndex`
- start / end time
- nullable `estimatedFrequencyHz`
- nullable `confidence`
- `frameState`
- frequency summary
- warnings

Frame diagnostics should not become:

- note sequence
- melody transcription
- score
- Practice result
- `TargetPitchCurve`

## 9. Research-only copy implications

Future algorithm improvements should not change product claims. Even if pitch extraction improves, the route should still only be described as:

- local browser pitch-frame diagnostics
- research-only decoded WAV frame diagnostics
- experimental diagnostic extractor

It should not be described as:

- pitch recognition is live
- melody recognition
- singing score
- audio import product feature
- Practice Mode audio import
- APK-ready

## 10. Relationship to P14 / P15 / P16

- P13 improves pitch-frame extraction only.
- P14 can later research note segmentation.
- P15 can later research `TargetPitchCurve` generation.
- P16 can later consider Practice Mode integration.
- P13a must not jump ahead to P14 / P15 / P16.

## 11. APK / WebView caveat

Pitch extraction improvement planning does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 12. Non-goals

P13a does not do:

- runtime code
- route behavior changes
- UI copy changes
- navigation changes
- homepage link
- `/practice` link
- feature flag implementation
- dev-only guard implementation
- `package.json` changes
- `app/research/local-audio-decode` page / component changes
- `app/practice/page.tsx` changes
- file input behavior changes
- decode behavior changes
- Extract pitch frames behavior changes
- disabled / enabled gating changes
- automatic decoding
- automatic pitch extraction
- pitch extraction algorithm changes
- waveform analysis implementation
- note segmentation
- `TargetPitchCurve` generation
- Practice Mode integration
- live chart rendering
- converter changes
- MusicXML parser
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
- estimator changes in `/practice`
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
