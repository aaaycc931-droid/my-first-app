import { ACTIVITY_FAMILIES } from "../activity/activityDefinition";
import { getLocalEarTrainingChordVariantCount } from "../practice/localEarTrainingChords";
import { getLocalHarmonyProgressionVariantCount } from "../practice/localEarTrainingHarmonyProgressions";
import { getLocalEarTrainingQuestionVariantCount } from "../practice/localEarTrainingIntervals";
import { getLocalEarTrainingMelodyVariantCount } from "../practice/localEarTrainingMelodyDictation";
import { getLocalModulationVariantCount } from "../practice/localEarTrainingModulations";
import { getLocalEarTrainingRhythmVariantCount } from "../practice/localEarTrainingRhythm";
import { getLocalScaleModeVariantCount } from "../practice/localEarTrainingScaleModes";
import { getLocalSeventhChordSpacingVariantCount } from "../practice/localEarTrainingSeventhChordSpacing";
import { getLocalSeventhChordVariantCount } from "../practice/localEarTrainingSeventhChords";
import { getLocalEarTrainingSinglePitchVariantCount } from "../practice/localEarTrainingSinglePitch";
import {
  LOCAL_PRACTICE_CATALOG_VERSION,
  type LocalPracticeDifficulty,
  type LocalPracticeKind,
} from "../practice/localPracticeCatalog";

export const P119_CONTENT_EDUCATION_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const P119_V1_VARIANT_MINIMUM = 20 as const;
export const P119_PROFESSIONAL_VARIANT_TARGET = 40 as const;

export const P119_REVIEW_DIMENSIONS = [
  "target-truth",
  "answer-rule",
  "terminology-solfege",
  "difficulty-progression",
  "explanation",
  "misconception-risk",
] as const;

type P119ReviewDimension = (typeof P119_REVIEW_DIMENSIONS)[number];
type P119ReviewStatus = "NOT_EXECUTED" | "IN_PROGRESS" | "COMPLETE";

export type P119ContentInventoryGroup = {
  kind: LocalPracticeKind;
  difficulty: LocalPracticeDifficulty;
  variantCount: number;
  meetsV1Minimum: boolean;
  meetsProfessionalTarget: boolean;
};

export type P119ContentEducationEvidenceInput = {
  schemaVersion: 1;
  candidate: {
    sourceCommitSha: string;
    catalogVersion: number;
    reviewManifestSha256: string;
  };
  automatedEvidence: {
    ciCommitSha: string;
    ciRunId: number;
    expandedCatalogPassed: boolean;
    localPracticeCustomizerPassed: boolean;
    legacyActivityAdaptersPassed: boolean;
    localCoursePathPassed: boolean;
  };
  reviewPlan: {
    status: P119ReviewStatus;
    approvedBeforeReview: boolean;
    inventorySha256: string;
    sampleItemIds: string[];
    dimensions: P119ReviewDimension[];
  };
  teacherReviews: Array<{
    status: P119ReviewStatus;
    reviewerToken: string;
    independent: boolean;
    qualificationVerifiedExternally: boolean;
    reviewedItemIds: string[];
    approvedDimensions: P119ReviewDimension[];
    openFindingCount: number;
    signedEvidenceRef: string;
  }>;
};

export type P119ContentEducationEvidenceCheck = {
  id: string;
  label: string;
  passed: boolean;
  observed: string;
  required: string;
};

const difficulties: LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];
const kinds: LocalPracticeKind[] = [
  "single-pitch",
  "interval",
  "chord-inversion",
  "harmony-progression",
  "scale-mode",
  "seventh-chord",
  "seventh-chord-spacing",
  "modulation",
  "rhythm",
  "melody-dictation",
];

