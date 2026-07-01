# P13f Manual Browser QA Result for Pitch Diagnostic Guard

## 1. Purpose

This document records the real browser manual QA result for the P13d pitch diagnostic guard: **Tiny Isolated Pitch Extraction Diagnostic Guard**.

P13f is docs-only. It does not implement code, modify runtime behavior, change the pitch extraction algorithm, add tests, generate audio, connect Practice Mode, or make product-readiness claims.

## 2. Test summary

- Result: **Pass**.
- Route tested: `/research/local-audio-decode`.
- Feature tested: P13d diagnostic frequency bounds plus voiced / unvoiced guard behavior.
- Scope: manual browser QA for route behavior, explicit actions, gating, diagnostic output, local-only boundary, and Practice Mode smoke check.
- Test file: local-only small WAV, not committed.
- No real audio committed.
- No `metadata.local.json` committed.

## 3. Test environment

- Tester: not recorded.
- Date: not recorded.
- Browser / version: not recorded.
- OS / device: not recorded.
- Environment: not recorded.
- WAV description: local-only small WAV, not committed.
- Network panel inspected: yes.

## 4. Manual test flow result

The user completed and passed the following real browser flow:

- Opened `/research/local-audio-decode`.
- Confirmed the initial page loads.
- Selected a local small WAV.
- Ran decode metadata.
- Confirmed decoded metadata appears.
- Confirmed **Extract pitch frames** gating works.
- Ran **Extract pitch frames**.
- Confirmed diagnostic output appears.
- Confirmed no misleading `0 Hz` valid summary was observed.
- Confirmed research-only / diagnostic-only copy remains.
- Checked DevTools Network panel and observed no upload / cloud / AI behavior.
- Smoke checked `/practice` successfully.

## 5. Route behavior result

Confirmed for this tested browser session:

- Route path unchanged.
- Route loads.
- No homepage link added.
- No `/practice` link added.
- No public navigation change observed or introduced by P13f.
- Direct URL research route remains the intended access pattern.

## 6. Explicit action and gating result

Confirmed for this tested browser session:

- File selection remains explicit.
- Decode metadata remains explicit.
- **Extract pitch frames** remains explicit.
- **Extract pitch frames** remains gated behind decoded metadata.
- No automatic decode on page load.
- No automatic pitch extraction on file selection.

## 7. Diagnostic output result

Confirmed for this tested browser session:

- Diagnostic output appears after extraction.
- Output remains research-only.
- Output remains diagnostic-only.
- Min / median / max summary does not show misleading `0 Hz` as a valid result.
- Invalid / out-of-range handling is not presented as a formal score.
- No correct / wrong / pass / fail language.
- No melody recognition claim.
- No `TargetPitchCurve` claim.

## 8. Local-only / Network panel result

Observed in the tested browser session:

- No WAV upload request observed.
- No cloud assessment request observed.
- No AI API request observed.
- No server storage request observed.
- No account requirement observed.

This is a tested browser session result. It is not a universal security proof and is not APK / WebView proof.

## 9. Practice Mode smoke result

- Practice Mode smoke check: **Pass**.
- No Practice Mode behavior changes observed.
- Details not recorded unless additional details become available.

## 10. Product boundary result

Confirmed boundaries:

- Not formal pitch recognition.
- Not melody recognition.
- Not an audio import product feature.
- Not Practice Mode audio import.
- Not a singing score.
- Not `TargetPitchCurve` generation.
- Not note segmentation.
- Not APK-ready.

## 11. Issues found

- None observed.

## 12. Overall result

- Result: **Pass**.
- P13d diagnostic guard did not break the manual browser decode → extract flow in this tested session.
- Route remains suitable only as a limited research-only direct-URL demonstration.
- Manual browser QA does not prove APK / WebView readiness.

## 13. Known limitations

- Manual QA used a local browser session only.
- Not cross-browser certified.
- Not mobile / APK certified.
- Not formal accuracy validation.
- Not note segmentation validation.
- Not `TargetPitchCurve` validation.
- Not scoring validation.

## 14. Recommended next step

- P13g Optional Diagnostic Guard QA Summary, docs-only, if a final QA consolidation is desired.
- Or P13h next source decision for a second tiny algorithm improvement.
- Do not jump directly to note segmentation, `TargetPitchCurve` generation, Practice Mode integration, or scoring.

## 15. Non-goals

P13f does not do any of the following:

- Runtime code.
- Route behavior changes.
- UI copy changes.
- Navigation changes.
- Homepage link.
- `/practice` link.
- Feature flag implementation.
- Dev-only guard implementation.
- `package.json` changes.
- `app/research/local-audio-decode` page/component changes.
- `app/practice/page.tsx` changes.
- File input behavior changes.
- Decode behavior changes.
- **Extract pitch frames** behavior changes.
- Disabled / enabled gating changes.
- Automatic decoding.
- Automatic pitch extraction.
- Pitch extraction algorithm changes.
- Synthetic WAV generation.
- Committed WAV fixtures.
- New test scripts.
- Waveform analysis implementation.
- Smoothing implementation.
- Octave correction.
- Note segmentation.
- `TargetPitchCurve` generation.
- Practice Mode integration.
- Live chart rendering.
- Converter changes.
- MusicXML parser.
- MIDI import.
- Accompaniment playback.
- Source separation.
- Vocal separation.
- Song Learning Mode implementation.
- Cloud upload.
- Cloud assessment.
- GPT / AI API.
- Formal score.
- Rhythm evaluation.
- Sight-singing assessment.
- Estimator changes in `/practice`.
- Pitchy Practice Mode integration.
- Comparison harness changes.
- Benchmark gate / tolerance changes.
- `/api/recognize` changes.
- Recognition provider union changes.
- PDF upload.
- Audiveris.
- Dependency changes.
- Real audio commits.
- `metadata.local.json` commits.
- APK-ready claim.

P13h chooses conservative diagnostic median smoothing over valid diagnostic frequency estimates as the next future tiny isolated improvement direction after the P13d/P13e/P13f diagnostic guard implementation/source review/manual QA loop, while keeping route behavior, UI copy, file/decode/extract actions, gating, Practice Mode integration, note segmentation, TargetPitchCurve generation, formal scoring, upload/cloud/AI behavior, dependencies, real audio commits, and APK-ready claims unchanged.
