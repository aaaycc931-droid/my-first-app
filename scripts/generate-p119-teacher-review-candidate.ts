import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const P119_TEACHER_REVIEW_CANDIDATE_SCHEMA_VERSION =
  "p119-teacher-review-candidate-v1" as const;
export const P119_TEACHER_REVIEW_CANDIDATE_STATUS =
  "CANDIDATE_NOT_APPROVED" as const;
export const P119_TEACHER_REVIEW_ITEMS_PER_STRATUM = 5 as const;
export const P119_TEACHER_REVIEW_SEED =
  "p119d-candidate-v1|d6d9162a3892a4050f713312c430dd0ea420a114|b8430559e1fc3f102f8f9fce1158b473ea199e4c7f8fec9fef607b0ef42da8a1";
export const P119_TEACHER_REVIEW_MANIFEST_FILE =
  "review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json";
export const P119_TEACHER_REVIEW_CANDIDATE_FILE =
  "candidate-review-batch.v1.json";
export const P119_TEACHER_REVIEW_WORKSHEET_FILE =
  "teacher-review-worksheet.v1.csv";

type ManifestGroup = {
  kind: string;
  difficulty: string;
  variantCount: number;
  reviewItemIds: string[];
};

type ManifestItem = {
  reviewItemId: string;
  variantId: string;
};

type ManifestCourseItem = {
  reviewItemId: string;
};

type P119ReviewManifest = {
  schemaVersion: string;
  source: {
    sourceCommitSha: string;
    catalogVersion: number;
  };
  groups: ManifestGroup[];
  items: ManifestItem[];
  courseItems: ManifestCourseItem[];
};

export type P119TeacherReviewCandidate = ReturnType<
  typeof buildP119TeacherReviewCandidate
>;

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const rankItemIds = (
  itemIds: readonly string[],
  kind: string,
  difficulty: string,
) =>
  [...itemIds].sort((left, right) => {
    const leftScore = sha256(
      `${P119_TEACHER_REVIEW_SEED}\0${kind}\0${difficulty}\0${left}`,
    );
    const rightScore = sha256(
      `${P119_TEACHER_REVIEW_SEED}\0${kind}\0${difficulty}\0${right}`,
    );
    return leftScore.localeCompare(rightScore) || left.localeCompare(right);
  });

export const buildP119TeacherReviewCandidate = (
  manifest: P119ReviewManifest,
  serializedManifest: string,
) => {
  assert(
    manifest.groups.length === 30,
    `预期 30 个题型／难度层，实际为 ${manifest.groups.length}。`,
  );
  assert(
    manifest.courseItems.length === 3,
    `预期 3 个课程审核项，实际为 ${manifest.courseItems.length}。`,
  );

  const manifestItemIds = manifest.items.map((item) => item.reviewItemId);
  const manifestItemIdSet = new Set(manifestItemIds);
  assert(
    manifestItemIdSet.size === manifestItemIds.length,
    "manifest 题目 review item ID 存在重复。",
  );

  const groupedItemIds = manifest.groups.flatMap((group) => group.reviewItemIds);
  assert(
    groupedItemIds.length === manifestItemIds.length,
    "manifest 分层引用数量与题目 item 数量不一致。",
  );
  assert(
    new Set(groupedItemIds).size === groupedItemIds.length,
    "manifest 分层之间存在重复 review item ID。",
  );
  assert(
    groupedItemIds.every((itemId) => manifestItemIdSet.has(itemId)),
    "manifest 分层引用了不存在的题目 review item ID。",
  );

  const strata = manifest.groups.map((group) => {
    assert(
      group.reviewItemIds.length === group.variantCount,
      `${group.kind}/${group.difficulty} 的清单数与 variantCount 不一致。`,
    );
    assert(
      group.reviewItemIds.length >= P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
      `${group.kind}/${group.difficulty} 少于候选层内抽取数量。`,
    );
    return {
      kind: group.kind,
      difficulty: group.difficulty,
      populationCount: group.reviewItemIds.length,
      candidateCount: P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
      candidateItemIds: rankItemIds(
        group.reviewItemIds,
        group.kind,
        group.difficulty,
      ).slice(0, P119_TEACHER_REVIEW_ITEMS_PER_STRATUM),
    };
  });

  const courseCandidateItemIds = manifest.courseItems.map(
    (item) => item.reviewItemId,
  );
  const questionCandidateItemIds = strata.flatMap(
    (stratum) => stratum.candidateItemIds,
  );
  const sampleItemIds = [
    ...questionCandidateItemIds,
    ...courseCandidateItemIds,
  ];
  const allManifestIds = new Set([
    ...manifestItemIds,
    ...courseCandidateItemIds,
  ]);

  assert(
    new Set(sampleItemIds).size === sampleItemIds.length,
    "候选清单存在重复 review item ID。",
  );
  assert(
    sampleItemIds.every((itemId) => allManifestIds.has(itemId)),
    "候选清单包含 manifest 中不存在的 review item ID。",
  );

  const selectedItems = questionCandidateItemIds.map((itemId) => {
    const item = manifest.items.find((candidate) => candidate.reviewItemId === itemId);
    assert(item, `无法解析候选 item：${itemId}`);
    return item;
  });
  const variantItems = new Map<string, string[]>();
  for (const item of selectedItems) {
    variantItems.set(
      item.variantId,
      [...(variantItems.get(item.variantId) ?? []), item.reviewItemId],
    );
  }
  const crossStratumVariantIdOverlaps = Array.from(variantItems.entries())
    .filter(([, itemIds]) => itemIds.length > 1)
    .map(([variantId, itemIds]) => ({ variantId, itemIds }))
    .sort((left, right) => left.variantId.localeCompare(right.variantId));
  const crossStratumVariantIdOverlapCount = crossStratumVariantIdOverlaps
    .reduce((sum, overlap) => sum + overlap.itemIds.length - 1, 0);

  return {
    schemaVersion: P119_TEACHER_REVIEW_CANDIDATE_SCHEMA_VERSION,
    status: P119_TEACHER_REVIEW_CANDIDATE_STATUS,
    approval: {
      approvedBeforeReview: false,
      approvedByTeachers: false,
      statement:
        "本文件是可复现候选，不是责任方或教师批准的正式样本；批准前不得进入正式审核、正式样本或正式评估。",
    },
    source: {
      sourceCommitSha: manifest.source.sourceCommitSha,
      catalogVersion: manifest.source.catalogVersion,
      reviewManifestFile: P119_TEACHER_REVIEW_MANIFEST_FILE,
      reviewManifestSha256: sha256(serializedManifest),
    },
    selection: {
      method: "sha256-rank-within-kind-difficulty-v1",
      seed: P119_TEACHER_REVIEW_SEED,
      seedSha256: sha256(P119_TEACHER_REVIEW_SEED),
      questionStratification: "kind × difficulty",
      questionItemsPerStratum: P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
      coursePolicy: "include-all-frozen-course-items",
      tieBreak: "reviewItemId ASCII ascending",
    },
    summary: {
      questionPopulationCount: manifest.items.length,
      questionStratumCount: manifest.groups.length,
      questionCandidateCount: questionCandidateItemIds.length,
      coursePopulationCount: manifest.courseItems.length,
      courseCandidateCount: courseCandidateItemIds.length,
      totalCandidateCount: sampleItemIds.length,
    },
    checks: {
      duplicateCandidateItemIdCount:
        sampleItemIds.length - new Set(sampleItemIds).size,
      missingCandidateItemIdCount: sampleItemIds
        .filter((itemId) => !allManifestIds.has(itemId)).length,
      strataWithUnexpectedCandidateCount: strata
        .filter(
          (stratum) =>
            stratum.candidateItemIds.length
              !== P119_TEACHER_REVIEW_ITEMS_PER_STRATUM,
        ).length,
      crossStratumVariantIdOverlapCount,
      crossStratumVariantIdOverlaps,
      leakageRiskStatement:
        "题库是生成式变体，跨难度可能共享 variantId、音高材料或概念。候选生成只防止 reviewItemId 重复，不把相似移调或共享概念误称为独立统计样本；教师须在批准时确认该风险与必要扩样。",
    },
    strata,
    courseCandidateItemIds,
    sampleItemIds,
  };
};

