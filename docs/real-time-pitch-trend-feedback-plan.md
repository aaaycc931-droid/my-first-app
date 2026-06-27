# P8a Real-Time Pitch Trend Feedback UX & Architecture Plan

## 1. Purpose

P8a plans a future browser-local real-time pitch trend feedback experience for Practice Mode. It is documentation only. It does not implement real-time microphone listening, a trend chart, scoring, Practice Mode workflow changes, pitch-estimator changes, Pitchy adapter changes, comparison-harness behavior changes, new dependencies, persistence, cloud assessment, audio upload, or AI API calls.

The long-term product direction is a sight-singing and ear-training practice system suitable for university music-school practice contexts, but the current MVP must remain honest: existing pitch evaluation is experimental and cannot be described as conservatory-grade accuracy.

## 2. Product goal

Future real-time pitch trend feedback should help a user hear and see whether their sung pitch is above, below, or close to the current target note while practicing locally in the browser.

The intended behavior is:

- the user explicitly starts microphone listening after entering a practice step;
- audio remains browser-local and is not uploaded;
- the page displays the current estimated pitch when reliable;
- the page displays cents offset relative to the current target note;
- the user can see whether their pitch trace is higher than, lower than, or near the target;
- unreliable frames display `unknown` / `no pitch` instead of guessed note names;
- pitch correctness is separated from sustained pitch instability such as drift, wobble, or wide vibrato;
- the feature does not create a formal score, grade, pass/fail result, or conservatory assessment claim.

## 3. Future UX shape

A simple MVP trend view should prioritize understandable practice feedback over dense analysis.

Recommended elements:

- **Current target note:** show the active melody step target note from Practice Mode.
- **Target center line:** show `0 cents` as the center line for the current target note.
- **Reference bands:** show simple guide lines such as `+50`, `+25`, `0`, `-25`, and `-50` cents.
- **Live pitch trace:** draw the user's recent frame-level pitch offsets relative to the current target note.
- **Status prompt:** show plain-language states such as `close`, `slightly sharp`, `slightly flat`, `unstable`, and `no pitch`.
- **Optional estimate details:** optionally show estimated note and estimated Hz for transparent debugging and learning.
- **Optional confidence detail:** optionally show confidence / clarity when the active engine provides it, but label it as reliability context, not a score.
- **Low-confidence behavior:** hide the trace segment, break the line, or show `no pitch` when the frame is unreliable.

The chart must not be explained as a formal assessment. It should be copy-framed as a practice aid: useful for noticing tendencies, not a final judgment of musicianship.

## 4. Relationship to melody step practice

Real-time trend feedback should be target-aware and step-aware without changing the existing melody step flow.

Rules for a future implementation:

- the current Practice Mode step provides the target note;
- cents offset is calculated relative to the current target note, not only the nearest estimated note;
- switching steps does not automatically start microphone listening;
- playing the target note does not automatically start microphone listening;
- real-time feedback starts only after an explicit user action such as `Start live feedback`;
- stopping feedback may optionally offer a local attempt summary, but that summary needs separate design;
- the current local attempt history behavior should not change unless a future PR designs it explicitly;
- target-note playback and microphone listening should be separated so target audio does not accidentally become the measured input.

## 5. Technical architecture direction

A future MVP implementation can use a browser-local audio pipeline:

1. Request microphone permission only after a clear user action.
2. Read the microphone stream with Web Audio APIs.
3. Slice audio into short analysis frames suitable for local pitch estimation.
4. Run frame-level pitch analysis in the browser.
5. Apply confidence / clarity gating before showing a pitch value.
6. Convert reliable frequency estimates into cents offset relative to the current target note.
7. Smooth or debounce the displayed trend enough to reduce visual jitter without hiding real instability.
8. Preserve anomaly and no-pitch handling so unreliable frames become `unknown` / `no pitch`.
9. Keep all live state local to the browser session.
10. Avoid network upload, AI API calls, and cloud assessment in the real-time MVP.

The implementation should prefer transparent raw/reporting feedback first. Smoothing should improve readability, not rewrite poor estimates into a false sense of correctness.

## 6. Pitch engine strategy

The current in-repository autocorrelation estimator remains the baseline. Pitchy / McLeod remains a comparison candidate through the existing adapter and harness; it is not a production replacement.

Important boundaries:

- the P7 comparison harness and P7k one-sample A3 phone smoke test are useful plumbing evidence, not accuracy proof;
- the real-time prototype may start with the current estimator or an adapter abstraction, but it must not claim conservatory-grade accuracy;
- Pitchy comparison output should remain comparison evidence until broader mobile recordings and performance tests are available;
- future phone validation should cover more notes, vowels, singer ranges, devices, volumes, vibrato, drift, weak voice, and noisy-room conditions;
- trend feedback should expose raw/reporting behavior and no-pitch states instead of changing benchmark gates, tolerances, or exploratory-case status.

## 7. Mobile considerations

The real-time design must be verified on phones, not inferred from desktop behavior.

Key concerns:

- iPhone Safari and Android Chrome microphone permission flows differ and should both be tested;
- browser and OS echo cancellation, noise suppression, and automatic gain control may affect pitch estimates;
- users should be encouraged to wear headphones so target-note playback does not leak into the microphone;
- low-end phone CPU, battery, thermal behavior, and UI responsiveness need explicit testing;
- latency from audio frame to visual feedback must be measured before making product claims;
- the trend UI should fit a phone screen with readable target note, status, and recent trace;
- silence, breath noise, consonants, and unvoiced frames should produce `no pitch`, not confident-looking wrong notes.

## 8. Non-goals

P8a and the future real-time MVP plan explicitly do not include:

- formal scoring;
- grades or pass/fail labels;
- rhythm evaluation;
- full sight-singing assessment;
- cloud deep assessment;
- audio upload;
- GPT or other AI API calls;
- user accounts;
- persistence;
- Song Learning Mode;
- song upload;
- source separation;
- vocal melody extraction;
- target pitch curve generation;
- replacing the current estimator;
- claiming professional or conservatory-grade accuracy;
- installing Pitchfinder, CREPE, RMVPE, SwiftF0, or other new engines;
- changing benchmark gates or relaxing tolerance;
- putting real phone tests into CI;
- modifying `/api/recognize`, the recognition provider union, PDF upload, or Audiveris behavior.

## 9. Recommended next step

The next small PR should remain implementation-light: add a UI wireframe / state-machine design for `Start live feedback`, `Listening`, `No pitch`, `Stopped`, and `Permission denied` states, still without recording implementation. After that, a separate prototype PR can test a browser-local microphone pipeline behind a clear manual QA checklist and without changing existing Practice Mode attempt history or benchmark gates.
