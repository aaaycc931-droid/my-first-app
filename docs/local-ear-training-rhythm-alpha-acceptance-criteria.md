# P57 — Local Ear-Training Rhythm Runtime Alpha Acceptance Criteria

## Purpose and boundary

P57 adds a runnable browser-local rhythm-listening slice to `/practice` under “听辨练习”. It trains recognition of a small set of fixed, four-beat built-in rhythm shapes through voluntary browser Web Audio click playback and a user-selected answer. It is session-only and non-scoring.

P57 does not upload or read files, access a microphone, call an API, write `localStorage` or IndexedDB, create an account, database, cloud record, downloaded question bank, final target, official transcription, formal scoring, percentage, grade, pass/fail result, OCR / OMR, or `/api/recognize` call.

## Required flow

1. The default `/practice` entry remains “本地旋律”; the user explicitly opens “听辨练习”.
2. The rhythm panel clearly says it is an internal, local, session-only rhythm-listening exercise and not a formal result.
3. The user can choose 基础 or 进阶 difficulty. Changing difficulty stops playback and clears the current selection and answer display.
4. The user can play or stop the current four-beat pattern. The first beat uses a higher local synthesized click; the remaining onset clicks use a lower one.
5. The user chooses one visible rhythm-shape label, then explicitly opens the answer explanation.
6. The answer states whether the current selection agrees with the fixed answer and explains the pattern, without score, accuracy, grade, pass, or fail language.
7. Reset clears selection, answer display, playback and audio error for the current question. Next advances deterministic built-in sequence and likewise clears old state.
8. Browser playback failure is shown with Simplified Chinese recovery text.
9. Refresh removes sequence, selection and answer state. No persistence is introduced.

## Built-in scope

- Fixed `4/4` one-measure patterns only.
- 基础 includes 四拍均匀、前半小节更密、后半小节更密.
- 进阶 adds 中间留空.
- The answer is a rhythm-shape label and explanation, not a transcription editor or a formal rhythm-evaluation result.

## Required verification

- Focused pure-helper test covers deterministic question rotation, pattern contents, selection / answer behavior, playback duration and absence of assessment fields.
- Component type check and production build are required.
- Browser QA is strict: default navigation, local playback/stop state, answer/reset/next, difficulty reset, refresh loss, Chinese copy and no misleading formal-result language.
