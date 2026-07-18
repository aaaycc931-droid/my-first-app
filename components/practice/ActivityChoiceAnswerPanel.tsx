"use client";

export type ActivityChoiceOption = { id: string; label: string };

const accentClasses = {
  sky: {
    selected: "border-sky-600 bg-sky-50 text-sky-900 ring-sky-200",
    idle: "border-slate-200 bg-white text-slate-800 hover:border-sky-300",
  },
  emerald: {
    selected: "border-emerald-600 bg-emerald-50 text-emerald-900 ring-emerald-200",
    idle: "border-slate-200 bg-white text-slate-800 hover:border-emerald-300",
  },
  violet: {
    selected: "border-violet-600 bg-violet-50 text-violet-900 ring-violet-200",
    idle: "border-slate-200 bg-white text-slate-800 hover:border-violet-300",
  },
} as const;

export function ActivityChoiceAnswerPanel({
  options,
  selectedOptionId,
  disabled,
  onChoose,
  accent = "sky",
  columns = 3,
}: {
  options: readonly ActivityChoiceOption[];
  selectedOptionId: string | null;
  disabled: boolean;
  onChoose: (optionId: string) => void;
  accent?: keyof typeof accentClasses;
  columns?: 2 | 3;
}) {
  const colors = accentClasses[accent];
  return (
    <fieldset disabled={disabled} className="mt-4">
      <legend className="sr-only">选择听到的音名</legend>
      <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selectedOptionId === option.id}
            disabled={disabled}
            onClick={() => onChoose(option.id)}
            className={`rounded-xl border px-3 py-3 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${selectedOptionId === option.id ? `${colors.selected} ring-2` : colors.idle}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ActivityOrderedChoiceAnswerPanel({
  positionLabels,
  options,
  selectedOptionIds,
  disabled,
  onChoose,
}: {
  positionLabels: readonly string[];
  options: readonly ActivityChoiceOption[];
  selectedOptionIds: readonly (string | null)[];
  disabled: boolean;
  onChoose: (position: number, optionId: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      {positionLabels.map((label, position) => (
        <fieldset key={label} disabled={disabled}>
          <legend className="text-sm font-semibold text-slate-700">{label}</legend>
          <div className="mt-2 grid gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selectedOptionIds[position] === option.id}
                disabled={disabled}
                onClick={() => onChoose(position, option.id)}
                className={`rounded-xl border px-3 py-2 text-left font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${selectedOptionIds[position] === option.id ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
