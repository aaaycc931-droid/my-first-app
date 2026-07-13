import {
  createLocalEarTrainingMelodyQuestion,
  getEarTrainingMelodyNoteIds,
  getLocalEarTrainingMelodyAnswer,
  hasLocalEarTrainingMelodyAssessmentFields,
} from "../lib/practice/localEarTrainingMelodyDictation";

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const basic = createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 0 });
expect(basic.melody.noteIds.join(",") === "c4,d4,e4", "基础第一题应为固定短旋律");
const wrapped = createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 3 });
expect(wrapped.melody.id === basic.melody.id, "题目序列应可预测地循环");
expect(getEarTrainingMelodyNoteIds("基础").join(",") === "c4,d4,e4,g4", "基础难度不应显示 A4 选项");
expect(getEarTrainingMelodyNoteIds("进阶").includes("a4"), "进阶难度应显示 A4 选项");
const incomplete = getLocalEarTrainingMelodyAnswer({ question: basic, selectedNoteIds: ["c4", null, "e4"] });
expect(!incomplete.hasSelection && !incomplete.matchesAnswer, "未完成的旋律输入不能视为答案");
const correct = getLocalEarTrainingMelodyAnswer({ question: basic, selectedNoteIds: ["c4", "d4", "e4"] });
expect(correct.hasSelection && correct.matchesAnswer, "正确顺序应与答案一致");
const wrongOrder = getLocalEarTrainingMelodyAnswer({ question: basic, selectedNoteIds: ["c4", "e4", "d4"] });
expect(wrongOrder.hasSelection && !wrongOrder.matchesAnswer, "音名相同但顺序错误不能视为正确");
expect(!hasLocalEarTrainingMelodyAssessmentFields({}), "模块不应生成评分字段");
