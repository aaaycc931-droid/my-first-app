# audiveris-basic-01.source.md

## Source classification

- Sample kind: audiveris-real
- Exported by: Audiveris
- Audiveris version: 5.10.2
- Export format received: `.mxl`
- Extracted MusicXML file: `audiveris-basic-01.musicxml`
- MusicXML structure manually edited: no
- MXL archive manually edited: no

## Export metadata observed in MusicXML

- Software tags include:
  - Audiveris 5.10.2
  - ProxyMusic 4.0.3
- Encoding date observed: 2026-06-14
- Original source image path was present in the raw MusicXML export.

## Privacy / commit note

The raw MusicXML contained a local Windows source image path, including user-specific directory and filename information.
For the committed fixture, only the two metadata values in `<source>` and the `source-file` miscellaneous field were replaced with `[REDACTED_LOCAL_SOURCE_PATH]`. The note, measure, pitch, duration, and other score structure were not changed. The unredacted raw export must remain outside the repository.

## Intended repository location

Fixture location:

- `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`
- `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.expected.json`
- `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.source.md`

## Notes

This is a real Audiveris-exported sample, but recognition accuracy may be imperfect because Audiveris warned that the source image had a low interline value.
The purpose of this sample is parser compatibility testing, not final OMR accuracy evaluation.
