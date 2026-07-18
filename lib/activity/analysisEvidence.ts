export type AnalysisEvidenceState = "observed" | "missing" | "rejected";

export type AnalysisEvidenceV1 = {
  schemaVersion: "analysis-evidence-v1";
  evidenceId: string;
  attemptId: string;
  targetId: string;
  scope: "note" | "phrase";
  state: AnalysisEvidenceState;
  processing: "local";
  algorithmVersion: string;
  sourceAnalysisVersion: string;
  anchor: { timebase: "recording-relative-ms"; startMs?: number; endMs?: number };
  confidence: "high" | "medium" | "low" | null;
  metrics?: {
    detectedNote?: string;
    medianCents?: number;
    lowCents?: number;
    highCents?: number;
    timingOffsetMs?: number;
  };
  reason: string;
  assessmentMode: "non-scoring";
};

export const validateAnalysisEvidence = (evidence: AnalysisEvidenceV1) => {
  if (!evidence.evidenceId.startsWith(`${evidence.attemptId}:`)) {
    throw new Error("证据标识必须包含尝试标识。 ");
  }
  if (evidence.state !== "observed" && evidence.metrics !== undefined) {
    throw new Error("缺失或拒答证据不得携带检测结论。 ");
  }
  return evidence;
};
