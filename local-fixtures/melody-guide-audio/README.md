# Local Melody Guide Audio Fixtures

This directory defines the P10d WAV-only local fixture convention for future monophonic melody guide audio research. It is documentation, local directory structure, and an opt-in metadata-only validation script.

Do not commit real audio, real `metadata.local.json`, copyrighted materials, teaching-library audio, commercial song clips, or user recordings.

## Local layout

```text
local-fixtures/melody-guide-audio/
  README.md
  metadata.example.json
  metadata.local.json       # local-only, ignored by git
  audio/
    .gitkeep
    *.wav                   # local-only, ignored by git
```

## First-phase scope

Future first-phase local research should use only short, user-provided, uncompressed PCM WAV clips containing one monophonic melody guide. Piano or keyboard melody guide clips are preferred. Chords, polyphony, accompaniment, full song mixes, source separation, vocal separation, cloud processing, and built-in copyrighted song libraries are outside this convention.

## Metadata

Copy `metadata.example.json` to ignored `metadata.local.json` only on a developer machine when preparing local research materials:

```bash
cp local-fixtures/melody-guide-audio/metadata.example.json local-fixtures/melody-guide-audio/metadata.local.json
```

Then update only local-safe, non-identifying metadata values. Keep real WAV files under `local-fixtures/melody-guide-audio/audio/`; those WAV files and `metadata.local.json` stay local and ignored by git.

## Metadata-only validation

Run the opt-in local validator with:

```bash
npm run validate:local-melody-guide-fixtures
```

The validator checks the committed fake/sample-only `metadata.example.json`. If ignored `metadata.local.json` is absent, it prints a skip message and exits successfully. If `metadata.local.json` exists, it validates JSON shape, allowed metadata values, basic numeric constraints, safe `audio/*.wav` file references, and local referenced-file existence.

This validation is metadata-only. It does not read WAV binary contents, decode audio, analyze audio, create `AudioContext`, use `getUserMedia`, verify copyright ownership, prove the clip is actually monophonic, perform pitch tracking, or generate target curves.

P10f does not integrate these fixtures with Practice Mode.

## Metadata validator negative tests

Run the local metadata validator negative case harness with:

```bash
npm run test:local-melody-guide-validator
```

The harness creates temporary fake fixture roots to confirm valid metadata passes, invalid metadata fails, and missing `metadata.local.json` skips cleanly. It does not write to the real `local-fixtures/melody-guide-audio/metadata.local.json`, does not touch user-local metadata, and deletes its temporary fixtures when finished.

The harness may create an empty temporary `sample.wav` placeholder only for file existence checks. It does not read WAV binary contents, decode audio, analyze audio, create `AudioContext`, use `getUserMedia`, perform pitch tracking, or generate target curves.
