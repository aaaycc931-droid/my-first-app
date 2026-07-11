import { useEffect, useState } from "react";

import {
  canCreatePracticeTargetFromMockRecognitionDraft,
  canCreateValidationFromMockRecognitionDraft,
  canGenerateMockRecognitionDraft,
  canUseMockRecognitionDraftAsCurrent,
  clearMockRecognitionDraft,
  copyMockRecognitionDraftToManualDraft,
  createMockRecognitionDraft,
  getMockRecognitionDraftStatus,
  markMockRecognitionDraftChecked,
  markMockRecognitionDraftUnchecked,
  noSheetMusicSourceMockDraftReason,
  reconcileMockRecognitionDraftSource,
  type MockRecognitionDraft,
  type MockRecognitionReliability,
} from "../../lib/practice/localMockRecognitionDraft";
import type { NotationFragmentDraft } from "../../lib/practice/localNotationFragmentDraft";

type MockRecognitionDraftPanelProps = {
  currentSheetMusicSourceId: string | null;
  manualDraftEventCount: number;
  onCopyToManualDraft: (draft: NotationFragmentDraft, notice: string) => void;
};

const reliabilityLabels: Record<MockRecognitionReliability, string> = {
  clear: "相对明确",
  uncertain: "不确定",
  "possibly-missing": "可能缺失",
};

const durationLabels = {
  half: "二分",
  quarter: "四分",
  eighth: "八分",
};

const statusLabels = {
  empty: "未生成",
  draft: "未检查",
  checked: "已检查",
  stale: "已失效",
  cleared: "已清除",
};

