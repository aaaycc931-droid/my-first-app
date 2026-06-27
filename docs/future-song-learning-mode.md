# Future Song Learning Mode Direction

## Purpose

P7h records the long-term product direction for a future Song Learning Mode. It is documentation-only planning and does not implement song upload, source separation, vocal melody extraction, target pitch curve generation, cloud assessment, GPT coaching, real-time pitch trend charts, or any Practice Mode workflow change.

The opportunity is clear: many singers want to learn real songs with pitch feedback, but ordinary pitch detection is not enough when the audio contains accompaniment, the original singer, instruments, and the user's live voice at the same time. A standard monophonic pitch detector can estimate a dominant pitch from a simple voice signal; it should not be described as source separation, polyphonic transcription, or reliable user-vocal isolation from a full commercial mix.

## Long-term product goal

Future Song Learning Mode should help users learn the melody of real songs by comparing their sung pitch curve with a trustworthy target melody curve. In the mature version, the mode could:

- help users practice real song melodies phrase by phrase;
- extract or generate a target pitch curve from an original vocal melody or authorized practice material;
- show the user's real-time pitch curve against the target melody during practice;
- summarize phrase-level intonation issues such as consistently sharp notes, flat landings, unstable sustained notes, or missed contour direction;
- provide GPT-assisted coaching only from structured analysis results, not from unsupported claims about raw mixed audio.

This mode is a future module. It does not replace the current browser-local Practice Mode, and it should not be used to imply that the current system can accurately analyze complex mixed songs.

## Why ordinary pitch detection is insufficient

Real song practice creates audio conditions that are outside the current MVP boundary:

- the original track may include drums, harmony, accompaniment, and effects;
- the original lead vocal may overlap with instruments and backing vocals;
- a phone microphone may capture the backing track, the original vocal, room reflections, and the user's live voice together;
- the user vocal and original vocal may sing the same phrase at similar pitches, making isolation difficult;
- accompaniment instruments can produce stronger energy than the sung melody in some frames.

Because of these conditions, future documentation and UI copy must not say that the current local pitch estimator, Pitchy comparison adapter, or pitch engine comparison harness can reliably identify the user's melody from a mixed song recording.

## Possible future technical chain

A future Song Learning Mode may require a separate pipeline from Practice Mode:

1. The user imports an authorized song, stem, karaoke track, teacher-provided material, or other practice source.
2. Source separation / stem separation separates lead vocal and accompaniment when legally and technically appropriate.
3. Vocal melody extraction estimates the original singer's main melody from the vocal stem or other clean reference.
4. Target pitch curve generation converts the extracted melody into a practice-ready target curve, with phrase boundaries and uncertainty markers.
5. During practice, browser-local real-time pitch tracking estimates the user's voice from the microphone.
6. The UI displays user pitch curve vs target pitch curve for phrase-level learning feedback.
7. With explicit user consent, optional cloud deep assessment may run heavier source-separation, melody-extraction, or vocal-analysis models.
8. GPT may explain structured results and suggest exercises, but should not receive or infer unsupported correctness from unvalidated mixed-audio analysis.

This chain is intentionally future-facing. None of these steps are implemented by P7h.

## Product usage guidance

Future Song Learning Mode should guide users toward cleaner recordings and clearer feedback:

- Use headphones or earbuds when practicing with accompaniment or a target track.
- Avoid phone speaker playback during recording, because the microphone may capture both the track and the user's voice.
- Prefer local real-time feedback on the user's live voice over attempting to judge a combined speaker-plus-voice recording.
- Treat analysis of mixed original songs as offline or cloud deep processing, not as a current browser-local real-time MVP promise.
- Clearly label uncertain frames, extracted-target uncertainty, and cases where the source material is too dense for reliable melody extraction.

## Relationship to current Practice Mode

Practice Mode remains the near-term MVP. It should continue to focus on:

- single-note practice;
- melody step practice;
- browser-local real-time or near-real-time feedback;
- target-aware pitch comparison;
- local attempt history;
- real phone recording validation before stronger product claims.

Song Learning Mode is a separate future module. It should not replace Practice Mode and should not weaken the current Practice Mode boundary. The existing pitch engine comparison harness remains useful for monophonic single-note and melody-step pitch-engine validation, but future Song Learning Mode will need separate evaluation assets:

- real-song benchmark datasets with clear rights and usage boundaries;
- source separation / stem separation evaluation;
- vocal melody extraction benchmarks;
- target pitch curve generation review;
- user vocal vs original vocal separation tests;
- copyright, licensing, consent, and storage policy review.

## Key risks and non-goals

Future Song Learning Mode planning must preserve these boundaries:

- Do not claim the current system accurately identifies melody from complex commercial song mixes.
- Do not claim the current system reliably separates user voice from accompaniment and original vocals.
- Do not implement song upload in the current MVP.
- Do not silently upload user audio, imported songs, stems, or practice files.
- Do not bypass copyright, licensing, consent, or storage-policy decisions.
- Do not describe ordinary monophonic pitch detection as source separation or polyphonic transcription.
- Do not write Song Learning Mode as if it is already implemented.
- Do not add formal scores, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, or persistence as part of this planning step.

## Future evaluation areas

Before implementation, Song Learning Mode needs separate research and product review for:

- source separation / stem separation;
- vocal melody extraction;
- polyphonic music transcription;
- target pitch curve generation;
- karaoke-style pitch trace UI;
- cloud deep assessment for song learning;
- GPT-assisted coaching based on structured song-learning analysis;
- copyright, licensing, user consent, retention, and storage policy;
- real song benchmark datasets;
- separating the user's live vocal from the original vocal and accompaniment.

## P7h explicit boundary

P7h is docs-only. It does not implement Song Learning Mode, song upload, source separation, vocal melody extraction, target pitch curve generation, real-time pitch trend charts, Practice Mode UI changes, pitch estimator changes, Pitchy adapter changes, comparison harness behavior changes, new pitch-engine dependencies, cloud assessment, GPT / AI API calls, audio upload, accounts, persistence, formal scores, grades, pass/fail labels, rhythm evaluation, sight-singing assessment, benchmark gate changes, tolerance changes, `/api/recognize` changes, recognition provider union changes, PDF upload, or Audiveris integration.
