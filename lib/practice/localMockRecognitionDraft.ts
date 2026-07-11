import {
  canCreatePracticeTargetFromNotationDraft,
  type NotationDraftEvent,
  type NotationFragmentDraft,
  type NotationTimeSignature,
} from "./localNotationFragmentDraft";

export type MockRecognitionReliability = "clear" | "uncertain" | "possibly-missing";
export type MockRecognitionReviewStatus = "empty" | "draft" | "checked" | "stale" | "cleared";

export type MockRecognitionDraftEvent = NotationDraftEvent & {
  reliability: MockRecognitionReliability;
  reliabilityReason: string;
};

export type MockRecognitionDraft = {
  id: string;
  sourceType: "mock-data";
  sourceId: string;
  timeSignature: NotationTimeSignature;
  measureCount: 2;
  events: MockRecognitionDraftEvent[];
  checked: boolean;
  stale: boolean;
  cleared: boolean;
};

export const noSheetMusicSourceMockDraftReason =
  "请先选择一张本地乐谱图片。当前模拟草稿不会读取或识别图片内容。";

export function canGenerateMockRecognitionDraft(sourceId: string | null): boolean {
  return Boolean(sourceId);
}

export function createMockRecognitionDraft(sourceId: string | null): MockRecognitionDraft | null {
  if (!sourceId) return null;
  return {
    id: `mock-recognition-draft:${sourceId}`,
    sourceType: "mock-data",
    sourceId,
    timeSignature: "4/4",
    measureCount: 2,
    checked: false,
    stale: false,
    cleared: false,
    events: [
      { id: "mock-event-1", type: "note", pitch: "C4", duration: "quarter", measure: 1, reliability: "clear", reliabilityReason: "模拟相对明确事件" },
      { id: "mock-event-2", type: "note", pitch: "D4", duration: "quarter", measure: 1, reliability: "uncertain", reliabilityReason: "模拟低可信音高" },
      { id: "mock-event-3", type: "rest", pitch: null, duration: "quarter", measure: 1, reliability: "clear", reliabilityReason: "模拟相对明确休止符" },
      { id: "mock-event-4", type: "note", pitch: "E4", duration: "quarter", measure: 1, reliability: "uncertain", reliabilityReason: "模拟时值不确定" },
      { id: "mock-event-5", type: "note", pitch: "G4", duration: "half", measure: 2, reliability: "possibly-missing", reliabilityReason: "模拟事件可能缺失" },
    ],
  };
}

export function getMockRecognitionDraftStatus(draft: MockRecognitionDraft | null): MockRecognitionReviewStatus {
  if (!draft) return "empty";
  if (draft.stale) return "stale";
  if (draft.cleared) return "cleared";
  return draft.checked ? "checked" : "draft";
}

export function markMockRecognitionDraftChecked(draft: MockRecognitionDraft | null): MockRecognitionDraft | null {
  if (!draft || draft.stale || draft.cleared) return draft;
  return { ...draft, checked: true };
}

export function markMockRecognitionDraftUnchecked(draft: MockRecognitionDraft | null): MockRecognitionDraft | null {
  if (!draft) return draft;
  return { ...draft, checked: false, cleared: false };
}

export function clearMockRecognitionDraft(
  draft: MockRecognitionDraft | null,
): MockRecognitionDraft | null {
  if (!draft) return null;
  return {
    ...draft,
    events: [],
    checked: false,
    stale: false,
    cleared: true,
  };
}

export function reconcileMockRecognitionDraftSource(draft: MockRecognitionDraft | null, currentSourceId: string | null): MockRecognitionDraft | null {
  if (!draft) return null;
  if (draft.sourceId !== currentSourceId) return { ...draft, checked: false, stale: true };
  return draft;
}

export function canUseMockRecognitionDraftAsCurrent(draft: MockRecognitionDraft | null, currentSourceId: string | null): boolean {
  return Boolean(draft && !draft.stale && !draft.cleared && draft.sourceId === currentSourceId);
}

export function copyMockRecognitionDraftToManualDraft(draft: MockRecognitionDraft | null): NotationFragmentDraft | null {
  if (!draft || draft.stale || draft.cleared) return null;
  return {
    timeSignature: draft.timeSignature,
    events: draft.events.map(({ reliability, reliabilityReason, ...event }, index) => ({ ...event, id: `notation-event-${index + 1}` })),
    checked: false,
    stale: false,
    cleared: false,
    source: { mode: "independent" },
    nextEventNumber: draft.events.length + 1,
  };
}

export function canCreateValidationFromMockRecognitionDraft(): false {
  return false;
}

export function canCreatePracticeTargetFromMockRecognitionDraft(): false {
  return canCreatePracticeTargetFromNotationDraft();
}
