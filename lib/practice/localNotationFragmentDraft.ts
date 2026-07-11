export const notationTimeSignatures = ["2/4", "3/4", "4/4"] as const;
export const notationPitches = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const;
export const notationDurations = ["half", "quarter", "eighth"] as const;
export const notationMeasures = [1, 2] as const;
export const maxNotationDraftEvents = 8;

export type NotationTimeSignature = (typeof notationTimeSignatures)[number];
export type NotationPitch = (typeof notationPitches)[number];
export type NotationDuration = (typeof notationDurations)[number];
export type NotationMeasure = (typeof notationMeasures)[number];
export type NotationEventType = "note" | "rest";
export type NotationDraftStatus = "empty" | "draft" | "invalid" | "checked" | "stale" | "cleared";
export type NotationDraftSource = { mode: "independent" } | { mode: "visual-reference"; sourceId: string };

export type NotationDraftEvent = {
  id: string;
  type: NotationEventType;
  pitch: NotationPitch | null;
  duration: NotationDuration;
  measure: NotationMeasure;
};

export type NotationFragmentDraft = {
  timeSignature: NotationTimeSignature;
  events: NotationDraftEvent[];
  checked: boolean;
  stale: boolean;
  cleared: boolean;
  source: NotationDraftSource;
  nextEventNumber: number;
};

export type NotationDraftInput = {
  type: NotationEventType;
  pitch?: NotationPitch | null;
  duration: NotationDuration;
  measure: NotationMeasure;
};

const includesValue = <T extends readonly string[] | readonly number[]>(values: T, value: unknown) =>
  (values as readonly unknown[]).includes(value);

export function createNotationFragmentDraft(source: NotationDraftSource = { mode: "independent" }): NotationFragmentDraft {
  return { timeSignature: "4/4", events: [], checked: false, stale: false, cleared: false, source, nextEventNumber: 1 };
}

export function isAllowedTimeSignature(value: unknown): value is NotationTimeSignature {
  return includesValue(notationTimeSignatures, value);
}
export function isAllowedPitch(value: unknown): value is NotationPitch {
  return includesValue(notationPitches, value);
}
export function isAllowedDuration(value: unknown): value is NotationDuration {
  return includesValue(notationDurations, value);
}
export function isAllowedMeasure(value: unknown): value is NotationMeasure {
  return includesValue(notationMeasures, value);
}

export function validateNotationDraftEventInput(input: NotationDraftInput): string[] {
  const errors: string[] = [];
  if (input.type !== "note" && input.type !== "rest") errors.push("事件类型超出范围。");
  if (!isAllowedDuration(input.duration)) errors.push("时值超出当前范围。");
  if (!isAllowedMeasure(input.measure)) errors.push("小节超出当前范围。");
  if (input.type === "note" && !isAllowedPitch(input.pitch)) errors.push("音符必须选择当前范围内的音高。");
  if (input.type === "rest" && input.duration !== "quarter") errors.push("当前阶段只支持四分休止符。");
  return errors;
}

const invalidateReview = (draft: NotationFragmentDraft): NotationFragmentDraft => ({ ...draft, checked: false, stale: false, cleared: false });
const normalizeEvent = (event: NotationDraftInput, id: string): NotationDraftEvent => ({ id, type: event.type, pitch: event.type === "note" ? event.pitch ?? null : null, duration: event.duration, measure: event.measure });

export function addNotationDraftEvent(draft: NotationFragmentDraft, input: NotationDraftInput): NotationFragmentDraft {
  if (draft.events.length >= maxNotationDraftEvents) return draft;
  if (validateNotationDraftEventInput(input).length > 0) return { ...draft, checked: false, stale: false, cleared: false };
  const next = invalidateReview(draft);
  return { ...next, events: [...next.events, normalizeEvent(input, `notation-event-${draft.nextEventNumber}`)], nextEventNumber: draft.nextEventNumber + 1 };
}

export function updateNotationDraftEvent(draft: NotationFragmentDraft, id: string, input: NotationDraftInput): NotationFragmentDraft {
  if (validateNotationDraftEventInput(input).length > 0) return { ...draft, checked: false, stale: false, cleared: false };
  const next = invalidateReview(draft);
  return { ...next, events: next.events.map((event) => event.id === id ? normalizeEvent(input, id) : event) };
}

export function deleteNotationDraftEvent(draft: NotationFragmentDraft, id: string): NotationFragmentDraft {
  return { ...invalidateReview(draft), events: draft.events.filter((event) => event.id !== id) };
}

export function changeNotationDraftTimeSignature(draft: NotationFragmentDraft, timeSignature: NotationTimeSignature): NotationFragmentDraft {
  return { ...invalidateReview(draft), timeSignature };
}

export function markNotationDraftChecked(draft: NotationFragmentDraft): NotationFragmentDraft {
  if (draft.events.length === 0 || draft.stale || getNotationDraftStatus(draft) === "invalid") return draft;
  return { ...draft, checked: true, cleared: false };
}

export function clearNotationFragmentDraft(draft: NotationFragmentDraft): NotationFragmentDraft {
  return { ...draft, events: [], checked: false, stale: false, cleared: true };
}

export function resetNotationFragmentDraft(source: NotationDraftSource = { mode: "independent" }): NotationFragmentDraft {
  return { ...createNotationFragmentDraft(source), cleared: true };
}

export function reconcileNotationDraftSource(draft: NotationFragmentDraft, currentSourceId: string | null): NotationFragmentDraft {
  if (draft.source.mode === "visual-reference" && draft.source.sourceId !== currentSourceId && draft.events.length > 0) {
    return { ...draft, checked: false, stale: true };
  }
  return draft;
}

export function confirmNotationDraftWithCurrentSource(draft: NotationFragmentDraft, sourceId: string): NotationFragmentDraft {
  return { ...draft, source: { mode: "visual-reference", sourceId }, checked: false, stale: false, cleared: false };
}

export function convertNotationDraftToIndependent(draft: NotationFragmentDraft): NotationFragmentDraft {
  return { ...draft, source: { mode: "independent" }, checked: false, stale: false, cleared: false };
}

export function getNotationDraftStatus(draft: NotationFragmentDraft): NotationDraftStatus {
  if (draft.stale) return "stale";
  if (draft.events.length === 0) return draft.cleared ? "cleared" : "empty";
  if (draft.events.some((event) => validateNotationDraftEventInput(event).length > 0)) return "invalid";
  return draft.checked ? "checked" : "draft";
}

export function canCreateNotationValidation(): false { return false; }
export function canCreatePracticeTargetFromNotationDraft(): false { return false; }
