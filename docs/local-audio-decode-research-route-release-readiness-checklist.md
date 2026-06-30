# Local Audio Decode Research Route Release Readiness Checklist

## 1. Purpose

This document defines the P12o release readiness checklist for deciding whether `/research/local-audio-decode` is ready for a limited research-only demonstration as a local browser audio decode / pitch-frame diagnostics route.

P12o is documentation-only. It does not implement code, change route behavior, change UI copy, change pitch extraction logic, add runtime behavior, connect Practice Mode, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or add real audio fixtures.

## 2. Release target definition

The release target is limited to:

- research-only local browser audio decode / pitch-frame diagnostics tool
- isolated route: `/research/local-audio-decode`
- local WAV research flow
- diagnostic output only

The release target is not:

- formal audio import
- formal pitch recognition
- melody recognition
- scoring
- Practice Mode integration
- `TargetPitchCurve` generation
- Song Learning Mode
- APK-ready feature

## 3. Current evidence summary

Existing readiness evidence before this checklist:

- P12b implementation exists as an isolated research POC.
- P12c source review QA passed.
- P12d manual browser QA checklist exists.
- P12e manual browser QA pass was recorded.
- P12f / P12g data shape plan and QA were completed.
- P12h / P12i copy plan and QA were completed.
- P12j UI implementation plan was completed.
- P12k UI copy-only implementation was completed.
- P12l UI copy source review QA was completed.
- P12m visual manual browser QA pass was recorded.
- P12n Network panel manual QA pass was recorded.

## 4. Required readiness checklist

### Route isolation

- [ ] Route remains `/research/local-audio-decode`.
- [ ] Route is not linked from the homepage unless explicitly approved.
- [ ] Route is not linked from `/practice` unless separately approved.
- [ ] No Practice Mode integration is introduced.

### Research-only copy

- [ ] Page says research-only.
- [ ] Diagnostic output says research-only.
- [ ] No formal pitch score claim is present.
- [ ] No melody transcription claim is present.
- [ ] No Practice Mode result claim is present.
- [ ] No `TargetPitchCurve` claim is present.
- [ ] No APK-ready claim is present.

### Action separation

- [ ] File selection is explicit.
- [ ] Decode metadata is explicit.
- [ ] Extract pitch frames is explicit.
- [ ] Extract pitch frames remains gated behind decoded metadata.
- [ ] No automatic decode runs on page load.
- [ ] No automatic pitch extraction runs on file selection.

### Local-only behavior

- [ ] No upload was observed in Network QA.
- [ ] No cloud assessment was observed.
- [ ] No AI API was observed.
- [ ] No server storage was observed.
- [ ] No account requirement was observed.
- [ ] No real audio is committed.
- [ ] No `metadata.local.json` is committed.

### Output boundary

- [ ] Output is limited to diagnostics.
- [ ] Output may include analyzed duration.
- [ ] Output may include frame count.
- [ ] Output may include voiced / unvoiced counts.
- [ ] Output may include optional min / median / max frequency estimates.
- [ ] Output does not include a note sequence.
- [ ] Output does not include melody transcription.
- [ ] Output does not include `TargetPitchCurve`.
- [ ] Output does not include score / grade / pass / fail.

### Practice Mode non-regression

- [ ] `/practice` is untouched.
- [ ] `currentMelodyStepIndex` is untouched.
- [ ] Record / Estimate is untouched.
- [ ] Attempt history is untouched.
- [ ] Static pitch trend preview is untouched.

### Code boundary

- [ ] No `/api/recognize` changes are introduced.
- [ ] No recognition provider union changes are introduced.
- [ ] No PDF upload changes are introduced.
- [ ] No Audiveris changes are introduced.
- [ ] No package dependency changes are introduced.
- [ ] No estimator / Pitchy / benchmark gate changes are introduced.

### APK / WebView boundary

- [ ] Browser research is not described as proof of APK readiness.
- [ ] Android WebView still requires separate validation.

## 5. Release blockers

Any of the following should block a limited research-only release:

- upload / cloud / AI behavior appears
- route claims formal recognition or scoring
- route generates `TargetPitchCurve`
- route mutates Practice Mode
- Extract pitch frames runs automatically before decode
- real audio is committed
- `metadata.local.json` is committed
- APK-ready claim is added
- package dependencies unexpectedly change
- `/api/recognize` changes unexpectedly

## 6. Release wording allowed

Allowed wording:

- “research-only local audio decode diagnostic route”
- “local browser pitch-frame diagnostics”
- “experimental decoded WAV frame diagnostics”
- “not formal scoring”
- “not Practice Mode”
- “not APK-ready”

Avoid wording:

- “audio import is live”
- “pitch recognition is live”
- “melody recognition”
- “singing score”
- “Practice Mode audio import”
- “TargetPitchCurve generation”
- “APK-ready”

## 7. Recommended release status

- Status: ready for limited research-only demonstration after P12n evidence, assuming checks pass and the route remains unlinked or clearly research-only.
- Not ready for product release.
- Not ready for Practice Mode integration.
- Not ready for APK / WebView claims.

## 8. Future after release readiness

Possible next steps after P12o:

- P12p Production Visibility / Route Access Source Decision, docs-only.
- P12q Final Research Route Release QA, docs-only or manual QA result.
- Later P13: pitch-frame cleanup / note segmentation planning.

P12o does not implement these future steps.

## 9. Non-goals

P12o does not do any of the following:

- runtime code
- route behavior changes
- UI copy changes
- pitch extraction algorithm changes
- automated tests
- `package.json` changes
- `app/research/local-audio-decode` page/component changes
- `app/practice/page.tsx` changes
- file input behavior changes
- decode behavior changes
- Extract pitch frames behavior changes
- disabled/enabled gating changes
- automatic decoding
- automatic pitch extraction
- waveform analysis
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
