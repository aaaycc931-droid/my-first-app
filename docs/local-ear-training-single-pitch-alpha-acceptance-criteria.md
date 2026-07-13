# P58 — Local Ear-Training Single-Pitch Runtime Alpha Acceptance Criteria

## Scope

P58 adds a browser-local, session-only built-in single-pitch listening exercise to `/practice` → “听辨练习”. The user voluntarily plays one local synthesized sine tone, selects a displayed pitch name, then explicitly opens a brief answer explanation. It is a small built-in exercise, not a formal assessment.

## Required behavior

1. `/practice` still defaults to “本地旋律”; the user explicitly opens “听辨练习”.
2. 基础 provides C4、D4、E4、G4; 进阶 also provides A4、B4.
3. Difficulty changes stop playback and clear sequence, selection and answer visibility.
4. Play and stop control only browser-local Web Audio. Audio failure provides a Simplified Chinese recovery message.
5. A choice is required before answer display. The explanation says whether the current selection agrees with the fixed answer, without score, accuracy, grade, pass, or fail language.
6. Reset and next stop playback and clear old selection / answer state. Refresh removes all local session state.

## Boundary

P58 adds no microphone access, recording, upload, API call, localStorage, IndexedDB, account, database, cloud, persistence, downloaded question bank, final target, official transcription, OCR / OMR, `/api/recognize`, formal score, percentage, grade, pass/fail result or dependencies.

## Verification

Focused helper tests cover deterministic rotation, frequencies, answer behavior and absence of assessment fields. Component type check, build, `git diff --check`, remote checks and strict production browser QA are required.
