export const PITCH_BENCHMARK_PROTOCOL_VERSION = "p111-pitch-benchmark-v1" as const;

export type PitchBenchmarkSplit = "tuning" | "development" | "acceptance-blind";
export type PitchBenchmarkSource = "synthetic" | "instrument" | "real-voice" | "no-pitch";

export type PitchBenchmarkCase = {
  id: string;
  split: PitchBenchmarkSplit;
  sourceType: PitchBenchmarkSource;
  participantToken: string | null;
  consentRecordToken: string | null;
  authorizedForBenchmark: boolean;
  referenceVoiced: boolean;
  referenceFrequencyHz: number | null;
  strata: {
    range: "low" | "mid" | "high" | "not-applicable";
    dynamics: "soft" | "medium" | "loud" | "not-applicable";
    technique: "stable" | "vibrato" | "glide" | "breathy" | "not-applicable";
    noise: "quiet" | "ambient" | "speaker-leak" | "not-applicable";
    deviceClass: string;
  };
  annotation: {
    annotatorCount: number;
    adjudicatedWhenDisputed: boolean;
  };
  result: {
    predictedVoiced: boolean;
    frequencyHz: number | null;
    durationSeconds: number;
    processingMs: number;
  };
};

export type PitchBenchmarkInput = {
  protocolVersion: typeof PITCH_BENCHMARK_PROTOCOL_VERSION;
  benchmarkId: string;
  run: {
    commitSha: string;
    engineId: string;
    engineVersion: string;
    parametersSha256: string;
    deviceProfile: string;
    labelsSealedBeforeRun: boolean;
    engineFrozenBeforeBlindRun: boolean;
  };
  governance: {
    rawAudioLocalOnly: boolean;
    containsDirectIdentifiers: boolean;
    consentRecordsStoredSeparately: boolean;
    splitsAssignedBeforeRun: boolean;
  };
  cases: PitchBenchmarkCase[];
};

export type PitchBenchmarkMetrics = {
  sampleCount: number;
  referenceVoicedCount: number;
  voicedPrecision: number | null;
  voicedRecall: number | null;
  voicedF1: number | null;
  rawPitchAccuracy50Cents: number | null;
  rawChromaAccuracy50Cents: number | null;
  medianAbsoluteCents: number | null;
  p95AbsoluteCents: number | null;
  octaveErrorRatePercent: number | null;
  p95RealtimeFactor: number | null;
};

export type PitchBenchmarkCheck = {
  id: string;
  label: string;
  passed: boolean;
  observed: string;
  required: string;
};

const isCommit = (value: string) => /^[0-9a-f]{40}$/.test(value);
const isSha256 = (value: string) => /^[0-9a-f]{64}$/.test(value);
const isPositive = (value: number) => Number.isFinite(value) && value > 0;
const isNonNegative = (value: number) => Number.isFinite(value) && value >= 0;

