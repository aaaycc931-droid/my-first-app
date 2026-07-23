import { createHash } from "node:crypto";

import {
  adaptChordQuestionToActivity,
  adaptHarmonyProgressionQuestionToActivity,
  adaptIntervalQuestionToActivity,
  adaptMelodyDictationQuestionToActivity,
  adaptModulationQuestionToActivity,
  adaptRhythmQuestionToActivity,
  adaptScaleModeQuestionToActivity,
  adaptSeventhChordQuestionToActivity,
  adaptSeventhChordSpacingQuestionToActivity,
  adaptSinglePitchQuestionToActivity,
} from "../activity/legacyLocalActivityAdapter";
import {
  LOCAL_CHINESE_FOUNDATION_COURSE,
  LOCAL_COURSE_CONTENT_VERSION,
  LOCAL_COURSE_LESSONS,
  LOCAL_COURSE_PATH_SCHEMA_VERSION,
} from "../learning/localCoursePath";
import {
  createLocalEarTrainingChordQuestion,
  getLocalEarTrainingChordVariantCount,
} from "../practice/localEarTrainingChords";
import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionVariantCount,
} from "../practice/localEarTrainingHarmonyProgressions";
import {
  createLocalEarTrainingQuestion,
  getLocalEarTrainingQuestionVariantCount,
} from "../practice/localEarTrainingIntervals";
import {
  createLocalEarTrainingMelodyQuestion,
  getLocalEarTrainingMelodyVariantCount,
} from "../practice/localEarTrainingMelodyDictation";
import {
  createLocalModulationQuestion,
  getLocalModulationVariantCount,
} from "../practice/localEarTrainingModulations";
import {
  createLocalEarTrainingRhythmQuestion,
  getLocalEarTrainingRhythmVariantCount,
} from "../practice/localEarTrainingRhythm";
import {
  createLocalScaleModeQuestion,
  getLocalScaleModeVariantCount,
} from "../practice/localEarTrainingScaleModes";
import {
  createLocalSeventhChordSpacingQuestion,
  getLocalSeventhChordSpacingVariantCount,
} from "../practice/localEarTrainingSeventhChordSpacing";
import {
  createLocalSeventhChordQuestion,
  getLocalSeventhChordVariantCount,
} from "../practice/localEarTrainingSeventhChords";
import {
  createLocalEarTrainingSinglePitchQuestion,
  getLocalEarTrainingSinglePitchVariantCount,
} from "../practice/localEarTrainingSinglePitch";
import {
  LOCAL_PRACTICE_CATALOG_VERSION,
  type LocalPracticeDifficulty,
  type LocalPracticeKind,
} from "../practice/localPracticeCatalog";

export const P119_CONTENT_REVIEW_MANIFEST_SCHEMA_VERSION =
  "p119-content-review-manifest-v1" as const;
export const P119_CONTENT_REVIEW_MANIFEST_FILENAME_PREFIX =
  "review-manifest" as const;
export const P119_CONTENT_REVIEW_SIGNIFICANT_DIGITS = 14 as const;
export const P119_CONTENT_REVIEW_SOURCE_COMMIT =
  "bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1" as const;

export const P119_CONTENT_REVIEW_SOURCE_PATHS = [
  "lib/activity/activityDefinition.ts",
  "lib/activity/legacyLocalActivityAdapter.ts",
  "lib/learning/localCoursePath.ts",
  "lib/practice/localEarTrainingChords.ts",
  "lib/practice/localEarTrainingHarmonyProgressions.ts",
  "lib/practice/localEarTrainingIntervals.ts",
  "lib/practice/localEarTrainingMelodyDictation.ts",
  "lib/practice/localEarTrainingModulations.ts",
  "lib/practice/localEarTrainingRhythm.ts",
  "lib/practice/localEarTrainingScaleModes.ts",
  "lib/practice/localEarTrainingSeventhChordSpacing.ts",
  "lib/practice/localEarTrainingSeventhChords.ts",
  "lib/practice/localEarTrainingSinglePitch.ts",
  "lib/practice/localHarmonyProgressionCatalog.ts",
  "lib/practice/localModulationCatalog.ts",
  "lib/practice/localPracticeCatalog.ts",
  "lib/practice/localPracticeReviewQueue.ts",
  "lib/practice/localScaleModeCatalog.ts",
] as const;

