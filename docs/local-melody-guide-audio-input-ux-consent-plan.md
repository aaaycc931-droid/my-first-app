# P10b Local Melody Guide Audio Input UX / Consent Plan

## 1. Purpose

This document plans the future UX and consent flow for local melody guide audio import. The intended future feature is a browser-local path where a user imports a short, local, monophonic melody demonstration audio file that may later be analyzed into a target pitch curve for practice.

P10b is documentation-only. It does not implement runtime code, file import, UI, audio decoding, pitch tracking, note segmentation, target curve generation, or Practice Mode integration.

## 2. User-facing positioning

Future product copy should describe the feature as one of the following:

* Local monophonic melody guide audio import.
* Import a monophonic melody demonstration audio file.
* 导入本地单旋律示范音频.
* 导入单旋律示范音频.

Future copy must not describe the feature as:

* automatic melody detection from arbitrary accompaniment;
* vocal separation from a song;
* commercial song melody recognition;
* singing-melody inference from a complex backing track;
* an implemented Song Learning Mode.

The feature should be positioned as a narrow practice helper for user-provided, simple, single-line melodic examples, not as a general song-analysis product.

## 3. Suggested entry point

A future UI entry point may live in either:

* an advanced area in Practice Mode; or
* a future Target Curve Source area.

Suggested entry copy:

* 导入本地单旋律示范音频
* 适用于只弹主旋律的钢琴 / 键盘示范
* 当前建议使用清晰、单音、无和弦、无复杂伴奏的音频

The entry should make the feature feel optional and experimental. It should not sit in the main beginner flow until the local analysis pipeline has clear reliability limits and user-facing warnings.

P10b does not modify `/practice` UI.

## 4. File requirement copy

Future file requirement copy should set clear expectations before analysis:

* Supported direction: WAV first, MP3 later.
* The file must be selected from the user's local device.
* The audio should contain one monophonic melody line.
* The audio should not contain chords.
* The audio should not contain complex accompaniment.
* The audio should not contain drums, bass, or full band mixes.
* The audio should use as little reverb as practical.
* Notes should be clear and separated enough for analysis.
* Recommended duration should be short, such as a 5–30 second practice fragment.
* The user should own or otherwise have the right to use the audio.

Future UI should show these requirements before analysis, not only after an error occurs.

## 5. Consent and rights copy

Future consent copy should require the user to acknowledge the local privacy and rights boundary before analysis:

* The file is processed only in the user's browser.
* The file is not uploaded by default.
* The file is not saved to a server by default.
* The file does not enter a public song library.
* The user must confirm that they have the right to use the audio.
* The feature does not provide song content.
* The feature does not bypass copyright restrictions.
* If cloud analysis is ever added, it must use a separate, explicit opt-in flow.

Suggested confirmation language:

> I confirm this is a local monophonic melody demonstration audio file that I have the right to use. Analyze it only in this browser.

## 6. Local privacy boundary

Future UI should visibly state the local boundary in plain language:

* Audio is analyzed only in the browser.
* Audio is not uploaded.
* Basic local analysis can be used without creating an account.
* Audio and results are not persisted by default.
* The flow does not call GPT or other AI APIs.
* The flow does not call cloud assessment services.

This boundary should remain visible near the action button so the user does not confuse local analysis with upload, cloud recognition, or AI assessment.

## 7. Pre-analysis confirmation flow

A future pre-analysis flow should be explicit and ordered:

1. The user selects a local file.
2. The UI displays file name, format, size, and duration when available.
3. The UI displays a suitable-audio checklist.
4. The user confirms the file is a monophonic melody demonstration audio file.
5. The user confirms they own or have rights to use the file.
6. The user clicks a clearly labeled action such as `仅在本地分析`.
7. Only after confirmation should a future decoding and pitch tracking pipeline begin.

P10b does not implement any of these steps. It only documents the intended consent and UX sequence.

## 8. Error / warning states

Future UI should plan for these states:

* File format is not supported yet.
* File is too long.
* File is too large.
* Audio may contain multiple voices or chords.
* No stable monophonic melody was detected.
* Audio noise is too high.
* Browser does not support local audio decoding.
* The feature is still experimental.
* Results are for practice reference only and are not formal scoring.

Warnings should be actionable where possible, for example by asking the user to try a shorter, clearer, single-note melody fragment.

## 9. Relationship to target curve

Only after a future analysis succeeds should the app consider generating a `TargetPitchCurve` or `TargetPitchSegment` representation from the imported guide audio.

P10b does not implement:

* audio decoding;
* pitch tracking;
* note segmentation;
* target curve generation;
* preview rendering;
* Practice Mode integration.

The document is a UX and consent plan for the eventual entry point and boundary language, not a technical implementation of the target curve pipeline.

## 10. Accessibility / mobile notes

Future UI should consider:

* readable file selection states on mobile;
* consent copy that is short enough to scan but explicit enough to prevent misunderstanding;
* readable error and warning states;
* clear disabled, loading, success, warning, and error button states;
* copy that does not imply the file has been uploaded;
* copy that does not imply cloud analysis has started;
* copy that does not imply arbitrary songs can be analyzed.

The consent and checklist copy should be available to screen readers and should not rely only on color or iconography.

## 11. Non-goals

P10b does not do any of the following:

* runtime code;
* `app/practice/page.tsx` changes;
* file input UI implementation;
* MP3 / WAV import implementation;
* browser audio decoding;
* `AudioContext`;
* `getUserMedia`;
* microphone access;
* recording;
* pitch tracking implementation;
* note segmentation implementation;
* target curve generation;
* Practice Mode integration;
* live chart rendering;
* converter changes;
* generated fixture changes;
* MusicXML parser changes;
* MIDI import;
* accompaniment playback;
* source separation;
* vocal separation;
* Song Learning Mode implementation;
* cloud upload;
* cloud assessment;
* GPT / AI API usage;
* formal score;
* rhythm evaluation;
* sight-singing assessment;
* estimator changes;
* Pitchy Practice Mode integration;
* comparison harness changes;
* benchmark gate / tolerance changes;
* `/api/recognize` changes;
* recognition provider union changes;
* PDF upload;
* Audiveris changes;
* dependency changes.
