import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluateP119ContentEducationEvidence,
  type P119ContentEducationEvidenceInput,
} from "../lib/release/p119ContentEducationEvidence";

const evidencePath = resolve(
  process.cwd(),
  "local-fixtures/p119-content-education/evidence.local.json",
);

if (!existsSync(evidencePath)) {
  console.error(
    "尚无 P119a 本地教师审核证据文件。请复制 evidence.example.json 为 evidence.local.json，并只按真实执行结果填写；不得填写猜测值。",
  );
  process.exitCode = 2;
} else {
  const parsed = JSON.parse(
    readFileSync(evidencePath, "utf8"),
  ) as P119ContentEducationEvidenceInput;
  const result = evaluateP119ContentEducationEvidence(parsed);
  for (const check of result.checks) {
    console.log(
      `${check.passed ? "PASS" : "BLOCKED"} | ${check.label} | 当前：${check.observed} | 要求：${check.required}`,
    );
  }
  console.log(
    result.inventoryReadyForHumanReview
      ? "当前内容盘点达到本批次进入人工审核的自动前置条件。"
      : "当前内容盘点仍有自动前置阻塞；不得开始或宣称完成本批次教育审核。",
  );
  console.log(
    result.teacherReviewBatchApproved
      ? "本地记录显示双教师审核批次满足结构门槛；仍须人工核对资质、签署原件和逐题记录。"
      : "双教师审核仍为 NOT_EXECUTED / BLOCKED / INCOMPLETE；不得标记教育验收通过。",
  );
  if (!result.teacherReviewBatchApproved) process.exitCode = 2;
}
