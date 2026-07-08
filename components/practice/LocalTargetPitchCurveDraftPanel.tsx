import type { LocalTargetPitchCurveDraft } from "../../lib/practice/localTargetPitchCurveDraft";

type LocalTargetPitchCurveDraftPanelProps = {
  draft: LocalTargetPitchCurveDraft | null;
  isAnalysisReady: boolean;
  onGenerate: () => void;
  disabled?: boolean;
};

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null ? "—" : `${frequencyHz.toFixed(1)} Hz`;

export function LocalTargetPitchCurveDraftPanel({
  draft,
  isAnalysisReady,
  onGenerate,
  disabled = false,
}: LocalTargetPitchCurveDraftPanelProps) {
  const statusLabel = draft?.status === "ready" ? "已就绪" : isAnalysisReady ? "已就绪" : "等待已解码参考音频";

  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            P37 浏览器本地草稿基础
          </p>
          <h2 className="mt-1 text-2xl font-bold text-violet-950">
            本地目标音高曲线草稿
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
            从已解码的本地旋律参考音频生成诊断性的估计目标音高曲线草稿。本功能只使用当前浏览器当前会话的声道数据，不会创建最终目标、正式转写、分数、等级、通过/失败结果或准确率百分比。
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || !isAnalysisReady}
          className="rounded-full bg-violet-700 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:bg-slate-300 disabled:text-slate-600"
        >
          生成目标音高曲线草稿
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">状态</p>
          <p className="mt-2 text-violet-800">{statusLabel}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">帧数</p>
          <p className="mt-2 text-violet-800">{draft ? `${draft.frameCount} 总计` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">有声 / 无声</p>
          <p className="mt-2 text-violet-800">{draft ? `${draft.voicedFrameCount} / ${draft.unvoicedFrameCount}` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">时长</p>
          <p className="mt-2 text-violet-800">{draft ? `${(draft.durationMs / 1000).toFixed(2)}s` : "—"}</p>
        </div>
      </div>

      {draft ? (
        <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
          <div className="rounded-2xl border border-violet-200 bg-white p-4">
            <p className="font-bold text-violet-950">频率摘要</p>
            <p className="mt-2 text-violet-800">
              最小值 {formatFrequency(draft.frequencyMinHz)} · 中位数 {formatFrequency(draft.frequencyMedianHz)} · 最大值 {formatFrequency(draft.frequencyMaxHz)}
            </p>
            <p className="mt-3 font-semibold text-violet-950">前几帧草稿</p>
            <ul className="mt-2 space-y-1 text-violet-800">
              {draft.frames.slice(0, 5).map((frame) => (
                <li key={frame.frameIndex}>
                  #{frame.frameIndex} · {frame.timeMs.toFixed(0)}ms · {frame.voiced && frame.frequencyHz ? `${frame.frequencyHz.toFixed(1)} Hz` : "无声"} · 置信度 {frame.confidence.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">草稿警告 / 限制</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              {draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4 text-sm text-violet-900">
        <p className="font-bold text-violet-950">P37 边界</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>仅浏览器本地；不上传，也不进行云端处理。</li>
          <li>使用仅当前会话的已解码 PCM / 声道数据；不会保存到 localStorage、IndexedDB、账号、数据库或私有存储。</li>
          <li>仅草稿、估计与诊断用途；正式评分前需要检查。</li>
          <li>不用于评分，不是最终目标，也不是正式转写。</li>
          <li>最适合干净的人声参考、哼唱或单一旋律乐器。</li>
          <li>完整混音歌曲延后到未来私有云歌曲分析；P37 不做声源分离或整首歌曲人声旋律提取。</li>
          <li>P38 可能加入检查/校正或安全练习接入，但本面板不会把草稿连接到导入目标练习流程。</li>
        </ul>
      </div>
    </section>
  );
}
