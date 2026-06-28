# P8e Live Pitch Trend Data Shape Plan

## 1. Purpose

This document defines the future data shape and rendering contract for live pitch trend feedback. It prepares Practice Mode for a later target pitch curve vs user pitch curve experience without implementing runtime behavior in P8e.

The planned contract should support future:

- browser-local real-time feedback
- target pitch curve vs user pitch curve rendering
- no-pitch and low-confidence gaps
- target-relative cents offset display
- score, MusicXML, or MIDI-derived target curves
- local monophonic melody guide audio-derived target curves

P8e is docs-only. It does not change Practice Mode UI or runtime code.

## 2. Non-goals

P8e does not implement:

- microphone access
- `AudioContext`
- `getUserMedia`
- real-time recording
- frame-level pitch analysis
- live chart rendering
- target pitch curve generation
- score or MusicXML parser changes
- MIDI import
- MP3 or WAV import
- melody guide audio import
- accompaniment playback
- source separation
- vocal melody extraction
- Song Learning Mode
- cloud assessment
- GPT or AI API calls
- formal scoring
- rhythm evaluation
- sight-singing assessment

## 3. Target pitch data concepts

A future target pitch curve may be produced from one or more sources, but P8e does not implement any generation path.

Potential future target sources include:

- existing mock melody or melody steps
- score, MusicXML, or note sequence data
- MIDI
- future user-provided local monophonic melody guide audio

Conceptual fields for a target pitch segment:

| Field | Concept |
| --- | --- |
| `targetId` | Stable identifier for a target segment in a live pitch trend session. |
| `sourceType` | Source category: `"mock-melody-step"`, `"score-note-sequence"`, `"musicxml"`, `"midi"`, or `"local-melody-guide-audio"`. |
| `noteName` | Human-readable note name, such as `A4` or `C#5`, when known. |
| `frequencyHz` | Expected target frequency in hertz for the segment center. |
| `startTimeMs` | Start time of the target segment relative to the session or aligned playback timeline. |
| `endTimeMs` | End time of the target segment relative to the same timeline. |
| `expectedMidiNumber` | Expected MIDI note number when the target can be mapped to equal temperament. |
| `centsToleranceGuide` | Training guide band around the target center, not a formal score threshold. |
| `displayLabel` | UI label for the segment, such as a note name, lyric syllable, or melody step label. |
| `melodyStepIndex` | Optional Practice Mode melody step index when the target comes from an existing melody step. |
| `melodyStepId` | Optional Practice Mode melody step identifier when the target comes from an existing melody step. |

The target curve should be treated as training guidance. It should not automatically imply grading, formal score calculation, rhythm evaluation, or sight-singing assessment.

## 4. User pitch frame concepts

A future live pitch feedback session may produce user pitch frames in browser-local memory. P8e only defines conceptual fields and does not implement frame extraction.

Conceptual fields for a user pitch frame:

| Field | Concept |
| --- | --- |
| `timestampMs` | Frame timestamp relative to the live feedback session or aligned playback timeline. |
| `estimatedFrequencyHz` | Estimated user pitch frequency in hertz when a reliable pitch is available. |
| `estimatedMidiNumber` | Estimated nearest MIDI number when a pitch can be mapped to equal temperament. |
| `nearestNote` | Human-readable nearest note label when available. |
| `centsFromTarget` | Signed cents offset relative to the currently aligned target segment; `0` means target center. |
| `confidence` | Normalized confidence value when the pitch engine can provide one. |
| `clarity` | Optional pitch clarity value when available from a future pitch engine. |
| `voicing` | Optional voicing probability or voiced/unvoiced indicator when available. |
| `state` | Frame state: `"active-pitch-detected"`, `"no-pitch"`, `"low-confidence"`, or `"unknown"`. |
| `targetId` | Optional aligned target segment identifier. |
| `melodyStepId` | Optional aligned Practice Mode melody step identifier. |
| `anomalyLabels` | Optional labels for diagnostics such as unstable pitch, octave ambiguity, or excessive noise. |

Frames with `state: "active-pitch-detected"` may be rendered as part of the user pitch curve only when they are reliable enough for training feedback. Frames with uncertain or missing pitch should remain visible as uncertainty instead of being silently smoothed into a false continuous line.

## 5. No-pitch / low-confidence gap concepts

Future live feedback should represent missing or unreliable pitch explicitly. A gap is not a failed score event in P8e's planned contract; it is a rendering and training-feedback concept.

Conceptual fields for a no-pitch or low-confidence gap:

| Field | Concept |
| --- | --- |
| `gapStartMs` | Start timestamp of the gap. |
| `gapEndMs` | End timestamp of the gap. |
| `reason` | Gap reason: `"no-pitch"`, `"low-confidence"`, or `"unknown"`. |
| `shouldRenderAsGap` | Always `true` for this concept so the UI avoids implying continuous reliable pitch. |
| `shouldNotCountAsSuccess` | Always `true` so missing/uncertain pitch is not presented as successful matching. |
| `shouldNotCreateFormalScore` | Always `true` because this contract does not define formal grading or assessment. |

## 6. Rendering contract

Future charts should consume target segments, user pitch frames, and gap concepts with these rules:

- Target segments render as stable target note blocks or a target guide line.
- User pitch frames render as a curve only when the frame is active and reliable.
- No-pitch and low-confidence frames render as gaps or de-emphasized segments.
- `0` cents is the target center line.
- `+50`, `+25`, `0`, `-25`, and `-50` cents are guide bands for training feedback.
- The chart is training feedback, not a formal score.
- Uncertainty must be visible rather than hidden.

The rendering layer should not infer success from a continuous line, fill missing user frames as correct pitch, or convert gap concepts into grades.

## 7. Practice Mode integration boundary

Future live pitch trend data shapes should not automatically change the existing Practice Mode flow.

Integration boundaries:

- Play target must not start live feedback.
- Start live feedback must not play target automatically.
- Switching melody steps must not start live feedback.
- Switching melody steps must not write attempt history.
- The existing Record / Estimate flow remains separate until explicitly changed in a later PR.

Any future PR that changes these boundaries should include a separate product decision, implementation plan, and QA checklist.

## 8. Privacy and local-only boundary

Future live pitch frames should default to browser-local handling.

Default privacy boundaries:

- no audio upload
- no cloud assessment
- no persistence by default
- no account requirement
- no GPT or AI call

Any future cloud deep assessment would require explicit user opt-in and a separate design. P8e does not define cloud assessment payloads, retention rules, account flows, or AI evaluation behavior.

## 9. Relationship to future features

P8e prepares the data shape only.

Future work may include:

- P9 defining score, MusicXML, or note sequence conversion into a target curve
- local monophonic melody guide audio import using a compatible target curve shape
- accompaniment playback aligning playback time to target and user pitch frames

P8e does not implement any of these future features. It only records a lightweight data model and rendering contract so later PRs can stay small and reviewable.
