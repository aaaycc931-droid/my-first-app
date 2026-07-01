# P12q Final Research Route Release QA

## 1. Purpose

This document records the final research route release QA for `/research/local-audio-decode` after the P12p direct-URL-only visibility decision.

P12q is docs-only. It does not implement code, modify route behavior, modify UI copy, change navigation, link from the homepage, link from `/practice`, add a feature flag, add a dev-only guard, change file selection behavior, change decode behavior, change Extract pitch frames behavior, change disabled/enabled gating, change the pitch extraction algorithm, add runtime code, integrate Practice Mode, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or commit real audio.

## 2. Release QA result

- Result: Pass
- Route: `/research/local-audio-decode`
- Release scope: limited research-only demonstration
- Visibility strategy: direct URL only / unlinked by default
- Not product release
- Not Practice Mode integration
- Not APK/WebView ready

## 3. Evidence reviewed

- P12b implementation exists as an isolated research POC.
- P12c source review QA.
- P12d manual browser QA checklist.
- P12e manual browser QA pass record.
- P12f data shape plan.
- P12g data shape source review QA.
- P12h diagnostic output copy plan.
- P12i diagnostic output copy source review QA.
- P12j UI implementation plan.
- P12k UI copy-only implementation.
- P12l UI copy source review QA.
- P12m visual manual browser QA result.
- P12n Network panel manual QA result.
- P12o release readiness checklist.
- P12p visibility / access source decision.

## 4. Final route isolation check

- The route remains `/research/local-audio-decode`.
- The route remains unlinked from the homepage.
- The route remains unlinked from `/practice`.
- The route is not in public navigation.
- The route is not described as a product feature.
- The route remains direct URL only for limited research-only demonstration.

## 5. Final research-only copy check

The page and documentation remain bounded as:

- research-only
- local-only
- diagnostic output only
- no formal pitch score
- no melody transcription
- no Practice Mode result
- no `TargetPitchCurve` generated
- not APK-ready

## 6. Final action separation check

- File selection remains an explicit user action.
- Decode metadata remains an explicit user action.
- Extract pitch frames remains an explicit user action.
- Extract pitch frames remains gated behind decoded metadata.
- There is no automatic decode on page load.
- There is no automatic pitch extraction on file selection.

## 7. Final local-only / network evidence

- P12n Network panel QA observed no WAV upload request.
- No cloud assessment request was observed.
- No AI API request was observed.
- No server storage request was observed.
- No account requirement was observed.
- No public sharing behavior was observed.

This evidence is from a tested browser session. It is not a universal security proof and is not APK/WebView proof.

## 8. Final diagnostic output boundary

Diagnostic output remains limited to:

- analyzed duration
- analysis frames
- voiced diagnostic frames
- unvoiced diagnostic frames
- frequency summary / optional min / median / max

The route does not output:

- note sequence
- melody transcription
- `TargetPitchCurve`
- score / grade / pass / fail
- Practice Mode result
- learning progress result

## 9. Final Practice Mode boundary

- No `app/practice/page.tsx` changes.
- No `/practice` link.
- No Practice Mode integration.
- No `currentMelodyStepIndex` changes.
- No Record / Estimate changes.
- No attempt history changes.
- No static pitch trend preview changes.
- No scoring changes.

## 10. Final code boundary

- No `/api/recognize` changes.
- No recognition provider union changes.
- No PDF upload.
- No Audiveris.
- No dependency changes.
- No estimator / Pitchy / benchmark gate changes.
- No `package.json` / `package-lock.json` changes.
- No real audio committed.
- No `metadata.local.json` committed.

## 11. Final release wording

Allowed wording:

- “limited research-only demonstration”
- “research-only local audio decode diagnostic route”
- “local browser pitch-frame diagnostics”
- “experimental decoded WAV frame diagnostics”

Avoided wording:

- “audio import is live”
- “pitch recognition is live”
- “melody recognition”
- “singing score”
- “Practice Mode audio import”
- “TargetPitchCurve generation”
- “APK-ready”
- “production-ready product feature”

## 12. Final release status

- Status: ready for limited research-only demonstration by direct URL.
- Not ready for product release.
- Not ready for homepage promotion.
- Not ready for `/practice` linking.
- Not ready for Practice Mode integration.
- Not ready for `TargetPitchCurve` generation.
- Not ready for formal scoring.
- Not ready for Android APK / WebView claim.

## 13. Known limitations

- Only tested as a browser research route.
- Not cross-browser certified.
- Not mobile/APK certified.
- Not formal accuracy validated.
- Not formal pitch recognition.
- Not note segmentation.
- Not `TargetPitchCurve` generation.
- Not scoring.
- Not Practice Mode.
- Not public product flow.

## 14. Android APK / WebView caveat

This final research route release QA does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 15. Recommended next phase

- If staying in release/documentation mode: P12r Final Research Route Release Summary, docs-only.
- If moving into real capability improvement: P13a Pitch Extraction Accuracy Improvement Plan, docs-only.
- Do not jump directly to Practice Mode integration.
- Do not jump directly to `TargetPitchCurve` generation.
- Do not jump directly to scoring.

## 16. Non-goals

P12q does not do:

- runtime code
- route behavior changes
- UI copy changes
- navigation changes
- homepage link
- `/practice` link
- feature flag implementation
- dev-only guard implementation
- `package.json` changes
- `app/research/local-audio-decode` page/component changes
- `app/practice/page.tsx` changes
- file input behavior changes
- decode behavior changes
- Extract pitch frames behavior changes
- disabled/enabled gating changes
- automatic decoding
- automatic pitch extraction
- pitch extraction algorithm changes
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

## 17. P13a planning follow-up

P13a begins docs-only planning for future pitch extraction accuracy and diagnostic quality improvements after the final research route release QA while keeping route behavior, UI copy, file / decode / extract actions, pitch extraction logic, Practice Mode integration, note segmentation, `TargetPitchCurve` generation, formal scoring, upload / cloud / AI behavior, and APK-ready claims unchanged.
