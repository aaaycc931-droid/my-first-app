import { readFileSync } from "node:fs";

const storage = readFileSync("mobile/src/runtime/localVocalPracticeStorage.ts", "utf8");
const panel = readFileSync("components/practice/RealtimePitchMonitorPanel.tsx", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of [
  'const DB_NAME = "solfeggio-local-vocal-practice"',
  'createObjectStore(STORE_NAME, { keyPath: "id" })',
  'transaction.oncomplete',
  'database.close()',
  'LOCAL_VOCAL_RECORDING_MAX_BYTES',
  'LOCAL_VOCAL_PRACTICE_MAX_RECORDS',
  'curvePoints.slice(-600)',
  'recording: undefined',
  'recordingIncluded:',
]) requireCopy(storage, expected, "本机练声记录存储边界");

for (const expected of [
  "本机练声记录",
  "保存当前曲线与录音",
  "应用私有 IndexedDB",
  "单条录音最多 5 MB",
  "回看曲线",
  "回放录音",
  "导出 JSON",
  "删除",
  "确认全部清除",
  "不包含录音文件",
  "stopSavedPlayback();",
]) requireCopy(panel, expected, "本机练声记录中文界面");

console.log("本机练声记录存储与 UI 契约测试通过");
