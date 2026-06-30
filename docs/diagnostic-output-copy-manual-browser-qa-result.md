# P12m Manual Browser QA Result Record for Updated Diagnostic Output Copy

## 1. Purpose

This document records one real-browser manual QA result for the updated diagnostic output copy on `/research/local-audio-decode`.

P12m is a docs-only manual browser QA result record. It does not implement runtime code, route behavior changes, UI copy changes, pitch extraction algorithm changes, Practice Mode integration, scoring, note segmentation, or `TargetPitchCurve` generation.

## 2. Test summary

- Result: Pass
- Route tested: `/research/local-audio-decode`
- Feature tested: updated diagnostic output copy for decoded WAV pitch-frame extraction POC
- Scope: visual/browser QA for research-only diagnostic output copy
- Test file: local-only small WAV, not committed to repository
- No real audio committed
- No `metadata.local.json` committed

## 3. Test environment

- Tester: not recorded
- Date: not recorded
- Browser / version: not recorded
- OS / device: not recorded
- Environment: local dev or deployed preview: not recorded
- WAV description: local-only small WAV, details not recorded
- Network panel inspected: not recorded

## 4. Manual test flow result

The following manual browser flow was completed and passed:

- Opened `/research/local-audio-decode`
- Selected a local small WAV
- Ran decode metadata action
- Ran Extract pitch frames action
- Viewed diagnostic output area
- Visually confirmed updated diagnostic output copy appeared as intended

## 5. Diagnostic output heading result

- Heading appeared as `Pitch frame diagnostics` or equivalent research-only wording
- Heading did not claim pitch recognition result
- Heading did not claim melody recognition result
- Heading did not claim singing score
- Heading did not claim Practice result
- Heading did not claim TargetCurve result

## 6. Research-only summary copy result

- Copy indicates the values are local research diagnostics
- Copy indicates they are not a formal pitch score
- Copy indicates they are not melody transcription
- Copy indicates they are not Practice Mode result
- Copy indicates no `TargetPitchCurve` is generated

## 7. Boundary copy result

The page boundary copy was confirmed to contain, or equivalently express, the following:

- No upload
- No cloud
- No AI API
- No melody recognition
- No scoring
- No `TargetPitchCurve` generation
- Not Practice Mode
- Not APK-ready

## 8. Field label / helper copy result

Field labels and helper copy were not miswritten as:

- score
- correct
- wrong
- pass
- fail
- recognized melody
- note count
- target curve
- Practice Mode result

Fields remained diagnostic-only, including expressions such as:

- analyzed duration
- analysis frames
- voiced diagnostic frames
- unvoiced diagnostic frames
- frequency summary

## 9. Error / warning copy result

- Error / warning state: not triggered / not recorded
- Error / warning copy diagnostic-only wording: not recorded
- No user-blaming language: not recorded
- No scoring language: not recorded
- No recognition-result claim: not recorded

## 10. Practice Mode non-regression result

- Practice Mode smoke check: Pass, details not recorded

## 11. Local-only / network result

- Network panel inspection: not recorded
- Upload/cloud/AI behavior remains covered by source review boundaries but requires explicit network verification in future manual QA

## 12. Issues found

- None observed

## 13. Overall result

- Pass
- Updated diagnostic output copy appears consistent with P12h/P12j boundaries
- P12k UI copy remains research-only
- No product claim should be expanded based on this manual QA
- Browser QA does not prove APK-ready behavior

## 14. Android APK / WebView caveat

This manual browser QA does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, and performance inside Android WebView / packaged environments before any APK-ready claim.

## 15. Non-goals

P12m does not do any of the following:

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
