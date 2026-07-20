import assert from "node:assert/strict";

import { createRhythmErrorFindingActivityDefinition } from "../lib/activity/rhythmErrorFindingActivityAdapter";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalRhythmErrorFindingChallenge,
  hasRhythmErrorFindingAssessmentFields,
} from "../lib/practice/localRhythmErrorFinding";

const expectedKinds = ["missed", "split", "merged", "shifted"] as const;
expectedKinds.forEach((expectedKind, sequence) => {
  const question = createLocalEarTrainingRhythmQuestion({
    difficulty: "基础",
    sequence,
    variantId: "rhythm:front-dense",
    catalogMode: "expanded-local-v2",
  });
  const challenge = createLocalRhythmErrorFindingChallenge(question);
  assert.equal(challenge.correctCandidate.kind, expectedKind);
  assert.equal(challenge.options.length, 4);
  assert.equal(new Set(challenge.options.map((option) => option.id)).size, 4);
  assert.equal(challenge.correctCandidate.sourceOnsetBeats.join(","), question.pattern.onsetBeats.join(","));
  if (expectedKind === "split") assert.equal(challenge.correctCandidate.performedOnsetBeats.length, question.pattern.onsetBeats.length + 1);
  if (expectedKind === "missed" || expectedKind === "merged") assert.equal(challenge.correctCandidate.performedOnsetBeats.length, question.pattern.onsetBeats.length - 1);
  if (expectedKind === "shifted") assert.equal(challenge.correctCandidate.performedOnsetBeats.length, question.pattern.onsetBeats.length);
  assert.notDeepEqual(challenge.correctCandidate.performedOnsetBeats, question.pattern.onsetBeats);
  assert.match(challenge.correctCandidate.label, /附近：(漏掉|拆分|合并|位移)/);

  const definition = createRhythmErrorFindingActivityDefinition(question, challenge);
  assert.equal(definition.family, "rhythm-error-finding");
  assert.deepEqual(definition.allowedInputModes, ["choice"]);
  assert.equal(definition.assessmentMode, "non-scoring");
  assert.equal(definition.source.reviewState, "confirmed");
  assert.deepEqual(definition.target.expectedAnswer, { mode: "choice", optionIds: [challenge.correctCandidate.id] });
  assert.equal(hasRhythmErrorFindingAssessmentFields(definition), false);
  assert.equal(hasRhythmErrorFindingAssessmentFields(challenge), false);
});

console.log("local rhythm error-finding tests passed");