export function MockRecognitionDraftPanel({
  currentSheetMusicSourceId,
  manualDraftEventCount,
  onCopyToManualDraft,
}: MockRecognitionDraftPanelProps) {
  const [draft, setDraft] = useState<MockRecognitionDraft | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  useEffect(() => {
    setDraft((currentDraft) => reconcileMockRecognitionDraftSource(currentDraft, currentSheetMusicSourceId));
  }, [currentSheetMusicSourceId]);

  const status = getMockRecognitionDraftStatus(draft);
  const canGenerate = canGenerateMockRecognitionDraft(currentSheetMusicSourceId);
  const canUseCurrent = canUseMockRecognitionDraftAsCurrent(draft, currentSheetMusicSourceId);
  const canCopy = canUseCurrent && Boolean(draft);

  const generate = () => {
    setShowOverwriteConfirm(false);
    setDraft(createMockRecognitionDraft(currentSheetMusicSourceId));
  };

  const copyToManual = () => {
    const manualDraft = copyMockRecognitionDraftToManualDraft(draft);
    if (!manualDraft) return;
    onCopyToManualDraft(manualDraft, "已复制到手动草稿。复制后的手动草稿为未检查状态，仍需修改、检查，并等待后续小节校验。");
    setShowOverwriteConfirm(false);
  };

  return (
    <section className="mt-6 rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Stage C Runtime Alpha</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">模拟识谱草稿</h2>
          <div className="mt-2 max-w-3xl space-y-1 text-sm leading-6 text-slate-700">
            <p>当前结果来自固定示例数据，不是真实图片识别结果。</p>
            <p>系统当前没有读取或识别图片中的音符。</p>
            <p>该草稿仅用于验证未来识谱结果的检查流程。</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generate} disabled={!canGenerate} className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{draft ? "重新生成模拟草稿" : "生成模拟识谱草稿"}</button>
          <button type="button" onClick={() => setDraft((currentDraft) => currentDraft?.checked ? markMockRecognitionDraftUnchecked(currentDraft) : markMockRecognitionDraftChecked(currentDraft))} disabled={!canUseCurrent} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-semibold text-cyan-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">{draft?.checked ? "重新检查" : "标记为已检查"}</button>
          <button type="button" onClick={() => { setDraft(clearMockRecognitionDraft); setShowOverwriteConfirm(false); }} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">清除模拟草稿</button>
        </div>
      </div>

      {!canGenerate ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{noSheetMusicSourceMockDraftReason}</p> : null}
      {status === "stale" ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">参考图片已变更，旧的模拟识谱草稿已失效，请重新生成。</p> : null}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-bold text-slate-950">模拟草稿预览</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="font-semibold text-slate-700">来源类型</dt><dd>模拟数据</dd></div>
          <div><dt className="font-semibold text-slate-700">关联图片来源</dt><dd className="break-all">{draft?.sourceId ?? currentSheetMusicSourceId ?? "无有效来源"}</dd></div>
          <div><dt className="font-semibold text-slate-700">拍号</dt><dd>{draft?.timeSignature ?? "未生成"}</dd></div>
          <div><dt className="font-semibold text-slate-700">小节数量</dt><dd>{draft?.measureCount ?? 0}</dd></div>
          <div><dt className="font-semibold text-slate-700">事件数量</dt><dd>{draft?.events.length ?? 0}</dd></div>
          <div><dt className="font-semibold text-slate-700">草稿整体状态</dt><dd>{statusLabels[status]}</dd></div>
          <div><dt className="font-semibold text-slate-700">是否已检查</dt><dd>{draft?.checked && !draft.stale ? "是" : "否"}</dd></div>
          <div><dt className="font-semibold text-slate-700">是否已失效</dt><dd>{draft?.stale ? "是" : "否"}</dd></div>
          <div><dt className="font-semibold text-slate-700">是否可进入小节校验</dt><dd>否，小节时值校验将在 Stage D 提供。</dd></div>
          <div><dt className="font-semibold text-slate-700">是否可进入练习</dt><dd>否，当前仍是模拟识谱草稿，不能直接进入练习。</dd></div>
        </dl>

        <div className="mt-4 space-y-3">
          {!draft ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">当前没有模拟识谱草稿。请先选择本地乐谱图片，再生成固定示例草稿。</p> : null}
          {draft?.events.map((event, index) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
              <p className="font-bold text-slate-950">事件 {index + 1}：{event.type === "note" ? "音符" : "休止符"}</p>
              <p className="mt-1 text-slate-700">{event.type === "note" ? `音高 ${event.pitch}` : "无音高"}，{durationLabels[event.duration]}，第 {event.measure} 小节。</p>
              <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${event.reliability === "clear" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>可靠性：{reliabilityLabels[event.reliability]}｜{event.reliabilityReason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
        <p className="font-bold">复制为可编辑手动草稿</p>
        <p className="mt-1">需要先复制为可编辑草稿、完成检查，并在后续阶段通过校验。复制后仍不能进入练习，也不会生成 Stage D 校验。</p>
        <button type="button" onClick={() => manualDraftEventCount > 0 ? setShowOverwriteConfirm(true) : copyToManual()} disabled={!canCopy} className="mt-3 rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">复制到手动草稿进行修改</button>
        {showOverwriteConfirm ? <div className="mt-3 rounded-2xl border border-amber-200 bg-white p-3 text-amber-900"><p className="font-bold">当前手动草稿已有事件。复制会覆盖现有手动草稿，但不会清除本地图片或模拟草稿。</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={copyToManual} className="rounded-full bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white">确认覆盖并复制</button><button type="button" onClick={() => setShowOverwriteConfirm(false)} className="rounded-full border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-900">取消</button></div></div> : null}
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left font-semibold text-slate-500">小节时值校验：小节时值校验将在 Stage D 提供。</button>
        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left font-semibold text-slate-500">进入练习：当前仍是模拟识谱草稿，不能直接进入练习；需要先复制为可编辑草稿、完成检查，并在后续阶段通过校验。</button>
      </div>
      <p className="mt-4 text-sm text-slate-600">会话边界：模拟草稿只存在于当前页面内存；刷新后消失，不写入 localStorage 或 IndexedDB，不上传，不调用 /api/recognize，不调用真实 OCR、OMR 或 Audiveris。</p>
      <p className="sr-only">校验能力：{canCreateValidationFromMockRecognitionDraft() ? "是" : "否"}；练习目标能力：{canCreatePracticeTargetFromMockRecognitionDraft() ? "是" : "否"}</p>
    </section>
  );
}
