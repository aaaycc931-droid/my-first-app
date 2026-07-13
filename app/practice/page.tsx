"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  defaultMetronomeConfig,
  supportedCountInBars,
  supportedMetronomeMeters,
  supportedMetronomeSubdivisions,
  type CountInBars,
  type MetronomeMeter,
  type MetronomeSubdivision,
} from "../../lib/metronome/metronomeConfig";
import { BrowserMetronomeScheduler } from "../../lib/metronome/metronomeScheduler";
import { AudioOnsetRhythmFeedbackPanel } from "../../components/practice/AudioOnsetRhythmFeedbackPanel";
import { AudioOnsetTimelinePreview } from "../../components/practice/AudioOnsetTimelinePreview";
import {
  createRhythmTargetPattern,
  getRhythmTapFeedback,
  rhythmCloseToleranceMs,
  rhythmMatchWindowMs,
  rhythmTargetPatternLabels,
  rhythmTargetPatternTapGuidance,
  type RhythmPracticePhase,
  type RhythmTargetPattern,
  type RhythmTapEvent,
  type RhythmTargetEvent,
} from "../../lib/rhythm/rhythmTapFeedback";
import {
  createRhythmLatencyCalibrationTargets,
  getRhythmLatencyCalibration,
  type RhythmLatencyCalibrationTap,
} from "../../lib/rhythm/rhythmLatencyCalibration";
import {
  audioOnsetSensitivityPresets,
  detectAudioOnsets,
  type AudioOnsetDetectionResult,
  type AudioOnsetSensitivityPreset,
} from "../../lib/rhythm/audioOnsetDetection";
import {
  getAudioOnsetRhythmFeedback,
  getAudioOnsetRhythmMarkerDensitySummary,
  type AudioOnsetRhythmAlignmentMode,
} from "../../lib/rhythm/audioOnsetRhythmFeedback";
import {
  getBeatsPerBar,
  type MetronomeBeatMetadata,
} from "../../lib/metronome/metronomeGrid";

import { LocalMelodyGuideAudioImportPanel } from "../../components/practice/LocalMelodyGuideAudioImportPanel";
import { LocalEarTrainingIntervalPanel } from "../../components/practice/LocalEarTrainingIntervalPanel";
import { LocalEarTrainingRhythmPanel } from "../../components/practice/LocalEarTrainingRhythmPanel";
import { LocalTargetPitchCurveDraftPanel } from "../../components/practice/LocalTargetPitchCurveDraftPanel";
import { LocalTargetPitchCurveReviewPreviewPanel } from "../../components/practice/LocalTargetPitchCurveReviewPreviewPanel";
import { LocalTargetPitchCurveDraftReviewControlsPanel } from "../../components/practice/LocalTargetPitchCurveDraftReviewControlsPanel";
import { LocalReviewedDraftPracticeTargetPanel } from "../../components/practice/LocalReviewedDraftPracticeTargetPanel";
import {
  PracticeFeatureNavigation,
  type PracticeFeatureView,
} from "../../components/practice/PracticeFeatureNavigation";
import { PracticeFeatureSectionHeader } from "../../components/practice/PracticeFeatureSectionHeader";
import { SheetMusicImportPreviewPanel } from "../../components/practice/SheetMusicImportPreviewPanel";
import { ManualNotationFragmentDraftPanel } from "../../components/practice/ManualNotationFragmentDraftPanel";
import { MockRecognitionDraftPanel } from "../../components/practice/MockRecognitionDraftPanel";
import { NotationDraftValidationPanel } from "../../components/practice/NotationDraftValidationPanel";
import { NotationDraftPracticeTargetPanel } from "../../components/practice/NotationDraftPracticeTargetPanel";
import { NotationTemporaryPracticePanel } from "../../components/practice/NotationTemporaryPracticePanel";
import {
  createNotationFragmentDraft,
  type NotationDraftEvent,
  type NotationFragmentDraft,
} from "../../lib/practice/localNotationFragmentDraft";
import {
  createNotationTemporaryPracticeTarget,
  reconcileNotationTemporaryPracticeTarget,
  type NotationTemporaryPracticeTarget,
  type NotationTemporaryPracticeTargetMode,
} from "../../lib/practice/localNotationDraftPracticeTarget";
import type { NotationDraftValidationResult } from "../../lib/practice/localNotationDraftValidation";
import { getNonScoringImportedTargetPitchFeedback } from "../../lib/practice/nonScoringImportedTargetPitchFeedback";
import {
  getNonScoringNotationTargetPitchFeedback,
  getNotationTargetPitchFrequencyHz,
} from "../../lib/practice/nonScoringNotationTargetPitchFeedback";
import {
  createNotationTemporaryRhythmTapTargets,
  getNotationTemporaryRhythmTotalBeats,
} from "../../lib/practice/notationTemporaryRhythmTap";
import {
  createLocalTargetPitchCurveDraft,
  type LocalTargetPitchCurveDraft,
} from "../../lib/practice/localTargetPitchCurveDraft";
import {
  createDefaultLocalTargetPitchCurveDraftReviewSelection,
  getLocalTargetPitchCurveDraftSelectedDiagnostics,
  type LocalTargetPitchCurveDraftReviewSelection,
} from "../../lib/practice/localTargetPitchCurveDraftReviewControls";
import {
  canCreateLocalReviewedDraftPracticeTarget,
  createLocalReviewedDraftPracticeTarget,
  type LocalReviewedDraftPracticeTarget,
} from "../../lib/practice/localReviewedDraftPracticeTarget";
import { mockMelodyTargetCurveExample } from "../../lib/practice/mock-melody-target-segments.example";
import { researchTargetCurvePreviewExample } from "../../lib/practice/research-target-curve-preview.example";
import {
  parseResearchTargetCurveHandoffJson,
  type ParseResearchTargetCurveHandoffJsonResult,
} from "../../lib/practice/research-target-curve-handoff-json";
import type { ResearchTargetPitchCurveDiagnostic } from "../../lib/research/local-audio-decode/research-target-pitch-curve-diagnostics";
import {
  estimateLocalPitch,
  type PitchEstimateResult,
} from "../../lib/practice/pitchEstimate";
import {
  applyLocalMelodyGuideDecodedMetadata,
  createLocalMelodyGuideFileSummary,
  type LocalMelodyGuideAudioSource,
} from "../../lib/practice/localMelodyGuideAudio";

type PracticeFlowState = "idle" | "listening" | "attempting" | "feedback";

type AudioAnalysisResult = {
  durationSeconds: number;
  peakLevel: number;
  rmsLevel: number;
  simpleLevelHint: string;
};

type NotationPracticePitchFeedbackContext = {
  targetId: string;
  draftFingerprint: string;
  eventId: string;
  eventIndex: number;
  pitch: NonNullable<NotationDraftEvent["pitch"]>;
  targetFrequencyHz: number;
};

type NotationRhythmTapPracticeContext = {
  targetId: string;
  draftFingerprint: string;
  targetEventCount: number;
};

const getNotationPracticePitchFeedbackContextKey = (
  context: NotationPracticePitchFeedbackContext | null,
) =>
  context
    ? `${context.targetId}:${context.draftFingerprint}:${context.eventId}:${context.eventIndex}:${context.pitch}`
    : null;

type PitchComparisonResult = {
  targetNote: string;
  targetFrequencyHz: number;
  estimatedFrequencyHz: number;
  centsFromTarget: number;
  comparisonHint: string;
};

type PitchEstimateErrorFeedback = {
  title: string;
  whatHappened: string;
  suggestions: string[];
};

type PitchConfidenceFeedback = {
  label: string;
  explanation: string;
};

type ResearchTargetCurvePreviewState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "valid"; diagnostic: ResearchTargetPitchCurveDiagnostic };

type LocalMelodyGuideDecodedAudio = {
  channelData: Float32Array;
  sampleRate: number;
  durationSeconds: number;
  channelCount: number;
  analysisReady: boolean;
};

type PracticeAttemptSummary = {
  id: number;
  label: string;
  melodyStepId: string;
  melodyStepIndex: number;
  melodyStepNumber: number;
  targetNote: string;
  nearestNote: string;
  estimatedFrequencyHz: number;
  centsFromTarget: number;
  confidence: number;
  feedbackLabel: string;
};

const mockExercise = {
  title: "模拟旋律：级进热身",
  targetNotes: ["C4", "D4", "E4", "G4", "E4", "D4", "C4"],
  suggestedBpm: 72,
  goal: "保持旋律稳定，并观察以后可能出现音高或节奏反馈的位置。",
};

const mockFeedback = {
  pitch: "模拟音高反馈：大多数目标音标记为接近，G4 作为后续可关注的位置。",
  rhythm: "模拟节奏反馈：占位流程中间几个音标记为略快。",
  learning:
    "模拟 AI 风格学习建议：再听一遍，只唱 C4-D4-E4，然后慢速重试完整乐句。",
};

const practiceSteps = ["听目标音", "录制一次本地练习", "查看模拟反馈", "重试"];
const audioOnsetSensitivityOptions: AudioOnsetSensitivityPreset[] = [
  "balanced",
  "sensitive",
  "conservative",
];

const melodySteps = mockExercise.targetNotes.map((targetNote, index) => ({
  id: `melody-step-${index + 1}`,
  label: `旋律音 ${index + 1}`,
  targetNote,
}));

const noteFrequencies: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
};

const maxPracticeAttemptHistory = 5;
const rhythmPracticeBarCount = 2;
const rhythmLatencyCalibrationBarCount = 2;
const rhythmTargetPatternOptions: RhythmTargetPattern[] = [
  "quarter-note-pulse",
  "eighth-note-pulse",
];
const practiceResearchTargetCurveDiagnosticPreviewKey =
  "practiceResearchTargetCurveDiagnosticPreview";

const formatDiagnosticConfidenceLabel = (
  confidence: ResearchTargetPitchCurveDiagnostic["segments"][number]["diagnosticConfidence"],
) => (confidence === "low" ? "低诊断置信度" : "普通诊断置信度");

const staticPreviewTargetSegments =
  mockMelodyTargetCurveExample.segments.filter(
    (segment) => segment.shouldRenderAsTargetBlock,
  );

const staticPreviewTotalDurationMs = Math.max(
  ...staticPreviewTargetSegments.map((segment) => segment.endTimeMs),
  1,
);

const staticPreviewNoteTopPercent: Record<string, number> = {
  C4: 42,
  D4: 34,
  E4: 27,
  G4: 20,
};

const getImportedPracticeLiteSegmentIdentity = (
  segment: ResearchTargetPitchCurveDiagnostic["segments"][number] | null,
  segmentListIndex: number | null,
) => {
  if (!segment || segmentListIndex === null) {
    return null;
  }

  return [
    segment.segmentIndex,
    segmentListIndex,
    segment.startTimeSeconds,
    segment.endTimeSeconds,
    segment.targetFrequencyHz,
  ].join(":");
};

const getStaticPreviewTargetBlockStyle = (
  segment: (typeof staticPreviewTargetSegments)[number],
) => {
  const usableWidthPercent = 78;
  const leftPercent =
    12 +
    (segment.startTimeMs / staticPreviewTotalDurationMs) * usableWidthPercent;
  const widthPercent = Math.max(
    10,
    ((segment.endTimeMs - segment.startTimeMs) / staticPreviewTotalDurationMs) *
      usableWidthPercent -
      2,
  );
  const topPercent = staticPreviewNoteTopPercent[segment.noteName] ?? 42;

  return {
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    width: `${widthPercent}%`,
  };
};

const calculateCentsFromTarget = (
  estimatedFrequencyHz: number,
  targetFrequencyHz: number,
) => 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

const getPitchConfidenceFeedback = (
  confidence: number,
): PitchConfidenceFeedback => {
  if (confidence >= 0.75) {
    return {
      label: "可用音高帧较多",
      explanation: "在这个实验性本地估计中，大多数已分析帧产生了可用音高数据。",
    };
  }

  if (confidence >= 0.4) {
    return {
      label: "可用音高帧有限",
      explanation:
        "部分已分析帧产生了可用音高数据；结果仍可能受噪声或不稳定音频影响。",
    };
  }

  return {
    label: "可用音高帧较少",
    explanation:
      "只有少量已分析帧产生了可用音高数据；如有需要，请尝试更清晰的持续音。",
  };
};

const getPitchEstimateErrorFeedback = (
  errorMessage: string,
): PitchEstimateErrorFeedback => {
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("too short")) {
    return {
      title: "录音太短，无法完成实验性本地音高估计",
      whatHappened: "录音在获得足够本地音频用于稳定音高估计之前就结束了。",
      suggestions: ["请尝试录制更长的持续音。", "请保持一个音约 1 秒或更久。"],
    };
  }

  if (
    normalizedMessage.includes("no usable pitch frames") ||
    normalizedMessage.includes("louder") ||
    normalizedMessage.includes("steadier")
  ) {
    return {
      title: "未找到可用音高帧",
      whatHappened:
        "本地估计未能找到清晰、稳定的音高。录音可能太轻、有噪声或不稳定。",
      suggestions: [
        "请尝试唱或演奏更响、更稳定的单音。",
        "请靠近麦克风。",
        "请避免背景噪声。",
      ],
    };
  }

  return {
    title: "无法完成本地音高估计",
    whatHappened: errorMessage,
    suggestions: [
      "请重新录制一个清晰的持续音。",
      "音频仅保留在本地；不上传音频，也不调用 AI API。",
    ],
  };
};

const getComparisonHint = (centsFromTarget: number) => {
  const absoluteCents = Math.abs(centsFromTarget);

  if (absoluteCents <= 25) {
    return "接近目标音";
  }

  if (absoluteCents > 75) {
    return "离目标音较远";
  }

  if (centsFromTarget > 25) {
    return "略微偏高";
  }

  return "略微偏低";
};

const calculateTargetNoteSeconds = () => 60 / mockExercise.suggestedBpm;

const stopOscillator = (oscillator: OscillatorNode) => {
  try {
    oscillator.stop();
  } catch {
    // The oscillator may have already ended naturally.
  }
  oscillator.disconnect();
};

