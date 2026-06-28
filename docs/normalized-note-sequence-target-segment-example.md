# P9b Normalized Note Sequence to Target Segment JSON Example

## 1. Purpose

This document provides a docs-only JSON sketch showing how a small normalized note sequence could map into the P8e / P9a target pitch segment concept.

It demonstrates:

* a normalized note sequence
* target pitch segments
* a rest gap
* a repeated note
* a tied note expression choice
* measure / beat display alignment
* target-relative rendering assumptions

This example is intentionally illustrative. It is not a runtime schema, not a TypeScript type, not a MusicXML parser output contract, and not the final converter contract.

## 2. Non-goals

P9b does not implement or change any of the following:

* runtime code
* TypeScript type file
* converter implementation
* MusicXML parser
* MIDI import
* MP3 / WAV import
* melody guide audio import
* accompaniment playback
* target curve generation
* microphone access
* AudioContext
* getUserMedia
* real-time recording
* frame-level pitch analysis
* live chart rendering
* estimator changes
* Pitchy Practice Mode integration
* comparison harness changes
* benchmark gate / tolerance changes
* upload
* cloud assessment
* GPT / AI API
* formal scoring
* rhythm evaluation
* sight-singing assessment
* Song Learning Mode
* source separation
* vocal melody extraction
* `/api/recognize` changes
* PDF upload
* Audiveris

## 3. Example assumptions

This example uses a deliberately small monophonic melody so the mapping stays reviewable:

* `tempoBpm`: `60`
* `timeSignature`: `4/4`
* one beat = `1000ms`
* monophonic melody
* no chords
* no polyphony
* no rhythm scoring
* pitch curve timing is for visual alignment only

```json
{
  "exampleId": "p9b-simple-monophonic-4-4",
  "tempoBpm": 60,
  "timeSignature": "4/4",
  "beatDurationMs": 1000,
  "assumptions": {
    "texture": "monophonic",
    "chords": false,
    "polyphony": false,
    "rhythmScoring": false,
    "timingPurpose": "visual-alignment-only"
  }
}
```

## 4. Normalized note sequence example

The following sketch contains five normalized sequence items:

1. a normal note
2. a rest
3. a repeated note after the rest
4. the first part of a tied note
5. the ending part of the same tied note

The tied note is represented as two sequence items with the same `tieGroupId`. P9b recommends preserving both note items at this stage so measure / beat alignment remains explicit.

