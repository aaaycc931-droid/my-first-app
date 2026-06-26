# Local Real Voice Fixtures

This directory defines a local-only convention for future developer real voice experiments. It is intentionally a convention and metadata template only: do not commit real recordings, audio fixtures, exported clips, or derived audio assets here.

## Purpose

Use `local-fixtures/real-voice/` only on a developer machine when manually experimenting with real sustained-note recordings for the experimental local pitch estimate. The folder is meant to make future local tests easier to describe without changing product behavior or CI.

## Local folder convention

Recommended local layout:

```text
local-fixtures/real-voice/
  README.md
  metadata.example.json
  metadata.local.json        # local-only, ignored by git
  audio/                     # local-only, ignored by git
    <id>.wav                 # local-only, ignored by git
```

Only `README.md` and `metadata.example.json` should be committed. Real audio files and local metadata files must remain on the developer machine.

## Metadata expectations

Local metadata should avoid names, email addresses, account ids, exact locations, or other direct personal identifiers. Prefer broad categories such as device class and recording condition.

Required fields for local experiment records:

- `id`: non-identifying local sample id.
- `targetNote`: intended sustained note, such as `A4`.
- `expectedFrequencyHz`: expected equal-tempered frequency for the target note.
- `vowel`: intended sung vowel, such as `ah`, `ee`, or `oo`.
- `durationSeconds`: approximate recording duration in seconds.
- `singerRange`: broad range label or approximate comfortable range, without personal identity.
- `recordingCondition`: short local condition label.
- `deviceClass`: broad recording device category.
- `consentStatus`: consent category for the local sample.
- `localOnly`: must be `true` for this convention.
- `caveats`: known limitations or notes for interpretation.

See `metadata.example.json` for a text-only template with placeholder values.


## Opt-in local metadata validation

Developers who create the ignored local file `local-fixtures/real-voice/metadata.local.json` can manually run:

```bash
npm run validate:local-real-voice-fixtures
```

The script validates only the text metadata shape from this convention. If `metadata.local.json` is missing, the script explains that this is normal and exits successfully. The script is local-only, opt-in, and non-blocking: it is not part of CI and is intentionally not included in `npm run validate:local`.

The script does not read audio file contents, upload anything, call the network, call AI APIs, connect external datasets, change product behavior, change pitch estimation, or add scores, grades, pass/fail labels, rhythm evaluation, or sight-singing assessment.

## Boundaries

This convention does not:

- add real audio files or audio fixtures to the repository
- upload audio
- call AI APIs
- connect external datasets
- change the pitch estimator algorithm
- change Practice Mode UI workflow
- add scores, grades, pass/fail labels, rhythm evaluation, or sight-singing assessment
- change blocking gates, tolerances, or exploratory case status
- connect real voice fixtures to CI
- modify `/api/recognize`, recognition providers, PDF upload, or Audiveris behavior

If a future PR adds a validation script for these local files, it must be opt-in, local-only, and non-blocking by default. It must not become part of CI or product gating without a separate explicit design and review.
