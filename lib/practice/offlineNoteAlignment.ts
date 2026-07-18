import type { OfflinePitchAnalysisResult, OfflinePitchFrame } from "./offlinePitchAnalysis";

export const OFFLINE_NOTE_ALIGNMENT_VERSION = "offline-note-alignment-v1" as const;

export type OfflineAlignmentTarget = {
  targetId: string;
  index: number;
  phraseIndex: number;
  label: string;
  midi: number;
  startMs: number;
  endMs: number;
};

export type OfflineEvidenceConfidence = "high" | "medium" | "low";

export type OfflineNoteSegment = {
  segmentId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  voicedFrameCount: number;
  bridgedFrameCount: number;
  medianFrequencyHz: number;
  medianMidi: number;
  minMidi: number;
  maxMidi: number;
  medianFrameConfidence: number;
  confidence: OfflineEvidenceConfidence;
  state: "usable" | "rejected";
  reason: string;
  frames: readonly OfflinePitchFrame[];
};

export type OfflinePhaseEvidence = {
  phase: "onset" | "stable" | "tail";
  label: "音头" | "稳定段" | "尾音";
  startMs: number;
  endMs: number;
  voicedFrameCount: number;
  medianCents: number | null;
  lowCents: number | null;
  highCents: number | null;
  reason: string;
};

export type OfflineTargetEvidence = {
  target: OfflineAlignmentTarget;
  segmentId: string | null;
  state: "close" | "high" | "low" | "missing" | "unreliable";
  detectedNote: string | null;
  medianCents: number | null;
  lowCents: number | null;
  highCents: number | null;
  timingOffsetMs: number | null;
  confidence: OfflineEvidenceConfidence | null;
  phases: readonly OfflinePhaseEvidence[];
  reason: string;
};

export type OfflinePhraseEvidence = {
  phraseIndex: number;
  targetCount: number;
  reliableCount: number;
  missingCount: number;
  unreliableCount: number;
  medianCents: number | null;
  medianTimingOffsetMs: number | null;
  state: "available" | "partial" | "unavailable";
  reason: string;
};

export type OfflineNoteAlignmentResult = {
  version: typeof OFFLINE_NOTE_ALIGNMENT_VERSION;
  sourceAnalysisVersion: OfflinePitchAnalysisResult["version"];
  segments: readonly OfflineNoteSegment[];
  targetEvidence: readonly OfflineTargetEvidence[];
  phraseEvidence: readonly OfflinePhraseEvidence[];
  extraSegmentIds: readonly string[];
  summary: {
    segmentCount: number;
    usableSegmentCount: number;
    rejectedSegmentCount: number;
    targetCount: number;
    alignedTargetCount: number;
    missingTargetCount: number;
    unreliableTargetCount: number;
    extraSegmentCount: number;
  };
  alignmentReason: string;
};

type AlignmentOptions = {
  targets?: readonly OfflineAlignmentTarget[];
};

const HOP_MS = 20;
const MAX_BRIDGED_FRAMES = 1;
const SPLIT_JUMP_CENTS = 140;
const MIN_USABLE_FRAMES = 4;
const MIN_USABLE_DURATION_MS = 100;

const median = (values: readonly number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const percentile = (values: readonly number[], ratio: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)));
  return sorted[position] ?? null;
};

const centsBetween = (midi: number, targetMidi: number) => (midi - targetMidi) * 100;