```json
{
  "normalizedNoteSequence": [
    {
      "noteId": "n1",
      "noteName": "C",
      "octave": 4,
      "frequencyHz": 261.63,
      "midiNumber": 60,
      "startBeat": 0,
      "durationBeats": 1,
      "startTimeMs": 0,
      "endTimeMs": 1000,
      "measureNumber": 1,
      "beatInMeasure": 1,
      "displayLabel": "M1 beat 1 · C4",
      "isRest": false,
      "tieGroupId": null,
      "tieRole": null,
      "phraseHintId": "phrase-1",
      "sourceRef": {
        "sourceType": "example-score",
        "measureNumber": 1,
        "voice": 1
      }
    },
    {
      "noteId": "r1",
      "noteName": null,
      "octave": null,
      "frequencyHz": null,
      "midiNumber": null,
      "startBeat": 1,
      "durationBeats": 1,
      "startTimeMs": 1000,
      "endTimeMs": 2000,
      "measureNumber": 1,
      "beatInMeasure": 2,
      "displayLabel": "M1 beat 2 · rest",
      "isRest": true,
      "tieGroupId": null,
      "tieRole": null,
      "phraseHintId": "phrase-1",
      "sourceRef": {
        "sourceType": "example-score",
        "measureNumber": 1,
        "voice": 1
      }
    },
    {
      "noteId": "n2",
      "noteName": "C",
      "octave": 4,
      "frequencyHz": 261.63,
      "midiNumber": 60,
      "startBeat": 2,
      "durationBeats": 1,
      "startTimeMs": 2000,
      "endTimeMs": 3000,
      "measureNumber": 1,
      "beatInMeasure": 3,
      "displayLabel": "M1 beat 3 · C4 repeated",
      "isRest": false,
      "tieGroupId": null,
      "tieRole": null,
      "phraseHintId": "phrase-1",
      "sourceRef": {
        "sourceType": "example-score",
        "measureNumber": 1,
        "voice": 1
      }
    },
    {
      "noteId": "n3",
      "noteName": "D",
      "octave": 4,
      "frequencyHz": 293.66,
      "midiNumber": 62,
      "startBeat": 3,
      "durationBeats": 1,
      "startTimeMs": 3000,
      "endTimeMs": 4000,
      "measureNumber": 1,
      "beatInMeasure": 4,
      "displayLabel": "M1 beat 4 · D4 tie start",
      "isRest": false,
      "tieGroupId": "tie-d4-m1b4-m2b1",
      "tieRole": "start",
      "phraseHintId": "phrase-1",
      "sourceRef": {
        "sourceType": "example-score",
        "measureNumber": 1,
        "voice": 1
      }
    },
    {
      "noteId": "n4",
      "noteName": "D",
      "octave": 4,
      "frequencyHz": 293.66,
      "midiNumber": 62,
      "startBeat": 4,
      "durationBeats": 1,
      "startTimeMs": 4000,
      "endTimeMs": 5000,
      "measureNumber": 2,
      "beatInMeasure": 1,
      "displayLabel": "M2 beat 1 · D4 tie end",
      "isRest": false,
      "tieGroupId": "tie-d4-m1b4-m2b1",
      "tieRole": "end",
      "phraseHintId": "phrase-1",
      "sourceRef": {
        "sourceType": "example-score",
        "measureNumber": 2,
        "voice": 1
      }
    }
  ]
}
```

## 5. Target pitch segment example

The corresponding target segment sketch maps pitched notes to target blocks and the rest to a rest gap / no active target window.

P9b recommends that the first implementation phase use linked tied segments rather than automatically merged tied segments. Keeping linked tied segments preserves measure / beat alignment and source traceability. A future renderer can still choose to visually connect or merge adjacent tied blocks.

