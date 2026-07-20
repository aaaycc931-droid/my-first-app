import type { ActivityAnswer } from "./activityAnswer";
import type { AnalysisEvidenceV1 } from "./analysisEvidence";
import type {
  ActivityAnalysisEvidenceTargetV1,
  ActivityDefinitionV1,
} from "./activityDefinition";
import { isAnalysisEvidenceActivityTarget, validateActivityDefinition } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import { adaptOfflineNoteAlignmentEvidence } from "./offlineNoteAlignmentEvidenceAdapter";
import type { GeneratedLocalVocalExercise } from "../practice/localVocalExercise";
import type { OfflineNoteAlignmentResult } from "../practice/offlineNoteAlignment";

const scientificNote = (midi: number) => {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
};

const exerciseIdentity = (exercise: GeneratedLocalVocalExercise) => {
  const config = exercise.config;
  return [
    exercise.manifestVersion,
    config.patternId,
    `root-${config.rootMidi}`,
    config.direction,
    `bpm-${config.bpm}`,
    `octave-${config.octaveShift}`,
    `loops-${config.loops}`,
  ].join(".");
};

export type LocalVocalMicrophoneActivityDefinition = ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;
export type LocalIntervalImitationActivityDefinition = ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;

export const createLocalVocalMicrophoneActivityDefinition = (
  exercise: GeneratedLocalVocalExercise,
): LocalVocalMicrophoneActivityDefinition => {
  if (exercise.config.patternId !== "single" || exercise.config.loops !== 1 || exercise.events.length !== 1) {
    throw new Error("首个麦克风活动只接受单次单音长音练声目标。");
  }
  const event = exercise.events[0]!;
  if (event.midi !== 69) {
    throw new Error("首个麦克风活动只接受项目内置 A4 单音目标。");
  }
  const evidenceTargetId = `${exercise.manifestVersion}-${event.index}`;
  const identity = exerciseIdentity(exercise);
  return validateActivityDefinition({
    schemaVersion: "activity-definition-v1",
    activityId: `local.vocal-microphone.${identity}`,
    activityVersion: "1",
    contentVersion: `local-vocal-exercise.${identity}`,
    family: "vocal-training",
    title: "单音长音麦克风跟练",
    instructions: "查看项目内置 A4 单音目标，再主动录音并在本机分析本次演唱。",
    skillTags: ["练声", "单音长音", "麦克风", "本机分析"],
    difficulty: "foundation",
    assessmentMode: "non-scoring",
    source: { kind: "built-in", reviewState: "confirmed" },
    allowedInputModes: ["microphone"],
    target: {
      targetId: `local-vocal:${identity}`,
      label: `${scientificNote(event.midi)} · ${(event.durationSeconds).toFixed(2)} 秒`,
      checkPolicy: {
        kind: "analysis-evidence",
        evidenceSchemaVersion: "analysis-evidence-v1",
        requiredTargetIds: [evidenceTargetId],
      },
    },
    explanation: "反馈只引用当前尝试的本机逐音证据，不生成分数、等级或通过判断。",
    music: {
      range: { lowestNoteId: scientificNote(event.midi), highestNoteId: scientificNote(event.midi) },
      tempoBpm: exercise.config.bpm,
      referenceTimbre: "web-audio-sine-compatibility",
    },
  }) as LocalVocalMicrophoneActivityDefinition;
};

export const createLocalIntervalImitationActivityDefinition = ({
  exercise,
  comparisonVariantId,
  groupLabel,
}: {
  exercise: GeneratedLocalVocalExercise;
  comparisonVariantId: string;
  groupLabel: "第一组" | "第二组";
}): LocalIntervalImitationActivityDefinition => {
  if (exercise.config.patternId !== "interval" || exercise.config.loops !== 1 || exercise.events.length !== 3) {
    throw new Error("音程模唱活动只接受一次根音、目标音、根音的三音目标。");
  }
  const requiredTargetIds = exercise.events.map((event) => `${exercise.manifestVersion}-${event.index}`);
  const identity = `${comparisonVariantId}.${groupLabel === "第一组" ? "first" : "second"}`;
  return validateActivityDefinition({
    schemaVersion: "activity-definition-v1",
    activityId: `local.interval-imitation.${identity}`,
    activityVersion: "1",
    contentVersion: `local-interval-imitation.${identity}`,
    family: "vocal-training",
    title: `${groupLabel}音程模唱`,
    instructions: `听${groupLabel}参考音，再主动录制根音、目标音、根音并只在本机分析。`,
    skillTags: ["音程", "模唱", "麦克风", "本机分析"],
    difficulty: exercise.config.intervalSemitones <= 5 ? "foundation" : exercise.config.intervalSemitones <= 8 ? "intermediate" : "challenge",
    assessmentMode: "non-scoring",
    source: { kind: "built-in", reviewState: "confirmed" },
    allowedInputModes: ["microphone"],
    target: {
      targetId: `local-interval-imitation:${identity}`,
      label: `${groupLabel} · ${exercise.config.direction === "ascending" ? "上行" : "下行"}${exercise.config.intervalSemitones} 半音`,
      checkPolicy: {
        kind: "analysis-evidence",
        evidenceSchemaVersion: "analysis-evidence-v1",
        requiredTargetIds,
      },
    },
    explanation: "反馈只表达接近、偏高、偏低或证据不足，不生成分数、等级、通过／失败判断或专业声乐评估。",
    music: {
      tempoBpm: exercise.config.bpm,
      referenceTimbre: "web-audio-sine-compatibility",
    },
  }) as LocalIntervalImitationActivityDefinition;
};

