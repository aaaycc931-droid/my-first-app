import {
  createNotationTemporaryPracticeProgress,
  isNotationTemporaryPracticeRoundComplete,
  reconcileNotationTemporaryPracticeProgress,
  resetNotationTemporaryPracticeProgress,
  toggleNotationTemporaryPracticeEventCompletion,
} from "../lib/practice/notationTemporaryPracticeProgress";

const expect = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const target = { id: "target-1", draftFingerprint: "draft-1", status: "active", events: [{}, {}, {}] } as any;
const initial = createNotationTemporaryPracticeProgress(target);
const marked = toggleNotationTemporaryPracticeEventCompletion(initial, 1);
expect(marked.completedEventIndexes.join(",") === "1", "应标记当前事件完成");
expect(toggleNotationTemporaryPracticeEventCompletion(marked, 1).completedEventIndexes.length === 0, "再次点击应取消完成标记");
const complete = toggleNotationTemporaryPracticeEventCompletion(toggleNotationTemporaryPracticeEventCompletion(initial, 2), 0);
expect(complete.completedEventIndexes.join(",") === "0,2", "完成事件应保持顺序");
expect(resetNotationTemporaryPracticeProgress(complete).completedEventIndexes.length === 0, "从头重练应清空本轮完成标记");
expect(reconcileNotationTemporaryPracticeProgress(complete, { ...target, events: [{}, {}] } as any)?.completedEventIndexes.join(",") === "0", "事件范围缩小应移除越界标记");
expect(reconcileNotationTemporaryPracticeProgress(complete, { ...target, status: "stale" } as any) === null, "失效目标不应保留进度");
expect(!isNotationTemporaryPracticeRoundComplete(complete, target), "未标记所有事件时不应显示完成");
const allComplete = [0, 1, 2].reduce((progress, index) => toggleNotationTemporaryPracticeEventCompletion(progress, index), initial);
expect(isNotationTemporaryPracticeRoundComplete(allComplete, target), "标记所有事件后应完成本轮");
console.log("notation temporary practice progress tests passed");
