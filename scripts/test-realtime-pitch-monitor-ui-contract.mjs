import { readFileSync } from "node:fs";

const hook = readFileSync("components/practice/useRealtimePitchMonitor.ts", "utf8");
const panel = readFileSync("components/practice/RealtimePitchMonitorPanel.tsx", "utf8");
const chart = readFileSync("components/practice/RealtimePitchCurveChart.tsx", "utf8");
const app = readFileSync("mobile/src/App.tsx", "utf8");
const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of [
  "navigator.mediaDevices?.getUserMedia",
  ".getTracks().forEach((track) => track.stop())",
  "context.close()",
  "generationRef.current",
  "releaseResources();",
  'echoCancellation: false',
  'noiseSuppression: false',
]) requireCopy(hook, expected, "实时音高麦克风生命周期");

for (const expected of [
  "开始实时反馈",
  "停止监听",
  "停止并清空",
  "曲线时间缩放",
  "目标参考线（不计分）",
  "不足以可靠判断",
  "不录音、不保存、不上传",
  "不生成分数、等级或通过判断",
]) requireCopy(panel, expected, "实时音高中文界面");

for (const expected of [
  "splitReliablePitchCurveSegments",
  "最近 {windowSeconds} 秒音高曲线",
  "断线：不足以判断",
  "虚线：目标音",
  "现在",
]) requireCopy(chart, expected, "实时音高曲线界面");

requireCopy(app, '"monitor"', "Android 实时音高入口");
requireCopy(app, "<RealtimePitchMonitorPanel />", "Android 实时音高入口");
requireCopy(manifest, "android.permission.RECORD_AUDIO", "Android 麦克风权限");
if (manifest.includes("android.permission.INTERNET")) throw new Error("实时音高切片不得加入网络权限");

console.log("实时音高反馈 UI 与权限生命周期契约测试通过");
