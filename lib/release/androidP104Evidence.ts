export const ANDROID_P104_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type AndroidP104EvidenceInput = {
  schemaVersion: 1;
  candidate: { versionName: string; versionCode: number; commitSha: string; apkSha256: string };
  pitchBenchmark: {
    syntheticOrInstrumentSamples: number;
    realVoiceSamples: number;
    participantCount: number;
    deviceClassCount: number;
    realVoiceMedianAbsoluteCents: number;
    realVoiceP95AbsoluteCents: number;
    realVoiceOctaveErrorRatePercent: number;
    consentAndSourceRecorded: boolean;
    heldOutAcceptanceSet: boolean;
    coverageIncludesRangesDynamicsVibratoNoise: boolean;
  };
  androidRuns: Array<{
    deviceLabel: string;
    tier: "low" | "mid" | "high";
    androidVersion: string;
    webViewVersion: string;
    sampleRateHz: number;
    offlineColdStartP95Ms: number;
    microphoneToVisualP95Ms: number;
    completed20CycleStability: boolean;
    installPassed: boolean;
    offlinePassed: boolean;
    microphonePassed: boolean;
    recordingPassed: boolean;
    storagePassed: boolean;
    observationPassed: boolean;
    lifecyclePassed: boolean;
  }>;
  educationReview: { reviewerCount: number; observationCopyApproved: boolean; thresholdsApproved: boolean };
};

export type AndroidP104EvidenceCheck = { id: string; label: string; passed: boolean; observed: string; required: string };

const isSha256 = (value: string) => /^[0-9a-f]{64}$/.test(value);
const isCommit = (value: string) => /^[0-9a-f]{40}$/.test(value);

