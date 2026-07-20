"use client";

import { useMemo, useState } from "react";

import type {
  LocalPracticeDifficulty,
  LocalPracticeKind,
} from "../../lib/practice/localPracticeCatalog";
import {
  LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
  getLocalPracticeCustomizerSubsetOptions,
  resolveLocalPracticeCustomization,
  type LocalPracticeCustomization,
} from "../../lib/practice/localPracticeCustomizer";

type ResolvedLocalPracticeCustomization = NonNullable<
  ReturnType<typeof resolveLocalPracticeCustomization>
>;

type Props = {
  initialSelection?: LocalPracticeCustomization;
  onStart: (configResolved: ResolvedLocalPracticeCustomization) => void;
};

const kindOptions: ReadonlyArray<{ id: LocalPracticeKind; label: string }> = [
  { id: "single-pitch", label: "单音音高" },
  { id: "interval", label: "音程" },
  { id: "chord-inversion", label: "三和弦性质与转位" },
  { id: "harmony-progression", label: "和声进行" },
  { id: "scale-mode", label: "音阶与调式" },
  { id: "seventh-chord", label: "七和弦性质与转位" },
  { id: "seventh-chord-spacing", label: "七和弦排列" },
  { id: "modulation", label: "调制" },
  { id: "rhythm", label: "节奏" },
  { id: "melody-dictation", label: "旋律听写" },
];

const difficultyOptions: readonly LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];

const getInitialDirection = (selection?: LocalPracticeCustomization) =>
  selection?.kind === "interval" ? selection.intervalDirection : "上行";

const getInitialPlaybackMode = (selection?: LocalPracticeCustomization) =>
  selection?.kind === "chord-inversion" ? selection.chordPlaybackMode : "和声";