export const serializeP119TeacherReviewCandidate = (
  candidate: P119TeacherReviewCandidate,
) => `${JSON.stringify(candidate, null, 2)}\n`;

const serializeCsvCell = (value: string) =>
  `"${value.replaceAll("\"", "\"\"")}"`;

export const serializeP119TeacherReviewWorksheet = (
  candidate: P119TeacherReviewCandidate,
) => {
  const header = [
    "itemId",
    "target-truth",
    "answer-rule",
    "terminology-solfege",
    "difficulty-progression",
    "explanation",
    "misconception-risk",
    "findingId",
    "notes",
  ];
  const rows = candidate.sampleItemIds.map((itemId) => [
    itemId,
    "PENDING",
    "PENDING",
    "PENDING",
    "PENDING",
    "PENDING",
    "PENDING",
    "",
    "",
  ]);
  return [header, ...rows]
    .map((row) => row.map(serializeCsvCell).join(","))
    .join("\n")
    .concat("\n");
};

const getArgValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const runCli = () => {
  const manifestPath = resolve(
    process.cwd(),
    getArgValue("--manifest")
      ?? `local-fixtures/p119-content-education/${P119_TEACHER_REVIEW_MANIFEST_FILE}`,
  );
  const outputPath = resolve(
    process.cwd(),
    getArgValue("--output")
      ?? `local-fixtures/p119-content-education/${P119_TEACHER_REVIEW_CANDIDATE_FILE}`,
  );
  const worksheetPath = resolve(
    process.cwd(),
    getArgValue("--worksheet")
      ?? `local-fixtures/p119-content-education/${P119_TEACHER_REVIEW_WORKSHEET_FILE}`,
  );
  const serializedManifest = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(serializedManifest) as P119ReviewManifest;
  const candidate = buildP119TeacherReviewCandidate(
    manifest,
    serializedManifest,
  );
  const serializedCandidate = serializeP119TeacherReviewCandidate(candidate);
  const serializedWorksheet = serializeP119TeacherReviewWorksheet(candidate);

  if (process.argv.includes("--check")) {
    assert(existsSync(outputPath), `候选清单不存在：${outputPath}`);
    assert(existsSync(worksheetPath), `审核工作表不存在：${worksheetPath}`);
    assert(
      readFileSync(outputPath, "utf8") === serializedCandidate,
      "候选清单不是由当前 manifest、seed 与生成器确定性重建的结果。",
    );
    assert(
      readFileSync(worksheetPath, "utf8") === serializedWorksheet,
      "审核工作表与已批准候选 item ID 不一致。",
    );
    console.log(
      `P119 双教师候选清单与审核工作表复现检查通过：${outputPath}`,
    );
    return;
  }

  writeFileSync(outputPath, serializedCandidate, "utf8");
  writeFileSync(worksheetPath, serializedWorksheet, "utf8");
  console.log(
    `已写入 P119 双教师候选清单（未批准）与审核工作表：${outputPath}`,
  );
};

if (
  process.argv[1]
  && /generate-p119-teacher-review-candidate\.(?:ts|js)$/.test(process.argv[1])
) {
  runCli();
}
