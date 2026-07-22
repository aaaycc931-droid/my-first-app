import type { ActivityAnswer } from "./activityAnswer";
import type { AnalysisEvidenceV1 } from "./analysisEvidence";
import { validateAnalysisEvidence } from "./analysisEvidence";
import type { ActivityAnalysisEvidenceTargetV1, ActivityDefinitionV1 } from "./activityDefinition";
import { validateActivityDefinition } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import { adaptOfflineNoteAlignmentEvidence } from "./offlineNoteAlignmentEvidenceAdapter";
import {
  getLocalMelodySightSingingP113Targets,
  validateLocalMelodySightSingingTarget,
  type LocalMelodySightSingingTarget,
} from "../practice/localMelodySightSinging";
import type { OfflineNoteAlignmentResult } from "../practice/offlineNoteAlignment";

export type MelodySightSingingActivityDefinition = ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;

export type MelodySightSingingAnalysisBinding = {
  definitionActivityId: string;
  questionVariantId: string;
  visiblePresentationId: string;
  timedTargetId: string;
  countInRunId: string;
  attemptId: string;
  recordingId: string;
  recordingPlaybackQualificationId: string;
  analysisRunId: string;
  algorithmVersion: string;
};

export type MelodySightSingingActivityEvidenceBundle = {
  evidence: AnalysisEvidenceV1[];
  answer: ActivityAnswer | null;
  checkEvidence: ActivityCheckEvidence;
};

const rejected = (explanation: string): MelodySightSingingActivityEvidenceBundle => ({
  evidence: [],
  answer: null,
  checkEvidence: { state: "insufficient", assessmentMode: "non-scoring", explanation },
});

export const createMelodySightSingingActivityDefinition = (
  target: LocalMelodySightSingingTarget,
): MelodySightSingingActivityDefinition => {
  const valid = validateLocalMelodySightSingingTarget(target);
  const alignmentTargets = getLocalMelodySightSingingP113Targets(valid);
  const midis = alignmentTargets.map((item) => item.midi);
  const identity = `${valid.targetVersion}.${valid.visiblePresentationId}.${valid.timedTargetId}`;
  return validateActivityDefinition({
    schemaVersion: "activity-definition-v1",
    activityId: `local.melody-sight-singing.${identity}`,
    activityVersion: "1",
    contentVersion: `local-melody-sight-singing.${identity}`,
    family: "melody-sight-singing",
    title: "三音旋律视唱",
    instructions: "查看当前五线谱与固定唱名，按四拍预备主动录音，完整回放后确认仅在本机分析。",
    skillTags: ["旋律", "视唱", "五线谱", "固定唱名", "麦克风", "本机分析"],
    difficulty: valid.difficulty === "基础" ? "foundation" : valid.difficulty === "进阶" ? "intermediate" : "challenge",
    assessmentMode: "non-scoring",
    source: { kind: "built-in", reviewState: "confirmed" },
    allowedInputModes: ["microphone"],
    target: {
      targetId: valid.targetId,
      label: "可见三音五线谱与固定唱名时间目标",
      checkPolicy: {
        kind: "analysis-evidence",
        evidenceSchemaVersion: "analysis-evidence-v1",
        requiredTargetIds: alignmentTargets.map((item) => item.targetId),
      },
    },
    explanation: "反馈只表达接近、偏高、偏低或证据不足，不生成分数、等级或通过／失败判断。",
    music: {
      clef: "treble",
      meter: "4/4",
      tempoBpm: valid.bpm,
      range: { lowestNoteId: String(Math.min(...midis)), highestNoteId: String(Math.max(...midis)) },
    },
  }) as MelodySightSingingActivityDefinition;
};

const bindingFields: readonly (keyof MelodySightSingingAnalysisBinding)[] = [
  "definitionActivityId",
  "questionVariantId",
  "visiblePresentationId",
  "timedTargetId",
  "countInRunId",
  "attemptId",
  "recordingId",
  "recordingPlaybackQualificationId",
  "analysisRunId",
  "algorithmVersion",
];