```json
{
  "targetSegments": [
    {
      "targetId": "target-n1",
      "sourceNoteIds": ["n1"],
      "sourceType": "normalized-note",
      "noteName": "C4",
      "frequencyHz": 261.63,
      "expectedMidiNumber": 60,
      "startTimeMs": 0,
      "endTimeMs": 1000,
      "startBeat": 0,
      "endBeat": 1,
      "measureNumber": 1,
      "beatInMeasure": 1,
      "displayLabel": "M1 beat 1 · C4",
      "centsToleranceGuide": {
        "innerGuideCents": 25,
        "outerGuideCents": 50,
        "purpose": "display-only-not-pass-fail"
      },
      "segmentKind": "pitched-note",
      "tieGroupId": null,
      "shouldRenderAsTargetBlock": true,
      "shouldCreateFormalScore": false
    },
    {
      "targetId": "gap-r1",
      "sourceNoteIds": ["r1"],
      "sourceType": "normalized-rest",
      "noteName": null,
      "frequencyHz": null,
      "expectedMidiNumber": null,
      "startTimeMs": 1000,
      "endTimeMs": 2000,
      "startBeat": 1,
      "endBeat": 2,
      "measureNumber": 1,
      "beatInMeasure": 2,
      "displayLabel": "M1 beat 2 · rest gap",
      "centsToleranceGuide": null,
      "segmentKind": "rest-gap",
      "tieGroupId": null,
      "shouldRenderAsTargetBlock": false,
      "shouldCreateFormalScore": false
    },
    {
      "targetId": "target-n2",
      "sourceNoteIds": ["n2"],
      "sourceType": "normalized-note",
      "noteName": "C4",
      "frequencyHz": 261.63,
      "expectedMidiNumber": 60,
      "startTimeMs": 2000,
      "endTimeMs": 3000,
      "startBeat": 2,
      "endBeat": 3,
      "measureNumber": 1,
      "beatInMeasure": 3,
      "displayLabel": "M1 beat 3 · C4 repeated",
      "centsToleranceGuide": {
        "innerGuideCents": 25,
        "outerGuideCents": 50,
        "purpose": "display-only-not-pass-fail"
      },
      "segmentKind": "pitched-note",
      "tieGroupId": null,
      "shouldRenderAsTargetBlock": true,
      "shouldCreateFormalScore": false
    },
    {
      "targetId": "target-n3",
      "sourceNoteIds": ["n3"],
      "sourceType": "normalized-note",
      "noteName": "D4",
      "frequencyHz": 293.66,
      "expectedMidiNumber": 62,
      "startTimeMs": 3000,
      "endTimeMs": 4000,
      "startBeat": 3,
      "endBeat": 4,
      "measureNumber": 1,
      "beatInMeasure": 4,
      "displayLabel": "M1 beat 4 · D4 tie start",
      "centsToleranceGuide": {
        "innerGuideCents": 25,
        "outerGuideCents": 50,
        "purpose": "display-only-not-pass-fail"
      },
      "segmentKind": "pitched-note",
      "tieGroupId": "tie-d4-m1b4-m2b1",
      "shouldRenderAsTargetBlock": true,
      "shouldCreateFormalScore": false
    },
    {
      "targetId": "target-n4",
      "sourceNoteIds": ["n4"],
      "sourceType": "normalized-note",
      "noteName": "D4",
      "frequencyHz": 293.66,
      "expectedMidiNumber": 62,
      "startTimeMs": 4000,
      "endTimeMs": 5000,
      "startBeat": 4,
      "endBeat": 5,
      "measureNumber": 2,
      "beatInMeasure": 1,
      "displayLabel": "M2 beat 1 · D4 tie end",
      "centsToleranceGuide": {
        "innerGuideCents": 25,
        "outerGuideCents": 50,
        "purpose": "display-only-not-pass-fail"
      },
      "segmentKind": "pitched-note",
      "tieGroupId": "tie-d4-m1b4-m2b1",
      "shouldRenderAsTargetBlock": true,
      "shouldCreateFormalScore": false
    }
  ]
}
```

## 6. Mapping notes

* `noteId` maps into each segment through either `targetId` naming or `sourceNoteIds`.
* Rests may produce an explicit `rest-gap` segment or may be represented as no active target. This example uses an explicit `rest-gap` so timing remains visible.
* Repeated notes stay as separate target segments even when pitch is unchanged. This preserves articulation, source alignment, and future practice feedback boundaries.
* Tied notes are linked with `tieGroupId` and remain separate in this example. A future renderer may visually connect tied segments without losing measure / beat metadata.
* Slurs and phrase hints are visual phrase context only. They do not change target pitch, scoring, or pass/fail behavior.
* `centsToleranceGuide` is display-only. It is not a formal pass/fail tolerance, grade, or score threshold.
* All score-derived timing remains explicit before any live comparison. Live user pitch frames should not be compared against hidden or implicit timing.

## 7. Rendering notes

A future chart could use this example as follows:

* pitched target segments render as horizontal target blocks
* rest gaps render as blank space or no active target
* repeated notes render as separate blocks
* tied notes may render as connected blocks
* the `0 cents` line remains relative to the active target segment
* user pitch frames compare only when an active pitched target segment exists
* no-pitch / low-confidence frames remain gaps
* the chart remains practice feedback, not formal scoring

## 8. Future implementation notes

Future converter work can grow from this docs-only example, but P9b intentionally does not implement conversion.

Possible later steps:

* P9c mock melody / melodySteps alignment with target segment shape
* P9d type-only sketch if needed
* P9e converter prototype from existing mock melody only
* later MusicXML / note sequence converter
