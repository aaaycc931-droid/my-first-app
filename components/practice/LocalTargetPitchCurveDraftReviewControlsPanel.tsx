import type {
  LocalTargetPitchCurveDraftReviewMode,
  LocalTargetPitchCurveDraftReviewSelection,
  LocalTargetPitchCurveDraftSelectedDiagnostics,
} from "../../lib/practice/localTargetPitchCurveDraftReviewControls";

type Props = {
  selection: LocalTargetPitchCurveDraftReviewSelection;
  diagnostics: LocalTargetPitchCurveDraftSelectedDiagnostics;
  hasDraft: boolean;
  onUseFullDraft: () => void;
  onUseVoicedSpan: () => void;
  onUseManualFrameRange: () => void;
  onManualStartFrameChange: (frameIndex: number) => void;
  onManualEndFrameChange: (frameIndex: number) => void;
  onReset: () => void;
};

const modeLabels: Record<LocalTargetPitchCurveDraftReviewMode, string> = {
  "full-draft": "完整草稿",
  "voiced-span": "有声范围",
  "manual-frame-range": "手动帧范围",
};

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null ? "—" : `${frequencyHz.toFixed(1)} Hz`;
const formatCoverage = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const formatFrame = (frameIndex: number | null) => frameIndex === null ? "—" : String(frameIndex);

export function LocalTargetPitchCurveDraftReviewControlsPanel({
  selection,
  diagnostics,
  hasDraft,
  onUseFullDraft,
  onUseVoicedSpan,
  onUseManualFrameRange,
  onManualStartFrameChange,
  onManualEndFrameChange,
  onReset,
}: Props) {
  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">P39 最小检查控制</p>
          <h2 className="mt-1 text-2xl font-bold text-violet-950">本地目标音高曲线草稿检查控制</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
            这只是检查预览。接入练习前必须先检查。它不是最终目标，不是正式转写，也不是评分。置信度与覆盖率仅用于诊断参考。仅浏览器本地、仅当前会话：不上传、不使用云端、无账号、无数据库。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="rounded-full bg-white px-3 py-2 text-violet-800 ring-1 ring-violet-200">仅草稿： {String(diagnostics.draftOnly)}</span>
          <span className="rounded-full bg-white px-3 py-2 text-violet-800 ring-1 ring-violet-200">需要检查： {String(diagnostics.needsReview)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
        <p className="text-sm font-bold text-violet-950">当前检查模式：{modeLabels[selection.mode]}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onUseFullDraft} disabled={!hasDraft} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">使用完整草稿</button>
          <button type="button" onClick={onUseVoicedSpan} disabled={!hasDraft} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">使用有声范围</button>
          <button type="button" onClick={onUseManualFrameRange} disabled={!hasDraft} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-300 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200">使用手动帧范围</button>
          <button type="button" onClick={onReset} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-300">重置检查控制</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-violet-950">
            手动起始帧
            <input type="number" value={selection.manualStartFrame} onChange={(event) => onManualStartFrameChange(Number(event.target.value))} disabled={!hasDraft} className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 text-violet-950 disabled:bg-slate-100" />
          </label>
          <label className="text-sm font-semibold text-violet-950">
            手动结束帧
            <input type="number" value={selection.manualEndFrame} onChange={(event) => onManualEndFrameChange(Number(event.target.value))} disabled={!hasDraft} className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 text-violet-950 disabled:bg-slate-100" />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-violet-700">
          请求的手动边界：帧 {selection.manualStartFrame} → {selection.manualEndFrame}. helper 校验后的应用边界：帧 {formatFrame(diagnostics.selectedStartFrame)} → {formatFrame(diagnostics.selectedEndFrame)}.
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">已选帧数</p><p className="mt-2 text-violet-800">{diagnostics.selectedFrameCount}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">已选有声帧数</p><p className="mt-2 text-violet-800">{diagnostics.selectedVoicedFrameCount}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">已选有声音高覆盖率</p><p className="mt-2 text-violet-800">{formatCoverage(diagnostics.selectedVoicedCoverageRatio)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">已选时长</p><p className="mt-2 text-violet-800">{diagnostics.selectedDurationMs.toFixed(0)} ms</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">边界帧</p><p className="mt-2 text-violet-800">{formatFrame(diagnostics.selectedStartFrame)} → {formatFrame(diagnostics.selectedEndFrame)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">首个 / 最后有声帧</p><p className="mt-2 text-violet-800">{formatFrame(diagnostics.selectedFirstVoicedFrame)} / {formatFrame(diagnostics.selectedLastVoicedFrame)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200 lg:col-span-2"><p className="font-semibold text-violet-950">已选频率最小值 / 中位数 / 最大值</p><p className="mt-2 text-violet-800">{formatFrequency(diagnostics.selectedFrequencyMinHz)} · {formatFrequency(diagnostics.selectedFrequencyMedianHz)} · {formatFrequency(diagnostics.selectedFrequencyMaxHz)}</p></div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-bold text-amber-900">警告 and boundary copy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
          {diagnostics.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </div>
    </section>
  );
}
