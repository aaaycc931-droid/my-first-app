# P8b Real-Time Pitch Feedback UI State Machine and Wireframe Plan

## Purpose

P8b translates the earlier real-time pitch trend feedback direction into a concrete UI state-machine and mobile wireframe plan. It is documentation only. It does not implement microphone access, real-time recording, frame-level pitch analysis, a pitch trend chart, or any Practice Mode workflow change.

The future feature remains browser-local, manually started by the user, target-relative, uncertainty-aware, and non-scoring. Audio must not be uploaded. Unreliable frames must be shown as unknown / no pitch instead of being forced into a note, score, grade, pass, or fail result.

## Product guardrails inherited from P8a

Future real-time pitch feedback must preserve these boundaries:

- Use browser-local analysis only.
- Require an explicit user click on **Start live feedback**.
- Never upload raw audio or derived audio frames.
- Compare detected pitch to the current target note as cents offset.
- Show unknown / no pitch for unreliable frames.
- Avoid formal score, grade, pass, fail, rhythm evaluation, and sight-singing assessment language.
- Keep the existing Record / Estimate flow unchanged until a separate implementation PR intentionally changes it.

## UI state machine

| State | What the user sees | Allowed buttons | Microphone access | Pitch trace | Cents offset | Attempt history | Audio upload | Exit / retry path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `idle` | Current target note, short local-only explanation, Start live feedback button, existing Practice Mode controls unchanged. | Start live feedback, Play target, melody step controls, existing Record / Estimate controls. | No. | No live trace; placeholder or empty chart area only in a future prototype. | No. | No write. | No. | Click Start live feedback to request permission; navigate away with no side effect. |
| `requesting-microphone-permission` | Browser permission prompt plus in-page message: requesting microphone permission. | Cancel / Stop live feedback if UI provides it; existing non-live controls should remain safe but should not auto-start live feedback. | Permission request in progress; no analysis until granted. | No. | No. | No write. | No. | Permission grant enters `listening`; denial enters `permission-denied`; hardware/API failure enters `microphone-error`; unsupported API enters `unsupported-browser`. |
| `listening` | Message that the app is listening locally and waiting for stable pitch. Stop live feedback is prominent. | Stop live feedback, Play target, melody step controls. Step changes must not auto-play or auto-write history. | Yes, active stream. | Future chart may show time axis with unknown frames until reliable pitch exists. | Only when a reliable frame exists; otherwise not shown. | No write. | No. | Stop live feedback enters `stopped` and stops the stream; analysis branches to `no-pitch`, `low-confidence`, or `active-pitch-detected` as frames arrive. |
| `no-pitch` | Listening state with message: no stable pitch detected / unknown. Chart gap or neutral unknown segment. | Stop live feedback, Play target, melody step controls. | Yes, active stream. | Show gap, dotted unknown segment, or muted placeholder; do not invent pitch. | No. | No write. | No. | Continue listening; reliable frames enter `active-pitch-detected`; low confidence enters `low-confidence`; Stop enters `stopped`. |
| `low-confidence` | Listening state with message that pitch is unstable or confidence is low. | Stop live feedback, Play target, melody step controls. | Yes, active stream. | Optional muted / translucent segment; visually distinct from reliable pitch. | Optional hidden or de-emphasized; if shown, label as unstable estimate. | No write. | No. | Continue listening; confidence recovery enters `active-pitch-detected`; silence/unvoiced frames enter `no-pitch`; Stop enters `stopped`. |
| `active-pitch-detected` | Live target-relative feedback such as near target, slightly high, or slightly low. | Stop live feedback, Play target, melody step controls. | Yes, active stream. | Yes in future chart implementation. | Yes, target-relative cents offset around the 0-cent center line. | No automatic write. | No. | Continue listening; unreliable frames enter `no-pitch` or `low-confidence`; Stop enters `stopped`. |
| `stopped` | Microphone has stopped. Optional short local-only summary such as last observed range or most recent reliable offset, explicitly not a formal score. | Start live feedback, Play target, melody step controls, existing Record / Estimate controls. | No; stream must be stopped and tracks released. | Static last local trace may remain visible only as session UI, not saved history. | Optional last local summary; no grade/pass/fail. | No automatic write. | No. | Click Start live feedback to start a new local session; navigate away discards transient live session UI unless a later PR explicitly designs local persistence. |
| `permission-denied` | Microphone permission was denied and live feedback cannot start. | Retry / Start live feedback, Play target, melody step controls, existing Record / Estimate controls. | No. | No. | No. | No write. | No. | User changes browser permission and retries; unsupported or hardware errors move to the relevant error state. |
| `microphone-error` | Microphone could not start or stream failed. Message should suggest checking the microphone, another app, or browser settings. | Retry / Start live feedback, Play target, melody step controls. | No active stream after cleanup. | No live trace. | No. | No write. | No. | Retry requests permission/start again; navigate away with no side effect. |
| `unsupported-browser` | Current browser does not support the required local microphone APIs for this future feature. | Play target, melody step controls, existing Record / Estimate controls; Start live feedback disabled or hidden with explanation. | No. | No. | No. | No write. | No. | Try a supported browser in a future implementation; no automatic fallback to upload/cloud. |

### State transition notes

- `idle` is the only safe default when Practice Mode loads.
- `requesting-microphone-permission` must be entered only after the explicit Start live feedback click.
- `listening`, `no-pitch`, `low-confidence`, and `active-pitch-detected` all require an active browser microphone stream.
- `stopped`, `permission-denied`, `microphone-error`, and `unsupported-browser` must not keep microphone tracks alive.
- Step changes during any live state may update the target reference for future cents comparisons, but must not start recording, play audio, write history, or create scoring events.

