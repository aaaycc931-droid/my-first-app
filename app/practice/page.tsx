const mockExercise = {
  title: "Mock Melody: Stepwise Warmup",
  targetNotes: ["C4", "D4", "E4", "G4", "E4", "D4", "C4"],
  suggestedBpm: 72,
  goal: "Keep the melody steady and notice where future pitch or rhythm feedback would appear.",
};

const practiceSteps = [
  "Listen to target",
  "Sing or clap",
  "Review feedback",
  "Retry",
];

export default function PracticePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-emerald-600">
            Early learning prototype
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Practice Mode
          </h1>
          <p className="mt-3 text-slate-600">
            This page is an early learning prototype that uses a mock exercise to
            validate the practice flow for a future recognition + practice +
            assessment learning tool.
          </p>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Current status: this prototype does not record audio, does not score
            performance, and all pitch, rhythm, and AI feedback below is
            placeholder/mock content only.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Mock melody exercise
            </p>
            <h2 className="mt-2 text-2xl font-bold">{mockExercise.title}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">Exercise title</dt>
                <dd className="mt-1 text-slate-600">{mockExercise.title}</dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">Target notes</dt>
                <dd className="mt-1 text-slate-600">
                  {mockExercise.targetNotes.join(" · ")}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">Suggested BPM</dt>
                <dd className="mt-1 text-slate-600">
                  {mockExercise.suggestedBpm} BPM
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">Practice goal</dt>
                <dd className="mt-1 text-slate-600">{mockExercise.goal}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Practice steps</h2>
            <ol className="mt-4 space-y-3">
              {practiceSteps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-xl font-bold text-blue-950">Target notes</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {mockExercise.targetNotes.map((note, index) => (
              <span
                key={`${note}-${index}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-800 ring-1 ring-blue-200"
              >
                {note}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Pitch feedback placeholder</h2>
            <p className="mt-2 text-sm text-slate-600">
              Future versions may show cents deviation, pitch stability, and
              intonation feedback. No real pitch detection is implemented here.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Rhythm feedback placeholder</h2>
            <p className="mt-2 text-sm text-slate-600">
              Future versions may show timing deviation, early/late feedback,
              and rhythm stability. No real rhythm evaluation is implemented
              here.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">AI feedback placeholder</h2>
            <p className="mt-2 text-sm text-slate-600">
              Future AI feedback may explain mistakes and recommend the next
              practice step. This page does not call any AI API.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
