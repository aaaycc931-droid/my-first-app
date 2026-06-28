# Local Monophonic Melody Guide Audio Import Plan

## 1. Purpose

This document plans a future local monophonic melody guide audio import feature. The long-term goal is to let users import a local MP3 or WAV file that they have the right to use, analyze that file in the browser, and eventually generate a compatible target pitch curve for practice.

P10a is planning only. It does not implement audio import, file decoding, pitch extraction, target curve generation, or any `/practice` UI changes.

The intended input is a simple monophonic guide melody, such as a teacher playing the vocal melody line on piano. This feature direction is not complex accompaniment recognition, pure-accompaniment-to-melody inference, vocal separation, or Song Learning Mode implementation.

## 2. User scenario

A typical future user scenario is:

* A sight-singing or ear-training student has a short local audio file of a teacher playing the main melody on piano.
* The audio contains only the single-note melody the student should sing.
* The audio does not contain chords, dense accompaniment, polyphony, drums, bass, or a commercial song mix.
* The student wants the system to identify the melody and generate a target pitch trend.
* The student can later practice singing while following that target curve.

This scenario supports basic guided practice for students who do not have MusicXML or MIDI available but do have a simple local guide recording.

## 3. Accepted future input scope

Future acceptable input should stay narrow and explicit:

* Local MP3 file.
* Local WAV file.
* Monophonic piano melody guide.
* Monophonic keyboard melody guide.
* Simple sung or hummed guide vocal as a possible later extension.
* User-provided local file only.

A recommended first implementation phase would prioritize WAV before MP3 because WAV may be easier to validate and reason about during local decoding research. MP3 can be considered later after the browser decoding path and validation boundaries are confirmed.

P10a does not implement any import path for WAV, MP3, or any other audio format.

## 4. Out-of-scope audio

The future feature should not support or promise reliable results for:

* Complex accompaniment.
* Chords.
* Polyphonic piano.
* Full commercial song mixes.
* Vocal plus accompaniment mixed tracks.
* Source separation.
* Vocal isolation.
* Automatic accompaniment-to-melody inference.
* Drum, bass, or band mixes.
* Noisy rehearsal recordings.
* Copyrighted built-in song libraries.

The product boundary should remain clear: this is for local monophonic guide audio, not general music transcription or commercial song analysis.

## 5. Local-only and copyright boundary

A future implementation should preserve a conservative local-only boundary:

* The user provides their own local file.
* There is no built-in song library.
* There is no server upload by default.
* There is no cloud processing by default.
* There is no storage by default.
* Extracted curves are not shared by default.
* The user is responsible for having the rights to use their material.
* The product should not claim to bypass copyright restrictions.

This boundary keeps the feature aligned with practice support for user-provided learning material rather than content distribution or copyright circumvention.

## 6. Future processing pipeline

A future local-only pipeline could be explored in small steps:

1. User selects a local guide audio file.
2. Browser decodes the audio locally.
3. Audio is normalized to a mono analysis buffer and a consistent sample-rate strategy.
4. Monophonic pitch tracking estimates candidate pitch over time.
5. Confidence and voicing filters remove low-confidence or unvoiced frames.
6. Smoothing and outlier handling reduce obvious pitch spikes.
7. Optional note segmentation groups stable pitch regions.
8. The result maps to the existing `TargetPitchCurve` and `TargetPitchSegment` shape.
9. A visual preview is shown before practice.
10. The user confirms before the generated curve is used as the active target curve.

P10a does not implement any of these steps.

## 7. Relationship to existing P8 / P9 work

This plan builds on the pitch trend and target curve planning already completed:

* P8c provides the static pitch trend preview UI direction.
* P8e defines user and target pitch trend data concepts.
* P9d defines the `TargetPitchCurve` and `TargetPitchSegment` type contract.
* P9k proved that a static preview can read hand-authored target curve data.
* Future melody guide audio import should eventually produce compatible `TargetPitchCurve` data.
* P10a only plans this relationship and does not connect a new data source.

The future imported melody guide audio flow should be treated as one possible upstream source for target curve data, not as a replacement for MusicXML, MIDI, or hand-authored examples.

## 8. Accuracy and product claims boundary

Any future implementation must use cautious language. Even if a prototype works, product claims should remain limited:

* Suitable only for simple monophonic guide audio.
* Not guaranteed for complex music.
* Not conservatory-grade proof.
* Not formal scoring.
* Not rhythm evaluation.
* Not polyphonic transcription.
* Not accompaniment melody inference.
* Not commercial song analysis.

The feature should help students practice with a guide curve, but it should not be described as authoritative music transcription or assessment.

## 9. Suggested future milestones

Suggested small future PR sequence:

* P10b local melody guide audio input UX / consent plan, docs-only.
* P10c local audio decoding capability research, docs-only.
* P10d WAV-only local fixture convention, docs-only.
* P10e monophonic audio pitch tracking prototype plan, docs-only.
* P10f optional local-only WAV proof-of-concept, not connected to `/practice`.
* Later: target curve generation prototype from local monophonic guide audio.

Each milestone should preserve the MVP principle of one small, explainable change at a time.

## 10. Non-goals

P10a does not do any of the following:

* Runtime code.
* `app/practice/page.tsx` changes.
* File input UI.
* MP3 / WAV import implementation.
* Browser audio decoding.
* `AudioContext`.
* `getUserMedia`.
* Microphone access.
* Recording.
* Pitch tracking implementation.
* Note segmentation implementation.
* Target curve generation.
* Practice Mode integration.
* Live chart rendering.
* Converter changes.
* Generated fixture changes.
* MusicXML parser changes.
* MIDI import.
* Accompaniment playback.
* Source separation.
* Vocal separation.
* Song Learning Mode implementation.
* Cloud upload.
* Cloud assessment.
* GPT / AI API integration.
* Formal score.
* Rhythm evaluation.
* Sight-singing assessment.
* Estimator changes.
* Pitchy Practice Mode integration.
* Comparison harness changes.
* Benchmark gate / tolerance changes.
* `/api/recognize` changes.
* Recognition provider union changes.
* PDF upload.
* Audiveris.
* Dependency changes.
