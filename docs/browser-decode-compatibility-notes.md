# P11d Browser Decode Compatibility Notes

## Summary

P11d documents browser compatibility and future mobile / WebView risks for the isolated `/research/local-audio-decode` browser `decodeAudioData` metadata-only proof of concept.

This note is docs-only. It does not change runtime behavior and does not promote the research route into Browser Local Practice Mode, product audio import, or APK-ready functionality.

## Related context

- P11a added the isolated browser `decodeAudioData` metadata-only proof of concept on `/research/local-audio-decode`.
- P11b recorded source-review QA confirming the proof of concept remains metadata-only and isolated in `docs/browser-decode-metadata-poc-source-review-qa.md`.
- P11c recorded user-performed manual browser QA passing outside Codex in `docs/browser-decode-metadata-poc-manual-browser-qa.md`.
- The implementation plan and risk review remain documented in `docs/browser-decode-audio-data-implementation-plan-risk-review.md`.

## Compatibility notes

Browser `decodeAudioData` behavior may vary by browser, platform, operating system media stack, and the exact encoding inside a file. A file that decodes successfully in one desktop browser may fail in another browser, on a mobile browser, or in a future packaged WebView environment.

The current WAV extension and MIME checks should be treated only as conservative pre-checks. They can reduce obvious invalid input, but they do not guarantee that the browser can decode the selected file. A valid-looking `.wav` file may still fail browser decoding if its internal encoding, headers, duration, channels, bit depth, or browser support are incompatible.

Browser-provided file type metadata can also be empty or inconsistent. Some file pickers or browser engines may report an empty `File.type`, a generic type, or a type that does not match the file extension or actual file bytes. The proof of concept should not treat browser-provided MIME type as authoritative proof of decode compatibility.

Large files remain a risk even for metadata-only experiments. Browser decoding may require reading or decoding substantial audio data into memory, so oversized files can cause slow UI, high memory usage, tab instability, or decode failure. Metadata-only display does not remove the need for file-size boundaries and performance validation before any productization.

## Mobile, WebView, and APK risks

Mobile browsers may behave differently from desktop browsers for file picker behavior, MIME reporting, supported encodings, memory limits, decode timing, and error reporting. Android Chrome should be validated separately from desktop Chrome.

Android WebView and any future packaged APK require separate validation. Browser decode success on a desktop route does not prove APK readiness, WebView compatibility, mobile performance, or Android packaging safety.

P11d makes no APK-readiness claim.

## Metadata-only boundaries

The P11a proof of concept is metadata-only decode research. Metadata-only decode is not playback, waveform analysis, sample visualization, pitch tracking, or music understanding.

Specifically, metadata-only decode does not:

- Play audio.
- Analyze waveforms.
- Visualize samples.
- Track pitch.
- Generate a `TargetPitchCurve`.
- Create Practice Mode target data.
- Prove that audio import is ready for product use.
- Prove APK readiness.

The decoded `AudioBuffer` must not be passed into Practice Mode without a separate plan, acceptance criteria, QA, and explicit user approval. Any future connection to `/practice` must be treated as new product work, not as a continuation of the metadata-only research proof of concept.

## Suggested future manual QA matrix

Before relying on browser decoding for any product-facing decision, run manual QA across a small compatibility matrix:

- Chrome desktop.
- Edge desktop.
- Safari, if available.
- Firefox, if available.
- Android Chrome later.
- Android WebView / packaged APK later.

The Android Chrome and Android WebView / packaged APK checks should remain separate because WebView behavior can differ from the standalone browser.

## Suggested future test files

Future compatibility QA should include intentionally varied files:

- Small PCM WAV.
- WAV with unsupported encoding.
- Oversized WAV.
- Non-WAV file renamed to `.wav`.
- File with missing or empty MIME type, if possible.

These files should be selected manually or kept outside the repository unless a separate fixture plan explicitly approves committed test assets.

## Boundary confirmation

P11d is docs-only and does not modify the isolated research route, Practice Mode, `/api/recognize`, dependencies, lockfiles, fixtures, upload behavior, cloud behavior, storage, persistence, AI behavior, accounts, real audio, or `metadata.local.json`.

P11d does not add playback, waveform analysis, sample visualization, pitch tracking, `TargetPitchCurve` generation, product audio import, `/practice` integration, server processing, or APK readiness.

## Recommended next step

Keep `/research/local-audio-decode` isolated as research-only. If browser audio decoding moves beyond metadata display, create a separate plan with explicit acceptance criteria, compatibility QA, performance limits, Practice Mode boundaries, and user approval before implementation.
