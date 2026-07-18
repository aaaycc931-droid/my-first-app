import type { ActivityAnswer } from "./activityAnswer";
import { validateActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import { canEnterActivityPractice, validateActivityDefinition } from "./activityDefinition";

export type ActivityLifecycle = "preview" | "ready" | "answering" | "checked" | "explained";
export type ActivityCheckEvidence = {
  state: "consistent" | "different" | "insufficient";
  assessmentMode: "non-scoring";
  explanation: string;
};

export type ActivitySessionV1 = {
  schemaVersion: "activity-session-v1";
  sessionId: string;
  attemptId: string;
  attemptNumber: number;
  revision: number;
  activityId: string;
  targetId: string;
  lifecycle: ActivityLifecycle;
  answer?: ActivityAnswer;
  checkEvidence?: ActivityCheckEvidence;
  availableActions: Array<"replay-reference" | "restart-current-attempt" | "show-explanation">;
};

const update = (session: ActivitySessionV1, expectedRevision: number, change: Partial<ActivitySessionV1>) => {
  if (session.revision !== expectedRevision) throw new Error("活动状态已变化，请刷新后重试。 ");
  return { ...session, ...change, revision: session.revision + 1 };
};

export const createActivitySession = (definition: ActivityDefinitionV1, sessionId: string): ActivitySessionV1 => {
  validateActivityDefinition(definition);
  return {
    schemaVersion: "activity-session-v1", sessionId, attemptId: `${sessionId}:attempt:1`, attemptNumber: 1,
    revision: 0, activityId: definition.activityId, targetId: definition.target.targetId,
    lifecycle: canEnterActivityPractice(definition) ? "ready" : "preview",
    availableActions: ["replay-reference", "restart-current-attempt"],
  };
};

export const confirmActivityPreview = (session: ActivitySessionV1, expectedRevision: number) =>
  update(session, expectedRevision, { lifecycle: "ready" });

export const submitActivityAnswer = (
  definition: ActivityDefinitionV1, session: ActivitySessionV1, answer: ActivityAnswer, expectedRevision: number,
) => update(session, expectedRevision, { answer: validateActivityAnswer(answer, definition.allowedInputModes), lifecycle: "answering" });

export const checkChoiceActivityAnswer = (
  definition: ActivityDefinitionV1, session: ActivitySessionV1, expectedRevision: number,
) => {
  if (!session.answer || session.answer.mode !== "choice" || definition.target.expectedAnswer.mode !== "choice") {
    return update(session, expectedRevision, {
      lifecycle: "checked", checkEvidence: { state: "insufficient", assessmentMode: "non-scoring", explanation: "当前答案无法可靠检查。" },
      availableActions: ["replay-reference", "restart-current-attempt", "show-explanation"],
    });
  }
  const expected = [...definition.target.expectedAnswer.optionIds].sort().join("|");
  const actual = [...session.answer.optionIds].sort().join("|");
  return update(session, expectedRevision, {
    lifecycle: "checked",
    checkEvidence: { state: expected === actual ? "consistent" : "different", assessmentMode: "non-scoring", explanation: definition.explanation },
    availableActions: ["replay-reference", "restart-current-attempt", "show-explanation"],
  });
};

export const restartActivityAttempt = (session: ActivitySessionV1, expectedRevision: number): ActivitySessionV1 => {
  const attemptNumber = session.attemptNumber + 1;
  return update(session, expectedRevision, {
    attemptNumber, attemptId: `${session.sessionId}:attempt:${attemptNumber}`, lifecycle: "ready", answer: undefined,
    checkEvidence: undefined, availableActions: ["replay-reference", "restart-current-attempt"],
  });
};
