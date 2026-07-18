import type { ActivitySessionV1 } from "../activity/activitySession";
import type { AnalysisEvidenceV1 } from "../activity/analysisEvidence";

export type CompanionEvidenceSummaryV1 = Pick<
  AnalysisEvidenceV1,
  "evidenceId" | "targetId" | "scope" | "state" | "confidence" | "reason" | "assessmentMode"
> & { metrics?: AnalysisEvidenceV1["metrics"] };

export type CompanionActionKind = "replay-reference" | "restart-current-attempt" | "show-explanation";

export type CompanionContextV1 = {
  schemaVersion: "companion-context-v1";
  activityId: string;
  targetId: string;
  sessionId: string;
  attemptId: string;
  revision: number;
  lifecycle: ActivitySessionV1["lifecycle"];
  assessmentMode: "non-scoring";
  evidence: CompanionEvidenceSummaryV1[];
  availableActions: CompanionActionKind[];
  localCapability: "available" | "disabled";
};

export type CompanionEventV1 =
  | { schemaVersion: "companion-event-v1"; type: "activity-lifecycle-changed"; context: CompanionContextV1 }
  | { schemaVersion: "companion-event-v1"; type: "answer-checked"; context: CompanionContextV1 }
  | { schemaVersion: "companion-event-v1"; type: "analysis-evidence-ready"; context: CompanionContextV1 }
  | { schemaVersion: "companion-event-v1"; type: "repractice-opened"; context: CompanionContextV1 };

export const createCompanionContext = (
  session: ActivitySessionV1,
  evidence: readonly AnalysisEvidenceV1[],
  companionEnabled = true,
): CompanionContextV1 => ({
  schemaVersion: "companion-context-v1",
  activityId: session.activityId,
  targetId: session.targetId,
  sessionId: session.sessionId,
  attemptId: session.attemptId,
  revision: session.revision,
  lifecycle: session.lifecycle,
  assessmentMode: "non-scoring",
  evidence: evidence
    .filter((item) => item.attemptId === session.attemptId)
    .map(({ evidenceId, targetId, scope, state, confidence, reason, assessmentMode, metrics }) => ({
      evidenceId, targetId, scope, state, confidence, reason, assessmentMode,
      ...(state === "observed" && metrics ? { metrics } : {}),
    })),
  availableActions: session.availableActions,
  localCapability: companionEnabled ? "available" : "disabled",
});

export type CompanionActionRequestV1 = {
  schemaVersion: "companion-action-request-v1";
  requestId: string;
  sessionId: string;
  expectedRevision: number;
  action: CompanionActionKind;
};

export const authorizeCompanionAction = ({
  request, context, seenRequestIds,
}: {
  request: CompanionActionRequestV1;
  context: CompanionContextV1;
  seenRequestIds: ReadonlySet<string>;
}): { ok: true; requestId: string; action: CompanionActionKind } | { ok: false; reason: string } => {
  if (request.schemaVersion !== "companion-action-request-v1" || request.requestId.length === 0) {
    return { ok: false, reason: "伙伴操作协议无效。" };
  }
  if (context.localCapability !== "available") return { ok: false, reason: "伙伴功能当前未启用。" };
  if (seenRequestIds.has(request.requestId)) return { ok: false, reason: "该伙伴操作已经执行。" };
  if (request.sessionId !== context.sessionId || request.expectedRevision !== context.revision) {
    return { ok: false, reason: "练习状态已变化，请重新确认操作。" };
  }
  if (!context.availableActions.includes(request.action)) return { ok: false, reason: "当前练习未授权该操作。" };
  return { ok: true, requestId: request.requestId, action: request.action };
};
