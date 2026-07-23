import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const readSource = (relativePath) =>
  readFileSync(join(root, relativePath), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const extractBetween = (source, startMarker, endMarker, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, `无法定位${label}`);
  return source.slice(start, end);
};

const assertContains = (source, expected, label) =>
  assert(source.includes(expected), `${label}缺少：${expected}`);

const assertTargetContract = ({
  path,
  kind,
  includes = [],
  endMarker = "const playQuestion =",
}) => {
  const source = readSource(path);
  const reveal = extractBetween(
    source,
    "const revealAnswer =",
    endMarker,
    `${kind}查看答案流程`,
  );
  assertContains(reveal, "onLocalAnswerResult({", `${kind}查看答案流程`);
  const target = extractBetween(
    reveal,
    "target: {",
    "},\n        isCorrect:",
    `${kind}复练目标对象`,
  );
  assertContains(target, `kind: "${kind}"`, `${kind}复练目标`);
  assertContains(target, "seed: sessionSeed", `${kind}复练目标`);
  assertContains(target, "sequence", `${kind}复练目标`);
  assertContains(target, "variantId: question.variantId", `${kind}复练目标`);
  assertContains(reveal, "isCorrect:", `${kind}答题结果`);
  for (const expected of includes) {
    assertContains(target, expected, `${kind}复练目标`);
  }
};

assertTargetContract({
  path: "components/practice/LocalEarTrainingSinglePitchPanel.tsx",
  kind: "single-pitch",
});
assertTargetContract({
  path: "components/practice/LocalEarTrainingIntervalPanel.tsx",
  kind: "interval",
  includes: ["direction"],
  endMarker: "const nextQuestion =",
});
assertTargetContract({
  path: "components/practice/LocalEarTrainingRhythmPanel.tsx",
  kind: "rhythm",
});

for (const path of [
  "components/practice/LocalEarTrainingSinglePitchPanel.tsx",
  "components/practice/LocalEarTrainingIntervalPanel.tsx",
  "components/practice/LocalEarTrainingRhythmPanel.tsx",
  "components/practice/LocalEarTrainingMelodyDictationPanel.tsx",
]) {
  const source = readSource(path);
  assertContains(
    source,
    path.endsWith("LocalEarTrainingMelodyDictationPanel.tsx")
      ? '{showLocalPiano && answerMode !== "piano" ? ('
      : "{showLocalPiano ? (",
    `${path} Android 参考钢琴 disclosure`,
  );
  for (const expected of [
    'import { LocalPianoPanel } from "../piano/LocalPianoPanel"',
    "showLocalPiano = false",
    "showLocalPiano?: boolean",
    "aria-expanded={isLocalPianoOpen}",
    "setIsLocalPianoOpen((current) => !current)",
    "{isLocalPianoOpen ? <div",
    "<LocalPianoPanel />",
    "弹奏不保存、不上传，也不生成分数或正式评分。",
    "expandedLocalCatalog = false",
    "expandedLocalCatalog?: boolean",
    '"expanded-local-v2"',
    '<option value="挑战">挑战：',
  ]) {
    assertContains(source, expected, `${path} Android 参考钢琴 disclosure`);
  }
}

const localAudioPlaybackSource = readSource(
  "components/practice/useLocalAudioPlayback.ts",
);
for (const expected of [
  "stopAllBrowserAudio",
  "subscribeBrowserAudioStopAll",
  "stopAllBrowserAudio();",
  "subscribeBrowserAudioStopAll(stop)",
]) {
  assertContains(
    localAudioPlaybackSource,
    expected,
    "题目声音与本地参考钢琴必须双向互斥",
  );
}

