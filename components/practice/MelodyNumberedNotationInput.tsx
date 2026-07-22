"use client";

import type { EarTrainingMelodyNoteId } from "../../lib/practice/localEarTrainingMelodyDictation";
import {
  getMelodyNumberedNotationPresentation as getCanonicalMelodyNumberedNotationPresentation,
  type MelodyNumberedNotationPresentation,
} from "../../lib/practice/localMelodyNumberedNotationDraft";

export type { MelodyNumberedNotationPresentation };

export type MelodyNumberedNotationReviewState =
  | "waiting"
  | "draft"
  | "checked"
  | "confirmed"
  | "cleared";

export type MelodyNumberedNotationInputProps = {
  noteIds: readonly (EarTrainingMelodyNoteId | null)[];
  availableNoteIds: readonly EarTrainingMelodyNoteId[];
  disabled: boolean;
  locked: boolean;
  reviewState: MelodyNumberedNotationReviewState;
  onChoose: (position: number, noteId: EarTrainingMelodyNoteId) => void;
  onCheck: () => void;
  onConfirm: () => void;
  onClear: () => void;
};

const reviewStateLabels: Record<MelodyNumberedNotationReviewState, string> = {
  waiting: "等待完整播放",
  draft: "待检查草稿",
  checked: "已检查，等待确认",
  confirmed: "已确认当前修订",
  cleared: "草稿已清空",
};

export const getMelodyNumberedNotationPresentation = (
  noteId: EarTrainingMelodyNoteId,
): MelodyNumberedNotationPresentation =>
  getCanonicalMelodyNumberedNotationPresentation(noteId);

const getDraftAriaLabel = (
  noteIds: readonly (EarTrainingMelodyNoteId | null)[],
) => {
  const positions = [0, 1, 2].map((position) => {
    const noteId = noteIds[position] ?? null;
    return noteId
      ? `第 ${position + 1} 个音为${getMelodyNumberedNotationPresentation(noteId).optionLabel}`
      : `第 ${position + 1} 个音尚未填写`;
  });
  return `你的固定 C 为 1 的三音简谱草稿：${positions.join("；")}。`;
};

export function MelodyNumberedNotationInput({
  noteIds,
  availableNoteIds,
  disabled,
  locked,
  reviewState,
  onChoose,
  onCheck,
  onConfirm,
  onClear,
}: MelodyNumberedNotationInputProps) {
  const positions = [0, 1, 2] as const;
  const normalizedNoteIds = positions.map((position) => noteIds[position] ?? null);
  const hasAnyNote = normalizedNoteIds.some((noteId) => noteId !== null);
  const isComplete = normalizedNoteIds.every((noteId) => noteId !== null);
  const inputDisabled = disabled || locked || reviewState === "confirmed";

  return (
    <section
      className="rounded-2xl border border-sky-200 bg-white p-4"
      aria-label="三音简谱草稿编辑"
      data-testid="melody-numbered-notation-input"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-slate-950">三音简谱音高草稿</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            当前固定 C 为 1，只编辑三个音的音高顺序，不推断调性，也不输入或评价节奏。这不是完整制谱、正式转写或评分。
          </p>
        </div>
        <p
          aria-live="polite"
          className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"
        >
          {reviewStateLabels[reviewState]}
        </p>
      </div>

      <div
        role="img"
        aria-label={getDraftAriaLabel(normalizedNoteIds)}
        className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-sky-100 bg-sky-50/40 p-3"
        data-testid="melody-numbered-notation-preview"
      >
        {positions.map((position) => {
          const noteId = normalizedNoteIds[position];
          const presentation = noteId
            ? getMelodyNumberedNotationPresentation(noteId)
            : null;
          return (
            <div
              key={position}
              className="min-w-0 rounded-xl border border-sky-100 bg-white px-2 py-3 text-center"
              data-testid={`melody-numbered-token-${position}`}
              aria-hidden="true"
            >
              <span className="relative inline-flex min-h-14 min-w-12 items-end justify-center pt-4 font-serif text-4xl font-bold leading-none text-sky-950">
                {presentation?.octave === "upper" ? (
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 text-2xl leading-none"
                    data-testid={`melody-numbered-octave-dot-${position}`}
                  >
                    ·
                  </span>
                ) : null}
                {presentation?.accidental === "sharp" ? (
                  <span
                    className="mr-0.5 text-2xl leading-none"
                    data-testid={`melody-numbered-sharp-${position}`}
                  >
                    ♯
                  </span>
                ) : null}
                {presentation ? (
                  <span data-testid={`melody-numbered-degree-${position}`}>
                    {presentation.degree}
                  </span>
                ) : (
                  <span
                    className="font-sans text-sm font-semibold text-slate-400"
                    data-testid={`melody-numbered-degree-${position}`}
                  >
                    待填
                  </span>
                )}
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                第 {position + 1} 个音
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {positions.map((position) => {
          const selectedNoteId = normalizedNoteIds[position];
          return (
            <label
              key={position}
              className="block rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800"
            >
              第 {position + 1} 个音
              <select
                aria-label={`选择第 ${position + 1} 个音的简谱音高`}
                value={selectedNoteId ?? ""}
                disabled={inputDisabled}
                onChange={(event) => {
                  if (event.target.value) {
                    onChoose(position, event.target.value as EarTrainingMelodyNoteId);
                  }
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="" disabled>
                  选择简谱音高
                </option>
                {availableNoteIds.map((noteId) => (
                  <option key={noteId} value={noteId}>
                    {getMelodyNumberedNotationPresentation(noteId).optionLabel}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={inputDisabled || !isComplete || reviewState === "checked"}
          onClick={onCheck}
          className="min-h-11 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          检查简谱草稿
        </button>
        <button
          type="button"
          disabled={disabled || locked || reviewState !== "checked"}
          onClick={onConfirm}
          className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          确认当前简谱修订
        </button>
        <button
          type="button"
          disabled={disabled || locked || !hasAnyNote}
          onClick={onClear}
          className="min-h-11 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          清空简谱草稿
        </button>
      </div>
    </section>
  );
}
