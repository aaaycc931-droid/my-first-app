import assert from "node:assert/strict";

import {
  adaptIntervalQuestionToActivity,
  adaptChordQuestionToActivity,
  adaptHarmonyProgressionQuestionToActivity,
  adaptScaleModeQuestionToActivity,
  adaptMelodyDictationQuestionToActivity,
  adaptRhythmQuestionToActivity,
  adaptSinglePitchQuestionToActivity,
} from "../lib/activity/legacyLocalActivityAdapter";
import { createLocalEarTrainingSinglePitchQuestion } from "../lib/practice/localEarTrainingSinglePitch";
import { createLocalEarTrainingQuestion } from "../lib/practice/localEarTrainingIntervals";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";
import { createLocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";
import { createLocalEarTrainingChordQuestion } from "../lib/practice/localEarTrainingChords";
import { createLocalHarmonyProgressionQuestion } from "../lib/practice/localEarTrainingHarmonyProgressions";
import { createLocalScaleModeQuestion } from "../lib/practice/localEarTrainingScaleModes";

const single = adaptSinglePitchQuestionToActivity(createLocalEarTrainingSinglePitchQuestion({
  difficulty: "基础", sequence: 0, questionIndex: 0, catalogMode: "expanded-local-v2",
}));
assert.equal(single.family, "pitch-relation");
assert.deepEqual(single.allowedInputModes, ["choice"]);

const intervalQuestion = createLocalEarTrainingQuestion({
  difficulty: "基础", direction: "上行", sequence: 0, questionIndex: 0, catalogMode: "expanded-local-v2",
});
const interval = adaptIntervalQuestionToActivity(intervalQuestion);
const repeatedInterval = adaptIntervalQuestionToActivity(createLocalEarTrainingQuestion({
  difficulty: "基础", direction: "上行", sequence: 99, variantId: intervalQuestion.variantId, catalogMode: "expanded-local-v2",
}));
const descendingInterval = adaptIntervalQuestionToActivity({ ...intervalQuestion, direction: "下行" });
assert.equal(interval.family, "interval");
assert.equal(interval.activityId, repeatedInterval.activityId, "sequence must not change stable activity identity");
assert.notEqual(interval.activityId, descendingInterval.activityId, "direction is part of the interval target identity");
assert.deepEqual(interval.target.expectedAnswer, { mode: "choice", optionIds: [intervalQuestion.interval.id] });

const chordQuestion = createLocalEarTrainingChordQuestion({
  difficulty: "进阶", sequence: 0, variantId: "chord:c4:minor:first",
});
const chord = adaptChordQuestionToActivity(chordQuestion);
assert.equal(chord.family, "chord");
assert.equal(chord.contentVersion, "local-harmony-training-v1");
assert.deepEqual(chord.target.expectedAnswer, { mode: "choice", optionIds: ["minor-first"] });
assert.match(chord.explanation, /第一转位/);

const progressionQuestion = createLocalHarmonyProgressionQuestion({
  difficulty: "挑战", sequence: 0, variantId: "progression:a3:minor-authentic",
});
const progression = adaptHarmonyProgressionQuestionToActivity(progressionQuestion);
assert.equal(progression.family, "harmony-progression");
assert.deepEqual(progression.target.expectedAnswer, { mode: "choice", optionIds: ["minor-authentic"] });
assert.match(progression.explanation, /小调/);

const scaleQuestion = createLocalScaleModeQuestion({
  difficulty: "挑战", sequence: 0, variantId: "scale:f4:lydian",
});
const scale = adaptScaleModeQuestionToActivity(scaleQuestion);
assert.equal(scale.family, "scale-mode");
assert.equal(scale.contentVersion, "local-scale-mode-v1");
assert.deepEqual(scale.target.expectedAnswer, { mode: "choice", optionIds: ["lydian"] });
assert.match(scale.explanation, /升高的四级/);

const rhythmQuestion = createLocalEarTrainingRhythmQuestion({
  difficulty: "进阶", sequence: 0, questionIndex: 0, catalogMode: "expanded-local-v2",
});
const rhythm = adaptRhythmQuestionToActivity(rhythmQuestion);
assert.equal(rhythm.family, "rhythm-dictation");
assert.equal(rhythm.music?.meter, "4/4");
assert.equal(rhythm.music?.tempoBpm, rhythmQuestion.bpm);
assert.match(rhythm.target.targetId, new RegExp(`bpm-${rhythmQuestion.bpm}$`));

const melodyQuestion = createLocalEarTrainingMelodyQuestion({
  difficulty: "基础", sequence: 0, questionIndex: 3, catalogMode: "expanded-local-v2",
});
const melody = adaptMelodyDictationQuestionToActivity(melodyQuestion);
assert.equal(melody.family, "melody-dictation");
assert.equal(melody.target.answerPolicy?.choiceOrder, "ordered");
assert.deepEqual(
  melody.target.expectedAnswer,
  { mode: "choice", optionIds: melodyQuestion.melody.noteIds },
);

for (const activity of [single, interval, chord, progression, scale, rhythm, melody]) {
  assert.equal(activity.assessmentMode, "non-scoring");
  assert.equal(activity.source.reviewState, "confirmed");
  assert.equal("score" in activity, false);
  assert.equal("accuracy" in activity, false);
}

console.log("P114b legacy activity adapter tests passed.");
