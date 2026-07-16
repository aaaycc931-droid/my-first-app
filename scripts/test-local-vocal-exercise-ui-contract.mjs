import { readFileSync } from "node:fs";

const panel = readFileSync("components/practice/LocalVocalExercisePanel.tsx", "utf8");
const app = readFileSync("mobile/src/App.tsx", "utf8");
const generator = readFileSync("lib/practice/localVocalExercise.ts", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of ["练声音型", "根音", "模进方向", "八度位置", "速度：", "循环组数", "参考播放", "播放参考音型", "停止参考播放", "不代表声部或正式等级"]) requireCopy(panel, expected, "练声生成器中文界面");
for (const expected of ["single", "interval", "major-scale", "five-note", "arpeggio", "manifestVersion", "referenceMode", "intervalSemitones"]) requireCopy(generator, expected, "版本化练声生成器");
requireCopy(app, "<LocalVocalExercisePanel />", "Android 练声入口");

console.log("本地练声生成器 UI 与版本化 manifest 契约测试通过");