export default function PracticePage() {
  const [activeFeatureView, setActiveFeatureView] =
    useState<PracticeFeatureView>("local-melody");
  const sheetMusicImportInputRef = useRef<HTMLInputElement | null>(null);
  const [sheetMusicSourceId, setSheetMusicSourceId] = useState<string | null>(null);
  const [manualNotationImportNotice, setManualNotationImportNotice] = useState<string | null>(null);
  const [manualNotationEventCount, setManualNotationEventCount] = useState(0);
  const [manualNotationDraft, setManualNotationDraft] = useState<NotationFragmentDraft>(() => createNotationFragmentDraft());
  const [manualNotationValidationResult, setManualNotationValidationResult] = useState<NotationDraftValidationResult | null>(null);
  const [notationTemporaryPracticeTarget, setNotationTemporaryPracticeTarget] = useState<NotationTemporaryPracticeTarget | null>(null);
  const [notationTemporaryPracticeTargetMode, setNotationTemporaryPracticeTargetMode] = useState<NotationTemporaryPracticeTargetMode>("sight-singing");
  const [notationPracticePitchFeedbackContext, setNotationPracticePitchFeedbackContext] = useState<NotationPracticePitchFeedbackContext | null>(null);
  const [notationRhythmTapPracticeContext, setNotationRhythmTapPracticeContext] = useState<NotationRhythmTapPracticeContext | null>(null);
  const [flowState, setFlowState] = useState<PracticeFlowState>("idle");
  const [metronomeBpm, setMetronomeBpm] = useState(defaultMetronomeConfig.bpm);
  const [metronomeMeter, setMetronomeMeter] = useState<MetronomeMeter>(
    defaultMetronomeConfig.meter,
  );
  const [metronomeCountInBars, setMetronomeCountInBars] =
    useState<CountInBars>(0);
  const [metronomeSubdivision, setMetronomeSubdivision] =
    useState<MetronomeSubdivision>("quarter");
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [metronomeBeat, setMetronomeBeat] =
    useState<MetronomeBeatMetadata | null>(null);
  const [metronomeError, setMetronomeError] = useState("");
  const [rhythmPhase, setRhythmPhase] = useState<RhythmPracticePhase>("idle");
  const [rhythmTargetPattern, setRhythmTargetPattern] =
    useState<RhythmTargetPattern>("quarter-note-pulse");
  const [rhythmTargets, setRhythmTargets] = useState<RhythmTargetEvent[]>([]);
  const [rhythmTaps, setRhythmTaps] = useState<RhythmTapEvent[]>([]);
  const [rhythmNowMs, setRhythmNowMs] = useState(0);
  const [rhythmError, setRhythmError] = useState("");
  const [latencyCalibrationPhase, setLatencyCalibrationPhase] =
    useState<RhythmPracticePhase>("idle");
  const [latencyCalibrationTargets, setLatencyCalibrationTargets] = useState<
    RhythmTargetEvent[]
  >([]);
  const [latencyCalibrationTaps, setLatencyCalibrationTaps] = useState<
    RhythmLatencyCalibrationTap[]
  >([]);
  const [latencyCalibrationNowMs, setLatencyCalibrationNowMs] = useState(0);
  const [latencyCalibrationError, setLatencyCalibrationError] = useState("");
  const [applyLatencyCalibration, setApplyLatencyCalibration] = useState(false);
  const [playError, setPlayError] = useState("");
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [hasMockFeedback, setHasMockFeedback] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioAnalysisResult, setAudioAnalysisResult] =
    useState<AudioAnalysisResult | null>(null);
  const [audioAnalysisError, setAudioAnalysisError] = useState("");
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [pitchEstimateResult, setPitchEstimateResult] =
    useState<PitchEstimateResult | null>(null);
  const [pitchEstimateImportedSegmentKey, setPitchEstimateImportedSegmentKey] =
    useState<string | null>(null);
  const [pitchEstimateNotationTargetKey, setPitchEstimateNotationTargetKey] =
    useState<string | null>(null);
  const [pitchEstimateError, setPitchEstimateError] = useState("");
  const [isEstimatingPitch, setIsEstimatingPitch] = useState(false);
  const [audioOnsetResult, setAudioOnsetResult] =
    useState<AudioOnsetDetectionResult | null>(null);
  const [audioOnsetError, setAudioOnsetError] = useState("");
  const [audioOnsetSensitivityPreset, setAudioOnsetSensitivityPreset] =
    useState<AudioOnsetSensitivityPreset>("balanced");
  const [isDetectingAudioOnsets, setIsDetectingAudioOnsets] = useState(false);
  const [audioOnsetAlignmentMode, setAudioOnsetAlignmentMode] =
    useState<AudioOnsetRhythmAlignmentMode>("recording-start");
  const [focusedAudioOnsetCandidateIndex, setFocusedAudioOnsetCandidateIndex] =
    useState<number | null>(null);
  const [currentMelodyStepIndex, setCurrentMelodyStepIndex] = useState(0);
  const [isSelectedTargetNotePlaying, setIsSelectedTargetNotePlaying] =
    useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [practiceAttempts, setPracticeAttempts] = useState<
    PracticeAttemptSummary[]
  >([]);
  const [
    importedResearchTargetCurvePreview,
    setImportedResearchTargetCurvePreview,
  ] = useState<ResearchTargetCurvePreviewState>({ status: "idle" });
  const [manualResearchTargetCurveJson, setManualResearchTargetCurveJson] =
    useState("");
  const [
    manualResearchTargetCurvePreview,
    setManualResearchTargetCurvePreview,
  ] = useState<ResearchTargetCurvePreviewState>({ status: "idle" });
  const [importedPracticeLiteActive, setImportedPracticeLiteActive] =
    useState(false);
  const [selectedImportedSegmentIndex, setSelectedImportedSegmentIndex] =
    useState<number | null>(null);
  const [localMelodyGuideSource, setLocalMelodyGuideSource] =
    useState<LocalMelodyGuideAudioSource | null>(null);
  const [localMelodyGuideDecodeError, setLocalMelodyGuideDecodeError] =
    useState("");
  const [localMelodyGuideDecodedAudio, setLocalMelodyGuideDecodedAudio] =
    useState<LocalMelodyGuideDecodedAudio | null>(null);
  const [localTargetPitchCurveDraft, setLocalTargetPitchCurveDraft] =
    useState<LocalTargetPitchCurveDraft | null>(null);
  const [
    localTargetPitchCurveDraftReviewSelection,
    setLocalTargetPitchCurveDraftReviewSelection,
  ] = useState<LocalTargetPitchCurveDraftReviewSelection>(() =>
    createDefaultLocalTargetPitchCurveDraftReviewSelection(),
  );
  const [
    localReviewedDraftPracticeTarget,
    setLocalReviewedDraftPracticeTarget,
  ] = useState<LocalReviewedDraftPracticeTarget | null>(null);
  const metronomeSchedulerRef = useRef<BrowserMetronomeScheduler | null>(null);
  const rhythmSchedulerRef = useRef<BrowserMetronomeScheduler | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerIdRef = useRef<number | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const recordedAudioUrlRef = useRef<string | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackOscillatorsRef = useRef<OscillatorNode[]>([]);
  const playbackTimeoutIdsRef = useRef<number[]>([]);
  const audioAnalysisRunIdRef = useRef(0);
  const pitchEstimateRunIdRef = useRef(0);
  const audioOnsetRunIdRef = useRef(0);
  const practiceAttemptIdRef = useRef(0);
  const recordingAttemptKeyCounterRef = useRef(0);
  const currentRecordingAttemptKeyRef = useRef<number | null>(null);
  const recordedPracticeAttemptKeyRef = useRef<number | null>(null);
  const rhythmTapIdRef = useRef(0);
  const rhythmTimeoutIdsRef = useRef<number[]>([]);
  const rhythmTimerIdRef = useRef<number | null>(null);
  const latencyCalibrationSchedulerRef =
    useRef<BrowserMetronomeScheduler | null>(null);
  const latencyCalibrationTimeoutIdsRef = useRef<number[]>([]);
  const latencyCalibrationTimerIdRef = useRef<number | null>(null);
  const latencyCalibrationTapIdRef = useRef(0);
  const localMelodyGuideInputRef = useRef<HTMLInputElement | null>(null);
  const localMelodyGuideRunIdRef = useRef(0);

  const localTargetPitchCurveDraftSelectedDiagnostics = useMemo(
    () =>
      getLocalTargetPitchCurveDraftSelectedDiagnostics(
        localTargetPitchCurveDraft,
        localTargetPitchCurveDraftReviewSelection,
      ),
    [localTargetPitchCurveDraft, localTargetPitchCurveDraftReviewSelection],
  );

  useEffect(() => {
    setNotationTemporaryPracticeTarget((currentTarget) =>
      reconcileNotationTemporaryPracticeTarget(
        currentTarget,
        manualNotationDraft,
        manualNotationValidationResult,
      ),
    );
  }, [manualNotationDraft, manualNotationValidationResult]);

  useEffect(() => {
    setNotationPracticePitchFeedbackContext((currentContext) => {
      if (!currentContext) return null;

      const currentTarget = notationTemporaryPracticeTarget;
      const currentEvent = currentTarget?.events[currentContext.eventIndex];

      if (
        !currentTarget ||
        currentTarget.status !== "active" ||
        currentTarget.id !== currentContext.targetId ||
        currentTarget.draftFingerprint !== currentContext.draftFingerprint ||
        currentEvent?.id !== currentContext.eventId ||
        currentEvent.pitch !== currentContext.pitch
      ) {
        return null;
      }

      return currentContext;
    });
  }, [notationTemporaryPracticeTarget]);

  useEffect(() => {
    const currentTarget = notationTemporaryPracticeTarget;
    if (
      !notationRhythmTapPracticeContext ||
      (currentTarget &&
        currentTarget.status === "active" &&
        currentTarget.mode === "rhythm" &&
        currentTarget.id === notationRhythmTapPracticeContext.targetId &&
        currentTarget.draftFingerprint === notationRhythmTapPracticeContext.draftFingerprint)
    ) {
      return;
    }

    stopRhythmPracticeRuntime();
    setNotationRhythmTapPracticeContext(null);
    setRhythmPhase("idle");
    setRhythmTargets([]);
    setRhythmTaps([]);
    setRhythmNowMs(0);
  }, [notationTemporaryPracticeTarget, notationRhythmTapPracticeContext]);

  const clearLocalReviewedDraftPracticeTarget = () => {
    setLocalReviewedDraftPracticeTarget(null);
  };

  const resetLocalTargetPitchCurveDraftReviewSelection = () => {
    setLocalTargetPitchCurveDraftReviewSelection(
      createDefaultLocalTargetPitchCurveDraftReviewSelection(),
    );
    clearLocalReviewedDraftPracticeTarget();
  };

  const currentMelodyStep =
    melodySteps[currentMelodyStepIndex] ?? melodySteps[0];
  const selectedTargetNote = currentMelodyStep.targetNote;
  const isFirstMelodyStep = currentMelodyStepIndex === 0;
  const isLastMelodyStep = currentMelodyStepIndex === melodySteps.length - 1;

  const pitchEstimateErrorFeedback = useMemo(
    () =>
      pitchEstimateError
        ? getPitchEstimateErrorFeedback(pitchEstimateError)
        : null,
    [pitchEstimateError],
  );

  const pitchConfidenceFeedback = useMemo(
    () =>
      pitchEstimateResult
        ? getPitchConfidenceFeedback(pitchEstimateResult.confidence)
        : null,
    [pitchEstimateResult],
  );

  const validImportedPreviewSegments =
    importedResearchTargetCurvePreview.status === "valid"
      ? importedResearchTargetCurvePreview.diagnostic.segments
      : [];
  const canEnterImportedPracticeLite = validImportedPreviewSegments.length > 0;
  const selectedImportedSegment =
    selectedImportedSegmentIndex === null
      ? null
      : (validImportedPreviewSegments[selectedImportedSegmentIndex] ?? null);
  const selectedImportedSegmentKey = getImportedPracticeLiteSegmentIdentity(
    selectedImportedSegment,
    selectedImportedSegmentIndex,
  );
  const importedTargetPitchFeedbackMayBeStale =
    Boolean(pitchEstimateResult && selectedImportedSegment) &&
    pitchEstimateImportedSegmentKey !== selectedImportedSegmentKey;
  const notationPracticePitchFeedbackContextKey =
    getNotationPracticePitchFeedbackContextKey(
      notationPracticePitchFeedbackContext,
    );
  const notationTargetPitchFeedbackMayBeStale =
    Boolean(pitchEstimateResult && notationPracticePitchFeedbackContext) &&
    pitchEstimateNotationTargetKey !== notationPracticePitchFeedbackContextKey;
  const notationTargetPitchFeedback =
    notationPracticePitchFeedbackContext &&
    pitchEstimateResult &&
    !notationTargetPitchFeedbackMayBeStale
      ? getNonScoringNotationTargetPitchFeedback({
          targetFrequencyHz:
            notationPracticePitchFeedbackContext.targetFrequencyHz,
          estimatedFrequencyHz: pitchEstimateResult.estimatedFrequencyHz,
          confidence: pitchEstimateResult.confidence,
          validPitchFrames: pitchEstimateResult.validPitchFrames,
        })
      : null;

  const canUseReviewedDraftAsTemporaryPracticeTarget =
    Boolean(localTargetPitchCurveDraft) &&
    canCreateLocalReviewedDraftPracticeTarget(
      localTargetPitchCurveDraftSelectedDiagnostics,
    );
  const reviewedDraftTemporaryTargetDisabledReason = !localTargetPitchCurveDraft
    ? "请先导入本地旋律音频并生成目标音高曲线草稿。"
    : localTargetPitchCurveDraftSelectedDiagnostics.selectedFrameCount <= 0
      ? "当前检查选区没有可用帧，请调整检查模式或手动帧范围。"
      : localTargetPitchCurveDraftSelectedDiagnostics.selectedVoicedFrameCount <= 0
        ? "当前检查选区没有有声音高帧，请选择包含有声内容的范围。"
        : localTargetPitchCurveDraftSelectedDiagnostics.selectedFrequencyMedianHz === null
          ? "当前检查选区还没有可用的中位参考频率诊断。"
          : "当前检查选区可创建临时诊断练习目标。";

  const localReviewedDraftPitchFeedback = localReviewedDraftPracticeTarget
    ? getNonScoringImportedTargetPitchFeedback({
        targetFrequencyHz:
          localReviewedDraftPracticeTarget.referenceFrequencyHz,
        estimatedFrequencyHz: pitchEstimateResult?.estimatedFrequencyHz,
        confidence: pitchEstimateResult?.confidence,
        validPitchFrames: pitchEstimateResult?.validPitchFrames,
      })
    : null;

  useEffect(() => {
    if (
      localReviewedDraftPracticeTarget &&
      !canCreateLocalReviewedDraftPracticeTarget(
        localTargetPitchCurveDraftSelectedDiagnostics,
      )
    ) {
      clearLocalReviewedDraftPracticeTarget();
    }
  }, [
    localReviewedDraftPracticeTarget,
    localTargetPitchCurveDraftSelectedDiagnostics,
  ]);

  const pitchComparisonResult = useMemo<PitchComparisonResult | null>(() => {
    const targetFrequencyHz = noteFrequencies[selectedTargetNote];

    if (!pitchEstimateResult || !targetFrequencyHz) {
      return null;
    }

    const centsFromTarget = calculateCentsFromTarget(
      pitchEstimateResult.estimatedFrequencyHz,
      targetFrequencyHz,
    );

    return {
      targetNote: selectedTargetNote,
      targetFrequencyHz,
      estimatedFrequencyHz: pitchEstimateResult.estimatedFrequencyHz,
      centsFromTarget,
      comparisonHint: getComparisonHint(centsFromTarget),
    };
  }, [pitchEstimateResult, selectedTargetNote]);

  const latencyCalibrationResult = useMemo(
    () =>
      getRhythmLatencyCalibration({
        targets: latencyCalibrationTargets,
        taps: latencyCalibrationTaps,
        status:
          latencyCalibrationPhase === "idle" ? "not-started" : "collecting",
      }),
    [
      latencyCalibrationTargets,
      latencyCalibrationTaps,
      latencyCalibrationPhase,
      latencyCalibrationNowMs,
    ],
  );

  const activeLatencyOffsetMs =
    applyLatencyCalibration && latencyCalibrationResult.offsetMs !== null
      ? latencyCalibrationResult.offsetMs
      : 0;

  const rhythmFeedbackSummary = useMemo(
    () =>
      getRhythmTapFeedback({
        targets: rhythmTargets,
        taps: rhythmTaps,
        phase: rhythmPhase,
        nowMs: rhythmNowMs,
        latencyOffsetMs: activeLatencyOffsetMs,
      }),
    [
      rhythmTargets,
      rhythmTaps,
      rhythmPhase,
      rhythmNowMs,
      activeLatencyOffsetMs,
    ],
  );

  const audioOnsetRhythmFeedback = useMemo(
    () =>
      getAudioOnsetRhythmFeedback({
        onsetResult: audioOnsetResult,
        config: {
          bpm: metronomeBpm,
          meter: metronomeMeter,
          countIn: {
            enabled: false,
            bars: 0,
          },
          subdivision: metronomeSubdivision,
        },
        pattern: rhythmTargetPattern,
        barCount: rhythmPracticeBarCount,
        alignmentMode: audioOnsetAlignmentMode,
        latencyOffsetMs: activeLatencyOffsetMs,
      }),
    [
      audioOnsetResult,
      metronomeBpm,
      metronomeMeter,
      metronomeSubdivision,
      rhythmTargetPattern,
      activeLatencyOffsetMs,
      audioOnsetAlignmentMode,
    ],
  );

  const audioOnsetTimelineDurationMs = Math.max(
    audioOnsetResult?.durationMs ?? 0,
    ...audioOnsetRhythmFeedback.targetMarkers.map(
      (marker) => marker.targetTimeMs,
    ),
    ...audioOnsetRhythmFeedback.timelineMarkers.map(
      (marker) => marker.displayTimeMs,
    ),
    1,
  );

  const audioOnsetMarkerDensitySummary = useMemo(
    () =>
      getAudioOnsetRhythmMarkerDensitySummary({
        candidateCount: audioOnsetResult?.candidates.length ?? 0,
        targetCount: audioOnsetRhythmFeedback.targetMarkers.length,
        feedbackMarkerCount: audioOnsetRhythmFeedback.timelineMarkers.length,
        missedCount: audioOnsetRhythmFeedback.missedCount,
        extraCount: audioOnsetRhythmFeedback.extraCount,
      }),
    [
      audioOnsetResult?.candidates.length,
      audioOnsetRhythmFeedback.targetMarkers.length,
      audioOnsetRhythmFeedback.timelineMarkers.length,
      audioOnsetRhythmFeedback.missedCount,
      audioOnsetRhythmFeedback.extraCount,
    ],
  );

  const importedTargetPitchFeedback = useMemo(
    () =>
      getNonScoringImportedTargetPitchFeedback({
        targetFrequencyHz: selectedImportedSegment?.targetFrequencyHz,
        estimatedFrequencyHz: pitchEstimateResult?.estimatedFrequencyHz,
        confidence: pitchEstimateResult?.confidence,
        validPitchFrames: pitchEstimateResult?.validPitchFrames,
      }),
    [selectedImportedSegment, pitchEstimateResult],
  );

  const revokeRecordedAudioUrl = (url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  const stopRecordingTimer = () => {
    if (recordingTimerIdRef.current !== null) {
      window.clearInterval(recordingTimerIdRef.current);
      recordingTimerIdRef.current = null;
    }
  };

  const stopRhythmPracticeRuntime = () => {
    rhythmSchedulerRef.current?.stop();
    rhythmSchedulerRef.current = null;
    rhythmTimeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    rhythmTimeoutIdsRef.current = [];
    if (rhythmTimerIdRef.current !== null) {
      window.clearInterval(rhythmTimerIdRef.current);
      rhythmTimerIdRef.current = null;
    }
  };

  const stopLatencyCalibrationRuntime = () => {
    latencyCalibrationSchedulerRef.current?.stop();
    latencyCalibrationSchedulerRef.current = null;
    latencyCalibrationTimeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    latencyCalibrationTimeoutIdsRef.current = [];
    if (latencyCalibrationTimerIdRef.current !== null) {
      window.clearInterval(latencyCalibrationTimerIdRef.current);
      latencyCalibrationTimerIdRef.current = null;
    }
  };

  const stopMetronome = () => {
    metronomeSchedulerRef.current?.stop();
    metronomeSchedulerRef.current = null;
    setIsMetronomeRunning(false);
    setMetronomeBeat(null);
  };

  const stopRecordingTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;
  };

  const stopPlayback = () => {
    playbackTimeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    playbackTimeoutIdsRef.current = [];
    playbackOscillatorsRef.current.forEach(stopOscillator);
    playbackOscillatorsRef.current = [];
    void playbackAudioContextRef.current?.close();
    playbackAudioContextRef.current = null;
    setActiveNoteIndex(null);
    setIsSelectedTargetNotePlaying(false);
    setFlowState((currentState) =>
      currentState === "listening" ? "idle" : currentState,
    );
  };

  const invalidateLocalAudioAsyncWork = () => {
    audioAnalysisRunIdRef.current += 1;
    pitchEstimateRunIdRef.current += 1;
    audioOnsetRunIdRef.current += 1;
  };

  useEffect(() => {
    recordedAudioUrlRef.current = recordedAudioUrl;
  }, [recordedAudioUrl]);

  useEffect(() => {
    const storedPreview = window.sessionStorage.getItem(
      practiceResearchTargetCurveDiagnosticPreviewKey,
    );

    if (!storedPreview) {
      return;
    }

    const result = parseResearchTargetCurveHandoffJson(storedPreview);

    if (result.ok) {
      setImportedResearchTargetCurvePreview({
        status: "valid",
        diagnostic: result.diagnostic,
      });
      return;
    }

    setImportedResearchTargetCurvePreview({
      status: "invalid",
      message: "本地导入的诊断数据格式无效，请确认它来自本地音频研究工具。",
    });
  }, []);

  useEffect(() => {
    setImportedPracticeLiteActive(false);
    setSelectedImportedSegmentIndex(null);
  }, [importedResearchTargetCurvePreview]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      shouldDiscardRecordingRef.current = true;
      audioAnalysisRunIdRef.current += 1;
      pitchEstimateRunIdRef.current += 1;
      audioOnsetRunIdRef.current += 1;
      localMelodyGuideRunIdRef.current += 1;
      playbackTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      playbackOscillatorsRef.current.forEach(stopOscillator);
      playbackOscillatorsRef.current = [];
      void playbackAudioContextRef.current?.close();
      playbackAudioContextRef.current = null;
      stopMetronome();
      stopRhythmPracticeRuntime();
      stopRecordingTimer();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopRecordingTracks();
      recordingChunksRef.current = [];
      revokeRecordedAudioUrl(recordedAudioUrlRef.current);
    },
    [],
  );

  const handleLocalMelodyGuideFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    const runId = localMelodyGuideRunIdRef.current + 1;
    localMelodyGuideRunIdRef.current = runId;
    setLocalMelodyGuideDecodeError("");
    setLocalMelodyGuideDecodedAudio(null);
    setLocalTargetPitchCurveDraft(null);
    resetLocalTargetPitchCurveDraftReviewSelection();
    clearLocalReviewedDraftPracticeTarget();

    if (!file) {
      setLocalMelodyGuideSource(null);
      return;
    }

    const selectedSummary = createLocalMelodyGuideFileSummary(file);
    setLocalMelodyGuideSource({ ...selectedSummary, status: "decoding" });

    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioData = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);

      if (isMountedRef.current && runId === localMelodyGuideRunIdRef.current) {
        setLocalMelodyGuideSource(
          applyLocalMelodyGuideDecodedMetadata(selectedSummary, {
            decodedDurationSeconds: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channelCount: audioBuffer.numberOfChannels,
          }),
        );
        setLocalMelodyGuideDecodedAudio({
          channelData: new Float32Array(audioBuffer.getChannelData(0)),
          sampleRate: audioBuffer.sampleRate,
          durationSeconds: audioBuffer.duration,
          channelCount: audioBuffer.numberOfChannels,
          analysisReady: true,
        });
      }
    } catch {
      if (isMountedRef.current && runId === localMelodyGuideRunIdRef.current) {
        setLocalMelodyGuideSource({ ...selectedSummary, status: "error" });
        setLocalMelodyGuideDecodeError(
          "This browser could not decode the selected local melody guide audio. Try another WAV, MP3, or M4A file supported by this browser.",
        );
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }
    }
  };

  const handleClearLocalMelodyGuide = () => {
    localMelodyGuideRunIdRef.current += 1;
    setLocalMelodyGuideSource(null);
    setLocalMelodyGuideDecodeError("");
    setLocalMelodyGuideDecodedAudio(null);
    setLocalTargetPitchCurveDraft(null);
    resetLocalTargetPitchCurveDraftReviewSelection();
    clearLocalReviewedDraftPracticeTarget();
    if (localMelodyGuideInputRef.current) {
      localMelodyGuideInputRef.current.value = "";
    }
  };

  const handleGenerateLocalTargetPitchCurveDraft = () => {
    if (!localMelodyGuideDecodedAudio?.analysisReady) {
      setLocalTargetPitchCurveDraft(null);
      resetLocalTargetPitchCurveDraftReviewSelection();
      clearLocalReviewedDraftPracticeTarget();
      return;
    }

    resetLocalTargetPitchCurveDraftReviewSelection();
    clearLocalReviewedDraftPracticeTarget();
    setLocalTargetPitchCurveDraft(
      createLocalTargetPitchCurveDraft(
        localMelodyGuideDecodedAudio.channelData,
        localMelodyGuideDecodedAudio.sampleRate,
      ),
    );
  };

  const handleUseSelectedReviewRangeAsTemporaryPracticeTarget = () => {
    const target = createLocalReviewedDraftPracticeTarget(
      localTargetPitchCurveDraftSelectedDiagnostics,
    );
    setLocalReviewedDraftPracticeTarget(target);
  };

  const handleResetRhythmPractice = () => {
    stopRhythmPracticeRuntime();
    setRhythmPhase("idle");
    setRhythmTargets([]);
    setRhythmTaps([]);
    setRhythmNowMs(0);
    setRhythmError("");
  };

  const handleStopRhythmPractice = () => {
    stopRhythmPracticeRuntime();
    setRhythmPhase("stopped");
    setRhythmNowMs(performance.now());
  };

  const handleStartRhythmPractice = async () => {
    setNotationRhythmTapPracticeContext(null);
    handleResetRhythmPractice();

    const beatsPerBar = getBeatsPerBar(metronomeMeter);
    const beatDurationMs = (60 / metronomeBpm) * 1000;
    const countInBeatCount = metronomeCountInBars * beatsPerBar;
    const startDelayMs = 80;
    const nowMs = performance.now();
    const practiceStartTimeMs =
      nowMs + startDelayMs + countInBeatCount * beatDurationMs;
    const targets = createRhythmTargetPattern({
      config: {
        bpm: metronomeBpm,
        meter: metronomeMeter,
        countIn: {
          enabled: metronomeCountInBars > 0,
          bars: metronomeCountInBars,
        },
        subdivision: metronomeSubdivision,
      },
      practiceStartTimeMs,
      barCount: rhythmPracticeBarCount,
      pattern: rhythmTargetPattern,
    });
    const practiceDurationMs =
      rhythmPracticeBarCount * beatsPerBar * beatDurationMs +
      rhythmMatchWindowMs +
      120;

    setRhythmTargets(targets);
    setRhythmTaps([]);
    setRhythmNowMs(nowMs);
    setRhythmPhase(countInBeatCount > 0 ? "count-in" : "practice");
    setRhythmError("");

    rhythmTimerIdRef.current = window.setInterval(() => {
      setRhythmNowMs(performance.now());
    }, 60);

    if (countInBeatCount > 0) {
      rhythmTimeoutIdsRef.current.push(
        window.setTimeout(
          () => {
            setRhythmPhase("practice");
          },
          Math.max(0, practiceStartTimeMs - performance.now()),
        ),
      );
    }

    rhythmTimeoutIdsRef.current.push(
      window.setTimeout(
        () => {
          stopRhythmPracticeRuntime();
          setRhythmPhase("stopped");
          setRhythmNowMs(performance.now());
        },
        Math.max(0, practiceStartTimeMs - nowMs + practiceDurationMs),
      ),
    );

    const scheduler = new BrowserMetronomeScheduler({
      config: {
        bpm: metronomeBpm,
        meter: metronomeMeter,
        countIn: {
          enabled: metronomeCountInBars > 0,
          bars: metronomeCountInBars,
        },
        subdivision: metronomeSubdivision,
      },
    });
    rhythmSchedulerRef.current = scheduler;

    try {
      await scheduler.start();
    } catch {
      stopRhythmPracticeRuntime();
      setRhythmPhase("idle");
      setRhythmError(
        "此浏览器无法启动节奏练习节拍器；请确认在用户手势中点击开始。",
      );
    }
  };

  const handleStartNotationRhythmPractice = async (
    target: NotationTemporaryPracticeTarget | null,
  ) => {
    if (!target || target.status !== "active" || target.mode !== "rhythm") {
      return;
    }

    handleResetRhythmPractice();

    const targetEventCount = target.events.filter((event) => event.type === "note").length;
    if (targetEventCount === 0) {
      setNotationRhythmTapPracticeContext(null);
      setRhythmError("当前临时节奏目标没有需要拍击的音符事件。");
      return;
    }

    const meter = target.timeSignature as MetronomeMeter;
    const beatsPerBar = getBeatsPerBar(meter);
    const beatDurationMs = (60 / metronomeBpm) * 1000;
    const countInBeatCount = metronomeCountInBars * beatsPerBar;
    const nowMs = performance.now();
    const practiceStartTimeMs = nowMs + 80 + countInBeatCount * beatDurationMs;
    const config = {
      bpm: metronomeBpm,
      meter,
      countIn: { enabled: metronomeCountInBars > 0, bars: metronomeCountInBars },
      subdivision: metronomeSubdivision,
    } as const;
    const targets = createNotationTemporaryRhythmTapTargets({
      draft: target,
      config,
      practiceStartTimeMs,
    });
    const practiceDurationMs =
      getNotationTemporaryRhythmTotalBeats(target.events) * beatDurationMs +
      rhythmMatchWindowMs +
      120;

    setMetronomeMeter(meter);
    setNotationRhythmTapPracticeContext({
      targetId: target.id,
      draftFingerprint: target.draftFingerprint,
      targetEventCount,
    });
    setRhythmTargets(targets);
    setRhythmTaps([]);
    setRhythmNowMs(nowMs);
    setRhythmPhase(countInBeatCount > 0 ? "count-in" : "practice");
    setRhythmError("");

    rhythmTimerIdRef.current = window.setInterval(() => {
      setRhythmNowMs(performance.now());
    }, 60);

    if (countInBeatCount > 0) {
      rhythmTimeoutIdsRef.current.push(
        window.setTimeout(() => setRhythmPhase("practice"), Math.max(0, practiceStartTimeMs - performance.now())),
      );
    }

    rhythmTimeoutIdsRef.current.push(
      window.setTimeout(() => {
        stopRhythmPracticeRuntime();
        setRhythmPhase("stopped");
        setRhythmNowMs(performance.now());
      }, Math.max(0, practiceStartTimeMs - nowMs + practiceDurationMs)),
    );

    const scheduler = new BrowserMetronomeScheduler({ config });
    rhythmSchedulerRef.current = scheduler;

    try {
      await scheduler.start();
    } catch {
      stopRhythmPracticeRuntime();
      setRhythmPhase("idle");
      setRhythmError("此浏览器无法启动临时节奏目标的节拍器；请确认在用户手势中点击开始。");
    }
  };

  const handleRhythmTap = () => {
    const timestampMs = performance.now();
    if (rhythmPhase !== "practice") {
      return;
    }
    const nextTapId = rhythmTapIdRef.current + 1;
    rhythmTapIdRef.current = nextTapId;
    setRhythmTaps((currentTaps) => [
      ...currentTaps,
      { id: nextTapId, timestampMs, phase: "practice" },
    ]);
    setRhythmNowMs(timestampMs);
  };

  const handleResetLatencyCalibration = () => {
    stopLatencyCalibrationRuntime();
    setLatencyCalibrationPhase("idle");
    setLatencyCalibrationTargets([]);
    setLatencyCalibrationTaps([]);
    setLatencyCalibrationNowMs(0);
    setLatencyCalibrationError("");
    setApplyLatencyCalibration(false);
  };

  const handleStopLatencyCalibration = () => {
    stopLatencyCalibrationRuntime();
    setLatencyCalibrationPhase("stopped");
    setLatencyCalibrationNowMs(performance.now());
  };

  const handleStartLatencyCalibration = async () => {
    handleResetLatencyCalibration();

    const beatsPerBar = getBeatsPerBar(metronomeMeter);
    const beatDurationMs = (60 / metronomeBpm) * 1000;
    const countInBeatCount = metronomeCountInBars * beatsPerBar;
    const startDelayMs = 80;
    const nowMs = performance.now();
    const calibrationStartTimeMs =
      nowMs + startDelayMs + countInBeatCount * beatDurationMs;
    const targets = createRhythmLatencyCalibrationTargets({
      config: {
        bpm: metronomeBpm,
        meter: metronomeMeter,
        countIn: {
          enabled: metronomeCountInBars > 0,
          bars: metronomeCountInBars,
        },
        subdivision: metronomeSubdivision,
      },
      calibrationStartTimeMs,
      barCount: rhythmLatencyCalibrationBarCount,
    });
    const calibrationDurationMs =
      rhythmLatencyCalibrationBarCount * beatsPerBar * beatDurationMs +
      rhythmMatchWindowMs +
      120;

    setLatencyCalibrationTargets(targets);
    setLatencyCalibrationTaps([]);
    setLatencyCalibrationNowMs(nowMs);
    setLatencyCalibrationPhase(countInBeatCount > 0 ? "count-in" : "practice");
    setLatencyCalibrationError("");

    latencyCalibrationTimerIdRef.current = window.setInterval(() => {
      setLatencyCalibrationNowMs(performance.now());
    }, 60);

    if (countInBeatCount > 0) {
      latencyCalibrationTimeoutIdsRef.current.push(
        window.setTimeout(
          () => setLatencyCalibrationPhase("practice"),
          Math.max(0, calibrationStartTimeMs - performance.now()),
        ),
      );
    }

    latencyCalibrationTimeoutIdsRef.current.push(
      window.setTimeout(
        () => {
          stopLatencyCalibrationRuntime();
          setLatencyCalibrationPhase("stopped");
          setLatencyCalibrationNowMs(performance.now());
        },
        Math.max(0, calibrationStartTimeMs - nowMs + calibrationDurationMs),
      ),
    );

    const scheduler = new BrowserMetronomeScheduler({
      config: {
        bpm: metronomeBpm,
        meter: metronomeMeter,
        countIn: {
          enabled: metronomeCountInBars > 0,
          bars: metronomeCountInBars,
        },
        subdivision: metronomeSubdivision,
      },
    });
    latencyCalibrationSchedulerRef.current = scheduler;

    try {
      await scheduler.start();
    } catch {
      stopLatencyCalibrationRuntime();
      setLatencyCalibrationPhase("idle");
      setLatencyCalibrationError(
        "此浏览器无法启动校准点击；请确认在用户手势中点击开始。",
      );
    }
  };

  const handleLatencyCalibrationTap = () => {
    const timestampMs = performance.now();
    if (latencyCalibrationPhase !== "practice") return;
    const nextTapId = latencyCalibrationTapIdRef.current + 1;
    latencyCalibrationTapIdRef.current = nextTapId;
    setLatencyCalibrationTaps((currentTaps) => [
      ...currentTaps,
      { id: nextTapId, timestampMs },
    ]);
    setLatencyCalibrationNowMs(timestampMs);
  };

  const handleStartMetronome = async () => {
    stopMetronome();
    setMetronomeError("");

    const scheduler = new BrowserMetronomeScheduler({
      config: {
        bpm: metronomeBpm,
        meter: metronomeMeter,
        countIn: {
          enabled: metronomeCountInBars > 0,
          bars: metronomeCountInBars,
        },
        subdivision: metronomeSubdivision,
      },
      onBeat: (beat) => {
        if (isMountedRef.current) {
          setMetronomeBeat(beat);
        }
      },
    });

    metronomeSchedulerRef.current = scheduler;

    try {
      await scheduler.start();
      setIsMetronomeRunning(true);
    } catch {
      metronomeSchedulerRef.current = null;
      setIsMetronomeRunning(false);
      setMetronomeError(
        "此浏览器无法启动 Web Audio 节拍器；请确认在用户手势中点击开始。",
      );
    }
  };

  const handleStopMetronome = () => {
    stopMetronome();
  };

  const handleListenToTarget = async () => {
    stopPlayback();
    setFlowState("listening");
    setPlayError("");

    try {
      const audioContext = new AudioContext();
      playbackAudioContextRef.current = audioContext;
      const startTime = audioContext.currentTime + 0.05;
      const noteSeconds = calculateTargetNoteSeconds();

      mockExercise.targetNotes.forEach((note, index) => {
        const noteOffset = index * noteSeconds;
        const noteStartTime = startTime + noteOffset;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value =
          noteFrequencies[note] ?? noteFrequencies.C4;
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.18, noteStartTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          noteStartTime + noteSeconds * 0.9,
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStartTime);
        oscillator.stop(noteStartTime + noteSeconds * 0.95);
        playbackOscillatorsRef.current.push(oscillator);

        const noteTimeoutId = window.setTimeout(() => {
          setActiveNoteIndex(index);
        }, noteOffset * 1000);
        playbackTimeoutIdsRef.current.push(noteTimeoutId);
      });

      const totalSeconds = mockExercise.targetNotes.length * noteSeconds;
      const completionTimeoutId = window.setTimeout(
        () => {
          playbackOscillatorsRef.current = [];
          void audioContext.close();
          if (playbackAudioContextRef.current === audioContext) {
            playbackAudioContextRef.current = null;
          }
          playbackTimeoutIdsRef.current = [];
          setActiveNoteIndex(null);
          setFlowState("idle");
        },
        totalSeconds * 1000 + 500,
      );
      playbackTimeoutIdsRef.current.push(completionTimeoutId);
    } catch {
      setPlayError("目标音播放失败。此原型仍只使用模拟反馈，不提供正式评分。");
      stopPlayback();
    }
  };

  const handlePlaySelectedTargetNote = async () => {
    stopPlayback();
    setPlayError("");

    const targetFrequency = noteFrequencies[selectedTargetNote];

    if (!targetFrequency) {
      setPlayError(`目标音 ${selectedTargetNote} 暂时无法播放。`);
      return;
    }

    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime + 0.05;
      const noteSeconds = 1;

      playbackAudioContextRef.current = audioContext;
      playbackOscillatorsRef.current = [oscillator];
      setIsSelectedTargetNotePlaying(true);

      oscillator.type = "sine";
      oscillator.frequency.value = targetFrequency;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + noteSeconds * 0.9,
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + noteSeconds);

      const completionTimeoutId = window.setTimeout(
        () => {
          playbackOscillatorsRef.current =
            playbackOscillatorsRef.current.filter(
              (currentOscillator) => currentOscillator !== oscillator,
            );
          void audioContext.close();
          if (playbackAudioContextRef.current === audioContext) {
            playbackAudioContextRef.current = null;
          }
          playbackTimeoutIdsRef.current = playbackTimeoutIdsRef.current.filter(
            (timeoutId) => timeoutId !== completionTimeoutId,
          );
          setIsSelectedTargetNotePlaying(false);
        },
        noteSeconds * 1000 + 200,
      );

      playbackTimeoutIdsRef.current.push(completionTimeoutId);
    } catch {
      setPlayError("此浏览器无法播放所选目标音。");
      stopPlayback();
    }
  };

  const handleStartMockAttempt = () => {
    stopPlayback();
    setHasMockFeedback(false);
    setFlowState("attempting");
  };

  const handleStartLocalRecording = async () => {
    stopPlayback();
    invalidateLocalAudioAsyncWork();
    setHasMockFeedback(false);
    setRecordingError("");
    setAudioAnalysisError("");
    setAudioAnalysisResult(null);
    setIsAnalyzingAudio(false);
    setPitchEstimateResult(null);
    setPitchEstimateImportedSegmentKey(null);
    setPitchEstimateNotationTargetKey(null);
    setPitchEstimateError("");
    setIsEstimatingPitch(false);
    setAudioOnsetResult(null);
    setAudioOnsetError("");
    setIsDetectingAudioOnsets(false);
    setRecordingSeconds(0);
    revokeRecordedAudioUrl(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    currentRecordingAttemptKeyRef.current = null;
    recordedPracticeAttemptKeyRef.current = null;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingError("此浏览器不支持本地录音。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }

      const recorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const shouldDiscardRecording = shouldDiscardRecordingRef.current;

        stopRecordingTimer();
        stopRecordingTracks();
        mediaRecorderRef.current = null;

        if (shouldDiscardRecording || !isMountedRef.current) {
          recordingChunksRef.current = [];
          if (isMountedRef.current) {
            setIsRecording(false);
          }
          return;
        }

        if (recordingChunksRef.current.length > 0) {
          const audioBlob = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const nextRecordingAttemptKey =
            recordingAttemptKeyCounterRef.current + 1;
          recordingAttemptKeyCounterRef.current = nextRecordingAttemptKey;
          currentRecordingAttemptKeyRef.current = nextRecordingAttemptKey;
          recordedPracticeAttemptKeyRef.current = null;
          setRecordedAudioBlob(audioBlob);
          setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        }

        recordingChunksRef.current = [];
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setFlowState("attempting");
      recordingTimerIdRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch {
      stopRecordingTimer();
      stopRecordingTracks();
      if (isMountedRef.current) {
        setIsRecording(false);
        setRecordingError("需要麦克风权限才能录制本地练习。");
      }
    }
  };

  const handleStopLocalRecording = () => {
    shouldDiscardRecordingRef.current = false;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      stopRecordingTimer();
      stopRecordingTracks();
      setIsRecording(false);
    }
  };

  const handleAnalyzeLocalRecording = async () => {
    if (!recordedAudioBlob) {
      setAudioAnalysisError("请先录制一次本地练习，再运行本地音频分析。");
      return;
    }

    setAudioAnalysisError("");
    setAudioAnalysisResult(null);
    setIsAnalyzingAudio(true);

    const audioAnalysisRunId = audioAnalysisRunIdRef.current + 1;
    audioAnalysisRunIdRef.current = audioAnalysisRunId;

    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioData = await recordedAudioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      let peakLevel = 0;
      let squaredSampleSum = 0;
      let sampleCount = 0;

      for (
        let channelIndex = 0;
        channelIndex < audioBuffer.numberOfChannels;
        channelIndex += 1
      ) {
        const channelData = audioBuffer.getChannelData(channelIndex);

        for (
          let sampleIndex = 0;
          sampleIndex < channelData.length;
          sampleIndex += 1
        ) {
          const sampleLevel = Math.abs(channelData[sampleIndex]);
          peakLevel = Math.max(peakLevel, sampleLevel);
          squaredSampleSum += channelData[sampleIndex] ** 2;
          sampleCount += 1;
        }
      }

      const rmsLevel =
        sampleCount > 0 ? Math.sqrt(squaredSampleSum / sampleCount) : 0;
      let simpleLevelHint = "录音电平看起来可用";

      if (peakLevel >= 0.98) {
        simpleLevelHint = "录音可能削波";
      } else if (peakLevel < 0.08 || rmsLevel < 0.015) {
        simpleLevelHint = "录音可能太轻";
      }

      if (
        !isMountedRef.current ||
        audioAnalysisRunId !== audioAnalysisRunIdRef.current
      ) {
        return;
      }

      setAudioAnalysisResult({
        durationSeconds: audioBuffer.duration,
        peakLevel,
        rmsLevel,
        simpleLevelHint,
      });
    } catch {
      if (
        isMountedRef.current &&
        audioAnalysisRunId === audioAnalysisRunIdRef.current
      ) {
        setAudioAnalysisError("此浏览器无法完成本地音频分析。");
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }

      if (
        isMountedRef.current &&
        audioAnalysisRunId === audioAnalysisRunIdRef.current
      ) {
        setIsAnalyzingAudio(false);
      }
    }
  };

  const handleEstimatePitchLocally = async () => {
    if (!recordedAudioBlob) {
      setPitchEstimateError("请先录制一次本地练习，再进行本地音高估计。");
      return;
    }

    const recordingAttemptKey = currentRecordingAttemptKeyRef.current;
    const attemptedMelodyStepIndex = currentMelodyStepIndex;
    const attemptedMelodyStep =
      melodySteps[attemptedMelodyStepIndex] ?? melodySteps[0];
    const attemptedImportedSegmentKey = selectedImportedSegmentKey;
    const attemptedNotationTargetKey = notationPracticePitchFeedbackContextKey;

    setPitchEstimateError("");
    setPitchEstimateResult(null);
    setPitchEstimateImportedSegmentKey(null);
    setPitchEstimateNotationTargetKey(null);
    setIsEstimatingPitch(true);

    const pitchEstimateRunId = pitchEstimateRunIdRef.current + 1;
    pitchEstimateRunIdRef.current = pitchEstimateRunId;
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioData = await recordedAudioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const result = estimateLocalPitch(audioBuffer);

      if (
        isMountedRef.current &&
        pitchEstimateRunId === pitchEstimateRunIdRef.current &&
        recordingAttemptKey === currentRecordingAttemptKeyRef.current
      ) {
        const targetNote = attemptedMelodyStep.targetNote;
        const targetFrequencyHz = noteFrequencies[targetNote];

        setPitchEstimateResult(result);
        setPitchEstimateImportedSegmentKey(attemptedImportedSegmentKey);
        setPitchEstimateNotationTargetKey(attemptedNotationTargetKey);

        if (
          targetFrequencyHz &&
          recordedPracticeAttemptKeyRef.current !== recordingAttemptKey
        ) {
          const centsFromTarget = calculateCentsFromTarget(
            result.estimatedFrequencyHz,
            targetFrequencyHz,
          );
          const nextAttemptId = practiceAttemptIdRef.current + 1;
          practiceAttemptIdRef.current = nextAttemptId;
          recordedPracticeAttemptKeyRef.current = recordingAttemptKey;

          setPracticeAttempts((currentAttempts) =>
            [
              {
                id: nextAttemptId,
                label: `Attempt ${nextAttemptId}`,
                melodyStepId: attemptedMelodyStep.id,
                melodyStepIndex: attemptedMelodyStepIndex,
                melodyStepNumber: attemptedMelodyStepIndex + 1,
                targetNote,
                nearestNote: result.nearestNote,
                estimatedFrequencyHz: result.estimatedFrequencyHz,
                centsFromTarget,
                confidence: result.confidence,
                feedbackLabel: getComparisonHint(centsFromTarget).toLowerCase(),
              },
              ...currentAttempts,
            ].slice(0, maxPracticeAttemptHistory),
          );
        }
      }
    } catch (error) {
      if (
        isMountedRef.current &&
        pitchEstimateRunId === pitchEstimateRunIdRef.current
      ) {
        setPitchEstimateError(
          error instanceof Error
            ? error.message
            : "此浏览器无法完成本地音高估计。",
        );
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }

      if (
        isMountedRef.current &&
        pitchEstimateRunId === pitchEstimateRunIdRef.current
      ) {
        setIsEstimatingPitch(false);
      }
    }
  };

  const handleDetectAudioOnsets = async () => {
    if (!recordedAudioBlob) {
      setAudioOnsetError(
        "请先录制一次本地练习，再运行浏览器本地起音检测。",
      );
      return;
    }

    setAudioOnsetError("");
    setAudioOnsetResult(null);
    setIsDetectingAudioOnsets(true);

    const audioOnsetRunId = audioOnsetRunIdRef.current + 1;
    audioOnsetRunIdRef.current = audioOnsetRunId;
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioData = await recordedAudioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);
      const result = detectAudioOnsets(channelData, audioBuffer.sampleRate, {
        sensitivityPreset: audioOnsetSensitivityPreset,
      });

      if (
        isMountedRef.current &&
        audioOnsetRunId === audioOnsetRunIdRef.current
      ) {
        setAudioOnsetResult(result);
      }
    } catch {
      if (
        isMountedRef.current &&
        audioOnsetRunId === audioOnsetRunIdRef.current
      ) {
        setAudioOnsetError(
          "此浏览器无法完成本地起音检测。音频不会上传，也不会调用 AI。",
        );
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }

      if (
        isMountedRef.current &&
        audioOnsetRunId === audioOnsetRunIdRef.current
      ) {
        setIsDetectingAudioOnsets(false);
      }
    }
  };

  const handlePlayRecordedAttempt = () => {
    if (!recordedAudioUrl) {
      return;
    }

    const audio = new Audio(recordedAudioUrl);
    void audio.play().catch(() => {
      setRecordingError("此浏览器无法播放已录制的练习。");
    });
  };

  const moveMelodyStep = (direction: -1 | 1) => {
    setCurrentMelodyStepIndex((currentIndex) =>
      Math.min(Math.max(currentIndex + direction, 0), melodySteps.length - 1),
    );
  };

  const handlePreviousMelodyStep = () => {
    moveMelodyStep(-1);
  };

  const handleNextMelodyStep = () => {
    moveMelodyStep(1);
  };

  const handleRestartMelody = () => {
    setCurrentMelodyStepIndex(0);
  };

  const handlePreviewManualResearchTargetCurveJson = () => {
    const result: ParseResearchTargetCurveHandoffJsonResult =
      parseResearchTargetCurveHandoffJson(manualResearchTargetCurveJson);

    if (result.ok) {
      setManualResearchTargetCurvePreview({
        status: "valid",
        diagnostic: result.diagnostic,
      });
      return;
    }

    setManualResearchTargetCurvePreview({
      status: "invalid",
      message: "粘贴的诊断数据格式无效，请确认它来自本地音频研究工具。",
    });
  };

  const handleStartImportedPracticeLite = () => {
    if (!canEnterImportedPracticeLite) {
      return;
    }

    setSelectedImportedSegmentIndex(0);
    setImportedPracticeLiteActive(true);
  };

  const handleExitImportedPracticeLite = () => {
    setImportedPracticeLiteActive(false);
  };

  const handleClearImportedResearchTargetCurvePreview = () => {
    window.sessionStorage.removeItem(
      practiceResearchTargetCurveDiagnosticPreviewKey,
    );
    setImportedPracticeLiteActive(false);
    setSelectedImportedSegmentIndex(null);
    setImportedResearchTargetCurvePreview({ status: "idle" });
  };

  const handlePracticeAttemptTargetAgain = (melodyStepIndex: number) => {
    if (melodyStepIndex >= 0 && melodyStepIndex < melodySteps.length) {
      setCurrentMelodyStepIndex(melodyStepIndex);
    }
  };

  const handleClearPracticeAttempts = () => {
    setPracticeAttempts([]);
    recordedPracticeAttemptKeyRef.current = null;
  };

  const handleClearRecording = () => {
    shouldDiscardRecordingRef.current = true;
    invalidateLocalAudioAsyncWork();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      stopRecordingTimer();
      stopRecordingTracks();
      setIsRecording(false);
    }

    revokeRecordedAudioUrl(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    currentRecordingAttemptKeyRef.current = null;
    recordedPracticeAttemptKeyRef.current = null;
    setRecordingError("");
    setAudioAnalysisError("");
    setAudioAnalysisResult(null);
    setIsAnalyzingAudio(false);
    setPitchEstimateResult(null);
    setPitchEstimateImportedSegmentKey(null);
    setPitchEstimateError("");
    setIsEstimatingPitch(false);
    setAudioOnsetResult(null);
    setAudioOnsetError("");
    setIsDetectingAudioOnsets(false);
    setRecordingSeconds(0);
    recordingChunksRef.current = [];
  };

  const handleShowMockFeedback = () => {
    stopPlayback();
    setHasMockFeedback(true);
    setFlowState("feedback");
  };

  const handleRetry = () => {
    stopPlayback();
    setHasMockFeedback(false);
    setPlayError("");
    setFlowState("idle");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }
      event.preventDefault();
      if (latencyCalibrationPhase === "practice") {
        handleLatencyCalibrationTap();
        return;
      }
      handleRhythmTap();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rhythmPhase, latencyCalibrationPhase]);

  const isListening = flowState === "listening";
  const isAnyTargetPlaybackActive = isListening || isSelectedTargetNotePlaying;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-emerald-600">
            浏览器本地练习模式
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            练习模式
          </h1>
          <p className="mt-3 text-slate-600">
            这是一个本地旋律逐步练习原型。你可以听一个目标音、录制一次浏览器本地练习，并把本地音高估计与当前步骤目标音进行对比。
          </p>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            当前状态：浏览器本地练习模式，不上传音频，不持久保存，不调用 AI
            API，不提供正式评分，不提供等级 / 通过 /
            失败判断，也不进行节奏评测或视唱综合评测。
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              模拟旋律练习
            </p>
            <h2 className="mt-2 text-2xl font-bold">{mockExercise.title}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">目标音列表</dt>
                <dd className="mt-1 text-slate-600">
                  {mockExercise.targetNotes.join(" · ")}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <dt className="font-semibold text-slate-700">建议 BPM</dt>
                <dd className="mt-1 text-slate-600">
                  {mockExercise.suggestedBpm} BPM
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:col-span-2">
                <dt className="font-semibold text-slate-700">练习目标</dt>
                <dd className="mt-1 text-slate-600">{mockExercise.goal}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">练习步骤</h2>
            <ol className="mt-4 space-y-3">
              {practiceSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <PracticeFeatureNavigation
          activeView={activeFeatureView}
          onActiveViewChange={setActiveFeatureView}
        />

        {activeFeatureView === "sheet-music" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：乐谱预览"
              title="乐谱到练习目标输入系统 Stage A / Stage B / Stage C / Stage D / Stage E"
              description="这里提供本地乐谱图片预览、草稿检查、小节时值校验和经确认生成的临时乐谱练习目标；当前不做真实识谱、正式转写或评分。"
            />
            <SheetMusicImportPreviewPanel
              inputRef={sheetMusicImportInputRef}
              onSourceChange={setSheetMusicSourceId}
            />
            <MockRecognitionDraftPanel
              currentSheetMusicSourceId={sheetMusicSourceId}
              manualDraftEventCount={manualNotationEventCount}
              onCopyToManualDraft={(draft, notice) => {
                setManualNotationDraft(draft);
                setManualNotationImportNotice(notice);
              }}
            />
            <ManualNotationFragmentDraftPanel
              currentSheetMusicSourceId={sheetMusicSourceId}
              draft={manualNotationDraft}
              importNotice={manualNotationImportNotice}
              onDraftEventCountChange={setManualNotationEventCount}
              onDraftChange={setManualNotationDraft}
            />
            <NotationDraftValidationPanel
              draft={manualNotationDraft}
              result={manualNotationValidationResult}
              onResultChange={setManualNotationValidationResult}
            />
            <NotationDraftPracticeTargetPanel
              draft={manualNotationDraft}
              validation={manualNotationValidationResult}
              target={notationTemporaryPracticeTarget}
              mode={notationTemporaryPracticeTargetMode}
              onModeChange={setNotationTemporaryPracticeTargetMode}
              onConfirmCreate={() => {
                const target = createNotationTemporaryPracticeTarget(
                  manualNotationDraft,
                  manualNotationValidationResult,
                  notationTemporaryPracticeTargetMode,
                );
                if (target) {
                  setNotationTemporaryPracticeTarget(target);
                  setNotationPracticePitchFeedbackContext(null);
                  setNotationRhythmTapPracticeContext(null);
                  handleResetRhythmPractice();
                }
              }}
              onClear={() => {
                setNotationTemporaryPracticeTarget(null);
                setNotationPracticePitchFeedbackContext(null);
                setNotationRhythmTapPracticeContext(null);
                handleResetRhythmPractice();
              }}
              onEnterPractice={() => setActiveFeatureView("notation-practice")}
            />
          </>
        ) : null}

        {activeFeatureView === "notation-practice" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：临时乐谱练习"
              title="当前会话内的非评分乐谱练习"
              description="此处使用经确认创建的临时乐谱目标按事件顺序练习；视唱音符可主动进入本地非评分音高跟练，节奏目标可主动进入本地拍击练习，不会替换本地旋律流程或保存数据。"
            />
            <NotationTemporaryPracticePanel
              target={notationTemporaryPracticeTarget}
              onGoToSheetMusic={() => setActiveFeatureView("sheet-music")}
              onClear={() => {
                setNotationTemporaryPracticeTarget(null);
                setNotationPracticePitchFeedbackContext(null);
                setNotationRhythmTapPracticeContext(null);
                handleResetRhythmPractice();
              }}
              onPracticeCurrentNote={(event, eventIndex) => {
                const targetFrequencyHz = getNotationTargetPitchFrequencyHz(
                  event.pitch,
                );
                const currentTarget = notationTemporaryPracticeTarget;

                if (
                  !currentTarget ||
                  currentTarget.status !== "active" ||
                  currentTarget.mode !== "sight-singing" ||
                  event.type !== "note" ||
                  !event.pitch ||
                  targetFrequencyHz === null
                ) {
                  return;
                }

                setNotationPracticePitchFeedbackContext({
                  targetId: currentTarget.id,
                  draftFingerprint: currentTarget.draftFingerprint,
                  eventId: event.id,
                  eventIndex,
                  pitch: event.pitch,
                  targetFrequencyHz,
                });
                setActiveFeatureView("feedback");
              }}
              onPracticeRhythmTarget={() => {
                const currentTarget = notationTemporaryPracticeTarget;
                if (
                  !currentTarget ||
                  currentTarget.status !== "active" ||
                  currentTarget.mode !== "rhythm"
                ) {
                  return;
                }
                setNotationPracticePitchFeedbackContext(null);
                setNotationRhythmTapPracticeContext({
                  targetId: currentTarget.id,
                  draftFingerprint: currentTarget.draftFingerprint,
                  targetEventCount: currentTarget.events.filter((event) => event.type === "note").length,
                });
                setActiveFeatureView("rhythm");
              }}
            />
          </>
        ) : null}

        {activeFeatureView === "local-melody" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：本地旋律"
              title="本地旋律流程"
              description="按本地音频导入 → 生成目标音高曲线草稿 → 检查选区 → 创建临时练习目标的顺序完成。所有内容只保留在当前浏览器会话中。"
            />
        <LocalMelodyGuideAudioImportPanel
          source={localMelodyGuideSource}
          decodeError={localMelodyGuideDecodeError}
          inputRef={localMelodyGuideInputRef}
          onFileChange={handleLocalMelodyGuideFileChange}
          onClear={handleClearLocalMelodyGuide}
        />

        <LocalTargetPitchCurveDraftPanel
          draft={localTargetPitchCurveDraft}
          isAnalysisReady={Boolean(localMelodyGuideDecodedAudio?.analysisReady)}
          onGenerate={handleGenerateLocalTargetPitchCurveDraft}
        />

        <LocalTargetPitchCurveReviewPreviewPanel
          draft={localTargetPitchCurveDraft}
        />

        <LocalTargetPitchCurveDraftReviewControlsPanel
          selection={localTargetPitchCurveDraftReviewSelection}
          diagnostics={localTargetPitchCurveDraftSelectedDiagnostics}
          hasDraft={Boolean(localTargetPitchCurveDraft)}
          onUseFullDraft={() =>
            setLocalTargetPitchCurveDraftReviewSelection(
              (currentSelection) => ({
                ...currentSelection,
                mode: "full-draft",
              }),
            )
          }
          onUseVoicedSpan={() =>
            setLocalTargetPitchCurveDraftReviewSelection(
              (currentSelection) => ({
                ...currentSelection,
                mode: "voiced-span",
              }),
            )
          }
          onUseManualFrameRange={() =>
            setLocalTargetPitchCurveDraftReviewSelection(
              (currentSelection) => ({
                ...currentSelection,
                mode: "manual-frame-range",
              }),
            )
          }
          onManualStartFrameChange={(frameIndex) =>
            setLocalTargetPitchCurveDraftReviewSelection(
              (currentSelection) => ({
                ...currentSelection,
                mode: "manual-frame-range",
                manualStartFrame: frameIndex,
              }),
            )
          }
          onManualEndFrameChange={(frameIndex) =>
            setLocalTargetPitchCurveDraftReviewSelection(
              (currentSelection) => ({
                ...currentSelection,
                mode: "manual-frame-range",
                manualEndFrame: frameIndex,
              }),
            )
          }
          onReset={resetLocalTargetPitchCurveDraftReviewSelection}
        />

        <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
            P40 安全练习接入 Alpha
          </p>
          <h2 className="mt-1 text-xl font-bold text-fuchsia-950">
            将已检查选区用作临时诊断练习目标
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            此操作需要明确点击，只会创建一个浏览器本地、仅当前会话、仅来自已检查选区、不评分且可清除的临时练习目标。它用于当前阶段练习反馈的诊断参考，不是最终目标、正式转写或正式歌曲分析结果，也不会启动播放、录音、音高估计或评分。
          </p>
          <button
            type="button"
            onClick={handleUseSelectedReviewRangeAsTemporaryPracticeTarget}
            disabled={!canUseReviewedDraftAsTemporaryPracticeTarget}
            className="mt-4 rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            使用当前检查选区作为临时练习目标
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            {canUseReviewedDraftAsTemporaryPracticeTarget
              ? "当前检查选区可用：点击后会替换现有临时目标，但不会改变草稿、检查控制或评分语义。"
              : reviewedDraftTemporaryTargetDisabledReason}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            重新生成草稿、重置检查控制、清除本地旋律音频或选择新的本地音频，都会清除或使当前临时目标失效。
          </p>
        </section>

        <LocalReviewedDraftPracticeTargetPanel
          target={localReviewedDraftPracticeTarget}
          latestEstimatedPitchHz={
            pitchEstimateResult?.estimatedFrequencyHz ?? null
          }
          pitchFeedback={localReviewedDraftPitchFeedback}
          onClear={clearLocalReviewedDraftPracticeTarget}
        />

          </>
        ) : null}

        {activeFeatureView === "ear-training" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：听辨练习"
              title="浏览器本地内置听辨"
              description="从内置音程题开始练习听辨：播放题目、选择答案、查看解释并复练。题目和选择只保留在当前会话，不提供正式成绩。"
            />
            <LocalEarTrainingIntervalPanel />
            <LocalEarTrainingRhythmPanel />
          </>
        ) : null}

        {activeFeatureView === "rhythm" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：节拍与节奏"
              title="非评分节奏诊断工具"
              description="这里集中放置节拍器、点击式节奏练习和当前会话延迟校准，用于观察节奏稳定性；不提供分数、等级、通过或失败判断。"
            />
        <section className="mt-6 rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                节拍器基础
              </p>
              <h2 className="mt-1 text-2xl font-bold text-teal-950">
                未来节奏训练基础节拍器
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-900">
                这是浏览器本地 Web Audio 节拍器基础模块，用于未来预备拍、细分拍元数据、点击式节奏练习和节奏训练复用。当前只提供稳定节拍、预备拍与元数据，不做节奏评分、正式评测、通过 / 失败或等级。
              </p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-white p-4 text-sm text-teal-950 shadow-sm lg:min-w-64">
              <p className="font-semibold">当前 beat</p>
              <p className="mt-2 text-3xl font-bold">
                {metronomeBeat
                  ? `${metronomeBeat.phase === "count-in" ? "预备拍 " : "练习 "}${metronomeBeat.barNumber}.${metronomeBeat.beatNumber}`
                  : "—"}
              </p>
              <p className="mt-1 font-medium">
                {metronomeBeat
                  ? metronomeBeat.isStrongBeat
                    ? "小节重拍"
                    : "弱拍"
                  : "等待开始"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-6">
            <label className="rounded-2xl bg-white p-4 font-semibold text-teal-950 ring-1 ring-teal-200">
              BPM
              <input
                type="number"
                min="30"
                max="240"
                value={metronomeBpm}
                onChange={(event) =>
                  setMetronomeBpm(Number(event.target.value))
                }
                disabled={isMetronomeRunning}
                className="mt-2 w-full rounded-xl border border-teal-200 px-3 py-2 text-slate-900 disabled:bg-slate-100"
              />
            </label>
            <label className="rounded-2xl bg-white p-4 font-semibold text-teal-950 ring-1 ring-teal-200">
              拍号
              <select
                value={metronomeMeter}
                onChange={(event) =>
                  setMetronomeMeter(event.target.value as MetronomeMeter)
                }
                disabled={isMetronomeRunning}
                className="mt-2 w-full rounded-xl border border-teal-200 px-3 py-2 text-slate-900 disabled:bg-slate-100"
              >
                {supportedMetronomeMeters.map((meter) => (
                  <option key={meter} value={meter}>
                    {meter}
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl bg-white p-4 font-semibold text-teal-950 ring-1 ring-teal-200">
              预备拍
              <select
                value={metronomeCountInBars}
                onChange={(event) =>
                  setMetronomeCountInBars(
                    Number(event.target.value) as CountInBars,
                  )
                }
                disabled={isMetronomeRunning}
                className="mt-2 w-full rounded-xl border border-teal-200 px-3 py-2 text-slate-900 disabled:bg-slate-100"
              >
                {supportedCountInBars.map((bars) => (
                  <option key={bars} value={bars}>
                    {bars === 0 ? "关闭" : `${bars} 小节`}
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl bg-white p-4 font-semibold text-teal-950 ring-1 ring-teal-200">
              细分拍
              <select
                value={metronomeSubdivision}
                onChange={(event) =>
                  setMetronomeSubdivision(
                    event.target.value as MetronomeSubdivision,
                  )
                }
                disabled={isMetronomeRunning}
                className="mt-2 w-full rounded-xl border border-teal-200 px-3 py-2 text-slate-900 disabled:bg-slate-100"
              >
                {supportedMetronomeSubdivisions.map((subdivision) => (
                  <option key={subdivision} value={subdivision}>
                    {subdivision === "quarter"
                      ? "四分音符"
                      : subdivision === "eighth"
                        ? "八分音符"
                        : "十六分音符"}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-200">
              <p className="font-semibold text-teal-950">强拍 / 弱拍</p>
              <p className="mt-2 text-teal-800">
                每小节第 1 拍为强拍；预备拍与练习阶段分开。
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-200">
              <p className="font-semibold text-teal-950">本地边界</p>
              <p className="mt-2 text-teal-800">
                细分拍当前只是未来节奏练习的元数据；音频只播放拍级点击声。
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStartMetronome}
              disabled={isMetronomeRunning}
              className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-teal-300"
            >
              开始节拍器
            </button>
            <button
              type="button"
              onClick={handleStopMetronome}
              disabled={!isMetronomeRunning}
              className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-800 disabled:text-slate-400"
            >
              停止节拍器
            </button>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              仅基础模块：没有节奏分数 / 通过 / 失败 / 等级
            </span>
          </div>
          {metronomeError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {metronomeError}
            </p>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
                节奏练习 Alpha
              </p>
              <h2 className="mt-1 text-2xl font-bold text-violet-950">
                点击式节奏练习 Alpha
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
                {notationRhythmTapPracticeContext
                  ? "当前正在准备一个已确认的临时节奏目标。非休止事件的起点会成为 tap 参考点；休止只推进时间，不要求点击。它复用当前 BPM、拍号、预备拍与拍级点击声。"
                  : "当前 Alpha 可选择四分音符脉冲（每拍点击一次）或八分音符脉冲（每拍点击两次）。它复用当前 BPM、拍号与预备拍；目标模式独立于细分拍点击声，当前仍只播放拍级点击声。"}
              </p>
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                仅提供不评分的练习反馈：只显示接近 / 偏早 / 偏晚 /
                漏掉 / 额外，不提供正式分数、准确率百分比、等级、通过 /
                失败或最终评测；还没有麦克风起音检测。
              </p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-white p-4 text-sm text-violet-950 shadow-sm lg:min-w-64">
              <p className="font-semibold">当前阶段</p>
              <p className="mt-2 text-3xl font-bold">{rhythmPhase}</p>
              <p className="mt-1 font-medium">
                {rhythmPhase === "count-in"
                  ? "先听预备拍，进入练习阶段后再点击"
                  : rhythmPhase === "practice"
                    ? "请按空格键或点击“点击”"
                    : "等待开始"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            <label className="rounded-2xl bg-white p-4 font-semibold text-violet-950 ring-1 ring-violet-200">
              {notationRhythmTapPracticeContext ? "临时节奏目标" : "目标模式"}
              <select
                value={rhythmTargetPattern}
                onChange={(event) =>
                  setRhythmTargetPattern(
                    event.target.value as RhythmTargetPattern,
                  )
                }
                disabled={
                  Boolean(notationRhythmTapPracticeContext) || rhythmPhase === "count-in" || rhythmPhase === "practice"
                }
                className="mt-2 w-full rounded-xl border border-violet-200 px-3 py-2 text-slate-900 disabled:bg-slate-100"
              >
                {rhythmTargetPatternOptions.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {rhythmTargetPatternLabels[pattern]}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-violet-800">
                {notationRhythmTapPracticeContext
                  ? `当前目标含 ${notationRhythmTapPracticeContext.targetEventCount} 个需要拍击的音符事件。`
                  : `${rhythmTargetPatternTapGuidance[rhythmTargetPattern]} · ${rhythmPracticeBarCount} 小节`}
              </span>
            </label>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
              <p className="font-semibold text-violet-950">点击次数</p>
              <p className="mt-2 text-violet-800">
                {rhythmFeedbackSummary.tapCount} 次练习点击
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
              <p className="font-semibold text-violet-950">容差</p>
              <p className="mt-2 text-violet-800">
                接近 ±{rhythmCloseToleranceMs}ms · 匹配窗口 ±
                {rhythmMatchWindowMs}ms
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
              <p className="font-semibold text-violet-950">最近反馈</p>
              <p className="mt-2 text-violet-800">
                {rhythmFeedbackSummary.status}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => notationRhythmTapPracticeContext ? handleStartNotationRhythmPractice(notationTemporaryPracticeTarget) : handleStartRhythmPractice()}
              disabled={
                rhythmPhase === "count-in" || rhythmPhase === "practice"
              }
              className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-violet-300"
            >
              {notationRhythmTapPracticeContext ? "开始此节奏目标练习" : "开始节奏练习"}
            </button>
            <button
              type="button"
              onClick={handleStopRhythmPractice}
              disabled={
                rhythmPhase !== "count-in" && rhythmPhase !== "practice"
              }
              className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:text-slate-400"
            >
              停止
            </button>
            <button
              type="button"
              onClick={handleResetRhythmPractice}
              className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800"
            >
              重置
            </button>
            <button
              type="button"
              onClick={handleRhythmTap}
              disabled={rhythmPhase !== "practice"}
              className="rounded-full bg-white px-5 py-2 text-sm font-bold text-violet-900 ring-1 ring-violet-300 disabled:text-slate-400"
            >
              点击 / 空格键
            </button>
          </div>
          {rhythmError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {rhythmError}
            </p>
          ) : null}

          <div className="mt-5 rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                  点击延迟校准
                </p>
                <h3 className="mt-1 text-xl font-bold text-indigo-950">
                  仅当前会话的校准估计
                </h3>
                <p className="mt-2 text-sm leading-6 text-indigo-900">
                  这有助于调整浏览器 / 键盘点击时序。它不是节奏分数。尚无麦克风起音检测。不会保存到账号或数据库。
                </p>
              </div>
              <label className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-semibold text-indigo-950">
                <input
                  type="checkbox"
                  checked={applyLatencyCalibration}
                  onChange={(event) =>
                    setApplyLatencyCalibration(event.target.checked)
                  }
                  disabled={latencyCalibrationResult.offsetMs === null}
                  className="mr-2"
                />
                应用当前会话延迟校准
                <span className="mt-1 block font-normal text-indigo-800">
                  {activeLatencyOffsetMs !== 0
                    ? `反馈已按 ${Math.round(activeLatencyOffsetMs)}ms 估计值调整。`
                    : "已关闭或正在等待估计值。"}
                </span>
              </label>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="font-semibold text-indigo-950">状态</p>
                <p className="mt-1 text-indigo-800">
                  {latencyCalibrationResult.status}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="font-semibold text-indigo-950">样本</p>
                <p className="mt-1 text-indigo-800">
                  {latencyCalibrationResult.acceptedSampleCount} 个已接受 /{" "}
                  {latencyCalibrationResult.sampleCount} 次点击
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="font-semibold text-indigo-950">
                  估计偏移
                </p>
                <p className="mt-1 text-indigo-800">
                  {latencyCalibrationResult.offsetMs === null
                    ? "—"
                    : `${Math.round(latencyCalibrationResult.offsetMs)}ms`}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="font-semibold text-indigo-950">稳定性提示</p>
                <p className="mt-1 text-indigo-800">
                  {latencyCalibrationResult.stabilityHint}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartLatencyCalibration}
                disabled={
                  latencyCalibrationPhase === "count-in" ||
                  latencyCalibrationPhase === "practice"
                }
                className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-indigo-300"
              >
                开始校准
              </button>
              <button
                type="button"
                onClick={handleStopLatencyCalibration}
                disabled={
                  latencyCalibrationPhase !== "count-in" &&
                  latencyCalibrationPhase !== "practice"
                }
                className="rounded-full border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 disabled:text-slate-400"
              >
                停止校准
              </button>
              <button
                type="button"
                onClick={handleResetLatencyCalibration}
                className="rounded-full border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-800"
              >
                重置校准
              </button>
              <button
                type="button"
                onClick={handleLatencyCalibrationTap}
                disabled={latencyCalibrationPhase !== "practice"}
                className="rounded-full bg-white px-5 py-2 text-sm font-bold text-indigo-900 ring-1 ring-indigo-300 disabled:text-slate-400"
              >
                校准点击 / 空格键
              </button>
            </div>
            {latencyCalibrationError ? (
              <p className="mt-3 text-sm font-semibold text-red-700">
                {latencyCalibrationError}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-indigo-900">
              校准使用浏览器本地输入时间戳，与预备拍后的四分音符点击目标对齐。它只估计当前会话级点击偏移；不测量音频硬件往返延迟、正式评测准确度、麦克风或乐器起音时序。
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
            <h3 className="font-bold text-violet-950">
              练习反馈日志（本轮仅当前会话）
            </h3>
            <p className="mt-2 text-sm font-semibold text-violet-800">
              {notationRhythmTapPracticeContext
                ? "来源：已确认的临时节奏目标；每个非休止事件起点对应一个 tap 参考点。"
                : `模式：${rhythmTargetPatternLabels[rhythmTargetPattern]} · ${rhythmTargetPatternTapGuidance[rhythmTargetPattern]}`}
            </p>
            {rhythmFeedbackSummary.feedback.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {rhythmFeedbackSummary.feedback
                  .slice(-12)
                  .map((item, index) => (
                    <li
                      key={`${item.category}-${item.tapId ?? item.targetIndex}-${index}`}
                      className="rounded-xl bg-violet-50 p-3 text-violet-900"
                    >
                      <span className="font-bold">{item.category}</span>
                      <span className="ml-2">{item.message}</span>
                      {item.offsetMs !== null ? (
                        <span className="ml-2 text-violet-700">
                          偏移 {Math.round(item.offsetMs)}ms
                        </span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-violet-800">
                {rhythmPhase === "practice"
                  ? "等待 tap。"
                  : "开始后先听预备拍；练习阶段的点击才会进入反馈。"}
              </p>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-violet-900">
            时间戳来自浏览器本地输入事件，可能受键盘、浏览器与设备延迟影响；P25 只做仅当前会话的点击延迟校准估计，不做麦克风起音检测、音频硬件往返测量，不上传音频，也不写入持久节奏历史。
          </p>
        </section>

          </>
        ) : null}

        {activeFeatureView === "onset" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：起音诊断"
              title="从最新本地录音查看起音候选"
              description="这里用于浏览器本地起音候选检测、时间线预览和非评分节奏反馈。请先在练习反馈功能区录制一次，再回到这里检测。"
            />
        <section className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
                音频起音检测基础
              </p>
              <h2 className="mt-1 text-2xl font-bold text-orange-950">
                浏览器本地音频起音研究面板
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-orange-900">
                从最新本地录音中检测起音，作为未来人声节奏训练、钢琴、吉他 / 拨弦乐器、打击乐和其他短起音乐器的研究 / 练习基础。
              </p>
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                这不是节奏分数，也不是节奏评分。没有通过/失败、等级或准确率百分比。不上传、不使用云端 / AI、无账号、无数据库，也无持久节奏历史。
              </p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-white p-4 text-sm text-orange-950 shadow-sm lg:min-w-64">
              <p className="font-semibold">检测到的起音候选</p>
              <p className="mt-2 text-3xl font-bold">
                {audioOnsetResult ? audioOnsetResult.onsetCount : "—"}
              </p>
              <p className="mt-1 font-medium">
                {recordedAudioBlob
                  ? "已有最新本地录音"
                  : "请先本地录音"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-orange-200 bg-white p-4">
            <p className="text-sm font-bold text-orange-950">
              起音灵敏度预设
            </p>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              {audioOnsetSensitivityOptions.map((preset) => (
                <label
                  key={preset}
                  className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-orange-950"
                >
                  <span className="flex items-center gap-2 font-semibold capitalize">
                    <input
                      type="radio"
                      name="audio-onset-sensitivity"
                      value={preset}
                      checked={audioOnsetSensitivityPreset === preset}
                      onChange={() => setAudioOnsetSensitivityPreset(preset)}
                    />
                    {preset}
                  </span>
                  <span className="mt-1 block text-orange-800">
                    {audioOnsetSensitivityPresets[preset].description}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-orange-900">
              灵敏模式可能检测到更弱的起音，但也可能增加额外候选。保守模式可能减少额外候选，但也可能漏掉较弱起音。本功能仅用于诊断，不用于评分。人声和延音乐器未来可能仍需调校。修改预设后，请再次点击检测按钮，在最新本地录音上重新运行浏览器本地检测。
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDetectAudioOnsets}
              disabled={!recordedAudioBlob || isDetectingAudioOnsets}
              className="rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-orange-300"
            >
              {isDetectingAudioOnsets
                ? "正在本地检测起音…"
                : "从最新本地录音检测起音"}
            </button>
            <span className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-800">
              仅候选检测 · 仅诊断置信度
            </span>
          </div>

          {audioOnsetError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {audioOnsetError}
            </p>
          ) : null}
          {!audioOnsetResult ? (
            <div className="mt-5 rounded-2xl border border-dashed border-orange-300 bg-white p-4 text-sm text-orange-900">
              <p className="font-bold text-orange-950">还没有起音时间线</p>
              <p className="mt-2">
                从最新本地录音检测起音，以预览起音强度。这是浏览器本地诊断预览，不用于评分。
              </p>
            </div>
          ) : null}
          {audioOnsetResult ? (
            <div className="mt-5 grid gap-3 text-sm lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-orange-200">
                <p className="font-bold text-orange-950">诊断摘要</p>
                <p className="mt-2 text-orange-900">
                  {audioOnsetResult.diagnosticSummary}
                </p>
                <p className="mt-2 text-orange-800">
                  预设 {audioOnsetResult.sensitivityPreset} · 阈值{" "}
                  {audioOnsetResult.threshold.toFixed(4)} · 最大强度{" "}
                  {audioOnsetResult.maxStrength.toFixed(4)} · 最小间隔{" "}
                  {audioOnsetResult.minOnsetGapMs}ms
                </p>
                <p className="mt-2 text-orange-800">
                  采样率 {audioOnsetResult.sampleRate} Hz · 时长{" "}
                  {audioOnsetResult.durationMs.toFixed(0)}ms · 帧{" "}
                  {audioOnsetResult.frameSize} · 步长 {audioOnsetResult.hopSize}
                </p>
                {audioOnsetResult.warnings.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-orange-800">
                    {audioOnsetResult.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <AudioOnsetTimelinePreview
                onsetResult={audioOnsetResult}
                rhythmFeedback={audioOnsetRhythmFeedback}
                markerDensitySummary={audioOnsetMarkerDensitySummary}
                timelineDurationMs={audioOnsetTimelineDurationMs}
                focusedCandidateIndex={focusedAudioOnsetCandidateIndex}
                onFocusCandidate={setFocusedAudioOnsetCandidateIndex}
              />
              <div className="rounded-2xl bg-white p-4 ring-1 ring-orange-200">
                <p className="font-bold text-orange-950">
                  检测到的起音时间
                </p>
                {audioOnsetResult.candidates.length > 0 ? (
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {audioOnsetResult.candidates
                      .slice(0, 12)
                      .map((candidate, candidateIndex) => (
                        <li
                          key={`${candidate.frameIndex}-${candidate.onsetTimeMs}`}
                          className={`rounded-xl p-3 text-orange-900 ${candidateIndex === focusedAudioOnsetCandidateIndex ? "bg-purple-50 ring-2 ring-purple-300" : "bg-orange-50"}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setFocusedAudioOnsetCandidateIndex(candidateIndex)
                            }
                            onFocus={() =>
                              setFocusedAudioOnsetCandidateIndex(candidateIndex)
                            }
                            className="text-left font-bold text-orange-950 underline decoration-orange-300 underline-offset-2"
                          >
                            标记 #{candidateIndex + 1} ·{" "}
                            {candidate.onsetTimeMs.toFixed(0)}ms
                          </button>
                          <span className="ml-2">
                            {candidate.confidence} 诊断置信度 ·
                            候选索引 {candidateIndex} · 强度{" "}
                            {candidate.strength.toFixed(4)} · 阈值{" "}
                            {candidate.threshold.toFixed(4)}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-orange-800">
                    没有超过诊断阈值的起音候选。
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* P34 extracted panel preserves boundary copy: No upload / cloud / AI. */}
          <AudioOnsetRhythmFeedbackPanel
            rhythmFeedback={audioOnsetRhythmFeedback}
            alignmentMode={audioOnsetAlignmentMode}
            onAlignmentModeChange={setAudioOnsetAlignmentMode}
            onFocusCandidate={setFocusedAudioOnsetCandidateIndex}
          />

          <p className="mt-4 text-sm leading-6 text-orange-900">
            当前限制：人声、长笛、小提琴、连音、弱起音、强噪声环境可能更难检测；本阶段不做
            特定乐器调校、降噪、正式节奏评测。P28 加入录音开始与首个起音两种对齐模式，用于不评分的节奏反馈匹配。
          </p>
        </section>

          </>
        ) : null}

        {activeFeatureView === "feedback" ? (
          <>
            <PracticeFeatureSectionHeader
              eyebrow="当前功能区：练习反馈"
              title="本次会话的录音、音高估计与反馈"
              description="这里保留本地录音、音高估计、临时乐谱与导入目标音高反馈及练习记录。反馈只用于诊断参考，不是评分、等级或通过 / 失败判断。"
            />
        {notationPracticePitchFeedbackContext ? (
          <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">临时乐谱当前跟练</p>
                <h2 className="mt-1 text-2xl font-bold text-violet-950">{notationPracticePitchFeedbackContext.pitch} · 事件 {notationPracticePitchFeedbackContext.eventIndex + 1}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">请使用下方现有的浏览器本地录音和“进行本地音高估计”完成一次跟练。只有在你主动从临时视唱事件进入后，估计结果才会与此音符关联。</p>
              </div>
              <button type="button" onClick={() => setActiveFeatureView("notation-practice")} className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800">返回临时乐谱练习</button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">当前参考音高</dt><dd className="mt-1 text-violet-800">{notationPracticePitchFeedbackContext.targetFrequencyHz.toFixed(2)} Hz</dd></div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">本地估计状态</dt><dd className="mt-1 text-violet-800">{pitchEstimateResult ? (notationTargetPitchFeedbackMayBeStale ? "估计对应其他目标，请重新估计" : "已获得当前事件的本地估计") : "等待录音和本地音高估计"}</dd></div>
            </dl>
            {notationTargetPitchFeedbackMayBeStale ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">当前音高估计是在选择这个视唱音符之前或切换目标后得到的，不能作为当前事件的参考。请重新录音并进行本地音高估计。</p> : null}
            {notationTargetPitchFeedback ? <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 text-violet-950"><p className="font-semibold">{notationTargetPitchFeedback.title}</p><p className="mt-1 text-sm leading-6 text-violet-900">{notationTargetPitchFeedback.message}</p>{notationTargetPitchFeedback.centsDifference !== null ? <p className="mt-3 text-sm font-medium text-violet-800">与当前参考音的音分差：{notationTargetPitchFeedback.centsDifference.toFixed(1)}</p> : null}<p className="mt-3 text-sm leading-6 text-slate-700">这是本地、非评分的练习提示；不判断通过或失败，不生成正式成绩。</p></div> : null}
          </section>
        ) : null}
        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-950">
                交互式模拟流程
              </h2>
              <p className="mt-1 text-sm font-medium text-blue-800">
                状态： {flowState}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleListenToTarget}
                disabled={isListening}
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
              >
                {isListening ? "正在播放目标音…" : "听目标音"}
              </button>
              <button
                type="button"
                onClick={stopPlayback}
                disabled={!isAnyTargetPlaybackActive}
                className="rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 disabled:text-slate-400"
              >
                停止播放
              </button>
              <button
                type="button"
                onClick={handleStartMockAttempt}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                开始模拟练习
              </button>
              <button
                type="button"
                onClick={handleShowMockFeedback}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                显示模拟反馈
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                重试
              </button>
            </div>
          </div>

          {playError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {playError}
            </p>
          ) : null}
          {flowState === "attempting" ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-800">
              这次练习可以包含一段仅保留在浏览器本地的录音。音频不上传、不保存到服务器，也不提供正式评分。
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {mockExercise.targetNotes.map((note, index) => (
              <span
                key={`${note}-${index}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${activeNoteIndex === index ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-blue-800 ring-blue-200"}`}
              >
                {note}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                本地引导流程
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                旋律逐步练习流程
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                按固定旋律一步一步练习。步骤 X / N
                表示当前位置，当前目标音是本步骤的音，上一音 / 下一音 /
                重新开始只会移动所选步骤。
              </p>
              <ol className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">
                  1. 选择旋律步骤
                </li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">
                  2. 播放目标音并聆听
                </li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">
                  3. 录制一次本地练习
                </li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">
                  4. 在本地估计音高
                </li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200 sm:col-span-2">
                  5. 只查看对比结果，不提供正式评分
                </li>
              </ol>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:max-w-xs">
              <p className="font-semibold">原型边界</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>估计结果只与当前步骤目标音对比。</li>
                <li>这不是正式评分、等级、通过或失败判断。</li>
                <li>这不是节奏评测或视唱综合评测。</li>
                <li>音频和练习记录不上传，也不持久保存。</li>
                <li>不调用 AI API。</li>
              </ul>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">当前目标音</dt>
              <dd className="mt-1 text-slate-600">{selectedTargetNote}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">目标频率</dt>
              <dd className="mt-1 text-slate-600">
                {noteFrequencies[selectedTargetNote].toFixed(2)} Hz
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">录音</dt>
              <dd className="mt-1 text-slate-600">
                {recordedAudioBlob ? "练习录音已准备好" : "还没有录音"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">音高估计</dt>
              <dd className="mt-1 text-slate-600">
                {pitchEstimateResult
                  ? "音高估计已准备好"
                  : pitchEstimateErrorFeedback
                    ? "需要更清晰的本地录音"
                    : "尚未估计"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">置信状态</dt>
              <dd className="mt-1 text-slate-600">
                {pitchConfidenceFeedback
                  ? pitchConfidenceFeedback.label
                  : "等待本地估计"}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <dt className="font-semibold text-slate-700">对比</dt>
              <dd className="mt-1 text-slate-600">
                {pitchComparisonResult ? "对比已准备好" : "等待音高估计"}
              </dd>
            </div>
          </dl>

          {pitchEstimateResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">估计频率 Hz</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.estimatedFrequencyHz.toFixed(2)}
                </dd>
              </div>
              <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">最接近的音</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.nearestNote}
                </dd>
              </div>
            </dl>
          ) : null}

          {pitchComparisonResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                <dt className="font-semibold text-violet-950">对比提示</dt>
                <dd className="mt-1 text-violet-800">
                  {pitchComparisonResult.comparisonHint}
                </dd>
              </div>
              <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                <dt className="font-semibold text-violet-950">
                  与目标音的音分差
                </dt>
                <dd className="mt-1 text-violet-800">
                  {pitchComparisonResult.centsFromTarget.toFixed(1)}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
                仅界面的静态原型
              </p>
              <h2 className="mt-1 text-2xl font-bold text-cyan-950">
                实时音高趋势预览
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-900">
                目标音块读取手写的 TargetPitchCurve
                示例；用户音高曲线仍是静态占位。当前版本只是界面预览，不会打开麦克风，也不会分析音频。
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-800">
                长期方向：目标曲线可先来自五线谱 / MusicXML /
                MIDI，之后再探索用户本地提供的单旋律示范音频。P8c
                不实现音频导入、旋律提取、人声分离或歌曲学习模式。
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-300 bg-white p-4 text-sm text-cyan-950 shadow-sm lg:min-w-64">
              <p className="font-semibold">当前状态</p>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-cyan-700">当前目标音</dt>
                  <dd className="font-bold">{selectedTargetNote}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-cyan-700">反馈状态</dt>
                  <dd className="font-bold">未开始实时反馈</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-cyan-700">正式评分</dt>
                  <dd className="font-bold">无</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-cyan-950 opacity-70"
            >
              开始实时反馈（界面预览）
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 opacity-70"
            >
              停止实时反馈（界面预览）
            </button>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              当前为界面预览：不会打开麦克风
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-inner">
            <div className="grid min-h-[420px] grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr]">
              <div className="flex flex-col justify-between border-r border-cyan-100 bg-slate-50 px-3 py-6 text-right text-xs font-semibold text-slate-500">
                {["C4", "B3", "A3", "G3", "F3", "E3", "D3", "C3"].map(
                  (note) => (
                    <span key={note}>{note}</span>
                  ),
                )}
              </div>
              <div className="relative overflow-hidden bg-[linear-gradient(to_right,rgba(14,165,233,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.14)_1px,transparent_1px)] bg-[size:12.5%_12.5%] p-4 sm:p-6">
                <div
                  className="absolute inset-x-0 top-1/2 border-t-2 border-cyan-500"
                  aria-hidden="true"
                />
                <div className="absolute left-3 top-[18%] rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  +50 音分
                </div>
                <div className="absolute left-3 top-[34%] rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  +25 音分
                </div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-cyan-600 px-2 py-1 text-xs font-semibold text-white">
                  0 音分目标中心线
                </div>
                <div className="absolute left-3 top-[62%] rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  -25 音分
                </div>
                <div className="absolute left-3 top-[78%] rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  -50 音分
                </div>

                {staticPreviewTargetSegments.map((segment) => (
                  <div
                    key={segment.targetId}
                    className="absolute flex h-5 items-center justify-center rounded-full bg-emerald-500/80 px-2 text-[10px] font-bold text-white shadow-sm"
                    style={getStaticPreviewTargetBlockStyle(segment)}
                    aria-label={`静态目标音块 ${segment.displayLabel}`}
                  >
                    <span className="truncate">{segment.displayLabel}</span>
                  </div>
                ))}

                <svg
                  className="absolute inset-0 h-full w-full"
                  role="img"
                  aria-label="静态用户音高曲线占位，不是真实音高数据"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 10 56 C 18 52, 22 48, 29 49 S 42 42, 48 43"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="0"
                  />
                  <path
                    d="M 58 37 C 64 34, 70 40, 76 45 S 86 50, 93 48"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 49 43 L 57 38"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeDasharray="2 2"
                  />
                </svg>

                <div className="absolute bottom-4 left-[45%] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  未知 / 无音高间隙
                </div>
                <div className="absolute bottom-4 right-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-900 shadow-sm">
                  <p className="font-bold">静态占位读数</p>
                  <p className="mt-1">估计音名：E4</p>
                  <p>Hz: 329.63</p>
                  <p>置信度：模拟 0.72</p>
                </div>
                <div className="absolute bottom-4 left-4 hidden gap-8 text-xs font-semibold text-slate-400 sm:flex">
                  <span>0:00</span>
                  <span>小节 1</span>
                  <span>小节 2</span>
                  <span>0:08</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-cyan-900">
              <p className="font-semibold">浏览器本地</p>
              <p className="mt-1">
                未来实时分析也应优先浏览器本地处理；P8c 没有上传音频。
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-cyan-900">
              <p className="font-semibold">当前不请求麦克风</p>
              <p className="mt-1">
                本预览按钮禁用，不请求麦克风权限，不绑定 getUserMedia。
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-cyan-900">
              <p className="font-semibold">当前不评分</p>
              <p className="mt-1">
                当前没有正式评分、等级、通过 / 失败、节奏或视唱评测。
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
                研究预览 · 静态示例
              </p>
              <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
                研究用目标音高曲线诊断预览
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
                这个只读区域使用手写示例数据预览研究诊断形状。它不读取文件、存储、API、上传、数据库或账号数据。
              </p>
              <ul className="mt-3 grid gap-2 text-sm font-semibold text-fuchsia-950 sm:grid-cols-2">
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  研究预览
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  静态预览
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  不是正式练习目标
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  不参与评分
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  不是正式评测
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-fuchsia-200">
                  不替换当前练习旋律
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm text-fuchsia-950 shadow-sm lg:min-w-72">
              <p className="font-semibold">诊断摘要</p>
              <dl className="mt-3 space-y-2">
                <div>
                  <dt className="text-fuchsia-700">曲线来源</dt>
                  <dd className="mt-1 font-medium">
                    {researchTargetCurvePreviewExample.source}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fuchsia-700">片段数量</dt>
                  <dd className="font-bold">
                    {researchTargetCurvePreviewExample.summary.segmentCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fuchsia-700">总时长</dt>
                  <dd className="font-bold">
                    {researchTargetCurvePreviewExample.summary.totalDurationSeconds.toFixed(
                      2,
                    )}
                    s
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fuchsia-700">低诊断置信度片段</dt>
                  <dd className="font-bold">
                    {
                      researchTargetCurvePreviewExample.summary
                        .lowConfidenceSegmentCount
                    }
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-fuchsia-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-fuchsia-100 text-left text-sm">
                <thead className="bg-fuchsia-100/70 text-xs uppercase tracking-wide text-fuchsia-800">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      序号
                    </th>
                    <th scope="col" className="px-4 py-3">
                      开始 / 结束 / 时长
                    </th>
                    <th scope="col" className="px-4 py-3">
                      目标频率
                    </th>
                    <th scope="col" className="px-4 py-3">
                      诊断目标音标签
                    </th>
                    <th scope="col" className="px-4 py-3">
                      诊断置信度
                    </th>
                    <th scope="col" className="px-4 py-3">
                      来源帧
                    </th>
                    <th scope="col" className="px-4 py-3">
                      桥接空帧
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-100 text-fuchsia-950">
                  {researchTargetCurvePreviewExample.segments.map((segment) => (
                    <tr
                      key={segment.segmentIndex}
                      className={
                        segment.diagnosticConfidence === "low"
                          ? "bg-amber-50"
                          : "bg-white"
                      }
                    >
                      <td className="px-4 py-3 font-semibold">
                        {segment.segmentIndex}
                      </td>
                      <td className="px-4 py-3">
                        {segment.startTimeSeconds.toFixed(2)}s /{" "}
                        {segment.endTimeSeconds.toFixed(2)}s /{" "}
                        {segment.durationSeconds.toFixed(2)}s
                      </td>
                      <td className="px-4 py-3">
                        {segment.targetFrequencyHz.toFixed(2)} Hz
                      </td>
                      <td className="px-4 py-3">
                        {segment.targetNoteLabel ?? "无诊断标签"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            segment.diagnosticConfidence === "low"
                              ? "rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800"
                              : "rounded-full bg-fuchsia-100 px-2 py-1 font-bold text-fuchsia-800"
                          }
                        >
                          {segment.diagnosticConfidence === "low"
                            ? "低诊断置信度"
                            : "普通诊断置信度"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{segment.sourceFrameCount}</td>
                      <td className="px-4 py-3">
                        {segment.bridgedNullFrameCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-fuchsia-900">
            诊断目标音标签只是示例数据中的可选标签；它不是正式识别结果，也不会用于当前目标音、本地音高对比、练习历史或任何评测流程。
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                研究预览 · 只读预览
              </p>
              <h2 className="mt-1 text-2xl font-bold text-emerald-950">
                本地导入的练习目标预览
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
                这是研究预览，不是正式练习目标；不参与评分，不替换当前练习旋律，不写入练习历史，不参与音高对比。
              </p>
              <ul className="mt-3 grid gap-2 text-sm font-semibold text-emerald-950 sm:grid-cols-2">
                <li className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
                  不上传音频
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
                  不调用 API
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
                  不写入账号或数据库
                </li>
                <li className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
                  可以随时清除导入预览
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleClearImportedResearchTargetCurvePreview}
              className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              清除导入预览
            </button>
          </div>

          {importedResearchTargetCurvePreview.status === "idle" ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
              当前没有本地导入的练习目标预览。
            </p>
          ) : null}

          {importedResearchTargetCurvePreview.status === "invalid" ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-white p-4 text-sm font-semibold text-amber-900">
              {importedResearchTargetCurvePreview.message}
            </p>
          ) : null}

          {importedResearchTargetCurvePreview.status === "valid" ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4 text-emerald-950 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                只读预览
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-emerald-700">曲线来源</dt>
                  <dd className="mt-1 break-all font-semibold">
                    {importedResearchTargetCurvePreview.diagnostic.source}
                  </dd>
                </div>
                <div>
                  <dt className="text-emerald-700">片段数量</dt>
                  <dd className="mt-1 font-semibold">
                    {
                      importedResearchTargetCurvePreview.diagnostic.summary
                        .segmentCount
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-emerald-700">总时长</dt>
                  <dd className="mt-1 font-semibold">
                    {importedResearchTargetCurvePreview.diagnostic.summary.totalDurationSeconds.toFixed(
                      3,
                    )}
                    s
                  </dd>
                </div>
                <div>
                  <dt className="text-emerald-700">低诊断置信度片段数量</dt>
                  <dd className="mt-1 font-semibold">
                    {
                      importedResearchTargetCurvePreview.diagnostic.summary
                        .lowConfidenceSegmentCount
                    }
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-emerald-900">
                  {canEnterImportedPracticeLite
                    ? importedPracticeLiteActive
                      ? "当前已进入导入练习预览。"
                      : "可以显式进入导入练习预览；它不会替换当前练习旋律。"
                    : "当前导入预览没有可用片段，不能进入导入练习预览。"}
                </p>
                {importedPracticeLiteActive ? (
                  <span className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                    已进入导入练习预览
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartImportedPracticeLite}
                    disabled={!canEnterImportedPracticeLite}
                    className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    使用导入预览练习
                  </button>
                )}
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-emerald-100 text-left text-sm">
                    <thead className="bg-emerald-100/70 text-xs uppercase tracking-wide text-emerald-800">
                      <tr>
                        <th className="px-4 py-3">片段序号</th>
                        <th className="px-4 py-3">开始 / 结束 / 时长</th>
                        <th className="px-4 py-3">目标频率</th>
                        <th className="px-4 py-3">诊断目标音标签</th>
                        <th className="px-4 py-3">诊断置信度</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 text-emerald-950">
                      {importedResearchTargetCurvePreview.diagnostic.segments.map(
                        (segment) => (
                          <tr
                            key={`${segment.segmentIndex}-${segment.startTimeSeconds}-${segment.endTimeSeconds}`}
                            className={
                              segment.diagnosticConfidence === "low"
                                ? "bg-amber-50"
                                : "bg-white"
                            }
                          >
                            <td className="px-4 py-3 font-semibold">
                              {segment.segmentIndex}
                            </td>
                            <td className="px-4 py-3">
                              {segment.startTimeSeconds.toFixed(3)}s /{" "}
                              {segment.endTimeSeconds.toFixed(3)}s /{" "}
                              {segment.durationSeconds.toFixed(3)}s
                            </td>
                            <td className="px-4 py-3">
                              {segment.targetFrequencyHz.toFixed(2)} Hz
                            </td>
                            <td className="px-4 py-3">
                              {segment.targetNoteLabel ?? "无诊断标签"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  segment.diagnosticConfidence === "low"
                                    ? "rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800"
                                    : "rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-800"
                                }
                              >
                                {formatDiagnosticConfidenceLabel(
                                  segment.diagnosticConfidence,
                                )}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {importedPracticeLiteActive && selectedImportedSegment ? (
            <section className="mt-5 rounded-3xl border border-teal-200 bg-white p-5 text-teal-950 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                    导入练习轻量预览
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">导入练习预览</h3>
                  <ul className="mt-3 grid gap-2 text-sm font-semibold text-teal-900 sm:grid-cols-2">
                    <li className="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-200">
                      这是研究练习预览，不是正式评分。
                    </li>
                    <li className="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-200">
                      不写入练习历史。
                    </li>
                    <li className="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-200">
                      不替换当前练习旋律。
                    </li>
                    <li className="rounded-xl bg-teal-50 p-3 ring-1 ring-teal-200">
                      当前阶段不会判断对错。
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleExitImportedPracticeLite}
                  className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                >
                  退出导入练习预览
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <h4 className="font-bold text-teal-950">片段列表</h4>
                  <div className="mt-3 space-y-3">
                    {validImportedPreviewSegments.map((segment, index) => {
                      const isSelected = index === selectedImportedSegmentIndex;

                      return (
                        <button
                          key={`${segment.segmentIndex}-${segment.startTimeSeconds}-${segment.endTimeSeconds}`}
                          type="button"
                          onClick={() => setSelectedImportedSegmentIndex(index)}
                          className={`w-full rounded-2xl p-4 text-left text-sm ring-1 ${
                            isSelected
                              ? "bg-teal-700 text-white ring-teal-700"
                              : "bg-white text-teal-950 ring-teal-200 hover:bg-teal-100"
                          }`}
                        >
                          <span className="block font-bold">
                            片段 {index + 1}
                            {isSelected ? " · 当前选中" : ""}
                          </span>
                          <span className="mt-2 block">
                            目标音高 {segment.targetFrequencyHz.toFixed(2)} Hz
                            {segment.targetNoteLabel
                              ? ` · 目标音名 ${segment.targetNoteLabel}`
                              : ""}
                          </span>
                          <span className="mt-1 block">
                            {segment.startTimeSeconds.toFixed(3)}s →{" "}
                            {segment.endTimeSeconds.toFixed(3)}s · 持续{" "}
                            {segment.durationSeconds.toFixed(3)}s
                          </span>
                          <span className="mt-1 block">
                            {formatDiagnosticConfidenceLabel(
                              segment.diagnosticConfidence,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <h4 className="font-bold text-teal-950">当前导入片段详情</h4>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">
                        当前导入片段
                      </dt>
                      <dd className="mt-1 font-bold">
                        片段 {(selectedImportedSegmentIndex ?? 0) + 1}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">目标音高</dt>
                      <dd className="mt-1 font-bold">
                        {selectedImportedSegment.targetFrequencyHz.toFixed(2)}{" "}
                        Hz
                      </dd>
                    </div>
                    {selectedImportedSegment.targetNoteLabel ? (
                      <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                        <dt className="font-semibold text-teal-700">
                          目标音名
                        </dt>
                        <dd className="mt-1 font-bold">
                          {selectedImportedSegment.targetNoteLabel}
                        </dd>
                      </div>
                    ) : null}
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">开始时间</dt>
                      <dd className="mt-1 font-bold">
                        {selectedImportedSegment.startTimeSeconds.toFixed(3)}s
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">结束时间</dt>
                      <dd className="mt-1 font-bold">
                        {selectedImportedSegment.endTimeSeconds.toFixed(3)}s
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">持续时间</dt>
                      <dd className="mt-1 font-bold">
                        {selectedImportedSegment.durationSeconds.toFixed(3)}s
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                      <dt className="font-semibold text-teal-700">
                        诊断置信度
                      </dt>
                      <dd className="mt-1 font-bold">
                        {formatDiagnosticConfidenceLabel(
                          selectedImportedSegment.diagnosticConfidence,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                  音高反馈
                </p>
                <h4 className="mt-1 font-bold text-teal-950">
                  非评分反馈
                </h4>
                <p className="mt-2 text-sm leading-6 text-teal-900">
                  {importedTargetPitchFeedback.message}
                </p>
                <p className="mt-2 rounded-xl bg-white p-3 text-sm font-semibold leading-6 text-teal-900 ring-1 ring-teal-200">
                  此反馈使用最新本地音高估计与当前选中的导入片段。切换片段后如需更清晰的结果，请重新录制一次。这是练习反馈，不是评分。
                </p>
                {importedTargetPitchFeedbackMayBeStale ? (
                  <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800 ring-1 ring-amber-200">
                    最新本地音高估计之后已切换片段。
                    如需更清晰地查看此片段，请重新录制一次。这里仍然只是非评分练习反馈。
                  </p>
                ) : null}
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                    <dt className="font-semibold text-teal-700">目标音高</dt>
                    <dd className="mt-1 font-bold">
                      {selectedImportedSegment.targetFrequencyHz.toFixed(2)} Hz
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                    <dt className="font-semibold text-teal-700">估计音高</dt>
                    <dd className="mt-1 font-bold">
                      {pitchEstimateResult
                        ? `${pitchEstimateResult.estimatedFrequencyHz.toFixed(2)} Hz`
                        : "没有检测到可靠音高。"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-teal-200">
                    <dt className="font-semibold text-teal-700">方向提示</dt>
                    <dd className="mt-1 font-bold">
                      {importedTargetPitchFeedback.centsDifference === null
                        ? importedTargetPitchFeedback.title
                        : `${importedTargetPitchFeedback.centsDifference.toFixed(1)} cents`}
                    </dd>
                  </div>
                </dl>
                {selectedImportedSegment.diagnosticConfidence === "low" ? (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                    当前片段诊断置信度较低，反馈仅供练习参考。
                  </p>
                ) : null}
                <p className="mt-3 text-xs font-semibold text-teal-800">
                  This is non-scoring feedback. It does not create a saved
                  result, and it does not write to local attempt history.
                </p>
              </div>
            </section>
          ) : importedPracticeLiteActive ? (
            <section className="mt-5 rounded-3xl border border-teal-200 bg-white p-5 text-teal-950 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                音高反馈
              </p>
              <h3 className="mt-1 text-xl font-bold">非评分反馈</h3>
              <p className="mt-2 text-sm leading-6 text-teal-900">
                {importedTargetPitchFeedback.message}
              </p>
            </section>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-purple-200 bg-purple-50 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
              手动粘贴诊断 JSON（开发/调试）
            </p>
            <h2 className="mt-1 text-2xl font-bold text-purple-950">
              手动粘贴诊断 JSON（开发/调试）
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-purple-900">
              这是开发/调试备用入口。普通用户主流程应从本地音频研究工具点击「发送到练习页预览」。这里不是正式练习目标，不是正式音频导入，不参与评分，不替换当前练习旋律。
            </p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold text-purple-950 sm:grid-cols-2">
              <li className="rounded-xl bg-white p-3 ring-1 ring-purple-200">
                只读研究预览
              </li>
              <li className="rounded-xl bg-white p-3 ring-1 ring-purple-200">
                不上传，不调用 API，不写入账号或数据库
              </li>
              <li className="rounded-xl bg-white p-3 ring-1 ring-purple-200">
                不替换当前练习旋律
              </li>
              <li className="rounded-xl bg-white p-3 ring-1 ring-purple-200">
                不参与音高对比，不写入练习历史
              </li>
            </ul>
          </div>

          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-purple-950">
            粘贴来自本地音频研究工具的诊断 JSON
            <textarea
              value={manualResearchTargetCurveJson}
              onChange={(event) =>
                setManualResearchTargetCurveJson(event.target.value)
              }
              rows={8}
              className="w-full rounded-2xl border border-purple-200 bg-white p-3 font-mono text-xs font-normal text-slate-900 shadow-sm"
              placeholder="在这里粘贴研究诊断 JSON。"
            />
          </label>
          <button
            type="button"
            onClick={handlePreviewManualResearchTargetCurveJson}
            className="mt-3 rounded-full bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
          >
            预览粘贴的诊断数据
          </button>

          {manualResearchTargetCurvePreview.status === "invalid" ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-white p-4 text-sm font-semibold text-amber-900">
              {manualResearchTargetCurvePreview.message} 本次预览未更新。
            </p>
          ) : null}

          {manualResearchTargetCurvePreview.status === "valid" ? (
            <div className="mt-5 rounded-2xl border border-purple-200 bg-white p-4 text-purple-950 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                只读导入诊断预览
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-purple-700">曲线来源</dt>
                  <dd className="mt-1 break-all font-semibold">
                    {manualResearchTargetCurvePreview.diagnostic.source}
                  </dd>
                </div>
                <div>
                  <dt className="text-purple-700">片段数量</dt>
                  <dd className="mt-1 font-semibold">
                    {
                      manualResearchTargetCurvePreview.diagnostic.summary
                        .segmentCount
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-purple-700">总时长</dt>
                  <dd className="mt-1 font-semibold">
                    {manualResearchTargetCurvePreview.diagnostic.summary.totalDurationSeconds.toFixed(
                      3,
                    )}
                    s
                  </dd>
                </div>
                <div>
                  <dt className="text-purple-700">
                    Low confidence segment count
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {
                      manualResearchTargetCurvePreview.diagnostic.summary
                        .lowConfidenceSegmentCount
                    }
                  </dd>
                </div>
              </dl>
              <div className="mt-4 overflow-hidden rounded-2xl border border-purple-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-100 text-left text-sm">
                    <thead className="bg-purple-100/70 text-xs uppercase tracking-wide text-purple-800">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          片段序号
                        </th>
                        <th scope="col" className="px-4 py-3">
                          开始 / 结束 / 时长
                        </th>
                        <th scope="col" className="px-4 py-3">
                          目标频率
                        </th>
                        <th scope="col" className="px-4 py-3">
                          可选诊断目标音标签
                        </th>
                        <th scope="col" className="px-4 py-3">
                          诊断置信度
                        </th>
                        <th scope="col" className="px-4 py-3">
                          来源帧数量
                        </th>
                        <th scope="col" className="px-4 py-3">
                          桥接空帧数量
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100 text-purple-950">
                      {manualResearchTargetCurvePreview.diagnostic.segments.map(
                        (segment) => (
                          <tr
                            key={`${segment.segmentIndex}-${segment.startTimeSeconds}-${segment.endTimeSeconds}`}
                            className={
                              segment.diagnosticConfidence === "low"
                                ? "bg-amber-50"
                                : "bg-white"
                            }
                          >
                            <td className="px-4 py-3 font-semibold">
                              {segment.segmentIndex}
                            </td>
                            <td className="px-4 py-3">
                              {segment.startTimeSeconds.toFixed(3)}s /{" "}
                              {segment.endTimeSeconds.toFixed(3)}s /{" "}
                              {segment.durationSeconds.toFixed(3)}s
                            </td>
                            <td className="px-4 py-3">
                              {segment.targetFrequencyHz.toFixed(2)} Hz
                            </td>
                            <td className="px-4 py-3">
                              {segment.targetNoteLabel ?? "无诊断标签"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  segment.diagnosticConfidence === "low"
                                    ? "rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800"
                                    : "rounded-full bg-purple-100 px-2 py-1 font-bold text-purple-800"
                                }
                              >
                                {formatDiagnosticConfidenceLabel(
                                  segment.diagnosticConfidence,
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {segment.sourceFrameCount}
                            </td>
                            <td className="px-4 py-3">
                              {segment.bridgedNullFrameCount}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-purple-900">
                可选诊断目标音标签只是诊断元数据；它不会用于当前目标音、本地音高对比、练习历史或任何评测流程。
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-emerald-950">
                本地录音原型
              </h2>
              <p className="mt-1 text-sm font-medium text-emerald-800">
                录音只保留在此浏览器中。建议顺序：播放目标音、录音，然后在本地估计音高。音频不上传、不持久保存、不提供正式评分，也不调用
                AI API。
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                开始本地录音会通过 navigator.mediaDevices.getUserMedia(
                {"{ audio: true }"}) 向浏览器请求麦克风权限。
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                状态：{" "}
                {isRecording
                  ? `正在本地录音 ${recordingSeconds}s`
                  : recordedAudioUrl
                    ? "练习录音已可在本地播放"
                    : "还没有本地录音"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartLocalRecording}
                disabled={isRecording}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
              >
                开始本地录音
              </button>
              <button
                type="button"
                onClick={handleStopLocalRecording}
                disabled={!isRecording}
                className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 disabled:text-slate-400"
              >
                停止录音
              </button>
              <button
                type="button"
                onClick={handlePlayRecordedAttempt}
                disabled={!recordedAudioUrl || isRecording}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                播放练习录音
              </button>
              <button
                type="button"
                onClick={handleAnalyzeLocalRecording}
                disabled={!recordedAudioBlob || isRecording || isAnalyzingAudio}
                className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {isAnalyzingAudio ? "正在本地分析…" : "分析本地录音"}
              </button>
              <button
                type="button"
                onClick={handleEstimatePitchLocally}
                disabled={
                  !recordedAudioBlob || isRecording || isEstimatingPitch
                }
                className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {isEstimatingPitch ? "正在本地估计…" : "本地估计音高"}
              </button>
              <button
                type="button"
                onClick={handleClearRecording}
                disabled={
                  !recordedAudioUrl &&
                  !recordedAudioBlob &&
                  !isRecording &&
                  !recordingError &&
                  !audioAnalysisError &&
                  !audioAnalysisResult &&
                  !pitchEstimateError &&
                  !pitchEstimateResult
                }
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400"
              >
                清除录音
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900">
            <p className="font-semibold">本地音频分析范围</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>这不是音高检测。</li>
              <li>不进行节奏评测。</li>
              <li>这里只做本地录音质量分析。</li>
              <li>不上传音频。</li>
            </ul>
          </div>
          {recordingError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {recordingError}
            </p>
          ) : null}
          {audioAnalysisError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {audioAnalysisError}
            </p>
          ) : null}
          {pitchEstimateErrorFeedback ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">
                {pitchEstimateErrorFeedback.title}
              </p>
              <p className="mt-2">
                发生了什么： {pitchEstimateErrorFeedback.whatHappened}
              </p>
              <div className="mt-3">
                <p className="font-semibold">接下来可以尝试：</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {pitchEstimateErrorFeedback.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 font-medium">
                这只是实验性本地音高估计：不提供正式评分，不进行节奏评测，不上传音频，也不调用
                AI API。
              </p>
            </div>
          ) : null}
          {recordedAudioUrl ? (
            <audio className="mt-4 w-full" controls src={recordedAudioUrl}>
              你的浏览器不支持音频播放。
            </audio>
          ) : null}
          <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-indigo-900">
            <p className="font-semibold">实验性本地音高估计</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>置信度表示可用音高帧数除以已分析帧数。</li>
              <li>置信度不是正式评分，也不能证明音高准确。</li>
              <li>这不是正式音高评分。</li>
              <li>不进行节奏评测。</li>
              <li>不上传音频。</li>
              <li>不调用 AI API。</li>
            </ul>
          </div>
          {pitchEstimateResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">估计频率 Hz</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.estimatedFrequencyHz.toFixed(2)}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">最接近的音</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.nearestNote}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">音分偏移</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.centsOffset.toFixed(1)}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">置信帧覆盖率</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.confidence.toFixed(2)}
                </dd>
                <dd className="mt-2 text-xs leading-5 text-indigo-700">
                  {pitchConfidenceFeedback?.label}：置信度表示可用音高帧 /
                  已分析帧，不是正式评分，也不能证明音高准确。
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">已分析帧数</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.framesAnalyzed}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200">
                <dt className="font-semibold text-indigo-950">可用音高帧</dt>
                <dd className="mt-1 text-indigo-800">
                  {pitchEstimateResult.validPitchFrames}
                </dd>
                <dd className="mt-2 text-xs leading-5 text-indigo-700">
                  {pitchConfidenceFeedback?.explanation}
                </dd>
              </div>
            </dl>
          ) : null}
          {pitchEstimateResult ? (
            <p className="mt-3 rounded-xl border border-indigo-200 bg-white p-4 text-sm font-medium text-indigo-900">
              置信度只是基于可用音高帧 /
              已分析帧的实验性本地估计信号。它不是正式评分，不是等级，也不能证明估计音高准确。
            </p>
          ) : null}
          <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-sm text-violet-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">实验性目标音对比</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>不提供正式评分。</li>
                  <li>不进行节奏评测。</li>
                  <li>不上传音频。</li>
                  <li>不调用 AI API。</li>
                  <li>这里只把本地估计音高与当前旋律步骤目标音进行对比。</li>
                  <li>步骤 X / N 显示固定旋律中的当前位置。</li>
                  <li>上一音 / 下一音会限制在第一个和最后一个旋律步骤之间。</li>
                  <li>重新开始旋律会回到步骤 1。</li>
                  <li>
                    切换步骤不会自动播放、自动录音、自动估计，也不会新增练习记录。
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <div className="rounded-xl bg-violet-50 p-3 text-right ring-1 ring-violet-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    步骤 {currentMelodyStepIndex + 1} / {melodySteps.length}
                  </p>
                  <p className="mt-1 text-lg font-bold text-violet-950">
                    {selectedTargetNote}
                  </p>
                  <p className="mt-1 text-xs text-violet-800">
                    当前目标音来自这个固定旋律步骤。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={handlePreviousMelodyStep}
                    disabled={isFirstMelodyStep}
                    className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:text-slate-400"
                  >
                    上一音
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMelodyStep}
                    disabled={isLastMelodyStep}
                    className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:text-slate-400"
                  >
                    下一音
                  </button>
                  <button
                    type="button"
                    onClick={handleRestartMelody}
                    disabled={isFirstMelodyStep}
                    className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:text-slate-400"
                  >
                    重新开始旋律
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handlePlaySelectedTargetNote}
                  disabled={isSelectedTargetNotePlaying}
                  className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-violet-300"
                >
                  {isSelectedTargetNotePlaying
                    ? "正在播放所选音…"
                    : "播放所选目标音"}
                </button>
              </div>
            </div>
            {pitchComparisonResult && pitchEstimateResult ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">目标频率</dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchComparisonResult.targetFrequencyHz.toFixed(2)} Hz (
                    {pitchComparisonResult.targetNote})
                  </dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">
                    本地估计音高
                  </dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchComparisonResult.estimatedFrequencyHz.toFixed(2)} Hz
                  </dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">最接近的音</dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchEstimateResult.nearestNote}
                  </dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">
                    已分析帧 / 可用音高帧
                  </dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchEstimateResult.framesAnalyzed} /{" "}
                    {pitchEstimateResult.validPitchFrames}
                  </dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">
                    与目标音的音分差
                  </dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchComparisonResult.centsFromTarget.toFixed(1)}
                  </dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
                  <dt className="font-semibold text-violet-950">对比提示</dt>
                  <dd className="mt-1 text-violet-800">
                    {pitchComparisonResult.comparisonHint}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-violet-50 p-4 font-medium text-violet-800">
                请先本地估计音高，再将本地估计音高与当前步骤目标音对比。这个对比不是正式评分。
              </p>
            )}
          </div>

          <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">最近本地练习记录</p>
                <p className="mt-1 text-sky-800">
                  这些练习记录只是当前浏览器会话中的临时本地 React
                  状态。它们不上传、不保存到服务器、不写入浏览器存储，不是正式评分或等级，也不进行节奏评测。
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearPracticeAttempts}
                disabled={practiceAttempts.length === 0}
                className="rounded-full border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:text-slate-400"
              >
                清空练习记录
              </button>
            </div>
            {practiceAttempts.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {practiceAttempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="rounded-xl bg-white p-4 ring-1 ring-sky-200"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-sky-950">
                        {attempt.label}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                        {attempt.feedbackLabel}
                      </p>
                    </div>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="font-semibold">步骤 #</dt>
                        <dd className="text-sky-800">
                          {attempt.melodyStepNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">目标音</dt>
                        <dd className="text-sky-800">{attempt.targetNote}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">估计音</dt>
                        <dd className="text-sky-800">{attempt.nearestNote}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">估计频率 Hz</dt>
                        <dd className="text-sky-800">
                          {attempt.estimatedFrequencyHz.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">与目标音的音分差</dt>
                        <dd className="text-sky-800">
                          {attempt.centsFromTarget.toFixed(1)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">置信帧覆盖率</dt>
                        <dd className="text-sky-800">
                          {attempt.confidence.toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() =>
                        handlePracticeAttemptTargetAgain(
                          attempt.melodyStepIndex,
                        )
                      }
                      className="mt-3 rounded-full border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800"
                    >
                      再次练习这个目标音
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-xl bg-white p-4 font-medium text-sky-800 ring-1 ring-sky-200">
                录制并本地估计一次练习后，这里会显示临时本地音高对比反馈。
              </p>
            )}
          </section>
          {audioAnalysisResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200">
                <dt className="font-semibold text-emerald-950">时长（秒）</dt>
                <dd className="mt-1 text-emerald-800">
                  {audioAnalysisResult.durationSeconds.toFixed(2)}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200">
                <dt className="font-semibold text-emerald-950">峰值电平</dt>
                <dd className="mt-1 text-emerald-800">
                  {audioAnalysisResult.peakLevel.toFixed(4)}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200">
                <dt className="font-semibold text-emerald-950">RMS 电平</dt>
                <dd className="mt-1 text-emerald-800">
                  {audioAnalysisResult.rmsLevel.toFixed(4)}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200">
                <dt className="font-semibold text-emerald-950">简易电平提示</dt>
                <dd className="mt-1 text-emerald-800">
                  {audioAnalysisResult.simpleLevelHint}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        {hasMockFeedback ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">模拟音高反馈</h2>
              <p className="mt-2 text-sm text-slate-600">
                {mockFeedback.pitch} 这不是真实音高检测，也不提供正式评分。
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">模拟节奏反馈</h2>
              <p className="mt-2 text-sm text-slate-600">
                {mockFeedback.rhythm} 这不是真实节奏评测，也不提供正式评分。
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">模拟 AI 风格学习建议</h2>
              <p className="mt-2 text-sm text-slate-600">
                {mockFeedback.learning} 不调用 AI API。
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">音高反馈占位</h2>
              <p className="mt-2 text-sm text-slate-600">
                这里未实现真实音高检测。
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">节奏反馈占位</h2>
              <p className="mt-2 text-sm text-slate-600">
                这里未实现真实节奏评测。
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">AI 反馈占位</h2>
              <p className="mt-2 text-sm text-slate-600">
                此页面不调用任何 AI API。
              </p>
            </section>
          </div>
        )}
          </>
        ) : null}
      </section>
    </main>
  );
}
