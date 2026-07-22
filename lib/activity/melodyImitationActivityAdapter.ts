import type { ActivityAnswer } from "./activityAnswer";
import type { AnalysisEvidenceV1 } from "./analysisEvidence";
import { validateAnalysisEvidence } from "./analysisEvidence";
import type { ActivityAnalysisEvidenceTargetV1, ActivityDefinitionV1 } from "./activityDefinition";
import { validateActivityDefinition } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import { adaptOfflineNoteAlignmentEvidence } from "./offlineNoteAlignmentEvidenceAdapter";
import {
  getLocalMelodyImitationP113Targets,
  validateLocalMelodyImitationTimeline,
  type LocalMelodyImitationTimeline,
} from "../practice/localMelodyImitation";
import type { OfflineNoteAlignmentResult } from "../practice/offlineNoteAlignment";

export type MelodyImitationActivityDefinition = ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;

export type MelodyImitationAnalysisBinding = {
  definitionActivityId: string;
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
  timedTargetId: string;
  recordingId: string;
  analysisRunId: string;
  algorithmVersion: string;
};

export type MelodyImitationActivityEvidenceBundle = {
  evidence: AnalysisEvidenceV1[];
  answer: ActivityAnswer | null;
  checkEvidence: ActivityCheckEvidence;
};

const insufficient = (explanation: string): MelodyImitationActivityEvidenceBundle => ({
  evidence: [],
  answer: null,
  checkEvidence: { state: "insufficient", assessmentMode: "non-scoring", explanation },
});

export const createMelodyImitationActivityDefinition = (
  timeline: LocalMelodyImitationTimeline,
): MelodyImitationActivityDefinition => {
  const valid = validateLocalMelodyImitationTimeline(timeline);
  const alignmentTargets = getLocalMelodyImitationP113Targets(valid);
  const identity = `${valid.timelineVersion}.${valid.variantId}.${valid.targetId}`;
  const midis = alignmentTargets.map((target) => target.midi);
  return validateActivityDefinition({
    schemaVersion: "activity-definition-v1",
    activityId: `local.melody-imitation.${identity}`,
    activityVersion: "1",
    contentVersion: `local-melody-imitation.${identity}`,
    family: "melody-imitation",
    title: "三音旋律回唱",
    instructions: "完整听完隐藏旋律后，主动录音、回放检查并确认仅在本机分析本次回唱。",
    skillTags: ["旋律", "回唱", "麦克风", "本机分析"],
    difficulty: valid.difficulty === "基础" ? "foundation" : valid.difficulty === "进阶" ? "intermediate" : "challenge",
    assessmentMode: "non-scoring",
    source: { kind: "built-in", reviewState: "confirmed" },
    allowedInputModes: ["microphone"],
    target: {
      targetId: valid.targetId,
      label: "隐藏三音旋律时间目标",
      checkPolicy: {
        kind: "analysis-evidence",
        evidenceSchemaVersion: "analysis-evidence-v1",
        requiredTargetIds: alignmentTargets.map((target) => target.targetId),
      },
    },
    explanation: "反馈只表达接近、偏高、偏低或证据不足，不生成分数、等级或通过／失败判断。",
    music: {
      tempoBpm: valid.bpm,
      range: { lowestNoteId: String(Math.min(...midis)), highestNoteId: String(Math.max(...midis)) },
      referenceTimbre: "web-audio-sine-compatibility",
    },
  }) as MelodyImitationActivityDefinition;
};

const bindingFields: readonly (keyof MelodyImitationAnalysisBinding)[] = [
  "definitionActivityId",
  "questionVariantId",
  "attemptId",
  "playbackQualificationId",
  "timedTargetId",
  "recordingId",
  "analysisRunId",
  "algorithmVersion",
];

const sameBinding = (current: MelodyImitationAnalysisBinding, captured: MelodyImitationAnalysisBinding) =>
  bindingFields.every((field) => current[field].trim().length > 0 && current[field] === captured[field]);