const scientificNote = (midi: number) => {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const rounded = Math.round(midi);
  return `${names[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
};

const recentMedianFrequency = (frames: readonly OfflinePitchFrame[]) => median(
  frames.slice(-5).flatMap((frame) => frame.frequencyHz === null ? [] : [frame.frequencyHz]),
);

const createSegment = (
  frames: readonly OfflinePitchFrame[],
  bridgedFrameCount: number,
  segmentIndex: number,
): OfflineNoteSegment | null => {
  const voiced = frames.filter((frame) => frame.state === "voiced" && frame.frequencyHz !== null && frame.midi !== null);
  if (voiced.length === 0) return null;
  const frequencies = voiced.map((frame) => frame.frequencyHz as number);
  const midis = voiced.map((frame) => frame.midi as number);
  const confidences = voiced.map((frame) => frame.confidence);
  const startMs = voiced[0]!.timestampMs;
  const endMs = voiced.at(-1)!.timestampMs + HOP_MS;
  const durationMs = endMs - startMs;
  const medianFrameConfidence = median(confidences) ?? 0;
  const usable = voiced.length >= MIN_USABLE_FRAMES
    && durationMs >= MIN_USABLE_DURATION_MS
    && medianFrameConfidence >= 0.68;
  const confidence: OfflineEvidenceConfidence = medianFrameConfidence >= 0.86 && durationMs >= 180
    ? "high"
    : medianFrameConfidence >= 0.74 && durationMs >= MIN_USABLE_DURATION_MS
      ? "medium"
      : "low";
  return {
    segmentId: `offline-segment-${segmentIndex + 1}`,
    startMs,
    endMs,
    durationMs,
    voicedFrameCount: voiced.length,
    bridgedFrameCount,
    medianFrequencyHz: median(frequencies) as number,
    medianMidi: median(midis) as number,
    minMidi: Math.min(...midis),
    maxMidi: Math.max(...midis),
    medianFrameConfidence,
    confidence,
    state: usable ? "usable" : "rejected",
    reason: usable
      ? "连续 voiced 证据达到分段时长、帧数与置信门槛。"
      : voiced.length < MIN_USABLE_FRAMES || durationMs < MIN_USABLE_DURATION_MS
        ? "片段过短，保留为局部拒答，不解释成完整音符。"
        : "片段帧置信度不足，保留为局部拒答。",
    frames: voiced,
  };
};

export const segmentOfflinePitchFrames = (
  frames: readonly OfflinePitchFrame[],
): OfflineNoteSegment[] => {
  const segments: OfflineNoteSegment[] = [];
  let active: OfflinePitchFrame[] = [];
  let pendingRejected: OfflinePitchFrame[] = [];
  let bridgedFrameCount = 0;

  const flush = () => {
    const segment = createSegment(active, bridgedFrameCount, segments.length);
    if (segment) segments.push(segment);
    active = [];
    pendingRejected = [];
    bridgedFrameCount = 0;
  };

  for (const frame of frames) {
    const voiced = frame.state === "voiced" && frame.frequencyHz !== null && frame.midi !== null;
    if (!voiced) {
      if (active.length > 0) {
        pendingRejected.push(frame);
        if (pendingRejected.length > MAX_BRIDGED_FRAMES) flush();
      }
      continue;
    }

    const previousFrequency = recentMedianFrequency(active);
    const jumpCents = previousFrequency === null
      ? 0
      : Math.abs(1_200 * Math.log2((frame.frequencyHz as number) / previousFrequency));
    if (active.length > 0 && jumpCents > SPLIT_JUMP_CENTS) flush();
    if (active.length > 0 && pendingRejected.length > 0) {
      bridgedFrameCount += pendingRejected.length;
      pendingRejected = [];
    }
    active.push(frame);
  }
  flush();
  return segments;
};

const createPhaseEvidence = (
  segment: OfflineNoteSegment,
  targetMidi: number,
): OfflinePhaseEvidence[] => {
  const frames = segment.frames;
  const edgeCount = Math.max(1, Math.floor(frames.length * 0.2));
  const groups: Array<{
    phase: OfflinePhaseEvidence["phase"];
    label: OfflinePhaseEvidence["label"];
    frames: readonly OfflinePitchFrame[];
  }> = [
    { phase: "onset", label: "音头", frames: frames.slice(0, edgeCount) },
    { phase: "stable", label: "稳定段", frames: frames.slice(edgeCount, Math.max(edgeCount, frames.length - edgeCount)) },
    { phase: "tail", label: "尾音", frames: frames.slice(Math.max(edgeCount, frames.length - edgeCount)) },
  ];
  return groups.map((group) => {
    const values = group.frames.flatMap((frame) => frame.midi === null ? [] : [centsBetween(frame.midi, targetMidi)]);
    return {
      phase: group.phase,
      label: group.label,
      startMs: group.frames[0]?.timestampMs ?? segment.startMs,
      endMs: (group.frames.at(-1)?.timestampMs ?? segment.startMs) + HOP_MS,
      voicedFrameCount: values.length,
      medianCents: median(values),
      lowCents: percentile(values, 0.1),
      highCents: percentile(values, 0.9),
      reason: values.length > 0 ? "仅汇总本阶段的可靠 voiced 帧。" : "本阶段没有足够的可靠 voiced 帧。",
    };
  });
};

const matchCost = (segment: OfflineNoteSegment, target: OfflineAlignmentTarget) => {
  const segmentCenter = (segment.startMs + segment.endMs) / 2;
  const targetCenter = (target.startMs + target.endMs) / 2;
  const targetDuration = Math.max(120, target.endMs - target.startMs);
  const overlap = Math.max(0, Math.min(segment.endMs, target.endMs) - Math.max(segment.startMs, target.startMs));
  const centerDistance = Math.abs(segmentCenter - targetCenter);
  if (overlap <= 0 && centerDistance > Math.max(500, targetDuration * 0.9)) return Number.POSITIVE_INFINITY;
  const timingCost = centerDistance / targetDuration;
  const pitchDistance = Math.min(1_200, Math.abs(centsBetween(segment.medianMidi, target.midi)));
  return timingCost * 0.8 + (pitchDistance / 300) * 0.2 + (segment.state === "rejected" ? 0.35 : 0);
};

type Match = { targetIndex: number; segmentIndex: number };

const alignMonotonic = (
  segments: readonly OfflineNoteSegment[],
  targets: readonly OfflineAlignmentTarget[],
): Match[] => {
  const rows = targets.length + 1;
  const columns = segments.length + 1;
  const costs = Array.from({ length: rows }, () => Array<number>(columns).fill(Number.POSITIVE_INFINITY));
  const actions = Array.from({ length: rows }, () => Array<"match" | "target" | "segment" | null>(columns).fill(null));
  costs[0]![0] = 0;
  for (let targetIndex = 0; targetIndex <= targets.length; targetIndex += 1) {
    for (let segmentIndex = 0; segmentIndex <= segments.length; segmentIndex += 1) {
      const current = costs[targetIndex]![segmentIndex]!;
      if (!Number.isFinite(current)) continue;
      if (targetIndex < targets.length && current + 1.15 < costs[targetIndex + 1]![segmentIndex]!) {
        costs[targetIndex + 1]![segmentIndex] = current + 1.15;
        actions[targetIndex + 1]![segmentIndex] = "target";
      }
      if (segmentIndex < segments.length && current + 1.05 < costs[targetIndex]![segmentIndex + 1]!) {
        costs[targetIndex]![segmentIndex + 1] = current + 1.05;
        actions[targetIndex]![segmentIndex + 1] = "segment";
      }
      if (targetIndex < targets.length && segmentIndex < segments.length) {
        const cost = matchCost(segments[segmentIndex]!, targets[targetIndex]!);
        if (Number.isFinite(cost) && current + cost < costs[targetIndex + 1]![segmentIndex + 1]!) {
          costs[targetIndex + 1]![segmentIndex + 1] = current + cost;
          actions[targetIndex + 1]![segmentIndex + 1] = "match";
        }
      }
    }
  }
  const matches: Match[] = [];
  let targetIndex = targets.length;
  let segmentIndex = segments.length;
  while (targetIndex > 0 || segmentIndex > 0) {
    const action = actions[targetIndex]![segmentIndex];
    if (action === "match") {
      matches.push({ targetIndex: targetIndex - 1, segmentIndex: segmentIndex - 1 });
      targetIndex -= 1;
      segmentIndex -= 1;
    } else if (action === "target") {
      targetIndex -= 1;
    } else if (action === "segment") {
      segmentIndex -= 1;
    } else {
      break;
    }
  }
  return matches.reverse();
};

const createTargetEvidence = (
  target: OfflineAlignmentTarget,
  segment: OfflineNoteSegment | null,
): OfflineTargetEvidence => {
  if (!segment) {
    return {
      target,
      segmentId: null,
      state: "missing",
      detectedNote: null,
      medianCents: null,
      lowCents: null,
      highCents: null,
      timingOffsetMs: null,
      confidence: null,
      phases: [],
      reason: "目标时段没有可可靠对齐的演唱片段。",
    };
  }
  const values = segment.frames.flatMap((frame) => frame.midi === null ? [] : [centsBetween(frame.midi, target.midi)]);
  const medianCents = median(values);
  if (segment.state === "rejected" || medianCents === null) {
    return {
      target,
      segmentId: segment.segmentId,
      state: "unreliable",
      detectedNote: scientificNote(segment.medianMidi),
      medianCents: null,
      lowCents: null,
      highCents: null,
      timingOffsetMs: segment.startMs - target.startMs,
      confidence: segment.confidence,
      phases: [],
      reason: segment.reason,
    };
  }
  const state: OfflineTargetEvidence["state"] = Math.abs(medianCents) <= 35
    ? "close"
    : medianCents > 0
      ? "high"
      : "low";
  return {
    target,
    segmentId: segment.segmentId,
    state,
    detectedNote: scientificNote(segment.medianMidi),
    medianCents,
    lowCents: percentile(values, 0.1),
    highCents: percentile(values, 0.9),
    timingOffsetMs: segment.startMs - target.startMs,
    confidence: segment.confidence,
    phases: createPhaseEvidence(segment, target.midi),
    reason: state === "close"
      ? "稳定段中位音高接近目标；这是非评分证据。"
      : state === "high"
        ? "检测片段整体高于目标；目标只用于对照，没有改写检测轨迹。"
        : "检测片段整体低于目标；目标只用于对照，没有改写检测轨迹。",
  };
};

const createPhraseEvidence = (
  targetEvidence: readonly OfflineTargetEvidence[],
): OfflinePhraseEvidence[] => {
  const phraseIndexes = Array.from(new Set(targetEvidence.map((evidence) => evidence.target.phraseIndex)));
  return phraseIndexes.map((phraseIndex) => {
    const items = targetEvidence.filter((evidence) => evidence.target.phraseIndex === phraseIndex);
    const reliable = items.filter((evidence) => ["close", "high", "low"].includes(evidence.state));
    const missingCount = items.filter((evidence) => evidence.state === "missing").length;
    const unreliableCount = items.filter((evidence) => evidence.state === "unreliable").length;
    const state: OfflinePhraseEvidence["state"] = reliable.length === 0
      ? "unavailable"
      : reliable.length === items.length
        ? "available"
        : "partial";
    return {
      phraseIndex,
      targetCount: items.length,
      reliableCount: reliable.length,
      missingCount,
      unreliableCount,
      medianCents: median(reliable.flatMap((evidence) => evidence.medianCents === null ? [] : [evidence.medianCents])),
      medianTimingOffsetMs: median(reliable.flatMap((evidence) => evidence.timingOffsetMs === null ? [] : [evidence.timingOffsetMs])),
      state,
      reason: state === "available"
        ? "本句所有目标都有可解释的局部证据。"
        : state === "partial"
          ? "本句只有部分目标可判断，缺唱或低置信部分不会被平均隐藏。"
          : "本句没有足够可靠证据，保留无法判断。",
    };
  });
};

export const analyzeOfflineNoteAlignment = (
  analysis: OfflinePitchAnalysisResult,
  options: AlignmentOptions = {},
): OfflineNoteAlignmentResult => {
  const segments = segmentOfflinePitchFrames(analysis.frames);
  const usableSegments = segments.filter((segment) => segment.state === "usable");
  const targets = [...(options.targets ?? [])]
    .filter((target) => target.endMs >= 0 && target.startMs <= analysis.pcm.durationSeconds * 1_000)
    .sort((left, right) => left.startMs - right.startMs || left.index - right.index);
  const matches = alignMonotonic(segments, targets);
  const segmentByTarget = new Map(matches.map((match) => [match.targetIndex, segments[match.segmentIndex]!]));
  const targetEvidence = targets.map((target, index) => createTargetEvidence(target, segmentByTarget.get(index) ?? null));
  const usedSegmentIds = new Set(matches.map((match) => segments[match.segmentIndex]!.segmentId));
  const extraSegmentIds = usableSegments
    .filter((segment) => !usedSegmentIds.has(segment.segmentId))
    .map((segment) => segment.segmentId);
  const phraseEvidence = createPhraseEvidence(targetEvidence);
  return {
    version: OFFLINE_NOTE_ALIGNMENT_VERSION,
    sourceAnalysisVersion: analysis.version,
    segments,
    targetEvidence,
    phraseEvidence,
    extraSegmentIds,
    summary: {
      segmentCount: segments.length,
      usableSegmentCount: usableSegments.length,
      rejectedSegmentCount: segments.length - usableSegments.length,
      targetCount: targets.length,
      alignedTargetCount: targetEvidence.filter((evidence) => ["close", "high", "low"].includes(evidence.state)).length,
      missingTargetCount: targetEvidence.filter((evidence) => evidence.state === "missing").length,
      unreliableTargetCount: targetEvidence.filter((evidence) => evidence.state === "unreliable").length,
      extraSegmentCount: extraSegmentIds.length,
    },
    alignmentReason: targets.length === 0
      ? "没有已确认目标，只提供本机音符片段证据，不生成逐音或逐句结论。"
      : "先独立分割检测轨迹，再按时间单调对齐目标；目标不会修改频率、voicing、分段或拒答。",
  };
};
