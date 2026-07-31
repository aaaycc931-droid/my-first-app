import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const domain = readFileSync("lib/practice/localVocalPracticeRecord.ts", "utf8");
const storage = readFileSync("lib/platform/indexedDbLocalVocalPracticeRecordRepository.ts", "utf8");
const panel = readFileSync("components/practice/RealtimePitchMonitorPanel.tsx", "utf8");
const webRoot = readFileSync("app/practice/page.tsx", "utf8");
const androidRoot = readFileSync("mobile/src/App.tsx", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of [
  'const DB_NAME = "solfeggio-local-vocal-practice"',
  "const DB_VERSION = 1",
  'const STORE_NAME = "sessions"',
  'const STORE_KEY_PATH = "id"',
  "createObjectStore(STORE_NAME, { keyPath: STORE_KEY_PATH })",
  'transaction.oncomplete',
  'database.close()',
]) requireCopy(storage, expected, "IndexedDB 本机练声记录 adapter 边界");

for (const expected of [
  "type LocalVocalPracticeRecordRepository",
  "list: () => Promise<LocalVocalPracticeRecord[]>",
  "save: (record: LocalVocalPracticeRecord) => Promise<void>",
  "remove: (id: string) => Promise<void>",
  "clear: () => Promise<void>",
  'LOCAL_VOCAL_RECORDING_MAX_BYTES',
  'LOCAL_VOCAL_PRACTICE_MAX_RECORDS',
  'curvePoints.slice(-600)',
  'recording: undefined',
  'recordingIncluded:',
]) requireCopy(domain, expected, "本机练声记录 domain 与 port 边界");

for (const expected of [
  "practiceRecordRepository: LocalVocalPracticeRecordRepository",
  "practiceRecordRepository.list()",
  "practiceRecordRepository.save(record)",
  "practiceRecordRepository.remove(record.id)",
  "practiceRecordRepository.clear()",
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

for (const [source, label] of [[webRoot, "Web"], [androidRoot, "Android"]]) {
  requireCopy(
    source,
    "practiceRecordRepository={indexedDbLocalVocalPracticeRecordRepository}",
    `${label} composition root`,
  );
}

const sharedComponentSources = [];
const collectSources = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) collectSources(path);
    else if (/\.[cm]?[jt]sx?$/.test(entry)) sharedComponentSources.push(path);
  }
};
collectSources("components");
for (const sourcePath of sharedComponentSources) {
  const source = readFileSync(sourcePath, "utf8");
  if (source.includes("mobile/src/runtime")) {
    throw new Error(`共享组件不得反向导入 mobile runtime：${sourcePath}`);
  }
}

console.log("本机练声记录存储与 UI 契约测试通过");