const getVariantCount = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
): number => {
  if (kind === "single-pitch") {
    return getLocalEarTrainingSinglePitchVariantCount(difficulty, "expanded-local-v2");
  }
  if (kind === "interval") {
    return getLocalEarTrainingQuestionVariantCount(difficulty, "expanded-local-v2");
  }
  if (kind === "chord-inversion") return getLocalEarTrainingChordVariantCount(difficulty);
  if (kind === "harmony-progression") return getLocalHarmonyProgressionVariantCount(difficulty);
  if (kind === "scale-mode") return getLocalScaleModeVariantCount(difficulty);
  if (kind === "seventh-chord") return getLocalSeventhChordVariantCount(difficulty);
  if (kind === "seventh-chord-spacing") {
    return getLocalSeventhChordSpacingVariantCount(difficulty);
  }
  if (kind === "modulation") return getLocalModulationVariantCount(difficulty);
  if (kind === "rhythm") {
    return getLocalEarTrainingRhythmVariantCount(difficulty, "expanded-local-v2");
  }
  return getLocalEarTrainingMelodyVariantCount(difficulty, "expanded-local-v2");
};

export const buildP119LocalContentInventory = (): P119ContentInventoryGroup[] =>
  kinds.flatMap((kind) =>
    difficulties.map((difficulty) => {
      const variantCount = getVariantCount(kind, difficulty);
      return {
        kind,
        difficulty,
        variantCount,
        meetsV1Minimum: variantCount >= P119_V1_VARIANT_MINIMUM,
        meetsProfessionalTarget: variantCount >= P119_PROFESSIONAL_VARIANT_TARGET,
      };
    }),
  );

const isCommitSha = (value: string) => /^[0-9a-f]{40}$/.test(value);
const isSha256 = (value: string) => /^[0-9a-f]{64}$/.test(value);
const hasExactSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length
  && new Set(actual).size === actual.length
  && expected.every((item) => actual.includes(item));

