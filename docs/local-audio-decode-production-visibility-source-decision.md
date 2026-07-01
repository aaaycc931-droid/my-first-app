# Local Audio Decode Production Visibility Source Decision

## 1. Purpose

This document records the P12p production visibility and route access source decision for `/research/local-audio-decode`, the research-only local audio decode / pitch-frame diagnostics route.

P12p is documentation-only. It does not implement code, change route behavior, change UI copy, change navigation, add homepage links, add `/practice` links, add feature flags, add dev-only guards, change pitch extraction logic, connect Practice Mode, generate `TargetPitchCurve`, implement note segmentation, implement scoring, or add real audio fixtures.

## 2. Decision summary

### Chosen

- Keep `/research/local-audio-decode` unlinked from the homepage and `/practice` by default.
- Allow direct URL access for limited research-only demonstration.
- Keep strong research-only copy on the route.
- Do not present it as a product feature.
- Do not claim APK-ready status.

### Deferred

- homepage link
- `/practice` link
- public navigation entry
- product import flow
- feature flag implementation
- dev-only guard implementation
- APK / WebView validation
- Practice Mode integration

## 3. Options considered

### Option A: Keep route unlinked, direct URL only

Characteristics:

- The route can be accessed by direct URL.
- The route is not linked from the homepage.
- The route is not linked from `/practice`.
- The route is not included in public navigation.
- This is the best fit for limited research-only demonstration.

Benefits:

- Lowest risk.
- Does not affect the primary user flow.
- Does not imply a formal feature launch.
- Preserves the research route for continued review.
- Lets Codex, reviewers, and testers access the route directly.

Risks:

- Anyone who knows the URL can still access it.
- The page copy must remain clearly research-only.
- It is not suitable as a public product feature.

### Option B: Add homepage / navigation link

Characteristics:

- The route would be easier for users to discover.
- The risk is high for the current maturity level.

Problems:

- It could be misunderstood as a formal product feature.
- It could expand product claims too early.
- It could make users think formal audio import or formal pitch recognition is supported.
- This option is not recommended now.

### Option C: Link from `/practice`

Characteristics:

- This would be closer to a future learning flow.
- It is the highest-risk option now.

Problems:

- It could make the research POC look like a Practice Mode feature.
- It could imply that audio import is live in Practice Mode.
- It could blur future Practice integration boundaries.
- This option is not recommended now.

### Option D: Hide behind feature flag / dev-only guard

Characteristics:

- This would provide stronger access control.
- It requires runtime implementation.

Problems:

- P12p does not implement runtime changes.
- If needed later, a separate source decision and implementation should cover it.
- The route already has research-only copy and direct URL access, so P12p does not add more complex gating.

## 4. Chosen decision

Chosen option: Option A — keep `/research/local-audio-decode` unlinked, with direct URL access only for limited research-only demonstration.

This means:

- The route remains accessible by direct URL.
- The route is not linked from the homepage.
- The route is not linked from `/practice`.
- The route is not included in public navigation.
- The route is not a product feature.
- The route is not Practice Mode.
- The route is not APK-ready.
- Research-only copy remains required.

## 5. Why not homepage link yet

Do not add a homepage link yet because:

- The route is research-only.
- It is not formal audio import.
- It is not formal pitch recognition.
- It is not scoring.
- It is not Practice Mode.
- Homepage promotion would expand product promises too early.
- Homepage promotion could misrepresent the current maturity of the project.

## 6. Why not `/practice` link yet

Do not add a `/practice` link yet because:

- `/practice` is the current practice flow.
- `/research/local-audio-decode` is an isolated research route.
- Connecting the two would imply Practice Mode audio import.
- There is no `TargetPitchCurve` generation.
- There is no note segmentation.
- There is no scoring.
- There is no Practice integration source decision.

## 7. Direct URL demonstration boundary

Direct URL demonstration is allowed only within this boundary:

- research-only
- local-only
- no upload
- no cloud
- no AI API
- no melody recognition
- no scoring
- no `TargetPitchCurve` generation
- not Practice Mode
- not APK-ready

## 8. Production / Vercel caveat

If the route is accessible by direct URL in a deployed preview or production environment, it must still remain:

- unlinked by default
- labeled with research-only copy
- free of product claims
- absent from homepage promotion
- absent from Practice Mode links
- free of APK-ready claims

If future work needs stricter production visibility, it should be handled separately with:

- feature flag source decision
- dev-only guard plan
- route access implementation
- source review QA
- manual QA

P12p does not implement those items.

## 9. Release wording

Allowed wording:

- research-only local audio decode diagnostic route
- local browser pitch-frame diagnostics
- experimental decoded WAV frame diagnostics
- limited research-only demonstration

Avoid wording:

- audio import is live
- pitch recognition is live
- melody recognition
- singing score
- Practice Mode audio import
- `TargetPitchCurve` generation
- APK-ready
- production-ready product feature

## 10. Relationship to P12o

- P12o defined the release readiness checklist.
- P12p makes the visibility / access decision.
- P12p does not change readiness evidence.
- P12p does not implement route access changes.

## 11. Relationship to future P13

- P13 can later focus on pitch extraction quality or algorithm planning.
- P12p does not start P13.
- P12p does not improve the algorithm.
- P12p does not implement note segmentation.
- P12p does not generate `TargetPitchCurve`.

## 12. APK / WebView caveat

This production visibility decision does not prove Android APK / WebView readiness. Future Android APK packaging must separately validate file picker behavior, `AudioContext` / `decodeAudioData` behavior, memory limits, local processing, permissions, performance, and network behavior inside Android WebView / packaged environments before any APK-ready claim.

## 13. Future recommended sequence

Recommended future sequence:

- P12q Final Research Route Release QA, docs-only / manual QA result.
- P12r optional final release summary, docs-only.
- Then P13a Pitch Extraction Accuracy Improvement Plan, docs-only.

P12p does not implement those future steps.

## 14. Non-goals

P12p does not do any of the following:

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

P12q records final research route release QA after the direct-URL-only visibility decision, confirming `/research/local-audio-decode` is ready only for limited research-only demonstration while keeping homepage links, `/practice` links, navigation changes, route behavior changes, Practice Mode integration, `TargetPitchCurve` generation, formal scoring, upload/cloud/AI behavior, and APK-ready claims deferred.
