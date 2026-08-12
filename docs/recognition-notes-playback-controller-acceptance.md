# Recognition notes playback controller acceptance

Status: **Active implementation acceptance**

Last verified: 2026-08-13

## Scope and root cause

The `/recognize` page previously shared one browser audio channel and one mutable
timeout array across every main-result and dev-only Audiveris preview. A cleared
callback that was already queued could still run after replacement, stop the new
channel sources, discard the new timer handles, and publish the old note index or
idle state.

This slice moves recognition-note scheduling and timer ownership behind one
framework-free latest-wins controller, a recognition-specific browser port, and
a StrictMode-safe React hook.

## Required behavior

- every non-empty play invalidates the previous generation before creating new
  sources or timers;
- old note and completion callbacks return before touching channel, timers, or
  state, even when forced after `clearTimer`;
- main-result playback tracks the active note; both Audiveris previews do not;
- stop, source replacement, failure, natural completion, and dispose clear all
  owned timers and stop sources best-effort;
- empty playback is a complete no-op and does not stop a current run or clear an
  existing error;
- stop clears playback/index but preserves the error; workflow error clearing is
  a separate command;
- cleanup exceptions cannot prevent terminal state, and a current failure can be
  retried.

## Compatibility boundary

The page still owns BPM and DOM/JSX. BPM remains 40–240 with default 120; eighth,
quarter, half, and whole notes remain 0.5/1/2/4 beats. Playback keeps the same
continuous ordering, `currentTime + 0.04` start, sine oscillator, 0.0001 → 0.16
→ 0.0001 envelope, note duration, and `total duration + 500 ms` completion.

The existing Chinese error copy, buttons/disabled states, active-note highlight,
workflow invalidation, dev-only Audiveris isolation, endpoints, provider,
FormData, feature flags, file validation, schema, and non-scoring/no-upload
boundaries remain unchanged. This slice does not add audio-session resumption,
global audio mutual exclusion, persistence, production OMR, or UI redesign.

## Automated evidence and QA boundary

`test:recognition-notes-playback-controller` covers the browser port envelope,
four duration values, BPM scheduling, natural completion, both replacement
directions, forced stale note/completion callbacks, empty no-op, failure/retry,
stop/error separation, cleanup exceptions, dispose, StrictMode replay, and page
ownership/source contracts. Existing recognition workflow, fail-closed, static
boundary, note-frequency, and browser-audio tests remain required.

Real browser autoplay/audio output, Safari, Android System WebView or installed
APK, background/audio-focus behavior, accessibility, teacher review, and target-
user QA remain `NOT_EXECUTED`.

QA level recommendation: **strict**.

