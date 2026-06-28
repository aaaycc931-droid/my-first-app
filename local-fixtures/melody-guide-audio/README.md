# Local Melody Guide Audio Fixtures

This directory defines the P10d WAV-only local fixture convention for future monophonic melody guide audio research. It is documentation and local directory structure only.

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

Copy `metadata.example.json` to ignored `metadata.local.json` only on a developer machine when preparing local research materials. Keep every value non-identifying and local-only.

P10d does not read metadata, read WAV files, decode audio, create `AudioContext`, track pitch, generate target curves, or integrate with Practice Mode.