export type P119ContentReviewSourceFile = {
  path: string;
  sha256: string;
};

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type P119ContentReviewRepresentation = {
  representationId: string;
  factoryInput: JsonValue;
  questionSnapshot: JsonValue;
  activityDefinition: JsonValue;
};

export type P119ContentReviewItem = {
  reviewItemId: string;
  kind: LocalPracticeKind;
  difficulty: LocalPracticeDifficulty;
  variantId: string;
  contentVersions: string[];
  representations: P119ContentReviewRepresentation[];
};

export type P119ContentReviewManifest = {
  schemaVersion: typeof P119_CONTENT_REVIEW_MANIFEST_SCHEMA_VERSION;
  source: {
    sourceCommitSha: string;
    catalogVersion: number;
    catalogMode: "expanded-local-v2";
    activityDefinitionSchemaVersion: "activity-definition-v1";
    coursePathSchemaVersion: typeof LOCAL_COURSE_PATH_SCHEMA_VERSION;
    courseContentVersion: typeof LOCAL_COURSE_CONTENT_VERSION;
  };
  scope: {
    generatedKindCount: 10;
    difficultyCount: 3;
    inventoryGroupCount: 30;
    courseLessonCount: 3;
    statement: string;
  };
  evidenceBoundary: {
    manifestMeaning: string;
    professionalVariantTarget: "BLOCKED";
    samplingPlan: "NOT_EXECUTED";
    teacherReviews: "NOT_EXECUTED";
    educationValidity: "NOT_EXECUTED";
  };
  sourceFiles: P119ContentReviewSourceFile[];
  groups: Array<{
    kind: LocalPracticeKind;
    difficulty: LocalPracticeDifficulty;
    variantCount: number;
    reviewItemIds: string[];
  }>;
  items: P119ContentReviewItem[];
  courseItems: Array<{
    reviewItemId: string;
    courseId: string;
    courseContentVersion: string;
    courseTitle: string;
    courseObjective: string;
    chapterId: string;
    chapterTitle: string;
    chapterObjective: string;
    lesson: JsonValue;
  }>;
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

const compareAscii = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export const toP119ReviewJsonValue = (
  value: unknown,
  ancestors = new Set<object>(),
): JsonValue => {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("P119 清单拒绝 NaN 或 Infinity。");
    }
    if (Number.isInteger(value)) return value;
    return Number(value.toPrecision(P119_CONTENT_REVIEW_SIGNIFICANT_DIGITS));
  }
  if (typeof value !== "object") {
    throw new Error(`P119 清单拒绝非 JSON 值：${typeof value}`);
  }
  if (ancestors.has(value)) throw new Error("P119 清单拒绝循环引用。");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => toP119ReviewJsonValue(item, ancestors));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("P119 清单只接受普通 JSON 对象。");
    }
    const result: { [key: string]: JsonValue } = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = toP119ReviewJsonValue(nested, ancestors);
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
};

const withoutRuntimeQuestionFields = (
  question: Record<string, unknown>,
): JsonValue => {
  const { id: _id, sequence: _sequence, ...stable } = question;
  return toP119ReviewJsonValue(stable);
};

const representation = (
  representationId: string,
  factoryInput: Record<string, unknown>,
  question: Record<string, unknown>,
  activityDefinition: unknown,
): P119ContentReviewRepresentation => ({
  representationId,
  factoryInput: toP119ReviewJsonValue(factoryInput),
  questionSnapshot: withoutRuntimeQuestionFields(question),
  activityDefinition: toP119ReviewJsonValue(activityDefinition),
});