const melodySource = readSource(
  "components/practice/LocalEarTrainingMelodyDictationPanel.tsx",
);
const melodyReport = extractBetween(
  melodySource,
  "const reportLocalAnswerResult =",
  "const chooseStaffNotationNote =",
  "melody-dictation最小结果报告流程",
);
const melodyReveal = extractBetween(
  melodySource,
  "const revealAnswer =",
  "const nextQuestion =",
  "melody-dictation查看答案流程",
);
assertContains(melodyReport, "onLocalAnswerResult({", "melody-dictation结果报告流程");
assertContains(melodyReveal, "reportLocalAnswerResult(submittedNoteIds)", "melody-dictation查看答案流程");
const melodyTarget = extractBetween(
  melodyReport,
  "target: {",
  "},\n      isCorrect:",
  "melody-dictation复练目标对象",
);
for (const expected of [
  'kind: "melody-dictation"',
  "seed: sessionSeed",
  "sequence",
  "variantId: question.variantId",
]) {
  assertContains(melodyTarget, expected, "melody-dictation复练目标");
}
assertContains(melodyReport, "isCorrect:", "melody-dictation答题结果");

const appSource = readSource("mobile/src/App.tsx");
assert(
  (appSource.match(/expandedLocalCatalog/g) ?? []).length === 4,
  "Android 四类练习必须显式启用扩展本地题库",
);
const hashHandler = extractBetween(
  appSource,
  "const handleHashChange = () => {",
  'window.addEventListener("hashchange"',
  "哈希切换处理",
);
for (const expected of [
  "pendingReviewNavigationRef.current === nextScreen",
  "pendingReviewNavigationRef.current = null",
  "if (!shouldKeepReviewTarget) setActiveReviewTarget(null)",
]) {
  assertContains(hashHandler, expected, "哈希切换防串题");
}

const startReview = extractBetween(
  appSource,
  "const startReviewTarget = useCallback(",
  "const clearReviewQueue = useCallback(",
  "开始复练流程",
);
assertContains(
  startReview,
  "pendingReviewNavigationRef.current = targetScreen",
  "复练导航标记",
);

const answerResult = extractBetween(
  appSource,
  "const handleLocalAnswerResult = useCallback(",
  "const leaveReviewTarget = useCallback(",
  "答题结果提示流程",
);
for (const expected of [
  "wasInReviewQueue",
  "result.isCorrect",
  "本题已从本机复练中移除。",
  "本题回答已核对，未加入本机复练。",
  "已加入本机复练，可从练习首页再次打开。",
]) {
  assertContains(answerResult, expected, "答题结果提示分支");
}

assert(
  answerResult.indexOf("saveMobilePracticeReviewQueue(") < answerResult.indexOf("setReviewQueue(nextQueue)"),
  "复练队列必须先持久化成功，再更新内存界面",
);

const weakPointPanelSource = readSource("mobile/src/LocalWeakPointReviewQueuePanel.tsx");
const clearUi = extractBetween(
  weakPointPanelSource,
  "本机复练（{reviewModel.pendingTargetCount}）",
  "</section>\n  );",
  "复练清除界面",
);
for (const expected of [
  "setIsClearConfirmationVisible(true)",
  "isClearConfirmationVisible ?",
  "确认清除全部本机复练记录？",
  "onClear();",
  "确认清除",
  "setIsClearConfirmationVisible(false)",
  "取消",
  "不是能力评级、正确率或推荐排序",
]) {
  assertContains(clearUi, expected, "复练二次确认清除");
}

const recommendationSource = readSource("lib/learning/localExplainablePracticeRecommendation.ts");
const recommendationPanelSource = readSource("mobile/src/LocalExplainablePracticeRecommendationPanel.tsx");
for (const expected of [
  "buildLocalExplainablePracticeRecommendation",
  "review-queue-mru-v1",
  "queuePosition: 1",
  "sameKindPendingCount",
  "pendingTargetCount",
]) {
  assertContains(recommendationSource, expected, "P118d 可解释推荐 domain");
}
for (const expected of [
  "为什么是这题",
  "不读取答案 outcome",
  "不计算正确率、分数、等级、能力判断或诊断",
  "无法解释来源",
  "未生成建议",
]) {
  assertContains(recommendationPanelSource, expected, "P118d 可解释推荐界面");
}
assert(
  !recommendationSource.includes(".outcome"),
  "P118d 推荐 domain 不得读取 outcome",
);

console.log("移动端本机复练 UI 源级契约测试通过");
