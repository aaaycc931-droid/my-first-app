"use client";

import type { EarTrainingMelodyNoteId } from "../../lib/practice/localEarTrainingMelodyDictation";
import { earTrainingMelodyNotes } from "../../lib/practice/localEarTrainingMelodyDictation";

export type MelodyStaffNotationReviewState =
  | "waiting"
  | "draft"
  | "checked"
  | "confirmed"
  | "cleared";

export type MelodyStaffNotationInputProps = {
  noteIds: readonly (EarTrainingMelodyNoteId | null)[];
  availableNoteIds: readonly EarTrainingMelodyNoteId[];
  disabled: boolean;
  locked: boolean;
  reviewState: MelodyStaffNotationReviewState;
  onChoose: (position: number, noteId: EarTrainingMelodyNoteId) => void;
  onCheck: () => void;
  onConfirm: () => void;
  onClear: () => void;
};

const STAFF_LINE_Y = [36, 48, 60, 72, 84] as const;
const NOTE_X = [104, 184, 264] as const;

const STAFF_Y_BY_NOTE_ID: Record<EarTrainingMelodyNoteId, number> = {
  c4: 96,
  d4: 90,
  e4: 84,
  f4: 78,
  "f-sharp-4": 78,
  g4: 72,
  a4: 66,
  b4: 60,
  c5: 54,
};

const reviewStateLabels: Record<MelodyStaffNotationReviewState, string> = {
  waiting: "等待完整播放",
  draft: "待检查草稿",
  checked: "已检查，等待确认",
  confirmed: "已确认当前修订",
  cleared: "草稿已清空",
};

const getNoteLabel = (noteId: EarTrainingMelodyNoteId) =>
  earTrainingMelodyNotes[noteId].label;

const getDraftAriaLabel = (
  noteIds: readonly (EarTrainingMelodyNoteId | null)[],
) => {
  const positions = [0, 1, 2].map((position) => {
    const noteId = noteIds[position] ?? null;
    return `第 ${position + 1} 个音${noteId ? `为 ${getNoteLabel(noteId)}` : "尚未填写"}`;
  });
  return `你的三音五线谱草稿：${positions.join("；")}。`;
};

export function MelodyStaffNotationInput({
  noteIds,
  availableNoteIds,
  disabled,
  locked,
  reviewState,
  onChoose,
  onCheck,
  onConfirm,
  onClear,
}: MelodyStaffNotationInputProps) {
  const positions = [0, 1, 2] as const;
  const normalizedNoteIds = positions.map((position) => noteIds[position] ?? null);
  const hasAnyNote = normalizedNoteIds.some((noteId) => noteId !== null);
  const isComplete = normalizedNoteIds.every((noteId) => noteId !== null);
  const inputDisabled = disabled || locked || reviewState === "confirmed";

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-white p-4"
      aria-label="三音五线谱草稿编辑"
      data-testid="melody-staff-notation-input"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-slate-950">三音五线谱音高草稿</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            这里只编辑三个音的音高顺序，不评价节奏；这是受控草稿，不是完整制谱、正式转写或评分。
          </p>
        </div>
        <p aria-live="polite" className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
          {reviewStateLabels[reviewState]}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/40 p-2">
        <svg
          viewBox="0 0 320 116"
          role="img"
          aria-label={getDraftAriaLabel(normalizedNoteIds)}
          className="mx-auto block h-auto min-w-[280px] max-w-xl"
        >
          <rect x="0" y="0" width="320" height="116" rx="12" fill="#ffffff" />
          {STAFF_LINE_Y.map((y) => (
            <line
              key={y}
              x1="52"
              y1={y}
              x2="304"
              y2={y}
              stroke="#475569"
              strokeWidth="1.4"
            />
          ))}
          <text
            x="58"
            y="87"
            fill="#312e81"
            fontSize="54"
            fontFamily="serif"
            aria-hidden="true"
          >
            𝄞
          </text>
          {positions.map((position) => {
            const noteId = normalizedNoteIds[position];
            const x = NOTE_X[position];
            const y = noteId ? STAFF_Y_BY_NOTE_ID[noteId] : 60;
            return (
              <g key={position} aria-hidden="true">
                {noteId === "c4" ? (
                  <line
                    data-testid={`melody-staff-c4-ledger-${position}`}
                    x1={x - 14}
                    y1={y}
                    x2={x + 14}
                    y2={y}
                    stroke="#475569"
                    strokeWidth="1.4"
                  />
                ) : null}
                {noteId === "f-sharp-4" ? (
                  <text
                    data-testid={`melody-staff-sharp-${position}`}
                    x={x - 22}
                    y={y + 6}
                    fill="#0f172a"
                    fontSize="20"
                    fontFamily="serif"
                  >
                    ♯
                  </text>
                ) : null}
                <ellipse
                  data-testid={`melody-staff-notehead-${position}`}
                  cx={x}
                  cy={y}
                  rx="8"
                  ry="5.5"
                  transform={`rotate(-18 ${x} ${y})`}
                  fill={noteId ? "#312e81" : "#ffffff"}
                  stroke={noteId ? "#312e81" : "#94a3b8"}
                  strokeWidth="2"
                  strokeDasharray={noteId ? undefined : "3 3"}
                />
                {noteId ? (
                  <line
                    x1={x + 7}
                    y1={y}
                    x2={x + 7}
                    y2={y - 31}
                    stroke="#312e81"
                    strokeWidth="2"
                  />
                ) : null}
                <text
                  x={x}
                  y="110"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                >
                  {position + 1}
                </text>
              </g>
            );
          })}
        </svg>
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
                aria-label={`选择第 ${position + 1} 个音的五线谱音高`}
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
                  选择音高
                </option>
                {availableNoteIds.map((noteId) => (
                  <option key={noteId} value={noteId}>
                    {getNoteLabel(noteId)}
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
          className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          检查五线谱草稿
        </button>
        <button
          type="button"
          disabled={disabled || locked || reviewState !== "checked"}
          onClick={onConfirm}
          className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          确认当前谱面修订
        </button>
        <button
          type="button"
          disabled={disabled || locked || !hasAnyNote}
          onClick={onClear}
          className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          清空五线谱草稿
        </button>
      </div>
    </section>
  );
}
