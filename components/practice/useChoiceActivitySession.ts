"use client";

import { useState } from "react";

import type { ActivityAnswer } from "../../lib/activity/activityAnswer";
import type { AnyActivityDefinitionV1 } from "../../lib/activity/activityDefinition";
import {
  checkChoiceActivityAnswer,
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
  type ActivityCheckEvidence,
  type ActivitySessionV1,
} from "../../lib/activity/activitySession";

export function useChoiceActivitySession(
  definition: AnyActivityDefinitionV1,
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

  const submitAnswer = (answer: ActivityAnswer) => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      return submitActivityAnswer(
        definition,
        current,
        answer,
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

  const checkAnswer = (answer: ActivityAnswer, evidence: ActivityCheckEvidence) => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      const submitted = submitActivityAnswer(
        definition,
        current,
        answer,
        current.revision,
      );
      return completeActivityCheck(submitted, evidence, submitted.revision);
    });
  };

  const completeCheck = (evidence: ActivityCheckEvidence) => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      return completeActivityCheck(current, evidence, current.revision);
    });
  };

  const restart = () => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      return restartActivityAttempt(current, current.revision);
    });
  };

  const restartIfDirty = () => {
    setStoredSession((stored) => {
      const current = resolve(stored);
      if (
        current.lifecycle === "ready"
        && current.answer === undefined
        && current.checkEvidence === undefined
      ) {
        return current;
      }
      return restartActivityAttempt(current, current.revision);
    });
  };

  return {
    session,
    submitAnswer,
    submitChoice,
    checkAnswer,
    completeCheck,
    checkChoice,
    restart,
    restartIfDirty,
  };
}