## User operation flow

1. User enters Practice Mode.
2. User selects a melody step or stays on the current melody step.
3. Page shows the current target note and the live-feedback boundary: audio is analyzed only in the browser and is not uploaded.
4. User clicks **Start live feedback**.
5. Browser asks for microphone permission.
6. If the user allows permission, the UI enters `listening` and shows **Stop live feedback**.
7. If no reliable pitch is available, the UI shows no pitch / unknown instead of a guessed note.
8. If pitch confidence is low, the UI shows low confidence / unstable pitch and avoids authoritative cents feedback.
9. If a reliable pitch is detected, the UI shows target-relative cents feedback such as near target, slightly high, or slightly low.
10. User may play the target while live feedback is running, but Play target does not start live feedback and Start live feedback does not play the target.
11. User clicks **Stop live feedback**.
12. The microphone stream stops. The UI may show a short local-only summary, but it must not create a formal score, grade, pass/fail result, rhythm result, sight-singing assessment, or attempt-history entry.

## Mobile wireframe description

Text-only wireframe for a narrow phone screen:

```text
┌────────────────────────────────────┐
│ Practice Mode                       │
│ Browser-local live pitch feedback   │
│ No upload · No score                │
├────────────────────────────────────┤
│ Current target note                 │
│ A4                                 │
│ Step 2 / 5                          │
│ [Play target]                       │
├────────────────────────────────────┤
│ [Start live feedback]               │
│ or, while active: [Stop live feedback]│
├────────────────────────────────────┤
│ Status                              │
│ 正在监听你的声音 / 未检测到稳定音高 │
│ 音频仅在浏览器本地分析，不会上传    │
├────────────────────────────────────┤
│ Cents trend chart                   │
│ +50 ─────────────────────────       │
│ +25 - - - - - - - - - - - -        │
│   0 ═════════ target center ═       │
│ -25 - - - - - - - - - - - -        │
│ -50 ─────────────────────────       │
│ unknown gaps shown as muted breaks  │
├────────────────────────────────────┤
│ Optional details                    │
│ Estimated note: A4                  │
│ Estimated Hz: 440.1 Hz              │
│ Confidence / clarity: stable        │
└────────────────────────────────────┘
```

### Wireframe behavior requirements

- The current target note area must remain visually separate from detected pitch so the user knows what they are aiming for.
- The Start / Stop live feedback button must be explicit and must not be combined with Play target.
- The status area is always visible and should carry privacy and uncertainty messaging.
- The cents trend chart area should center on a 0-cent target line.
- Guide bands should include +50, +25, 0, -25, and -50 cents.
- No-pitch frames should appear as gaps, muted sections, or an `unknown` label, not as fake 0-cent success.
- Low-confidence frames should be visually de-emphasized and labeled unstable.
- Estimated note, estimated Hz, and confidence / clarity should be optional supporting details, not the main product promise.
- Boundary copy should remain visible near the live controls: browser-local, no upload, no score.

## Button and side-effect boundaries

- **Play target** does not automatically start live feedback.
- **Start live feedback** does not automatically play the target.
- Switching melody step does not automatically start live feedback.
- Switching melody step does not automatically play the target.
- Switching melody step does not automatically write attempt history.
- **Stop live feedback** stops the microphone stream and releases microphone tracks.
- P8b does not change the existing Record / Estimate workflow.
- P8b does not change attempt-history data logic.
- Live feedback sessions must be transient unless a later PR explicitly designs local-only persistence.
- Live feedback must not call `/api/recognize`, recognition providers, cloud assessment, GPT, or any AI API.

## Chinese UI copy draft

| Situation | Draft copy |
| --- | --- |
| Start button | 开始实时反馈 |
| Stop button | 停止实时反馈 |
| Listening | 正在监听你的声音 |
| No pitch | 未检测到稳定音高 |
| Near target | 音高接近目标音 |
| Slightly high | 略微偏高 |
| Slightly low | 略微偏低 |
| Low confidence | 音高不稳定 |
| Permission denied | 麦克风权限被拒绝 |
| Unsupported browser | 当前浏览器暂不支持实时反馈 |
| Privacy boundary | 音频仅在浏览器本地分析，不会上传 |
| No score boundary | 实时反馈仅用于练习提示，不生成正式分数 |
| Local summary | 本次实时反馈摘要仅显示在本地，不写入练习记录 |
| Retry hint | 请检查浏览器麦克风权限后重试 |

## Future implementation split

- **P8c:** Implement a UI-only static prototype with no microphone access.
- **P8d:** Implement browser microphone permission and start/stop plumbing, without pitch analysis.
- **P8e:** Connect a frame-level local pitch analysis prototype.
- **P8f:** Add target-relative cents trend chart visualization.
- **P8g:** Run mobile manual QA on real devices and document results.

## Explicit non-goals for P8b

P8b does not:

- implement real-time recording;
- implement microphone access;
- implement a pitch trend chart;
- implement frame-level pitch analysis;
- modify the estimator;
- replace the estimator;
- connect Pitchfinder, CREPE, RMVPE, SwiftF0, or any other new engine;
- upload audio;
- connect cloud assessment;
- connect GPT or any AI API;
- create formal scoring;
- create grades, pass labels, or fail labels;
- evaluate rhythm;
- implement sight-singing assessment;
- implement Song Learning Mode;
- implement song upload;
- implement source separation;
- implement vocal melody extraction;
- implement target pitch curve generation;
- modify Practice Mode UI workflow;
- modify the current Record / Estimate flow;
- modify attempt-history behavior;
- modify benchmark gates or tolerances;
- modify `/api/recognize`;
- modify the recognition provider union;
- add PDF upload or Audiveris integration.
