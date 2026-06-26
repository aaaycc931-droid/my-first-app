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


## `metadata.local.json` authoring guide

To create local real voice experiment metadata, copy the committed text-only example to the ignored local filename:

```bash
cp local-fixtures/real-voice/metadata.example.json local-fixtures/real-voice/metadata.local.json
```

Then edit `metadata.local.json` on your machine only. Keep the top-level shape as `{ "samples": [...] }`, add one object per local recording you personally own or have explicit local-use consent for, and keep every value non-identifying. Do not commit this file.

Field guidance for each sample:

- `id`: Use a short non-identifying local id that can match your local audio filename if needed, such as `local-a4-ah-001`. Do not use a real name, account id, email handle, or initials that identify a person.
- `targetNote`: Write the intended sustained pitch using a note name and octave, such as `A4`, `C4`, or `E5`. This is the note the singer attempted, not a measured result.
- `expectedFrequencyHz`: Write the expected equal-tempered frequency for `targetNote` as a number in hertz, such as `440` for `A4`. Do not use this field for measured estimator output.
- `vowel`: Write the intended sustained vowel using a simple label such as `ah`, `ee`, or `oo`. Avoid words or phrases that could reveal private context.
- `durationSeconds`: Write the approximate recording duration in seconds as a number, such as `1.5`, `2`, or `4`. This is approximate metadata, not a scoring target.
- `singerRange`: Use a broad, non-identifying range label such as `low-comfortable-range`, `middle-comfortable-range`, `high-comfortable-range`, `alto-like`, `tenor-like`, or `unspecified-comfortable-range`. Do not write a singer's name or biographical details.
- `recordingCondition`: Use a short broad condition label such as `quiet-room`, `laptop-fan-room-tone`, or `mild-background-noise`. Do not include addresses, workplace names, school names, or exact locations.
- `deviceClass`: Use a broad device category such as `laptop-built-in-microphone`, `phone-microphone`, or `usb-microphone`. Do not include serial numbers, account names, or device owner names.
- `consentStatus`: Use a consent category such as `developer-owned-local`, `explicit-local-use-consent`, or `do-not-share-local-only`. Only document recordings you are allowed to keep locally for this experiment.
- `localOnly`: Set this to `true`. Any other value is outside this convention.
- `caveats`: Use an array of short non-identifying notes about interpretation, such as `slight background noise`, `possible clipping`, or `uncertain starting pitch`. Do not include personal identifiers or private context.

Example local-only record shape:

```json
{
  "samples": [
    {
      "id": "local-a4-ah-001",
      "targetNote": "A4",
      "expectedFrequencyHz": 440,
      "vowel": "ah",
      "durationSeconds": 2,
      "singerRange": "middle-comfortable-range",
      "recordingCondition": "quiet-room",
      "deviceClass": "laptop-built-in-microphone",
      "consentStatus": "developer-owned-local",
      "localOnly": true,
      "caveats": [
        "Metadata example only; keep the matching recording local and uncommitted."
      ]
    }
  ]
}
```

Privacy and safety checklist before saving local metadata:

- Do not write real names.
- Do not write email addresses, phone numbers, home addresses, workplace names, school names, account ids, or exact locations.
- Do not write any information that could identify a person.
- Do not commit `metadata.local.json`.
- Do not commit any real recordings, exported clips, derived audio assets, or audio fixtures.
- Do not upload local recordings for this workflow.

After editing the ignored local file, manually run the opt-in validator when you want a metadata shape check:

```bash
npm run validate:local-real-voice-fixtures
```

This validation command is opt-in, local-only, non-blocking, and not part of CI. It is intentionally not included in `npm run validate:local`. It validates only text metadata shape and does not read audio contents, upload data, call AI APIs, connect external datasets, change product behavior, change pitch estimation, add scoring, add grades, add pass/fail labels, evaluate rhythm, or assess sight singing.

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
