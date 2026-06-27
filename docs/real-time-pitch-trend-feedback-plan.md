# P8a Real-Time Pitch Trend Feedback UX and Architecture Plan

## Purpose

This document records the product direction that P8b builds on. It is planning documentation only and does not change runtime behavior.

Future real-time pitch trend feedback should help a singer see whether the current sung pitch is above, below, or near the current Practice Mode target note. It should be browser-local, explicitly started by the user, and privacy-preserving.

## Direction

- Analyze microphone audio in the browser only after an explicit user action.
- Do not upload audio or send live audio frames to any server.
- Show target-relative cents offset instead of presenting a formal score.
- Show unknown / no pitch when frames are silent, unvoiced, unreliable, or below confidence thresholds.
- Keep feedback focused on pitch trend and intonation practice.
- Avoid rhythm evaluation, sight-singing assessment, grades, pass/fail labels, and conservatory-grade accuracy claims.

## P8b follow-up

P8b expands this direction into a concrete UI state-machine, mobile wireframe, button side-effect boundaries, Chinese copy draft, and future PR split. See `docs/real-time-pitch-feedback-ui-state-machine.md`.
