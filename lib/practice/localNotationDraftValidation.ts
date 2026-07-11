import {
  getNotationDraftStatus,
  notationMeasures,
  type NotationDuration,
  type NotationFragmentDraft,
  type NotationMeasure,
} from "./localNotationFragmentDraft";

export type NotationMeasureValidationState = "valid" | "underfilled" | "overfilled";

export type NotationMeasureValidation = {
  measure: NotationMeasure;
  expectedQuarterBeats: number;
  actualQuarterBeats: number;
  differenceQuarterBeats: number;
  state: NotationMeasureValidationState;
};

export type NotationDraftValidationResult = {
  draftFingerprint: string;
  status: "valid" | "invalid" | "stale";
  timeSignature: NotationFragmentDraft["timeSignature"];
  expectedQuarterBeatsPerMeasure: number;
  measures: NotationMeasureValidation[];
  canProceedToStageE: boolean;
};

const durationQuarterBeats: Record<NotationDuration, number> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export function getExpectedQuarterBeatsPerMeasure(
  timeSignature: NotationFragmentDraft["timeSignature"],
): number {
  return Number(timeSignature.split("/")[0]);
}

export function getNotationDraftFingerprint(draft: NotationFragmentDraft): string {
  return JSON.stringify({
    timeSignature: draft.timeSignature,
    events: draft.events,
    checked: draft.checked,
    stale: draft.stale,
    cleared: draft.cleared,
    source: draft.source,
  });
}

export function getNotationDraftValidationDisabledReason(
  draft: NotationFragmentDraft,
): string | null {
  const status = getNotationDraftStatus(draft);
  if (status === "empty" || status === "cleared") return "请先创建包含音符或休止符的手动草稿。";
  if (status === "stale") return "参考图片已变更，请先重新确认来源或改为独立草稿。";
  if (status === "invalid") return "草稿包含无效事件，请先修正。";
  if (!draft.checked) return "请先标记为已检查，再运行小节时值校验。";
  return null;
}

export function canRunNotationDraftValidation(draft: NotationFragmentDraft): boolean {
  return getNotationDraftValidationDisabledReason(draft) === null;
}

export function validateNotationDraftMeasures(
  draft: NotationFragmentDraft,
): NotationDraftValidationResult | null {
  if (!canRunNotationDraftValidation(draft)) return null;

  const expectedQuarterBeatsPerMeasure = getExpectedQuarterBeatsPerMeasure(draft.timeSignature);
  const measures = notationMeasures.map((measure): NotationMeasureValidation => {
    const actualQuarterBeats = draft.events
      .filter((event) => event.measure === measure)
      .reduce((total, event) => total + durationQuarterBeats[event.duration], 0);
    const differenceQuarterBeats = actualQuarterBeats - expectedQuarterBeatsPerMeasure;
    return {
      measure,
      expectedQuarterBeats: expectedQuarterBeatsPerMeasure,
      actualQuarterBeats,
      differenceQuarterBeats,
      state: differenceQuarterBeats === 0
        ? "valid"
        : differenceQuarterBeats < 0
          ? "underfilled"
          : "overfilled",
    };
  });
  const valid = measures.every((measure) => measure.state === "valid");

  return {
    draftFingerprint: getNotationDraftFingerprint(draft),
    status: valid ? "valid" : "invalid",
    timeSignature: draft.timeSignature,
    expectedQuarterBeatsPerMeasure,
    measures,
    canProceedToStageE: valid,
  };
}

export function reconcileNotationDraftValidation(
  result: NotationDraftValidationResult | null,
  draft: NotationFragmentDraft,
): NotationDraftValidationResult | null {
  if (!result || result.status === "stale") return result;
  if (result.draftFingerprint === getNotationDraftFingerprint(draft)) return result;
  return { ...result, status: "stale", canProceedToStageE: false };
}
