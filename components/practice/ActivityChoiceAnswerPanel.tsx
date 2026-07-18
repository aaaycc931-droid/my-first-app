"use client";

export type ActivityChoiceOption = { id: string; label: string };

export function ActivityChoiceAnswerPanel({
  options,
  selectedOptionId,
  disabled,
  onChoose,
}: {
  options: readonly ActivityChoiceOption[];
  selectedOptionId: string | null;
  disabled: boolean;
  onChoose: (optionId: string) => void;
}) {
  return (
    <fieldset disabled={disabled} className="mt-4">
      <legend className="sr-only">选择听到的音名</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selectedOptionId === option.id}
            disabled={disabled}
            onClick={() => onChoose(option.id)}
            className={`rounded-xl border px-3 py-3 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${selectedOptionId === option.id ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-200" : "border-slate-200 bg-white text-slate-800 hover:border-sky-300"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