export const evaluateAndroidP104Evidence = (input: AndroidP104EvidenceInput) => {
  const tiers = new Set(input.androidRuns.map((run) => run.tier));
  const deviceLabels = new Set(input.androidRuns.map((run) => run.deviceLabel));
  const allRuns = (predicate: (run: AndroidP104EvidenceInput["androidRuns"][number]) => boolean) => input.androidRuns.length >= 3 && input.androidRuns.every(predicate);
  const maxColdStart = input.androidRuns.length > 0 ? Math.max(...input.androidRuns.map((run) => run.offlineColdStartP95Ms)) : Number.POSITIVE_INFINITY;
  const maxVisualLatency = input.androidRuns.length > 0 ? Math.max(...input.androidRuns.map((run) => run.microphoneToVisualP95Ms)) : Number.POSITIVE_INFINITY;
  const checks: AndroidP104EvidenceCheck[] = [
    { id: "candidate", label: "候选版本与摘要可追溯", passed: input.candidate.versionName.length > 0 && Number.isInteger(input.candidate.versionCode) && input.candidate.versionCode > 0 && isCommit(input.candidate.commitSha) && isSha256(input.candidate.apkSha256), observed: `${input.candidate.versionName} / ${input.candidate.versionCode}`, required: "版本、正整数 versionCode、40 位 commit、64 位 APK SHA-256" },
    { id: "synthetic-count", label: "合成/乐器单音覆盖", passed: Number.isInteger(input.pitchBenchmark.syntheticOrInstrumentSamples) && input.pitchBenchmark.syntheticOrInstrumentSamples >= 200, observed: `${input.pitchBenchmark.syntheticOrInstrumentSamples}`, required: "至少 200" },
    { id: "real-voice-count", label: "真实人声覆盖", passed: Number.isInteger(input.pitchBenchmark.realVoiceSamples) && input.pitchBenchmark.realVoiceSamples >= 100, observed: `${input.pitchBenchmark.realVoiceSamples}`, required: "至少 100" },
    { id: "participants", label: "非开发参与者覆盖", passed: Number.isInteger(input.pitchBenchmark.participantCount) && input.pitchBenchmark.participantCount >= 20, observed: `${input.pitchBenchmark.participantCount}`, required: "至少 20 位" },
    { id: "device-classes", label: "真实采集设备类别", passed: Number.isInteger(input.pitchBenchmark.deviceClassCount) && input.pitchBenchmark.deviceClassCount >= 4, observed: `${input.pitchBenchmark.deviceClassCount}`, required: "至少 4 类" },
    { id: "coverage", label: "声区、强弱音、颤音与噪声覆盖", passed: input.pitchBenchmark.coverageIncludesRangesDynamicsVibratoNoise, observed: input.pitchBenchmark.coverageIncludesRangesDynamicsVibratoNoise ? "已记录" : "未完整记录", required: "四类均覆盖" },
    { id: "accuracy", label: "真实人声音高误差", passed: input.pitchBenchmark.realVoiceMedianAbsoluteCents >= 0 && input.pitchBenchmark.realVoiceMedianAbsoluteCents <= 35 && input.pitchBenchmark.realVoiceP95AbsoluteCents >= 0 && input.pitchBenchmark.realVoiceP95AbsoluteCents <= 100 && input.pitchBenchmark.realVoiceOctaveErrorRatePercent >= 0 && input.pitchBenchmark.realVoiceOctaveErrorRatePercent <= 2, observed: `中位 ${input.pitchBenchmark.realVoiceMedianAbsoluteCents} / P95 ${input.pitchBenchmark.realVoiceP95AbsoluteCents} 音分 / 八度错误 ${input.pitchBenchmark.realVoiceOctaveErrorRatePercent}%`, required: "中位≤35、P95≤100 音分、八度错误≤2%" },
    { id: "dataset-governance", label: "授权、来源与隔离验收集", passed: input.pitchBenchmark.consentAndSourceRecorded && input.pitchBenchmark.heldOutAcceptanceSet, observed: `${input.pitchBenchmark.consentAndSourceRecorded ? "已记录授权来源" : "缺授权来源"}；${input.pitchBenchmark.heldOutAcceptanceSet ? "已隔离验收集" : "未隔离验收集"}`, required: "两项均完成" },
    { id: "android-tiers", label: "三档 Android 真机", passed: input.androidRuns.length >= 3 && deviceLabels.size >= 3 && tiers.has("low") && tiers.has("mid") && tiers.has("high") && input.androidRuns.every((run) => run.deviceLabel.length > 0 && run.androidVersion.length > 0 && run.webViewVersion.length > 0 && Number.isFinite(run.sampleRateHz) && run.sampleRateHz > 0), observed: `${deviceLabels.size} 台；${Array.from(tiers).join("/") || "无"}`, required: "低/中/高三档各至少一台，记录系统/WebView/采样率" },
    { id: "cold-start", label: "飞行模式冷启动 P95", passed: maxColdStart >= 0 && maxColdStart <= 3_000, observed: Number.isFinite(maxColdStart) ? `${maxColdStart} ms` : "无数据", required: "每台≤3000 ms" },
    { id: "visual-latency", label: "麦克风到视觉反馈 P95", passed: maxVisualLatency >= 0 && maxVisualLatency <= 150, observed: Number.isFinite(maxVisualLatency) ? `${maxVisualLatency} ms` : "无数据", required: "每台≤150 ms" },
    { id: "feature-matrix", label: "安装、断网与核心媒体/存储矩阵", passed: allRuns((run) => run.installPassed && run.offlinePassed && run.microphonePassed && run.recordingPassed && run.storagePassed && run.observationPassed && run.lifecyclePassed), observed: `${input.androidRuns.filter((run) => run.installPassed && run.offlinePassed && run.microphonePassed && run.recordingPassed && run.storagePassed && run.observationPassed && run.lifecyclePassed).length}/${input.androidRuns.length} 台完整`, required: "三台全部完整" },
    { id: "stability", label: "20 轮媒体与页面稳定性", passed: allRuns((run) => run.completed20CycleStability), observed: `${input.androidRuns.filter((run) => run.completed20CycleStability).length}/${input.androidRuns.length} 台`, required: "三台全部完成" },
    { id: "education", label: "教学文案与阈值审核", passed: input.educationReview.reviewerCount >= 2 && input.educationReview.observationCopyApproved && input.educationReview.thresholdsApproved, observed: `${input.educationReview.reviewerCount} 位审核者`, required: "至少 2 位且文案/阈值均批准" },
  ];
  return { schemaVersion: ANDROID_P104_EVIDENCE_SCHEMA_VERSION, eligible: checks.every((check) => check.passed), checks };
};