const sameBinding = (
  current: MelodySightSingingAnalysisBinding,
  captured: MelodySightSingingAnalysisBinding,
) => bindingFields.every((field) => current[field].trim().length > 0 && current[field] === captured[field]);

const hasSameTargetIdentity = (
  target: LocalMelodySightSingingTarget,
  result: OfflineNoteAlignmentResult,
) => {
  const expected = getLocalMelodySightSingingP113Targets(target);
  if (result.targetEvidence.length !== 3) return false;
  return expected.every((item, index) => {
    const evidence = result.targetEvidence[index];
    return evidence?.target.targetId === item.targetId
      && evidence.target.index === index
      && evidence.target.phraseIndex === 0
      && evidence.target.midi === item.midi
      && evidence.target.startMs === item.startMs
      && evidence.target.endMs === item.endMs;
  });
};

const hasConservedAlignmentEvidence = (result: OfflineNoteAlignmentResult) => {
  const alignedCount = result.targetEvidence.filter((item) =>
    item.state === "close" || item.state === "high" || item.state === "low",
  ).length;
  const missingCount = result.targetEvidence.filter((item) => item.state === "missing").length;
  const unreliableCount = result.targetEvidence.filter((item) => item.state === "unreliable").length;
  const usableSegments = result.segments.filter((segment) => segment.state === "usable");
  const rejectedSegments = result.segments.filter((segment) => segment.state === "rejected");
  const segmentIds = result.segments.map((segment) => segment.segmentId);
  const assignedIds = result.targetEvidence.flatMap((item) => item.segmentId === null ? [] : [item.segmentId]);
  const assignedSet = new Set(assignedIds);
  const extraSet = new Set(result.extraSegmentIds);
  const byId = new Map(result.segments.map((segment) => [segment.segmentId, segment]));
  const assignedInTargetOrder = result.targetEvidence.flatMap((item) => {
    const segment = item.segmentId === null ? undefined : byId.get(item.segmentId);
    return segment ? [segment] : [];
  });
  const unassignedUsableIds = usableSegments
    .filter((segment) => !assignedSet.has(segment.segmentId))
    .map((segment) => segment.segmentId);

  return result.summary.targetCount === result.targetEvidence.length
    && result.summary.alignedTargetCount === alignedCount
    && result.summary.missingTargetCount === missingCount
    && result.summary.unreliableTargetCount === unreliableCount
    && alignedCount + missingCount + unreliableCount === result.targetEvidence.length
    && result.summary.segmentCount === result.segments.length
    && result.summary.usableSegmentCount === usableSegments.length
    && result.summary.rejectedSegmentCount === rejectedSegments.length
    && result.summary.extraSegmentCount === result.extraSegmentIds.length
    && new Set(segmentIds).size === segmentIds.length
    && new Set(assignedIds).size === assignedIds.length
    && extraSet.size === result.extraSegmentIds.length
    && assignedIds.every((id) => byId.has(id) && !extraSet.has(id))
    && assignedInTargetOrder.every((segment, index) =>
      index === 0 || segment.startMs >= assignedInTargetOrder[index - 1]!.endMs,
    )
    && result.targetEvidence.every((item) => {
      if (item.state === "missing") return item.segmentId === null;
      if (item.segmentId === null) return false;
      const segment = byId.get(item.segmentId);
      return item.state === "unreliable" ? segment?.state === "rejected" : segment?.state === "usable";
    })
    && unassignedUsableIds.length === result.extraSegmentIds.length
    && unassignedUsableIds.every((id) => extraSet.has(id));
};

const bindEvidenceIds = (
  evidence: readonly AnalysisEvidenceV1[],
  binding: MelodySightSingingAnalysisBinding,
): AnalysisEvidenceV1[] => evidence.map((item) => validateAnalysisEvidence({
  ...item,
  evidenceId: [
    binding.attemptId,
    "melody-sight-singing",
    binding.definitionActivityId,
    binding.questionVariantId,
    binding.visiblePresentationId,
    binding.timedTargetId,
    binding.countInRunId,
    binding.recordingId,
    binding.recordingPlaybackQualificationId,
    binding.analysisRunId,
    binding.algorithmVersion,
    "note",
    item.targetId,
  ].join(":"),
}));