const hasSameTimedTargetIdentity = (
  timeline: LocalMelodyImitationTimeline,
  result: OfflineNoteAlignmentResult,
) => {
  const targets = getLocalMelodyImitationP113Targets(timeline);
  if (result.targetEvidence.length !== 3) return false;
  return targets.every((target, index) => {
    const evidence = result.targetEvidence[index];
    return evidence?.target.targetId === target.targetId
      && evidence.target.index === index
      && evidence.target.phraseIndex === 0
      && evidence.target.midi === target.midi
      && evidence.target.startMs === target.startMs
      && evidence.target.endMs === target.endMs;
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
  const assignedSegmentIds = result.targetEvidence.flatMap((item) => item.segmentId === null ? [] : [item.segmentId]);
  const assignedSet = new Set(assignedSegmentIds);
  const extraSet = new Set(result.extraSegmentIds);
  const segmentById = new Map(result.segments.map((segment) => [segment.segmentId, segment]));
  const assignedSegmentsInTargetOrder = result.targetEvidence.flatMap((item) => {
    const segment = item.segmentId === null ? undefined : segmentById.get(item.segmentId);
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
    && new Set(assignedSegmentIds).size === assignedSegmentIds.length
    && extraSet.size === result.extraSegmentIds.length
    && assignedSegmentIds.every((segmentId) => segmentById.has(segmentId) && !extraSet.has(segmentId))
    && assignedSegmentsInTargetOrder.every((segment, index) =>
      index === 0 || segment.startMs >= assignedSegmentsInTargetOrder[index - 1]!.endMs,
    )
    && result.targetEvidence.every((item) => {
      if (item.state === "missing") return item.segmentId === null;
      if (item.segmentId === null) return false;
      const segment = segmentById.get(item.segmentId);
      return item.state === "unreliable" ? segment?.state === "rejected" : segment?.state === "usable";
    })
    && unassignedUsableIds.length === result.extraSegmentIds.length
    && unassignedUsableIds.every((segmentId) => extraSet.has(segmentId));
};

const bindEvidenceIds = (
  evidence: readonly AnalysisEvidenceV1[],
  binding: MelodyImitationAnalysisBinding,
): AnalysisEvidenceV1[] => evidence.map((item) => validateAnalysisEvidence({
  ...item,
  evidenceId: [
    binding.attemptId,
    "melody-imitation",
    binding.definitionActivityId,
    binding.questionVariantId,
    binding.playbackQualificationId,
    binding.timedTargetId,
    binding.recordingId,
    binding.analysisRunId,
    binding.algorithmVersion,
    "note",
    item.targetId,
  ].join(":"),
}));

export const adaptMelodyImitationActivityEvidence = ({
  definition,
  timeline,
  currentBinding,
  capturedBinding,
  result,
}: {
  definition: MelodyImitationActivityDefinition;
  timeline: LocalMelodyImitationTimeline;
  currentBinding: MelodyImitationAnalysisBinding;
  capturedBinding: MelodyImitationAnalysisBinding;
  result: OfflineNoteAlignmentResult;
}): MelodyImitationActivityEvidenceBundle => {
  validateLocalMelodyImitationTimeline(timeline);
  validateActivityDefinition(definition);
  const expectedDefinition = createMelodyImitationActivityDefinition(timeline);
  if (
    !sameBinding(currentBinding, capturedBinding)
    || currentBinding.definitionActivityId !== definition.activityId
    || currentBinding.questionVariantId !== timeline.variantId
    || currentBinding.timedTargetId !== timeline.targetId
    || currentBinding.algorithmVersion !== result.version
    || definition.activityId !== expectedDefinition.activityId
    || definition.contentVersion !== expectedDefinition.contentVersion
    || definition.target.targetId !== expectedDefinition.target.targetId
    || definition.family !== "melody-imitation"
    || definition.allowedInputModes.length !== 1
    || definition.allowedInputModes[0] !== "microphone"
  ) return insufficient("证据与当前题目、尝试、播放资格、录音或分析运行不一致，已拒绝检查。");

  const requiredTargetIds = definition.target.checkPolicy.requiredTargetIds;
  if (
    requiredTargetIds.length !== 3
    || requiredTargetIds.some((targetId, index) => targetId !== getLocalMelodyImitationP113Targets(timeline)[index]?.targetId)
    || !hasSameTimedTargetIdentity(timeline, result)
  ) return insufficient("有序逐音证据与当前版本化时间目标不一致，已拒绝检查。");

  if (!hasConservedAlignmentEvidence(result)) {
    return insufficient("逐音、分段或汇总证据不守恒，已拒绝检查。");
  }

  const noteEvidence = adaptOfflineNoteAlignmentEvidence(currentBinding.attemptId, result)
    .filter((item) => item.scope === "note");
  if (
    noteEvidence.length !== 3
    || noteEvidence.some((item, index) => item.targetId !== requiredTargetIds[index])
  ) return insufficient("当前尝试缺少完整且唯一的三音证据，已拒绝检查。");

  const evidence = bindEvidenceIds(noteEvidence, currentBinding);
  const answer: ActivityAnswer = { mode: "microphone", analysisEvidenceIds: evidence.map((item) => item.evidenceId) };
  const targets = result.targetEvidence;
  const hasInsufficient = targets.some((item) =>
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
      explanation: "证据不足：本轮至少一个音位缺少可解释的可靠证据，请清除后重新录制。",
    },
  };
  const allClose = targets.every((item) => item.state === "close");
  return {
    evidence,
    answer,
    checkEvidence: {
      state: allClose ? "consistent" : "different",
      assessmentMode: "non-scoring",
      explanation: allClose
        ? "接近：本轮三个音位的可靠证据均接近当前隐藏旋律目标；这只是非评分观察。"
        : "存在差异：本轮至少一个可靠音位偏高或偏低，请按逐音证据复练；这不是通过／失败判断。",
    },
  };
};
