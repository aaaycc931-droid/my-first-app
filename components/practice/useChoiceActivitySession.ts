"use client";

import { useState } from "react";

import type { ActivityDefinitionV1 } from "../../lib/activity/activityDefinition";
import {
  checkChoiceActivityAnswer,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
  type ActivitySessionV1,
} from "../../lib/activity/activitySession";

export function useChoiceActivitySession(
  definition: ActivityDefinitionV1,
  sessionId: string,
) {
  const [storedSession, setStoredSession] = useState(() =>
    createActivitySession(definition, sessionId),
  );
  const resolve = (candidate: ActivitySessionV1) =>
    candidate.activityId === definition.activityId && candidate.targetId === definition.target.targetId
      ? candidate
      : createActivitySession(definition, sessionId);
  const session = resolve(storedSession);

  const submitChoice = (optionIds: string[]) => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      return submitActivityAnswer(
        definition,
        current,
        { mode: "choice", optionIds },
        current.revision,
      );
    });
  };

  const checkChoice = (optionIds: string[]) => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      const submitted = submitActivityAnswer(
        definition,
        current,
        { mode: "choice", optionIds },
        current.revision,
      );
      return checkChoiceActivityAnswer(definition, submitted, submitted.revision);
    });
  };

  const restart = () => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      return restartActivityAttempt(current, current.revision);
    });
  };

  return { session, submitChoice, checkChoice, restart };
}
