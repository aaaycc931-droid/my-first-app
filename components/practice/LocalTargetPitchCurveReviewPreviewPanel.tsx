import type { LocalTargetPitchCurveDraft } from "../../lib/practice/localTargetPitchCurveDraft";
import { createLocalTargetPitchCurveDraftReviewPreview } from "../../lib/practice/localTargetPitchCurveReview";

type LocalTargetPitchCurveReviewPreviewPanelProps = {
  draft: LocalTargetPitchCurveDraft | null;
};

const formatTime = (timeMs: number | null) =>
  timeMs === null ? "—" : `${timeMs.toFixed(0)} ms`;

const formatCoverage = (ratio: number) => `${(ratio * 100).toFixed(1)}% coverage`;

export function LocalTargetPitchCurveReviewPreviewPanel({
  draft,
}: LocalTargetPitchCurveReviewPreviewPanelProps) {
  const preview = createLocalTargetPitchCurveDraftReviewPreview(draft);

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
            P38 检查预览基础
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
            本地目标音高曲线草稿检查预览
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
            用于 P37 草稿的浏览器本地、仅当前会话检查预览。它帮助在未来检查控制或安全练习接入前查看覆盖率、有声区域和估计音高范围。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="rounded-full bg-white px-3 py-2 text-fuchsia-800 ring-1 ring-fuchsia-200">
            仅草稿： {String(preview.draftOnly)}
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-fuchsia-800 ring-1 ring-fuchsia-200">
            需要检查： {String(preview.needsReview)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">草稿是否存在</p>
          <p className="mt-2 text-fuchsia-800">{draft ? "是" : "否"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">帧数</p>
          <p className="mt-2 text-fuchsia-800">{preview.frameCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">有声 / 无声</p>
          <p className="mt-2 text-fuchsia-800">{preview.voicedFrameCount} / {preview.unvoicedFrameCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">有声覆盖率</p>
          <p className="mt-2 text-fuchsia-800">{formatCoverage(preview.voicedCoverageRatio)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">首个有声帧</p>
          <p className="mt-2 text-fuchsia-800">{formatTime(preview.firstVoicedFrameTimeMs)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">最后有声帧</p>
          <p className="mt-2 text-fuchsia-800">{formatTime(preview.lastVoicedFrameTimeMs)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-4">
          <p className="font-bold text-fuchsia-950">估计音高范围</p>
          <p className="mt-2 text-fuchsia-800">{preview.estimatedRangeLabel}</p>
          <p className="mt-3 text-fuchsia-800">
            诊断置信度仍仅用于诊断；本面板不会生成分数、等级、通过/失败判断或准确率百分比。
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">警告</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm text-fuchsia-900">
        <p className="font-bold text-fuchsia-950">P38 限制</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>接入练习前必须先检查。</li>
          <li>仅为草稿；不是最终目标，也不是正式转写。</li>
          <li>不用于评分，也未连接到导入目标练习流程。</li>
          <li>不上传、不进行云端处理、无账号、无数据库、无私有存储。</li>
          <li>完整混音歌曲延后到未来私有云歌曲分析。</li>
          <li>P38 不提供校正编辑器、拖拽编辑或批准为最终目标的操作。</li>
        </ul>
      </div>
    </section>
  );
}
