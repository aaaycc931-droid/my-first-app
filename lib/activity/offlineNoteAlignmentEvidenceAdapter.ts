import type { AnalysisEvidenceV1 } from "./analysisEvidence";
import { validateAnalysisEvidence } from "./analysisEvidence";
import type { OfflineNoteAlignmentResult } from "../practice/offlineNoteAlignment";

const present = <T>(value: T | null): value is T => value !== null;

export const adaptOfflineNoteAlignmentEvidence = (
  attemptId: string,
  result: OfflineNoteAlignmentResult,
): AnalysisEvidenceV1[] => {
  const notes = result.targetEvidence.map((item): AnalysisEvidenceV1 => {
    const observed = item.state === "close" || item.state === "high" || item.state === "low";
    const state = observed ? "observed" : item.state === "missing" ? "missing" : "rejected";
    const metrics = observed ? {
      ...(present(item.detectedNote) ? { detectedNote: item.detectedNote } : {}),
      ...(present(item.medianCents) ? { medianCents: item.medianCents } : {}),
      ...(present(item.lowCents) ? { lowCents: item.lowCents } : {}),
      ...(present(item.highCents) ? { highCents: item.highCents } : {}),
      ...(present(item.timingOffsetMs) ? { timingOffsetMs: item.timingOffsetMs } : {}),
    } : undefined;
    return validateAnalysisEvidence({
      schemaVersion: "analysis-evidence-v1",
      evidenceId: `${attemptId}:${result.version}:note:${item.target.targetId}`,
      attemptId,
      targetId: item.target.targetId,
      scope: "note",
      state,
      processing: "local",
      algorithmVersion: result.version,
      sourceAnalysisVersion: result.sourceAnalysisVersion,
      anchor: { timebase: "recording-relative-ms", startMs: item.target.startMs, endMs: item.target.endMs },
      confidence: observed ? item.confidence : null,
      ...(metrics && Object.keys(metrics).length > 0 ? { metrics } : {}),
      reason: item.reason,
      assessmentMode: "non-scoring",
    });
  });
  const phrases = result.phraseEvidence.map((item): AnalysisEvidenceV1 => {
    const observed = item.state === "available" || item.state === "partial";
    const metrics = observed ? {
      ...(present(item.medianCents) ? { medianCents: item.medianCents } : {}),
      ...(present(item.medianTimingOffsetMs) ? { timingOffsetMs: item.medianTimingOffsetMs } : {}),
    } : undefined;
    return validateAnalysisEvidence({
      schemaVersion: "analysis-evidence-v1",
      evidenceId: `${attemptId}:${result.version}:phrase:${item.phraseIndex}`,
      attemptId,
      targetId: `phrase:${item.phraseIndex}`,
      scope: "phrase",
      state: observed ? "observed" : "rejected",
      processing: "local",
      algorithmVersion: result.version,
      sourceAnalysisVersion: result.sourceAnalysisVersion,
      anchor: { timebase: "recording-relative-ms" },
      confidence: null,
      ...(metrics && Object.keys(metrics).length > 0 ? { metrics } : {}),
      reason: item.reason,
      assessmentMode: "non-scoring",
    });
  });
  return [...notes, ...phrases];
};