const quantile = (values: readonly number[], ratio: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

const centsDifference = (estimated: number, reference: number) =>
  1_200 * Math.log2(estimated / reference);

const chromaDistance = (absoluteCents: number) => {
  const remainder = absoluteCents % 1_200;
  return Math.min(remainder, 1_200 - remainder);
};

export const calculatePitchBenchmarkMetrics = (
  cases: readonly PitchBenchmarkCase[],
): PitchBenchmarkMetrics => {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  const referenceVoiced = cases.filter((sample) => sample.referenceVoiced);
  const absoluteCents: number[] = [];
  let rawPitchHits = 0;
  let rawChromaHits = 0;
  let octaveErrors = 0;

  for (const sample of cases) {
    if (sample.referenceVoiced && sample.result.predictedVoiced) truePositive += 1;
    else if (!sample.referenceVoiced && sample.result.predictedVoiced) falsePositive += 1;
    else if (sample.referenceVoiced && !sample.result.predictedVoiced) falseNegative += 1;

    if (
      sample.referenceVoiced
      && sample.result.predictedVoiced
      && isPositive(sample.referenceFrequencyHz ?? 0)
      && isPositive(sample.result.frequencyHz ?? 0)
    ) {
      const error = Math.abs(centsDifference(
        sample.result.frequencyHz as number,
        sample.referenceFrequencyHz as number,
      ));
      absoluteCents.push(error);
      if (error <= 50) rawPitchHits += 1;
      if (chromaDistance(error) <= 50) rawChromaHits += 1;
      if (error >= 1_150 && chromaDistance(error) <= 50) octaveErrors += 1;
    }
  }

  const precisionDenominator = truePositive + falsePositive;
  const recallDenominator = truePositive + falseNegative;
  const precision = precisionDenominator > 0 ? truePositive / precisionDenominator : null;
  const recall = recallDenominator > 0 ? truePositive / recallDenominator : null;
  const f1 = precision !== null && recall !== null && precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : null;
  const realTimeFactors = cases
    .filter((sample) => isPositive(sample.result.durationSeconds) && isNonNegative(sample.result.processingMs))
    .map((sample) => sample.result.processingMs / (sample.result.durationSeconds * 1_000));

  return {
    sampleCount: cases.length,
    referenceVoicedCount: referenceVoiced.length,
    voicedPrecision: precision,
    voicedRecall: recall,
    voicedF1: f1,
    rawPitchAccuracy50Cents: referenceVoiced.length > 0 ? rawPitchHits / referenceVoiced.length : null,
    rawChromaAccuracy50Cents: referenceVoiced.length > 0 ? rawChromaHits / referenceVoiced.length : null,
    medianAbsoluteCents: quantile(absoluteCents, 0.5),
    p95AbsoluteCents: quantile(absoluteCents, 0.95),
    octaveErrorRatePercent: referenceVoiced.length > 0 ? (octaveErrors / referenceVoiced.length) * 100 : null,
    p95RealtimeFactor: quantile(realTimeFactors, 0.95),
  };
};

const formatMetric = (value: number | null, suffix = "") =>
  value === null ? "无数据" : `${Number(value.toFixed(4))}${suffix}`;

const createStratifiedMetrics = (cases: readonly PitchBenchmarkCase[]) => {
  const dimensions = [
    ["sourceType", (sample: PitchBenchmarkCase) => sample.sourceType],
    ["range", (sample: PitchBenchmarkCase) => sample.strata.range],
    ["dynamics", (sample: PitchBenchmarkCase) => sample.strata.dynamics],
    ["technique", (sample: PitchBenchmarkCase) => sample.strata.technique],
    ["noise", (sample: PitchBenchmarkCase) => sample.strata.noise],
    ["deviceClass", (sample: PitchBenchmarkCase) => sample.strata.deviceClass],
  ] as const;
  return dimensions.flatMap(([dimension, read]) => {
    const values = Array.from(new Set(cases.map(read))).sort();
    return values.map((value) => ({
      dimension,
      value,
      metrics: calculatePitchBenchmarkMetrics(cases.filter((sample) => read(sample) === value)),
    }));
  });
};

export const evaluatePitchBenchmark = (input: PitchBenchmarkInput) => {
  const ids = input.cases.map((sample) => sample.id);
  const uniqueIds = new Set(ids);
  const splitCounts = new Map<PitchBenchmarkSplit, number>();
  for (const sample of input.cases) splitCounts.set(sample.split, (splitCounts.get(sample.split) ?? 0) + 1);
  const realVoice = input.cases.filter((sample) => sample.sourceType === "real-voice");
  const syntheticOrInstrument = input.cases.filter((sample) => sample.sourceType === "synthetic" || sample.sourceType === "instrument");
  const participants = new Set(realVoice.map((sample) => sample.participantToken).filter(Boolean));
  const realVoiceDevices = new Set(realVoice.map((sample) => sample.strata.deviceClass).filter(Boolean));
  const blindCases = input.cases.filter((sample) => sample.split === "acceptance-blind");
  const blindMetrics = calculatePitchBenchmarkMetrics(blindCases);
  const blindRealVoiceMetrics = calculatePitchBenchmarkMetrics(
    blindCases.filter((sample) => sample.sourceType === "real-voice"),
  );
  const blindVoiceBoundaryMetrics = calculatePitchBenchmarkMetrics(
    blindCases.filter((sample) => sample.sourceType === "real-voice" || sample.sourceType === "no-pitch"),
  );
  const referencesValid = input.cases.every((sample) =>
    sample.id.trim().length > 0
    && sample.authorizedForBenchmark
    && isPositive(sample.result.durationSeconds)
    && isNonNegative(sample.result.processingMs)
    && (sample.referenceVoiced ? isPositive(sample.referenceFrequencyHz ?? 0) : sample.referenceFrequencyHz === null)
    && (sample.result.predictedVoiced ? isPositive(sample.result.frequencyHz ?? 0) : sample.result.frequencyHz === null),
  );
  const realVoiceGoverned = realVoice.every((sample) =>
    Boolean(sample.participantToken?.trim())
    && Boolean(sample.consentRecordToken?.trim())
    && sample.authorizedForBenchmark
    && sample.annotation.annotatorCount >= 2
    && sample.annotation.adjudicatedWhenDisputed,
  );
  const coverage = {
    ranges: new Set(realVoice.map((sample) => sample.strata.range)).size >= 3,
    dynamics: new Set(realVoice.map((sample) => sample.strata.dynamics)).size >= 3,
    vibrato: realVoice.some((sample) => sample.strata.technique === "vibrato"),
    noise: realVoice.some((sample) => sample.strata.noise !== "quiet"),
  };

  const checks: PitchBenchmarkCheck[] = [
    { id: "protocol", label: "协议与引擎运行可追溯", passed: input.protocolVersion === PITCH_BENCHMARK_PROTOCOL_VERSION && input.benchmarkId.trim().length > 0 && isCommit(input.run.commitSha) && input.run.engineId.trim().length > 0 && input.run.engineVersion.trim().length > 0 && isSha256(input.run.parametersSha256) && input.run.deviceProfile.trim().length > 0, observed: `${input.protocolVersion} / ${input.run.engineId}@${input.run.engineVersion}`, required: "冻结协议、benchmark ID、commit、引擎/参数摘要与设备档案" },
    { id: "privacy", label: "隐私与原始音频边界", passed: input.governance.rawAudioLocalOnly && !input.governance.containsDirectIdentifiers && input.governance.consentRecordsStoredSeparately, observed: `${input.governance.rawAudioLocalOnly ? "音频仅本机" : "音频边界错误"}；${input.governance.containsDirectIdentifiers ? "含直接身份信息" : "无直接身份信息"}`, required: "音频仅本机、无直接身份信息、授权记录分开保存" },
    { id: "blind-isolation", label: "调参/开发/盲测隔离", passed: uniqueIds.size === ids.length && (["tuning", "development", "acceptance-blind"] as const).every((split) => (splitCounts.get(split) ?? 0) > 0) && input.governance.splitsAssignedBeforeRun && input.run.labelsSealedBeforeRun && input.run.engineFrozenBeforeBlindRun, observed: `调参 ${splitCounts.get("tuning") ?? 0} / 开发 ${splitCounts.get("development") ?? 0} / 盲测 ${splitCounts.get("acceptance-blind") ?? 0}`, required: "ID 唯一、三集合均存在、先分组并封存标签、盲测前冻结引擎" },
    { id: "case-validity", label: "共同输入与结果字段有效", passed: referencesValid, observed: `${input.cases.length} 条`, required: "voiced/reference/result/duration/processing 字段一致且为有限值" },
    { id: "real-voice-governance", label: "人声授权与双人标注", passed: realVoice.length > 0 && realVoiceGoverned, observed: `${realVoice.length} 条 / ${participants.size} 位匿名参与者`, required: "每条人声均有匿名参与者/授权令牌、允许基准、至少两位标注者及争议复核" },
    { id: "p104-synthetic-count", label: "P104 合成/乐器数量", passed: syntheticOrInstrument.length >= 200, observed: `${syntheticOrInstrument.length}`, required: "至少 200 条" },
    { id: "p104-real-voice-count", label: "P104 真实人声数量", passed: realVoice.length >= 100, observed: `${realVoice.length}`, required: "至少 100 条" },
    { id: "p104-participants", label: "P104 参与者数量", passed: participants.size >= 20, observed: `${participants.size}`, required: "至少 20 位" },
    { id: "p104-device-classes", label: "P104 采集设备类别", passed: realVoiceDevices.size >= 4, observed: `${realVoiceDevices.size}`, required: "至少 4 类" },
    { id: "p104-strata", label: "P104 分层覆盖", passed: Object.values(coverage).every(Boolean), observed: `声区 ${coverage.ranges ? "有" : "缺"} / 强弱 ${coverage.dynamics ? "有" : "缺"} / 颤音 ${coverage.vibrato ? "有" : "缺"} / 噪声 ${coverage.noise ? "有" : "缺"}`, required: "低中高、轻中重、颤音和非安静环境均覆盖" },
    { id: "p104-accuracy", label: "P104 盲测真实人声音准门槛", passed: blindRealVoiceMetrics.medianAbsoluteCents !== null && blindRealVoiceMetrics.medianAbsoluteCents <= 35 && blindRealVoiceMetrics.p95AbsoluteCents !== null && blindRealVoiceMetrics.p95AbsoluteCents <= 100 && blindRealVoiceMetrics.octaveErrorRatePercent !== null && blindRealVoiceMetrics.octaveErrorRatePercent <= 2, observed: `中位 ${formatMetric(blindRealVoiceMetrics.medianAbsoluteCents, " cents")} / P95 ${formatMetric(blindRealVoiceMetrics.p95AbsoluteCents, " cents")} / 八度 ${formatMetric(blindRealVoiceMetrics.octaveErrorRatePercent, "%")}`, required: "仅 acceptance-blind 真实人声；中位≤35、P95≤100 cents、八度错误≤2%" },
    { id: "professional-counts", label: "专业扩展数据规模", passed: syntheticOrInstrument.length >= 1_000 && realVoice.length >= 300 && participants.size >= 40 && realVoiceDevices.size >= 6, observed: `合成/乐器 ${syntheticOrInstrument.length} / 人声 ${realVoice.length} / 参与者 ${participants.size} / 设备 ${realVoiceDevices.size}`, required: "1000 / 300 / 40 / 6" },
    { id: "professional-metrics", label: "专业盲测指标", passed: blindVoiceBoundaryMetrics.voicedF1 !== null && blindVoiceBoundaryMetrics.voicedF1 >= 0.95 && blindRealVoiceMetrics.rawPitchAccuracy50Cents !== null && blindRealVoiceMetrics.rawPitchAccuracy50Cents >= 0.97 && blindMetrics.p95RealtimeFactor !== null && blindMetrics.p95RealtimeFactor <= 0.5, observed: `人声+无音高 voiced F1 ${formatMetric(blindVoiceBoundaryMetrics.voicedF1)} / 真实人声 RPA ${formatMetric(blindRealVoiceMetrics.rawPitchAccuracy50Cents)} / 全盲测 RTF P95 ${formatMetric(blindMetrics.p95RealtimeFactor)}`, required: "voiced F1≥0.95、真实人声 RPA±50 cents≥0.97、RTF P95≤0.5" },
  ];

  const passed = (idsToCheck: readonly string[]) => idsToCheck.every((id) => checks.find((check) => check.id === id)?.passed);
  return {
    protocolVersion: PITCH_BENCHMARK_PROTOCOL_VERSION,
    p104Ready: passed(["protocol", "privacy", "blind-isolation", "case-validity", "real-voice-governance", "p104-synthetic-count", "p104-real-voice-count", "p104-participants", "p104-device-classes", "p104-strata", "p104-accuracy"]),
    professionalReady: checks.every((check) => check.passed),
    checks,
    blindMetrics,
    blindRealVoiceMetrics,
    blindVoiceBoundaryMetrics,
    stratifiedMetrics: createStratifiedMetrics(blindCases),
  };
};
