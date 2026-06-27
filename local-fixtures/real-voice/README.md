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

## PR reviewer checklist

Use this checklist before approving future PRs that touch the local real voice convention:

- [ ] No real audio files, exported clips, derived audio assets, or audio fixtures are committed.
- [ ] No real `metadata.local.json` or other local-only metadata file is committed.
- [ ] No real names, email addresses, phone numbers, addresses, exact locations, account ids, device owner names, or other identifiable personal information are included.
- [ ] Local real voice validation is not connected to CI and is not added to `npm run validate:local`.
- [ ] The pitch estimator algorithm is unchanged.
- [ ] The Practice Mode UI workflow is unchanged.
- [ ] No score, formal score, grade, pass label, fail label, rhythm evaluation, or sight-singing assessment is added.
- [ ] Blocking gates, tolerance values, and target frequencies are unchanged.
- [ ] Exploratory cases remain exploratory and are not promoted to blocking.
- [ ] The PR does not introduce uploads, AI API calls, external datasets, Audiveris integration, `/api/recognize` changes, recognition provider union changes, or PDF upload behavior.
- [ ] The PR clearly keeps this workflow local-only, opt-in, non-blocking, and outside CI.

The fuller reviewer checklist is documented in `docs/real-voice-dataset-plan.md#15-p5e-local-real-voice-pr-reviewer-checklist`.

## P7i real phone recording comparison protocol extension

P7i extends this local-only convention for future real phone pitch engine comparison between the current in-repository autocorrelation estimator, Pitchy, and any separately approved candidate engine. This is still documentation and fixture convention only: do not commit real recordings, do not upload audio, do not add cloud evaluation, and do not make real phone results a CI blocker.

### Real phone comparison goal

Use local phone recordings to answer a narrow reporting question: under quiet indoor, single-voice, known-target-note conditions, which engine behaves most reliably for browser-local MVP pitch feedback? The local set is intended to expose gross pitch error, octave error, false voiced frames, false unvoiced frames, out-of-human-range estimates, and drift or vibrato anomalies. It is not a formal score, grade, pass/fail result, conservatory-grade accuracy claim, rhythm evaluation, sight-singing assessment, or Song Learning Mode implementation.

### Recording collection protocol

- Devices: collect at least iPhone Safari and Android Chrome samples when available; optionally add non-identifying phone model notes and laptop microphone comparison samples.
- Environment: record in a quiet indoor room with one singer and no accompaniment.
- Microphone distance: keep the mouth roughly 20-40 cm from the microphone.
- Target note playback: prefer headphones so the phone microphone does not capture the target tone from speaker playback; use `playbackMode: "speaker"` only when intentionally documenting leakage risk.
- Sample shape: each audio file should contain one target note or one clearly bounded practice fragment.
- Storage: keep files only under ignored local paths such as `local-fixtures/real-voice/audio/`; never commit real audio.
- Metadata: every local recording must have a corresponding ignored `metadata.local.json` sample record before it is used for comparison.
- Privacy: do not record real names, phone numbers, email addresses, exact addresses, account ids, school/workplace names, or other direct personal identity data in metadata.

### Minimum initial coverage

Start with a small matrix rather than a large dataset:

| Field | Initial values |
| --- | --- |
| `targetNote` | `C4`, `E4`, `G4`, `A4`, `C5`; optionally `A3` / `C3` for lower male voices |
| `vowel` | `a`, `e`, `i`, `o`, `u` |
| `durationSeconds` | `1`, `3`, `5` |
| `volume` | `soft`, `normal`, `loud` |
| `performanceType` | `stable`, `light-vibrato`, `intentional-drift`, `no-pitch` |
| `deviceClass` | `iphone-safari`, `android-chrome`, `laptop-mic` |
| `roomCondition` | `quiet-room` |
| `singerRange` | `male-low`, `male-mid`, `female-mid`, `female-high`, `unknown-nonidentifying` |

### Real phone metadata fields

For P7i-style local phone comparison, copy `metadata.example.json` to the ignored `metadata.local.json` and include these fields where possible: `id`, `audioFile`, `targetNote`, `expectedFrequencyHz`, `targetFrequencyHz`, `vowel`, `durationSeconds`, `deviceClass`, `browser`, `os`, `microphoneDistanceCm`, `playbackMode`, `roomCondition`, `recordingCondition`, `volume`, `performanceType`, `singerRange`, `consentStatus`, `localOnly`, `includeInPitchEngineComparison`, `expectedBehavior`, and `caveats`.

`metadata.local.json` and all real audio files remain ignored. The committed `metadata.example.json` is only a placeholder shape and must not contain a real recording path, real person, or private device owner information.

### Future local comparison execution design

A future P7j PR may add an opt-in local script that reads ignored `metadata.local.json` plus ignored local audio fixtures, runs the current estimator and Pitchy over the same recordings, and writes a reporting-only comparison summary. That script should reuse P7g anomaly flags, stay outside CI, avoid benchmark gate changes, and exit safely with a clear message when metadata or audio is missing instead of blocking normal validation.

### Mobile browser validation table

| Check | iPhone Safari | Android Chrome | Notes |
| --- | --- | --- | --- |
| Microphone permission prompt appears and can be granted | pending manual check | pending manual check | No automated CI requirement |
| Stable local recording is possible | pending manual check | pending manual check | Watch for browser interruptions |
| Echo cancellation / noise suppression / auto gain control impact is visible | pending manual check | pending manual check | Document if pitch frames become unreliable |
| Headphones reduce target-tone leakage | pending manual check | pending manual check | Prefer `playbackMode: headphones` |
| Low-end phone stutter or dropped frames | pending manual check | pending manual check | Report as caveat, not failure |
| Latency feels suitable for future real-time trend exploration | pending manual check | pending manual check | Do not implement trend charts in P7i |
| Unreliable frames show unknown / no pitch rather than random note names | pending manual check | pending manual check | Use anomaly reporting language only |
