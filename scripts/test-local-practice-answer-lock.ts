import assert from "node:assert/strict";

import {
  chooseLocalPracticeAnswer,
  createLocalPracticeAnswerLock,
  resetLocalPracticeAnswer,
  revealLocalPracticeAnswer,
} from "../lib/practice/localPracticeAnswerLock";

let state = createLocalPracticeAnswerLock<string | null>(null);
state = chooseLocalPracticeAnswer(state, "c4");
state = revealLocalPracticeAnswer(state, (selection) => selection !== null);
assert.deepEqual(state, { selection: "c4", isAnswerVisible: true });
assert.equal(
  chooseLocalPracticeAnswer(state, "d4"),
  state,
  "answer selection must stay frozen after the answer is visible",
);
assert.equal(
  revealLocalPracticeAnswer(state, (selection) => selection !== null),
  state,
  "the same question must not reveal twice",
);
assert.deepEqual(resetLocalPracticeAnswer<string | null>(null), {
  selection: null,
  isAnswerVisible: false,
});

console.log("Local practice answer lock tests passed.");