export function LocalPracticeCustomizerPanel({ initialSelection, onStart }: Props) {
  const [kind, setKind] = useState<LocalPracticeKind>(initialSelection?.kind ?? "interval");
  const [difficulty, setDifficulty] = useState<LocalPracticeDifficulty>(
    initialSelection?.difficulty ?? "基础",
  );
  const [answerOptionIds, setAnswerOptionIds] = useState<string[]>(
    initialSelection ? [...initialSelection.answerOptionIds] : () =>
      getLocalPracticeCustomizerSubsetOptions("interval", "基础").map((option) => option.id),
  );
  const [intervalDirection, setIntervalDirection] = useState<"上行" | "下行">(
    getInitialDirection(initialSelection),
  );
  const [chordPlaybackMode, setChordPlaybackMode] = useState<"和声" | "分解">(
    getInitialPlaybackMode(initialSelection),
  );

  const subsetOptions = useMemo(
    () => getLocalPracticeCustomizerSubsetOptions(kind, difficulty),
    [difficulty, kind],
  );
  const selectedOptionIds = useMemo(() => new Set(answerOptionIds), [answerOptionIds]);
  const selectedOptions = subsetOptions.filter((option) => selectedOptionIds.has(option.id));
  const hasEnoughCategories = selectedOptions.length >= 2;

  const customizationCandidate = useMemo(() => {
    const base = {
      schemaVersion: LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
      kind,
      difficulty,
      answerOptionIds,
    };
    if (kind === "interval") return { ...base, kind, intervalDirection };
    if (kind === "chord-inversion") return { ...base, kind, chordPlaybackMode };
    return base;
  }, [answerOptionIds, chordPlaybackMode, difficulty, intervalDirection, kind]);
  const resolved = useMemo(
    () => resolveLocalPracticeCustomization(customizationCandidate),
    [customizationCandidate],
  );
  const stableVariantCount = resolved?.variantCount
    ?? selectedOptions.reduce((total, option) => total + option.variantCount, 0);

  const selectAllFor = (nextKind: LocalPracticeKind, nextDifficulty: LocalPracticeDifficulty) => {
    setAnswerOptionIds(
      getLocalPracticeCustomizerSubsetOptions(nextKind, nextDifficulty).map((option) => option.id),
    );
  };

  const changeKind = (nextKind: LocalPracticeKind) => {
    setKind(nextKind);
    selectAllFor(nextKind, difficulty);
  };

  const changeDifficulty = (nextDifficulty: LocalPracticeDifficulty) => {
    setDifficulty(nextDifficulty);
    selectAllFor(kind, nextDifficulty);
  };

  const toggleAnswerOption = (optionId: string) => {
    setAnswerOptionIds((current) => current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId]);
  };

  return (
    <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-violet-700">P115 本地练习定制</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">组合一组自己的听辨练习</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        在一页内完成范围与答案类别配置。配置和题序只用于当前页面会话，刷新后消失；不会保存为账号偏好，也不会生成分数、等级或通过结论。
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <fieldset className="rounded-2xl bg-violet-50 p-4">
          <legend className="px-1 text-sm font-bold text-violet-950">第 1 步：选择练习范围</legend>

          <label className="mt-3 block text-sm font-semibold text-slate-800" htmlFor="practice-customizer-kind">
            题型
          </label>
          <select
            id="practice-customizer-kind"
            className="mt-2 min-h-12 w-full rounded-xl border border-violet-200 bg-white px-3 text-slate-950"
            value={kind}
            onChange={(event) => changeKind(event.target.value as LocalPracticeKind)}
          >
            {kindOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>

          <p className="mt-4 text-sm font-semibold text-slate-800">练习难度</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {difficultyOptions.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={difficulty === option}
                className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${difficulty === option ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-white text-violet-900"}`}
                onClick={() => changeDifficulty(option)}
              >
                {option}
              </button>
            ))}
          </div>

          {kind === "interval" ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-800">音程方向</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["上行", "下行"] as const).map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={intervalDirection === direction}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${intervalDirection === direction ? "border-indigo-700 bg-indigo-700 text-white" : "border-indigo-200 bg-white text-indigo-900"}`}
                    onClick={() => setIntervalDirection(direction)}
                  >
                    {direction}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {kind === "chord-inversion" ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-800">三和弦播放方式</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["和声", "分解"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={chordPlaybackMode === mode}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${chordPlaybackMode === mode ? "border-indigo-700 bg-indigo-700 text-white" : "border-indigo-200 bg-white text-indigo-900"}`}
                    onClick={() => setChordPlaybackMode(mode)}
                  >
                    {mode === "和声" ? "同时播放" : "依次分解"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-bold text-slate-900">第 2 步：选择答案类别</legend>
          <p className="mt-3 text-sm leading-6 text-slate-600">至少保留 2 类，才能形成有辨别意义的练习。</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {subsetOptions.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${selectedOptionIds.has(option.id) ? "border-violet-500 bg-violet-50 text-violet-950" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-violet-700"
                  checked={selectedOptionIds.has(option.id)}
                  onChange={() => toggleAnswerOption(option.id)}
                />
                <span className="font-semibold">{option.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900"
            onClick={() => selectAllFor(kind, difficulty)}
          >
            恢复当前难度全部类别
          </button>
        </fieldset>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-bold text-emerald-950">
          已选 {selectedOptions.length} 类 · {stableVariantCount} 个稳定组合
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          开始后会沿用现有本地题库与不重复调度；这里只改变当前会话的出题范围，不改写原题目标识。
        </p>
        {!hasEnoughCategories ? (
          <p className="mt-2 text-sm font-semibold text-rose-800" role="alert">还需至少选择 2 个答案类别。</p>
        ) : null}
        <button
          type="button"
          className="mt-4 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-emerald-300 sm:w-auto"
          disabled={!hasEnoughCategories || !resolved}
          onClick={() => {
            if (resolved) onStart(resolved);
          }}
        >
          开始当前会话练习
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        会话边界：不保存这份定制配置、你的选择或声音；答案核对仅用于学习说明，属于非评分练习。
      </p>
    </section>
  );
}
