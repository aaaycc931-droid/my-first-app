import { readFileSync } from "node:fs";

const panel = readFileSync("components/practice/LocalVocalObservationPanel.tsx", "utf8");
const diagnostics = readFileSync("lib/practice/localVocalObservation.ts", "utf8");

for (const expected of [
  "本次音高观察（非评分）",
  "最多最近 30 秒",
  "观察音高分布",
  "持续音短期波动",
  "周期性音高摆动候选",
  "尾部音高走向",
  "不代表完整音域、极限或声部",
  "不判断颤音是否标准、自然或健康",
  "不推断音量、气息或声带状态",
  "算法版本",
]) if (!panel.includes(expected)) throw new Error(`P103 中文观察界面缺少：${expected}`);

for (const expected of [
  '"local-vocal-observation-v1"',
  "MAX_GAP_MS = 180",
  "MIN_CONFIDENCE = 0.7",
  "percentile",
  "linearSlope",
  "insufficient-data",
  "mixed-pitch",
]) if (!diagnostics.includes(expected)) throw new Error(`P103 观察算法边界缺少：${expected}`);

console.log("P103 本地音高观察 UI 与算法边界契约测试通过");
