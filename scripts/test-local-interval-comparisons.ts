import assert from "node:assert/strict";

import { adaptIntervalComparisonQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import { checkChoiceActivityAnswer, createActivitySession, submitActivityAnswer } from "../lib/activity/activitySession";
import {
  createLocalIntervalComparisonQuestion,
  getLocalIntervalComparisonAnswer,
  getLocalIntervalComparisonFrequencies,
  getLocalIntervalComparisonVariantCount,
  hasLocalIntervalComparisonAssessmentFields,
  isLocalIntervalComparisonVariantId,
} from "../lib/practice/localIntervalComparisons";
import type { LocalPracticeDifficulty } from "../lib/practice/localPracticeCatalog";

for (const difficulty of ["基础", "进阶", "挑战"] as LocalPracticeDifficulty[]) {
  const count = getLocalIntervalComparisonVariantCount(difficulty);
  assert(count >= 40, `${difficulty} must expose at least 40 stable comparison variants`);
  const ids = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const question = createLocalIntervalComparisonQuestion({ difficulty, sequence: index, questionIndex: index });
    assert.equal(isLocalIntervalComparisonVariantId(difficulty, question.variantId), true);
    ids.add(question.variantId);
    assert(getLocalIntervalComparisonFrequencies(question).flat().every((frequency) => Number.isFinite(frequency) && frequency > 0));
    const expectedSize = question.first.interval.semitones === question.second.interval.semitones
      ? "same-size"
      : question.first.interval.semitones > question.second.interval.semitones ? "first-larger" : "second-larger";
    assert.equal(question.sizeRelation, expectedSize);
    assert.match(getLocalIntervalComparisonAnswer(question).explanation, /半音/);
    assert.equal(hasLocalIntervalComparisonAssessmentFields(getLocalIntervalComparisonAnswer(question)), false);
  }
  assert.equal(ids.size, count, `${difficulty} variant ids must be unique`);
}

const question = createLocalIntervalComparisonQuestion({ difficulty: "基础", sequence: 0, questionIndex: 0 });
assert.equal(createLocalIntervalComparisonQuestion({ difficulty: "基础", sequence: 99, variantId: question.variantId }).variantId, question.variantId);
assert.throws(() => createLocalIntervalComparisonQuestion({ difficulty: "挑战", sequence: 0, variantId: question.variantId }), /Invalid/);
const definition = adaptIntervalComparisonQuestionToActivity(question);
assert.equal(definition.assessmentMode, "non-scoring");
assert.deepEqual(definition.target.expectedAnswer, { mode: "choice", optionIds: [question.sizeRelation, question.directionRelation] });
const session = createActivitySession(definition, "comparison-session");
const answering = submitActivityAnswer(definition, session, definition.target.expectedAnswer, session.revision);
assert.equal(answering.lifecycle, "answering");
const checked = checkChoiceActivityAnswer(definition, answering, answering.revision);
assert.equal(checked.lifecycle, "checked");
assert.equal(checked.checkEvidence?.state, "consistent");

console.log("P115h local interval comparison tests passed.");
