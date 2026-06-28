# P9a Score / MusicXML / Note Sequence to Target Curve Plan

## 1. Purpose

This document defines a future design plan for converting score-derived inputs, MusicXML, or a normalized note sequence into the target pitch curve and target pitch segments described by the P8e live pitch trend data shape / rendering contract.

The plan is intended to support future work on:

* target pitch curve vs user pitch curve comparison
* sight-singing melody follow-along practice
* the P8c large pitch trend chart direction
* the P8e live pitch trend data shape and rendering contract
* later browser-local real-time feedback

P9a is a docs-only planning step. It does not implement parsing, conversion, live feedback, or rendering behavior.

## 2. Current status

The current app does not implement any of the following:

* real target curve generation
* MusicXML parsing for target curve generation
* score-derived live feedback
* real-time microphone feedback
* rhythm evaluation
* formal scoring
* Song Learning Mode
* audio import

The current `/practice` experience remains Browser Local Only Practice Mode. Existing melody steps and mock melody data can be treated only as a conceptual starting point for future target curve work. They do not represent a complete score conversion system, a MusicXML parser, or a score-derived feedback engine.

## 3. Input source hierarchy

Future target pitch curves should use this source hierarchy, from current prototype source to later structured sources:

1. **Mock melody / existing melody steps**: current Practice Mode prototype source for simple target notes.
2. **Recognized note sequence**: future normalized note list from OMR or score recognition results.
3. **MusicXML**: future more standard structured score source when imported or recognized score data is available.
4. **MIDI**: possible future structured note source.
5. **Local monophonic melody guide audio**: later-stage direction only, outside P9a.

P9a only designs the relationship between score data, MusicXML, note sequences, and target pitch curve concepts. It does not handle MP3/WAV import, accompaniment audio, human vocal guide recordings, source separation, or Song Learning Mode.

## 4. Minimal note sequence concept

A future normalized note sequence should be small and explicit enough to map into P8e target pitch segments. A minimal note item may include:

* `noteId`: stable id within the normalized sequence
* `noteName`: pitch class or display note name, such as `C`, `F#`, or `Bb`
* `octave`: octave number when the item is pitched
* `frequencyHz`: target frequency for pitch comparison and display
* `midiNumber`: MIDI pitch number for pitch math and transposition-friendly operations
* `startBeat`: start position in beat units
* `durationBeats`: duration in beat units
* `startTimeMs`: explicit start time in milliseconds after timeline alignment
* `endTimeMs`: explicit end time in milliseconds after timeline alignment
* `measureNumber`: measure index or number for display alignment
* `beatInMeasure`: beat position within the measure
* `displayLabel`: user-facing label for chart/tooltips, such as `C4` or `Rest`
* `isRest`: whether the item represents silence/rest instead of a target pitch
* optional tie/slur notes: fields or references describing ties and slurs from notation
* optional `sourceRef`: reference back to source score, MusicXML element, recognition result, or measure/note coordinate

`startTimeMs` and `endTimeMs` can be derived from tempo, beat positions, and note durations, but P9a does not implement tempo conversion or timing derivation code.

## 5. Target segment mapping

A future converter can map normalized note sequence items into P8e target pitch segments as follows:

* `noteId` maps to a target segment id, such as `targetId`.
* `noteName`, `octave`, `frequencyHz`, and `midiNumber` map to target pitch fields used by the chart and pitch comparison layer.
* `startBeat`, `durationBeats`, `startTimeMs`, and `endTimeMs` define segment timing.
* `measureNumber` and `beatInMeasure` support display alignment, tooltips, and future score-position context.
* Rests produce either no target segment or an explicit rest gap, depending on the future chart data contract.
* Repeated notes should remain separate target segments when they occupy separate rhythmic positions.
* Tied notes may become a single merged segment or linked adjacent segments; the first MVP should choose the simpler representation that keeps timing explicit.
* Slurs should be treated as visual phrase hints only and should not imply scoring behavior.
* A tolerance guide may be displayed as a visual guide only; it is not a formal pass/fail, grade, or scoring rule.

## 6. Timing assumptions

Future target curve comparison requires a clear shared time axis before live user pitch frames can be compared to target segments.

Initial MVP assumptions may include:

* fixed tempo or user-selected tempo
* explicit target curve timing before live comparison starts
* simple beat-to-millisecond conversion for straightforward monophonic melodies

Future timing considerations include:

* tempo changes
* fermata
* rubato
* pickup measures
* repeats
* complex notation and tuplets
* playback alignment and user-controlled count-in behavior

P9a does not implement a tempo engine, playback synchronization, score-following, or live alignment.

## 7. Monophonic-first boundary

The first target curve implementation should be monophonic-first for sight-singing melody practice:

* one target pitch at a time
* rests allowed
* simple rhythm allowed for display alignment only
* no polyphonic transcription
* no chord-to-melody inference
* no accompaniment melody guessing
* no formal rhythm scoring

This boundary keeps the MVP focused on a single active target segment for future target-relative user pitch comparison.

## 8. Rendering relationship

Future trend chart rendering can use score-derived target curve data this way:

* target segments render as note blocks or a guide line
* rests render as gaps
* repeated notes render as separate blocks
* the current active target segment can be highlighted
* the `0 cents` center line remains target-relative
* user pitch frames compare against the active target segment
* no-pitch and low-confidence user frames render as gaps
* the chart remains practice feedback, not a formal score, grade, pass, or fail result

This relationship should preserve the P8e separation between future target pitch segments, user pitch frames, and no-pitch / low-confidence gaps.

## 9. Practice Mode integration boundary

Future score-derived target curve integration must not automatically change existing Practice Mode behavior. Unless a later PR explicitly changes behavior:

* Play target does not start live feedback.
* Start live feedback does not auto-play the target.
* Switching melody steps does not start the microphone.
* Switching melody steps does not write attempt history.
* Record / Estimate flow remains separate from target playback and future live feedback.
* No persistence is added unless a later PR explicitly adds it.

## 10. Non-goals

P9a does not do any of the following:

* runtime code
* `app/practice/page.tsx` changes
* MusicXML parser implementation
* MIDI import
* MP3/WAV import
* melody guide audio import
* accompaniment playback
* microphone access
* `AudioContext`
* `getUserMedia`
* real-time recording
* frame-level pitch analysis
* target curve generation
* live chart rendering
* estimator changes
* Pitchy Practice Mode integration
* comparison harness changes
* benchmark gate / tolerance changes
* upload
* cloud assessment
* GPT / AI API
* formal score
* grade/pass/fail
* rhythm evaluation
* sight-singing assessment
* Song Learning Mode
* source separation
* vocal melody extraction
* `/api/recognize` changes
* recognition provider union changes
* PDF upload
* Audiveris