export const evaluateP119ContentEducationEvidence = (
  input: P119ContentEducationEvidenceInput,
  inventory = buildP119LocalContentInventory(),
) => {
  const v1Blocked = inventory.filter((group) => !group.meetsV1Minimum);
  const professionalBlocked = inventory.filter((group) => !group.meetsProfessionalTarget);
  const sampleItemIds = input.reviewPlan.sampleItemIds;
  const schemaValid = input.schemaVersion === P119_CONTENT_EDUCATION_EVIDENCE_SCHEMA_VERSION;
  const candidateValid = isCommitSha(input.candidate.sourceCommitSha)
    && input.candidate.catalogVersion === LOCAL_PRACTICE_CATALOG_VERSION
    && isSha256(input.candidate.reviewManifestSha256);
  const automationValid = isCommitSha(input.automatedEvidence.ciCommitSha)
    && input.automatedEvidence.ciCommitSha === input.candidate.sourceCommitSha
    && Number.isSafeInteger(input.automatedEvidence.ciRunId)
    && input.automatedEvidence.ciRunId > 0
    && input.automatedEvidence.expandedCatalogPassed
    && input.automatedEvidence.localPracticeCustomizerPassed
    && input.automatedEvidence.legacyActivityAdaptersPassed
    && input.automatedEvidence.localCoursePathPassed;
  const reviewPlanValid = input.reviewPlan.status === "COMPLETE"
    && input.reviewPlan.approvedBeforeReview
    && input.reviewPlan.inventorySha256 === input.candidate.reviewManifestSha256
    && sampleItemIds.length > 0
    && new Set(sampleItemIds).size === sampleItemIds.length
    && hasExactSet(input.reviewPlan.dimensions, P119_REVIEW_DIMENSIONS);
  const completeReviews = input.teacherReviews.filter((review) => review.status === "COMPLETE");
  const reviewerTokens = new Set(completeReviews.map((review) => review.reviewerToken));
  const teacherReviewsValid = completeReviews.length >= 2
    && reviewerTokens.size >= 2
    && completeReviews.every((review) =>
      review.reviewerToken.length > 0
      && review.independent
      && review.qualificationVerifiedExternally
      && hasExactSet(review.reviewedItemIds, sampleItemIds)
      && hasExactSet(review.approvedDimensions, P119_REVIEW_DIMENSIONS)
      && review.openFindingCount === 0
      && review.signedEvidenceRef.length > 0);
  const inventoryReadyForHumanReview = candidateValid
    && schemaValid
    && automationValid
    && v1Blocked.length === 0;
  const teacherReviewBatchApproved = inventoryReadyForHumanReview
    && reviewPlanValid
    && teacherReviewsValid;

  const checks: P119ContentEducationEvidenceCheck[] = [
    {
      id: "evidence-schema",
      label: "证据记录使用当前冻结 schema",
      passed: schemaValid,
      observed: `schema ${input.schemaVersion}`,
      required: `schema ${P119_CONTENT_EDUCATION_EVIDENCE_SCHEMA_VERSION}`,
    },
    {
      id: "candidate-provenance",
      label: "内容候选与审核清单可追溯",
      passed: candidateValid,
      observed: `${input.candidate.sourceCommitSha || "无 commit"} / catalog ${input.candidate.catalogVersion}`,
      required: "40 位 source commit、当前 catalog version、独立的 64 位审核清单 SHA-256",
    },
    {
      id: "activity-family-contract",
      label: "活动族协议仍为冻结的 14 类",
      passed: ACTIVITY_FAMILIES.length === 14,
      observed: `${ACTIVITY_FAMILIES.length} 类`,
      required: "14 类协议；枚举存在不等于内容或教育验收通过",
    },
    {
      id: "v1-content-minimum",
      label: "当前本机生成题型达到 V1 每档最低题量",
      passed: v1Blocked.length === 0,
      observed: v1Blocked.length === 0
        ? `${inventory.length}/${inventory.length} 组达到至少 ${P119_V1_VARIANT_MINIMUM}`
        : v1Blocked.map((group) => `${group.kind}/${group.difficulty}=${group.variantCount}`).join("，"),
      required: `当前盘点的每个题型/难度至少 ${P119_V1_VARIANT_MINIMUM} 个稳定变体`,
    },
    {
      id: "professional-content-target",
      label: "当前本机生成题型达到专业路线题量目标",
      passed: professionalBlocked.length === 0,
      observed: `${inventory.length - professionalBlocked.length}/${inventory.length} 组达到至少 ${P119_PROFESSIONAL_VARIANT_TARGET}`,
      required: `每个题型/难度至少 ${P119_PROFESSIONAL_VARIANT_TARGET} 个经验证稳定变体`,
    },
    {
      id: "automated-structure-evidence",
      label: "结构、复现、定制与课程自动门禁",
      passed: automationValid,
      observed: automationValid ? `Actions run ${input.automatedEvidence.ciRunId}` : "未提供同 commit 的完整成功门禁",
      required: "同一 source commit 的 expanded catalog、customizer、legacy adapter、course path 与 Actions 证据",
    },
    {
      id: "review-plan",
      label: "双教师审核计划预先冻结",
      passed: reviewPlanValid,
      observed: `${input.reviewPlan.status} / ${sampleItemIds.length} 个抽样项`,
      required: "审核前批准、清单摘要一致、抽样 ID 唯一且覆盖六个冻结审核维度",
    },
    {
      id: "teacher-reviews",
      label: "两名独立教师完成同一冻结批次审核",
      passed: teacherReviewsValid,
      observed: `${reviewerTokens.size} 名独立 reviewer token / ${completeReviews.length} 份完成记录`,
      required: "至少两名不同 reviewer；资质在外部核验；同一抽样全部维度通过且零开放问题",
    },
  ];

  return {
    schemaVersion: P119_CONTENT_EDUCATION_EVIDENCE_SCHEMA_VERSION,
    inventory,
    inventoryReadyForHumanReview,
    teacherReviewBatchApproved,
    checks,
  };
};
