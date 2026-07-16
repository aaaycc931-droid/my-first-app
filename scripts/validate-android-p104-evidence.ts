import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { evaluateAndroidP104Evidence, type AndroidP104EvidenceInput } from "../lib/release/androidP104Evidence.js";

const evidencePath = resolve(process.cwd(), "local-fixtures/android-p104/evidence.local.json");

if (!existsSync(evidencePath)) {
  console.error("尚无 P104 本地证据文件。请复制 evidence.example.json 为 evidence.local.json，并按真实执行结果填写；不得填写猜测值。");
  process.exitCode = 2;
} else {
  const parsed = JSON.parse(readFileSync(evidencePath, "utf8")) as AndroidP104EvidenceInput;
  const result = evaluateAndroidP104Evidence(parsed);
  for (const check of result.checks) console.log(`${check.passed ? "PASS" : "BLOCKED"} | ${check.label} | 当前：${check.observed} | 要求：${check.required}`);
  console.log(result.eligible ? "P104 证据门槛已满足；仍需人工核对原始证据。" : "P104 仍有硬阻塞；不得标记完成或宣传专业准确度。");
  if (!result.eligible) process.exitCode = 2;
}