const requiredEvidenceForAttempt = ({
  definition,
  attemptId,
  evidence,
}: {
  definition: ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;
  attemptId: string;
  evidence: readonly AnalysisEvidenceV1[];
}) => {
  validateActivityDefinition(definition);
  if (!isAnalysisEvidenceActivityTarget(definition.target)) return null;
  const requiredTargetIds = definition.target.checkPolicy.requiredTargetIds;
  const matches = requiredTargetIds.map((targetId) => evidence.filter((item) =>
    item.schemaVersion === "analysis-evidence-v1"
    && item.evidenceId.startsWith(`${attemptId}:`)
    && item.attemptId === attemptId
    && item.scope === "note"
    && item.targetId === targetId
    && item.processing === "local"
    && item.assessmentMode === "non-scoring",
  ));
  if (matches.some((items) => items.length !== 1)) return null;
  const resolved = matches.map((items) => items[0]!);
  if (new Set(resolved.map((item) => item.evidenceId)).size !== resolved.length) return null;
  return resolved;
};

export const createLocalVocalMicrophoneAnswer = (input: {
  definition: ActivityDefinitionV1<ActivityAnalysisEvidenceTargetV1>;
  attemptId: string;
  evidence: readonly AnalysisEvidenceV1[];
}): ActivityAnswer | null => {
  const required = requiredEvidenceForAttempt(input);
  return required ? { mode: "microphone", analysisEvidenceIds: required.map((item) => item.evidenceId) } : null;
};

export const adaptLocalIntervalImitationActivityEvidence = ({
  definition,
  attemptId,
  result,
}: {
  definition: LocalIntervalImitationActivityDefinition;
  attemptId: string;
  result: OfflineNoteAlignmentResult;
}): LocalVocalMicrophoneActivityEvidenceBundle => {
  const evidence = adaptOfflineNoteAlignmentEvidence(attemptId, result);
  const answer = createLocalVocalMicrophoneAnswer({ definition, attemptId, evidence });
  const byTargetId = new Map(result.targetEvidence.map((item) => [item.target.targetId, item]));
  const required = definition.target.checkPolicy.requiredTargetIds.map((targetId) => byTargetId.get(targetId));
  const complete = required.every((item) => item !== undefined);
  const insufficient = !answer || !complete || required.some((item) =>
    !item || item.state === "missing" || item.state === "unreliable" || item.medianCents === null,
  );
  if (insufficient) return {
    evidence,
    answer,
    checkEvidence: {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "证据不足：本轮缺少完整可靠的三音模唱证据，请清除后重新录制。",
    },
  };
  const observed = required.flatMap((item) => item?.medianCents === null || item?.medianCents === undefined ? [] : [item.medianCents]);
  const allClose = required.every((item) => item?.state === "close");
  if (allClose) return {
    evidence,
    answer,
    checkEvidence: {
      state: "consistent",
      assessmentMode: "non-scoring",
      explanation: "接近：本轮三个音的可靠证据接近当前模唱目标；这只是非评分观察。",
    },
  };
  const medianCents = [...observed].sort((a, b) => a - b)[Math.floor(observed.length / 2)] ?? 0;
  return {
    evidence,
    answer,
    checkEvidence: {
      state: "different",
      assessmentMode: "non-scoring",
      explanation: medianCents >= 0
        ? "偏高：本轮可靠证据整体高于当前模唱目标；请按明细复练。"
        : "偏低：本轮可靠证据整体低于当前模唱目标；请按明细复练。",
    },
  };
};

export type LocalVocalMicrophoneActivityEvidenceBundle = {
  evidence: AnalysisEvidenceV1[];
  answer: ActivityAnswer | null;
  checkEvidence: ActivityCheckEvidence;
};

export const adaptLocalVocalMicrophoneActivityEvidence = ({
  definition,
  attemptId,
  result,
}: {
  definition: LocalVocalMicrophoneActivityDefinition;
  attemptId: string;
  result: OfflineNoteAlignmentResult;
}): LocalVocalMicrophoneActivityEvidenceBundle => {
  const evidence = adaptOfflineNoteAlignmentEvidence(attemptId, result);
  const answer = createLocalVocalMicrophoneAnswer({ definition, attemptId, evidence });
  const requiredTargetIds = definition.target.checkPolicy.requiredTargetIds;
  const byTargetId = new Map(result.targetEvidence.map((item) => [item.target.targetId, item]));
  const required = requiredTargetIds.map((targetId) => byTargetId.get(targetId));
  const complete = required.every((item) => item !== undefined);
  const hasInsufficient = required.some((item) => !item || item.state === "missing" || item.state === "unreliable");
  const allClose = complete && required.every((item) => item?.state === "close");
  const checkEvidence: ActivityCheckEvidence = !answer || !complete || hasInsufficient
    ? {
        state: "insufficient",
        assessmentMode: "non-scoring",
        explanation: "本轮缺少当前尝试的完整可靠逐音证据，保留为无法可靠检查；请重新录制。",
      }
    : allClose
      ? {
          state: "consistent",
          assessmentMode: "non-scoring",
          explanation: "本轮可靠逐音证据与当前单音目标接近；这只是非评分练习证据。",
        }
      : {
          state: "different",
          assessmentMode: "non-scoring",
          explanation: "本轮可靠逐音证据显示与当前单音目标存在偏高或偏低，请查看明细后复练。",
        };
  return { evidence, answer, checkEvidence };
};