export const adaptMelodySightSingingActivityEvidence = ({
  definition,
  target,
  currentBinding,
  capturedBinding,
  result,
}: {
  definition: MelodySightSingingActivityDefinition;
  target: LocalMelodySightSingingTarget;
  currentBinding: MelodySightSingingAnalysisBinding;
  capturedBinding: MelodySightSingingAnalysisBinding;
  result: OfflineNoteAlignmentResult;
}): MelodySightSingingActivityEvidenceBundle => {
  try {
    validateLocalMelodySightSingingTarget(target);
    validateActivityDefinition(definition);
  } catch {
    return rejected("视唱目标或活动定义身份无效，已拒绝检查。");
  }
  const expectedDefinition = createMelodySightSingingActivityDefinition(target);
  if (
    !sameBinding(currentBinding, capturedBinding)
    || currentBinding.definitionActivityId !== definition.activityId
    || currentBinding.questionVariantId !== target.variantId
    || currentBinding.visiblePresentationId !== target.visiblePresentationId
    || currentBinding.timedTargetId !== target.timedTargetId
    || currentBinding.algorithmVersion !== result.version
    || definition.activityId !== expectedDefinition.activityId
    || definition.contentVersion !== expectedDefinition.contentVersion
    || definition.target.targetId !== expectedDefinition.target.targetId
    || definition.family !== "melody-sight-singing"
    || definition.assessmentMode !== "non-scoring"
    || definition.allowedInputModes.length !== 1
    || definition.allowedInputModes[0] !== "microphone"
  ) return rejected("证据与当前可见谱面、四拍运行、尝试、录音回放或分析运行不一致，已拒绝检查。");

  const expectedTargetIds = getLocalMelodySightSingingP113Targets(target).map((item) => item.targetId);
  const requiredTargetIds = definition.target.checkPolicy.requiredTargetIds;
  if (
    requiredTargetIds.length !== 3
    || requiredTargetIds.some((id, index) => id !== expectedTargetIds[index])
    || !hasSameTargetIdentity(target, result)
  ) return rejected("有序逐音证据与当前版本化视唱目标不一致，已拒绝检查。");
  if (!hasConservedAlignmentEvidence(result)) {
    return rejected("逐音、分段或汇总证据不守恒，已拒绝检查。");
  }

  const noteEvidence = adaptOfflineNoteAlignmentEvidence(currentBinding.attemptId, result)
    .filter((item) => item.scope === "note");
  if (
    noteEvidence.length !== 3
    || noteEvidence.some((item, index) => item.targetId !== requiredTargetIds[index])
  ) return rejected("当前尝试缺少完整且唯一的三音视唱证据，已拒绝检查。");

  const evidence = bindEvidenceIds(noteEvidence, currentBinding);
  const answer: ActivityAnswer = { mode: "microphone", analysisEvidenceIds: evidence.map((item) => item.evidenceId) };
  const hasInsufficient = result.targetEvidence.some((item) =>
    item.state === "missing"
    || item.state === "unreliable"
    || item.medianCents === null
    || item.confidence === null,
  ) || result.extraSegmentIds.length > 0;
  if (hasInsufficient) return {
    evidence,
    answer,
    checkEvidence: {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "证据不足：本轮至少一个视唱音位或额外片段无法可靠解释，请清除后重新录制。",
    },
  };
  const allClose = result.targetEvidence.every((item) => item.state === "close");
  return {
    evidence,
    answer,
    checkEvidence: {
      state: allClose ? "consistent" : "different",
      assessmentMode: "non-scoring",
      explanation: allClose
        ? "接近：本轮三个音位的可靠证据均接近当前可见视唱目标；这只是非评分观察。"
        : "存在差异：本轮至少一个可靠音位偏高或偏低，请按可见谱面与逐音证据复练；这不是通过／失败判断。",
    },
  };
};
