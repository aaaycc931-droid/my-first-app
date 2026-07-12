import type { NotationFragmentDraft } from "./localNotationFragmentDraft";
import {
  getNotationDraftFingerprint,
  type NotationDraftValidationResult,
} from "./localNotationDraftValidation";

export const notationTemporaryPracticeTargetModes = [
  "sight-singing",
  "rhythm",
] as const;

export type NotationTemporaryPracticeTargetMode =
  (typeof notationTemporaryPracticeTargetModes)[number];

export type NotationTemporaryPracticeTarget = {
  id: string;
  mode: NotationTemporaryPracticeTargetMode;
  status: "active" | "stale";
  localOnly: true;
  sessionOnly: true;
  nonScoring: true;
  temporary: true;
  createdAtMs: number;
  draftFingerprint: string;
  sourceDescription: "独立手动草稿" | "手动草稿（使用本地图片作为肉眼参考）";
  timeSignature: NotationFragmentDraft["timeSignature"];
  events: NotationFragmentDraft["events"];
  warnings: string[];
};

const boundaryWarnings = [
  "这是当前浏览器会话内的临时练习目标。",
  "它来自已检查且通过小节时值校验的手动草稿，不是正式识谱或最终目标。",
  "当前练习不录音、不评分、不产生正式成绩。",
  "刷新页面后目标会消失；不会上传，也不会写入 localStorage、IndexedDB 或数据库。",
] as const;

export function canCreateNotationTemporaryPracticeTarget(
  draft: NotationFragmentDraft,
  validation: NotationDraftValidationResult | null,
): boolean {
  return Boolean(
    validation &&
      validation.status === "valid" &&
      validation.canProceedToStageE &&
      draft.checked &&
      !draft.stale &&
      draft.events.length > 0 &&
      validation.draftFingerprint === getNotationDraftFingerprint(draft),
  );
}

export function getNotationTemporaryPracticeTargetDisabledReason(
  draft: NotationFragmentDraft,
  validation: NotationDraftValidationResult | null,
): string {
  if (draft.events.length === 0) return "请先创建包含音符或休止符的手动草稿。";
  if (draft.stale) return "参考图片已变更，请先重新确认来源或改为独立草稿。";
  if (!draft.checked) return "请先检查手动草稿，再运行并通过小节时值校验。";
  if (!validation) return "请先运行小节时值校验。";
  if (validation.status === "stale") return "旧校验结果已失效，请重新检查并再次校验。";
  if (validation.status === "invalid") return "小节时值校验尚未通过，请修改草稿后重新检查。";
  if (!validation.canProceedToStageE) return "当前草稿尚未满足临时练习目标的校验条件。";
  if (validation.draftFingerprint !== getNotationDraftFingerprint(draft)) {
    return "草稿已变化，旧校验结果不能用于创建临时练习目标。";
  }
  return "当前草稿可生成临时练习目标。";
}

export function createNotationTemporaryPracticeTarget(
  draft: NotationFragmentDraft,
  validation: NotationDraftValidationResult | null,
  mode: NotationTemporaryPracticeTargetMode,
  createdAtMs = Date.now(),
): NotationTemporaryPracticeTarget | null {
  if (!canCreateNotationTemporaryPracticeTarget(draft, validation)) return null;

  return {
    id: `temporary-notation-target-${createdAtMs}`,
    mode,
    status: "active",
    localOnly: true,
    sessionOnly: true,
    nonScoring: true,
    temporary: true,
    createdAtMs,
    draftFingerprint: getNotationDraftFingerprint(draft),
    sourceDescription:
      draft.source.mode === "independent"
        ? "独立手动草稿"
        : "手动草稿（使用本地图片作为肉眼参考）",
    timeSignature: draft.timeSignature,
    events: draft.events.map((event) => ({ ...event })),
    warnings: [...boundaryWarnings],
  };
}

export function reconcileNotationTemporaryPracticeTarget(
  target: NotationTemporaryPracticeTarget | null,
  draft: NotationFragmentDraft,
  validation: NotationDraftValidationResult | null,
): NotationTemporaryPracticeTarget | null {
  if (!target || target.status === "stale") return target;
  if (
    !canCreateNotationTemporaryPracticeTarget(draft, validation) ||
    target.draftFingerprint !== getNotationDraftFingerprint(draft)
  ) {
    return { ...target, status: "stale" };
  }
  return target;
}
