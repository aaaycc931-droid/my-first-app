import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  evaluatePitchBenchmark,
  type PitchBenchmarkInput,
  type PitchBenchmarkMetrics,
} from "../lib/benchmark/pitchBenchmarkProtocol";

const inputPath = resolve(process.cwd(), "local-fixtures/pitch-benchmark/benchmark.local.json");

const metric = (value: number | null) => value === null ? "无数据" : String(Number(value.toFixed(4)));

const printMetrics = (label: string, metrics: PitchBenchmarkMetrics) => {
  console.log(`${label} | 样本 ${metrics.sampleCount} | voiced F1 ${metric(metrics.voicedF1)} | RPA ${metric(metrics.rawPitchAccuracy50Cents)} | RCA ${metric(metrics.rawChromaAccuracy50Cents)} | cents 中位/P95 ${metric(metrics.medianAbsoluteCents)}/${metric(metrics.p95AbsoluteCents)} | 八度错误 ${metric(metrics.octaveErrorRatePercent)}% | RTF P95 ${metric(metrics.p95RealtimeFactor)}`);
};

if (!existsSync(inputPath)) {
  console.error("尚无 P111 本地基准文件。请复制 benchmark.example.json 为 benchmark.local.json，再按真实记录填写。该本地文件已被 Git 忽略。");
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(readFileSync(inputPath, "utf8")) as PitchBenchmarkInput;
    const result = evaluatePitchBenchmark(input);
    for (const check of result.checks) {
      console.log(`${check.passed ? "PASS" : "BLOCKED"} | ${check.label} | 当前：${check.observed} | 要求：${check.required}`);
    }
    printMetrics("盲测总体", result.blindMetrics);
    printMetrics("盲测真实人声", result.blindRealVoiceMetrics);
    printMetrics("盲测人声与无音高边界", result.blindVoiceBoundaryMetrics);
    for (const row of result.stratifiedMetrics) printMetrics(`分层 ${row.dimension}=${row.value}`, row.metrics);
    console.log(result.p104Ready ? "P104 数据与指标门槛满足；仍须人工核对授权、原始标注和盲测封存记录。" : "P104 数据门槛仍有硬阻塞；不得标记完成或宣传专业准确度。");
    console.log(result.professionalReady ? "P111 专业扩展门槛满足；仍不等于正式评分已获教育批准。" : "专业扩展数据或指标尚未全部满足；保持非评分边界。");
    if (!result.p104Ready) process.exitCode = 2;
  } catch (error) {
    console.error("P111 本地基准文件无法解析或字段不完整。");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
