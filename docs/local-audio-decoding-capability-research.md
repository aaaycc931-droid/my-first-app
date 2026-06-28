# P10c Local Audio Decoding Capability Research

## 1. Purpose

This document researches the feasibility, limits, risks, and recommended sequencing for future browser-local WAV / MP3 decoding if the product later supports user-provided local monophonic melody guide audio.

P10c is research only. It does not implement file import, audio decoding, `AudioContext`, pitch tracking, target curve generation, or Practice Mode integration.

## 2. Current project status

The current project still has no local melody guide audio decoding implementation. Specifically, there is no:

* file input for melody guide audio
* MP3 / WAV import
* browser audio decoding pipeline
* `AudioContext` for imported guide audio
* `getUserMedia` connection for guide audio import
* microphone access for this feature
* recording for this feature
* pitch tracking from imported audio
* note segmentation from imported audio
* target curve generation from imported audio
* Practice Mode integration for imported guide audio

## 3. Candidate local decoding paths

### A. WAV-first local file path

A WAV-first path is the preferred first research and proof-of-concept direction.

Potential advantages:

* PCM WAV is simpler to inspect and validate than compressed formats.
* Sample rate, channel count, duration, and uncompressed PCM encoding are easier to constrain.
* WAV is a better fit for a future local fixture convention because deterministic local files are easier to reason about.
* A narrow WAV subset can reduce ambiguity before pitch tracking or target curve generation is attempted.

Known limitations:

* WAV files are larger than compressed audio files.
* Ordinary users may be less likely to have WAV examples than MP3 examples.
* Future UX must clearly explain that early support may be intentionally narrow.

### B. MP3 later via browser decoding

MP3 is a likely later user-facing format because many users recognize it and may already have short demonstration clips in that format.

Potential advantages:

* MP3 is common and familiar.
* Smaller files are easier for users to store and select locally.

Known risks and constraints:

* Browser support and decoding behavior need dedicated validation.
* Metadata and duration reporting may be less predictable than a constrained PCM WAV path.
* Decode failures may be harder for users to understand.
* Mobile browser memory and performance behavior need separate real-device checks.
* MP3 should not be the first implementation target until browser support, metadata behavior, consent copy, error states, and UX expectations are documented.

### C. Web Audio API `decodeAudioData` future path

The Web Audio API `decodeAudioData` path is a future candidate technical route for browser-local decoding.

P10c only records this as a possible future approach. P10c does not create an `AudioContext`, does not call `decodeAudioData`, and does not add any code.

If a future PR uses this path, it should be separate and should explicitly document:

* local-only processing
* user-triggered file selection and analysis
* no upload by default
* maximum duration and file size limits
* memory and performance risk handling
* resource cleanup expectations
* clear decode failure and unsupported-format errors
* mobile browser behavior validation

## 4. Recommended initial direction

The recommended initial direction is:

* Start with WAV-first research and a local fixture convention.
* Treat MP3 as later validation after browser support and UX risks are documented.
* Start with short clips, such as 5–30 seconds.
* Limit scope to monophonic melody only.
* Exclude complex accompaniment.
* Exclude commercial song mixes.
* Do not attempt source separation.
* Do not use cloud processing by default.

This sequence keeps the first future experiment small, local, explainable, and easier to validate.

## 5. Future validation questions

Before any real implementation, future PRs should answer:

* Which WAV formats are supported: PCM only, or more?
* How should sample rate differences be handled?
* Should stereo audio be rejected, downmixed to mono, or user-confirmed before analysis?
* What is the duration limit?
* What is the file size limit?
* How should decode failures be explained to the user?
* Is mobile browser memory sufficient for the chosen limits?
* Do iOS Safari and Android Chrome behave consistently enough for the selected path?
* Is MP3 duration metadata reliable enough for user-facing limits?
* Is explicit user action required before analysis starts?
* How does the UI prove or explain that audio is not uploaded?
* How does the product avoid implying support for arbitrary song analysis?

## 6. Future error states

Future implementation planning should include clear error states for:

* unsupported format
* file too large
* duration too long
* decode failed
* unsupported encoding
* too noisy
* likely polyphonic / chordal audio
* no stable pitch detected
* browser decoding unavailable
* memory or performance limitation
* experimental feature warning

These states should be written for users, not only developers.

## 7. Relationship to P10b UX / consent

This research should directly support the P10b UX and consent flow. The decoding capability boundaries should inform:

* file requirements
* local-only consent copy
* rights confirmation
* monophonic checklist language
* error messages
* experimental warnings
* no-upload / no-cloud boundary language

Any future implementation should preserve the user expectation that selected local audio stays local unless a separate, explicit opt-in cloud design is created.

## 8. Relationship to target curve pipeline

Future local decoding would only be the first stage of a longer target curve pipeline:

```text
local file selection → local decoding → normalized audio buffer → monophonic pitch tracking → filtering / smoothing → optional note segmentation → TargetPitchCurve
```

P10c does not implement any stage of this pipeline.

## 9. Security / privacy / copyright boundary

Future local guide audio work should keep these boundaries:

* user-provided local files only
* no built-in song library
* no upload by default
* no server storage by default
* no public sharing by default
* no copyright bypass claim
* cloud analysis, if ever added, requires separate opt-in and design

The feature should not imply that the app can legally or technically analyze any commercial song mix. The intended future scope is short, user-provided, monophonic demonstration audio.

## 10. Non-goals

P10c does not include:

* runtime code
* `app/practice/page.tsx` changes
* file input UI
* MP3 / WAV import implementation
* browser audio decoding implementation
* `AudioContext` creation
* `getUserMedia`
* microphone access
* recording
* pitch tracking
* note segmentation
* target curve generation
* Practice Mode integration
* live chart rendering
* converter changes
* generated fixture changes
* MusicXML parser changes
* MIDI import
* accompaniment playback
* source separation
* vocal separation
* Song Learning Mode implementation
* cloud upload
* cloud assessment
* GPT / AI API usage
* formal score
* rhythm evaluation
* sight-singing assessment
* estimator changes
* Pitchy Practice Mode integration
* comparison harness changes
* benchmark gate / tolerance changes
* `/api/recognize` changes
* recognition provider union changes
* PDF upload
* Audiveris changes
* dependency changes