const variantCount = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
): number => {
  if (kind === "single-pitch") {
    return getLocalEarTrainingSinglePitchVariantCount(difficulty, "expanded-local-v2");
  }
  if (kind === "interval") {
    return getLocalEarTrainingQuestionVariantCount(difficulty, "expanded-local-v2");
  }
  if (kind === "chord-inversion") {
    return getLocalEarTrainingChordVariantCount(difficulty);
  }
  if (kind === "harmony-progression") {
    return getLocalHarmonyProgressionVariantCount(difficulty);
  }
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

const buildRepresentations = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  questionIndex: number,
): P119ContentReviewRepresentation[] => {
  const common = { difficulty, sequence: 0, questionIndex };
  if (kind === "single-pitch") {
    const input = { ...common, catalogMode: "expanded-local-v2" as const };
    const question = createLocalEarTrainingSinglePitchQuestion(input);
    return [representation("default", input, question, adaptSinglePitchQuestionToActivity(question))];
  }
  if (kind === "interval") {
    return (["上行", "下行"] as const).map((direction) => {
      const input = {
        ...common,
        direction,
        catalogMode: "expanded-local-v2" as const,
      };
      const question = createLocalEarTrainingQuestion(input);
      return representation(
        direction,
        input,
        question,
        adaptIntervalQuestionToActivity(question),
      );
    });
  }
  if (kind === "chord-inversion") {
    const question = createLocalEarTrainingChordQuestion(common);
    return [representation("default", common, question, adaptChordQuestionToActivity(question))];
  }
  if (kind === "harmony-progression") {
    const question = createLocalHarmonyProgressionQuestion(common);
    return [
      representation(
        "default",
        common,
        question,
        adaptHarmonyProgressionQuestionToActivity(question),
      ),
    ];
  }
  if (kind === "scale-mode") {
    const question = createLocalScaleModeQuestion(common);
    return [representation("default", common, question, adaptScaleModeQuestionToActivity(question))];
  }
  if (kind === "seventh-chord") {
    const question = createLocalSeventhChordQuestion(common);
    return [
      representation("default", common, question, adaptSeventhChordQuestionToActivity(question)),
    ];
  }
  if (kind === "seventh-chord-spacing") {
    const question = createLocalSeventhChordSpacingQuestion(common);
    return [
      representation(
        "default",
        common,
        question,
        adaptSeventhChordSpacingQuestionToActivity(question),
      ),
    ];
  }
  if (kind === "modulation") {
    const question = createLocalModulationQuestion(common);
    return [representation("default", common, question, adaptModulationQuestionToActivity(question))];
  }
  if (kind === "rhythm") {
    const input = { ...common, catalogMode: "expanded-local-v2" as const };
    const question = createLocalEarTrainingRhythmQuestion(input);
    return [representation("default", input, question, adaptRhythmQuestionToActivity(question))];
  }
  const input = { ...common, catalogMode: "expanded-local-v2" as const };
  const question = createLocalEarTrainingMelodyQuestion(input);
  return [
    representation("default", input, question, adaptMelodyDictationQuestionToActivity(question)),
  ];
};

export const getP119ContentReviewItemId = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): string => `question:${kind}:${difficulty}:${variantId}`;

const buildItem = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  questionIndex: number,
): P119ContentReviewItem => {
  const representations = buildRepresentations(kind, difficulty, questionIndex);
  const firstQuestion = representations[0].questionSnapshot as { variantId?: JsonValue };
  if (typeof firstQuestion.variantId !== "string") {
    throw new Error(`P119 清单无法读取稳定 variantId：${kind}/${difficulty}/${questionIndex}`);
  }
  const variantId = firstQuestion.variantId;
  const contentVersions = Array.from(new Set(representations.map((item) => {
    const activity = item.activityDefinition as { contentVersion?: JsonValue };
    if (typeof activity.contentVersion !== "string") {
      throw new Error(`P119 清单缺少 Activity contentVersion：${variantId}`);
    }
    return activity.contentVersion;
  }))).sort(compareAscii);
  return {
    reviewItemId: getP119ContentReviewItemId(kind, difficulty, variantId),
    kind,
    difficulty,
    variantId,
    contentVersions,
    representations,
  };
};

const canonicalize = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareAscii(left, right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
};

export const serializeP119ContentReviewManifest = (
  manifest: P119ContentReviewManifest,
): string => `${JSON.stringify(canonicalize(toP119ReviewJsonValue(manifest)), null, 2)}\n`;

export const calculateP119ContentReviewManifestSha256 = (
  manifest: P119ContentReviewManifest,
): string => createHash("sha256")
  .update(serializeP119ContentReviewManifest(manifest), "utf8")
  .digest("hex");

