import assert from "node:assert/strict";

import type { ActivitySessionV1 } from "../lib/activity/activitySession";
import type { AnalysisEvidenceV1 } from "../lib/activity/analysisEvidence";
import { authorizeCompanionAction, createCompanionContext } from "../lib/companion/companionActivityBridge";

const session: ActivitySessionV1 = {
  schemaVersion: "activity-session-v1", sessionId: "s1", attemptId: "s1:attempt:1", attemptNumber: 1,
  revision: 3, activityId: "a1", targetId: "t1", lifecycle: "checked",
  answer: { mode: "choice", optionIds: ["private-selection"] },
  checkEvidence: { state: "different", assessmentMode: "non-scoring", explanation: "说明" },
  availableActions: ["replay-reference", "restart-current-attempt", "show-explanation"],
};
const rejected: AnalysisEvidenceV1 = {
  schemaVersion: "analysis-evidence-v1", evidenceId: "s1:attempt:1:algo:note:t1", attemptId: "s1:attempt:1",
  targetId: "t1", scope: "note", state: "rejected", processing: "local", algorithmVersion: "algo",
  sourceAnalysisVersion: "source", anchor: { timebase: "recording-relative-ms" }, confidence: null,
  reason: "无法判断", assessmentMode: "non-scoring",
};
const context = createCompanionContext(session, [rejected]);
const serialized = JSON.stringify(context);
assert.doesNotMatch(serialized, /private-selection|answer|score|pass|fail|accuracy/);
assert.equal(context.evidence[0]?.metrics, undefined);

const request = { schemaVersion: "companion-action-request-v1" as const, requestId: "r1", sessionId: "s1", expectedRevision: 3, action: "restart-current-attempt" as const };
assert.deepEqual(authorizeCompanionAction({ request, context, seenRequestIds: new Set() }), { ok: true, requestId: "r1", action: "restart-current-attempt" });
assert.equal(authorizeCompanionAction({ request, context, seenRequestIds: new Set(["r1"]) }).ok, false);
assert.equal(authorizeCompanionAction({ request: { ...request, expectedRevision: 2 }, context, seenRequestIds: new Set() }).ok, false);
assert.equal(authorizeCompanionAction({ request: { ...request, action: "show-explanation" }, context: { ...context, availableActions: [] }, seenRequestIds: new Set() }).ok, false);
assert.equal(authorizeCompanionAction({ request, context: createCompanionContext(session, [], false), seenRequestIds: new Set() }).ok, false);
assert.equal(authorizeCompanionAction({ request: { ...request, requestId: "" }, context, seenRequestIds: new Set() }).ok, false);

console.log("P114 companion activity bridge tests passed.");
