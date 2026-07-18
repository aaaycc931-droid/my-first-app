export const ACTIVITY_INPUT_MODES = [
  "choice",
  "piano",
  "staff-notation",
  "numbered-notation",
  "solfege",
  "tap",
  "microphone",
  "usb-midi",
  "ble-midi",
] as const;

export type ActivityInputMode = (typeof ACTIVITY_INPUT_MODES)[number];

export type ActivityAnswer =
  | { mode: "choice"; optionIds: string[] }
  | { mode: "piano" | "usb-midi" | "ble-midi"; noteIds: string[] }
  | { mode: "staff-notation" | "numbered-notation"; documentId: string; revision: number }
  | { mode: "solfege"; tokens: string[] }
  | { mode: "tap"; onsetMs: number[] }
  | { mode: "microphone"; analysisEvidenceIds: string[] };

export type ActivityInputCapability = {
  mode: ActivityInputMode;
  status: "production" | "legacy-unadapted" | "planned";
};

export const validateActivityAnswer = (
  answer: ActivityAnswer,
  allowedInputModes: readonly ActivityInputMode[],
): ActivityAnswer => {
  if (!allowedInputModes.includes(answer.mode)) {
    throw new Error(`活动不允许使用 ${answer.mode} 输入。`);
  }
  const nonEmpty =
    "optionIds" in answer ? answer.optionIds.length > 0
      : "noteIds" in answer ? answer.noteIds.length > 0
        : "tokens" in answer ? answer.tokens.length > 0
          : "onsetMs" in answer ? answer.onsetMs.length > 0
            : "analysisEvidenceIds" in answer ? answer.analysisEvidenceIds.length > 0
              : answer.documentId.length > 0 && Number.isInteger(answer.revision) && answer.revision >= 0;
  if (!nonEmpty) throw new Error("活动答案不能为空。 ");
  return answer;
};
