import LocalAudioDecodeFileInputShell from "./LocalAudioDecodeFileInputShell";

const warningItems = [
  "This is a research-only local browser audio decode metadata POC.",
  "Decoding is only triggered by a separate Decode metadata button.",
  "A WAV-first file picker is available for local selection before metadata-only decoding.",
  "No upload.",
  "No cloud.",
  "No AI API.",
  "No microphone.",
  "Exploratory pitch-frame diagnostics only after a separate Extract pitch frames click.",
  "No melody recognition.",
  "No TargetPitchCurve generation.",
  "Not Practice Mode.",
  "Not APK-ready.",
];

const currentStatusItems = [
  "Research route only",
  "Browser decodeAudioData metadata POC implemented",
  "Exploratory diagnostic pitch-frame extraction is gated behind a separate button",
  "AudioContext is scoped to explicit decode attempts only",
  "decodeAudioData is called only from the Decode metadata button",
  "File selection UI remains separate from decoding",
  "Practice Mode integration not implemented",
];

const futureFlowItems = [
  "Select a local WAV file manually",
  "Confirm local-only decode attempt",
  "Decode metadata",
  "Display duration / sample rate / channel count",
  "Optionally click Extract pitch frames for diagnostic metadata only",
  "Handle decode errors",
  "Clear result",
];

const boundaryItems = [
  "MP3 support",
  "arbitrary song analysis",
  "vocal separation",
  "accompaniment-to-melody inference",
  "product pitch tracking",
  "waveform analysis",
  "scoring",
  "TargetPitchCurve generation",
  "Song Learning Mode",
  "APK-ready behavior",
];

export default function LocalAudioDecodeResearchPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 shadow-lg shadow-black/20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
            Research-only placeholder
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Local Audio Decode Research
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-amber-50/90">
            This route provides an isolated, WAV-first local file-selection
            shell for browser decodeAudioData metadata research. It only decodes
            after an explicit Decode metadata click and intentionally provides
            no playback, waveform visualization, scoring, TargetPitchCurve
            generation, or Practice Mode entry. A separate gated action can
            produce exploratory pitch-frame diagnostic metadata only after a
            successful decode.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">
            Research-only warning
          </h2>
          <ul className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-2">
            {warningItems.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-800 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <LocalAudioDecodeFileInputShell />

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Current status</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-200">
            {currentStatusItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">
            Future intended flow
          </h2>
          <p className="mt-3 text-slate-300">
            These steps describe this isolated proof-of-concept flow. They are
            research-only and are not connected to Practice Mode.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-200">
            {futureFlowItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Boundaries</h2>
          <p className="mt-3 text-slate-300">This route does not support:</p>
          <ul className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-2">
            {boundaryItems.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-800 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-sky-300/30 bg-sky-300/10 p-6">
          <h2 className="text-2xl font-semibold text-white">
            Android APK / WebView caveat
          </h2>
          <p className="mt-3 leading-7 text-sky-50/90">
            Future Android APK packaging must separately validate file picker
            behavior, AudioContext behavior, decodeAudioData support, memory
            limits, local processing, and permission behavior inside Android
            WebView / packaged environments before any APK-ready claim.
          </p>
        </section>
      </div>
    </main>
  );
}