export const buildP119ContentReviewManifest = ({
  sourceCommitSha,
  sourceFiles,
}: {
  sourceCommitSha: string;
  sourceFiles: P119ContentReviewSourceFile[];
}): P119ContentReviewManifest => {
  if (!/^[0-9a-f]{40}$/.test(sourceCommitSha)) {
    throw new Error("P119 清单 source commit 必须是 40 位小写十六进制 SHA。");
  }
  const sortedSourceFiles = [...sourceFiles].sort((left, right) =>
    compareAscii(left.path, right.path));
  if (
    sortedSourceFiles.length !== P119_CONTENT_REVIEW_SOURCE_PATHS.length
    || sortedSourceFiles.some((item, index) =>
      item.path !== P119_CONTENT_REVIEW_SOURCE_PATHS[index]
      || !/^[0-9a-f]{64}$/.test(item.sha256))
  ) {
    throw new Error("P119 清单 source file 路径或 SHA-256 不完整。");
  }

  const items = kinds.flatMap((kind) =>
    difficulties.flatMap((difficulty) =>
      Array.from({ length: variantCount(kind, difficulty) }, (_, questionIndex) =>
        buildItem(kind, difficulty, questionIndex))
        .sort((left, right) => compareAscii(left.variantId, right.variantId))));
  const reviewItemIds = new Set(items.map((item) => item.reviewItemId));
  if (reviewItemIds.size !== items.length) {
    throw new Error("P119 清单 reviewItemId 必须全局唯一。");
  }

  const groups = kinds.flatMap((kind) =>
    difficulties.map((difficulty) => {
      const groupItems = items.filter((item) =>
        item.kind === kind && item.difficulty === difficulty);
      return {
        kind,
        difficulty,
        variantCount: groupItems.length,
        reviewItemIds: groupItems.map((item) => item.reviewItemId),
      };
    }));
  const chapter = LOCAL_CHINESE_FOUNDATION_COURSE.chapters[0];
  const courseItems = LOCAL_COURSE_LESSONS.map((lesson) => ({
    reviewItemId: `course:${LOCAL_CHINESE_FOUNDATION_COURSE.id}:${lesson.id}`,
    courseId: LOCAL_CHINESE_FOUNDATION_COURSE.id,
    courseContentVersion: LOCAL_CHINESE_FOUNDATION_COURSE.contentVersion,
    courseTitle: LOCAL_CHINESE_FOUNDATION_COURSE.title,
    courseObjective: LOCAL_CHINESE_FOUNDATION_COURSE.objective,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterObjective: chapter.objective,
    lesson: toP119ReviewJsonValue(lesson),
  }));

  return {
    schemaVersion: P119_CONTENT_REVIEW_MANIFEST_SCHEMA_VERSION,
    source: {
      sourceCommitSha,
      catalogVersion: LOCAL_PRACTICE_CATALOG_VERSION,
      catalogMode: "expanded-local-v2",
      activityDefinitionSchemaVersion: "activity-definition-v1",
      coursePathSchemaVersion: LOCAL_COURSE_PATH_SCHEMA_VERSION,
      courseContentVersion: LOCAL_COURSE_CONTENT_VERSION,
    },
    scope: {
      generatedKindCount: 10,
      difficultyCount: 3,
      inventoryGroupCount: 30,
      courseLessonCount: 3,
      statement: "仅冻结当前十类本机生成题型三档与三节中文基础课程候选；不代表十四类 Activity 内容、教师审核或教育有效性完成。",
    },
    evidenceBoundary: {
      manifestMeaning: "自动清单只证明内容可确定性重建、版本和摘要可复核。",
      professionalVariantTarget: "BLOCKED",
      samplingPlan: "NOT_EXECUTED",
      teacherReviews: "NOT_EXECUTED",
      educationValidity: "NOT_EXECUTED",
    },
    sourceFiles: sortedSourceFiles,
    groups,
    items,
    courseItems,
  };
};

export const getP119ContentReviewManifestItemIds = (
  manifest: P119ContentReviewManifest,
): string[] => [
  ...manifest.items.map((item) => item.reviewItemId),
  ...manifest.courseItems.map((item) => item.reviewItemId),
];
