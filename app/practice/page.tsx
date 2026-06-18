"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PracticeFlowState = "idle" | "listening" | "attempting" | "feedback";

type AudioAnalysisResult = {
  durationSeconds: number;
  peakLevel: number;
  rmsLevel: number;
  simpleLevelHint: string;
};

type PitchEstimateResult = {
  estimatedFrequencyHz: number;
  nearestNote: string;
  centsOffset: number;
  confidence: number;
  framesAnalyzed: number;
  validPitchFrames: number;
};

type PitchComparisonResult = {
  targetNote: string;
  targetFrequencyHz: number;
  estimatedFrequencyHz: number;
  centsFromTarget: number;
  comparisonHint: string;
};

const mockExercise = {
  title: "Mock Melody: Stepwise Warmup",
  targetNotes: ["C4", "D4", "E4", "G4", "E4", "D4", "C4"],
  suggestedBpm: 72,
  goal: "Keep the melody steady and notice where future pitch or rhythm feedback would appear.",
};

const mockFeedback = {
  pitch:
    "Mock pitch feedback: most target notes are marked as close, with G4 flagged as a future focus area.",
  rhythm:
    "Mock rhythm feedback: the middle notes are marked slightly rushed in this placeholder flow.",
  learning:
    "Mock AI-style learning feedback: listen once more, sing only C4-D4-E4, then retry the full phrase slowly.",
};

const practiceSteps = [
  "Listen to target",
  "Record one local practice attempt",
  "Review mock feedback",
  "Retry",
];

const noteFrequencies: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
};

const pitchNoteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const calculateRms = (samples: Float32Array, startIndex: number, frameSize: number) => {
  let squaredSampleSum = 0;

  for (let index = 0; index < frameSize; index += 1) {
    const sample = samples[startIndex + index] ?? 0;
    squaredSampleSum += sample * sample;
  }

  return Math.sqrt(squaredSampleSum / frameSize);
};

const estimateFrameFrequency = (
  samples: Float32Array,
  startIndex: number,
  frameSize: number,
  sampleRate: number,
) => {
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.ceil(sampleRate / 80), frameSize - 1);
  let bestLag = 0;
  let bestCorrelation = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;

    for (let index = 0; index < frameSize - lag; index += 1) {
      correlation += samples[startIndex + index] * samples[startIndex + index + lag];
    }

    const normalizedCorrelation = correlation / (frameSize - lag);

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : null;
};

const calculateMedian = (values: number[]) => {
  const sortedValues = [...values].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
};

const getNearestPitchNote = (frequency: number) => {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const nearestMidi = Math.round(midiFloat);
  const centsOffset = (midiFloat - nearestMidi) * 100;
  const octave = Math.floor(nearestMidi / 12) - 1;
  const noteName = pitchNoteNames[((nearestMidi % 12) + 12) % 12];

  return {
    nearestNote: `${noteName}${octave}`,
    centsOffset,
  };
};

const calculateCentsFromTarget = (estimatedFrequencyHz: number, targetFrequencyHz: number) =>
  1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

const getComparisonHint = (centsFromTarget: number) => {
  const absoluteCents = Math.abs(centsFromTarget);

  if (absoluteCents <= 25) {
    return "Close to target";
  }

  if (absoluteCents > 75) {
    return "Far from target";
  }

  if (centsFromTarget > 25) {
    return "A little sharp";
  }

  return "A little flat";
};

const estimateLocalPitch = (audioBuffer: AudioBuffer): PitchEstimateResult => {
  const frameSize = 4096;
  const hopSize = 2048;

  if (audioBuffer.length < frameSize) {
    throw new Error("Recording is too short for local pitch estimation. Try recording a longer sustained note.");
  }

  const monoSamples = new Float32Array(audioBuffer.length);

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
      monoSamples[sampleIndex] += channelData[sampleIndex] / audioBuffer.numberOfChannels;
    }
  }

  const frameFrequencies: number[] = [];
  let framesAnalyzed = 0;

  for (let startIndex = 0; startIndex + frameSize <= monoSamples.length; startIndex += hopSize) {
    framesAnalyzed += 1;

    if (calculateRms(monoSamples, startIndex, frameSize) < 0.015) {
      continue;
    }

    const frequency = estimateFrameFrequency(monoSamples, startIndex, frameSize, audioBuffer.sampleRate);

    if (frequency !== null && frequency >= 80 && frequency <= 1000) {
      frameFrequencies.push(frequency);
    }
  }

  if (framesAnalyzed === 0 || frameFrequencies.length === 0) {
    throw new Error("No usable pitch frames were found. Try a louder, steadier single note.");
  }

  const estimatedFrequencyHz = calculateMedian(frameFrequencies);
  const { nearestNote, centsOffset } = getNearestPitchNote(estimatedFrequencyHz);

  return {
    estimatedFrequencyHz,
    nearestNote,
    centsOffset,
    confidence: frameFrequencies.length / framesAnalyzed,
    framesAnalyzed,
    validPitchFrames: frameFrequencies.length,
  };
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
  const [flowState, setFlowState] = useState<PracticeFlowState>("idle");
  const [playError, setPlayError] = useState("");
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [hasMockFeedback, setHasMockFeedback] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [audioAnalysisResult, setAudioAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [audioAnalysisError, setAudioAnalysisError] = useState("");
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [pitchEstimateResult, setPitchEstimateResult] = useState<PitchEstimateResult | null>(null);
  const [pitchEstimateError, setPitchEstimateError] = useState("");
  const [isEstimatingPitch, setIsEstimatingPitch] = useState(false);
  const [selectedTargetNote, setSelectedTargetNote] = useState("C4");
  const [isSelectedTargetNotePlaying, setIsSelectedTargetNotePlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
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

  const targetNoteOptions = useMemo(
    () => Array.from(new Set(mockExercise.targetNotes)),
    [],
  );

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
  };

  useEffect(() => {
    recordedAudioUrlRef.current = recordedAudioUrl;
  }, [recordedAudioUrl]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      shouldDiscardRecordingRef.current = true;
      audioAnalysisRunIdRef.current += 1;
      pitchEstimateRunIdRef.current += 1;
      playbackTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      playbackOscillatorsRef.current.forEach(stopOscillator);
      playbackOscillatorsRef.current = [];
      void playbackAudioContextRef.current?.close();
      playbackAudioContextRef.current = null;
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
        oscillator.frequency.value = noteFrequencies[note] ?? noteFrequencies.C4;
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.18, noteStartTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + noteSeconds * 0.9);

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
      setPlayError("Target playback failed. This prototype still uses mock scoring only.");
      stopPlayback();
    }
  };

  const handlePlaySelectedTargetNote = async () => {
    stopPlayback();
    setPlayError("");

    const targetFrequency = noteFrequencies[selectedTargetNote];

    if (!targetFrequency) {
      setPlayError(`Target note ${selectedTargetNote} is not available for playback yet.`);
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
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteSeconds * 0.9);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + noteSeconds);

      const completionTimeoutId = window.setTimeout(() => {
        playbackOscillatorsRef.current = playbackOscillatorsRef.current.filter(
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
      }, noteSeconds * 1000 + 200);

      playbackTimeoutIdsRef.current.push(completionTimeoutId);
    } catch {
      setPlayError("Selected target note playback failed in this browser.");
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
    setPitchEstimateError("");
    setIsEstimatingPitch(false);
    setRecordingSeconds(0);
    revokeRecordedAudioUrl(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Local recording is not available in this browser.");
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
        setRecordingError("Microphone permission is required to record a local attempt.");
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
      setAudioAnalysisError("Record a local attempt before running local audio analysis.");
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

      for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
        const channelData = audioBuffer.getChannelData(channelIndex);

        for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
          const sampleLevel = Math.abs(channelData[sampleIndex]);
          peakLevel = Math.max(peakLevel, sampleLevel);
          squaredSampleSum += channelData[sampleIndex] ** 2;
          sampleCount += 1;
        }
      }

      const rmsLevel = sampleCount > 0 ? Math.sqrt(squaredSampleSum / sampleCount) : 0;
      let simpleLevelHint = "Recording level looks usable";

      if (peakLevel >= 0.98) {
        simpleLevelHint = "Recording may be clipped";
      } else if (peakLevel < 0.08 || rmsLevel < 0.015) {
        simpleLevelHint = "Recording may be too quiet";
      }

      if (!isMountedRef.current || audioAnalysisRunId !== audioAnalysisRunIdRef.current) {
        return;
      }

      setAudioAnalysisResult({
        durationSeconds: audioBuffer.duration,
        peakLevel,
        rmsLevel,
        simpleLevelHint,
      });
    } catch {
      if (isMountedRef.current && audioAnalysisRunId === audioAnalysisRunIdRef.current) {
        setAudioAnalysisError("Local audio analysis failed in this browser.");
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }

      if (isMountedRef.current && audioAnalysisRunId === audioAnalysisRunIdRef.current) {
        setIsAnalyzingAudio(false);
      }
    }
  };


  const handleEstimatePitchLocally = async () => {
    if (!recordedAudioBlob) {
      setPitchEstimateError("Record a local attempt before estimating pitch locally.");
      return;
    }

    setPitchEstimateError("");
    setPitchEstimateResult(null);
    setIsEstimatingPitch(true);

    const pitchEstimateRunId = pitchEstimateRunIdRef.current + 1;
    pitchEstimateRunIdRef.current = pitchEstimateRunId;
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioData = await recordedAudioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const result = estimateLocalPitch(audioBuffer);

      if (isMountedRef.current && pitchEstimateRunId === pitchEstimateRunIdRef.current) {
        setPitchEstimateResult(result);
      }
    } catch (error) {
      if (isMountedRef.current && pitchEstimateRunId === pitchEstimateRunIdRef.current) {
        setPitchEstimateError(error instanceof Error ? error.message : "Local pitch estimation failed in this browser.");
      }
    } finally {
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }

      if (isMountedRef.current && pitchEstimateRunId === pitchEstimateRunIdRef.current) {
        setIsEstimatingPitch(false);
      }
    }
  };

  const handlePlayRecordedAttempt = () => {
    if (!recordedAudioUrl) {
      return;
    }

    const audio = new Audio(recordedAudioUrl);
    void audio.play().catch(() => {
      setRecordingError("Recorded attempt playback failed in this browser.");
    });
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
    setRecordingError("");
    setAudioAnalysisError("");
    setAudioAnalysisResult(null);
    setIsAnalyzingAudio(false);
    setPitchEstimateResult(null);
    setPitchEstimateError("");
    setIsEstimatingPitch(false);
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

  const isListening = flowState === "listening";
  const isAnyTargetPlaybackActive = isListening || isSelectedTargetNotePlaying;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold text-emerald-600">Early learning prototype</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Practice Mode</h1>
          <p className="mt-3 text-slate-600">
            This page is an interactive mock practice flow for a future recognition + practice + assessment learning tool.
          </p>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Current status: browser local-only recording prototype, no upload, no real scoring, no AI API call, and no real pitch/rhythm evaluation. Feedback is mock-only.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mock melody exercise</p>
            <h2 className="mt-2 text-2xl font-bold">{mockExercise.title}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Target notes</dt><dd className="mt-1 text-slate-600">{mockExercise.targetNotes.join(" · ")}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Suggested BPM</dt><dd className="mt-1 text-slate-600">{mockExercise.suggestedBpm} BPM</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:col-span-2"><dt className="font-semibold text-slate-700">Practice goal</dt><dd className="mt-1 text-slate-600">{mockExercise.goal}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Practice steps</h2>
            <ol className="mt-4 space-y-3">
              {practiceSteps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{index + 1}</span>
                  <span className="font-medium text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-950">Interactive mock flow</h2>
              <p className="mt-1 text-sm font-medium text-blue-800">State: {flowState}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleListenToTarget} disabled={isListening} className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300">{isListening ? "Playing target..." : "Listen to target"}</button>
              <button type="button" onClick={stopPlayback} disabled={!isAnyTargetPlaybackActive} className="rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 disabled:text-slate-400">Stop playback</button>
              <button type="button" onClick={handleStartMockAttempt} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Start mock attempt</button>
              <button type="button" onClick={handleShowMockFeedback} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Show mock feedback</button>
              <button type="button" onClick={handleRetry} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Retry</button>
            </div>
          </div>

          {playError ? <p className="mt-3 text-sm font-semibold text-red-700">{playError}</p> : null}
          {flowState === "attempting" ? <p className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-800">This attempt can include one browser local-only recording. Audio is not uploaded, not saved to a server, and not scored.</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {mockExercise.targetNotes.map((note, index) => (
              <span key={`${note}-${index}`} className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${activeNoteIndex === index ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-blue-800 ring-blue-200"}`}>{note}</span>
            ))}
          </div>
        </section>


        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Guided local flow</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Single-note practice loop</h2>
              <p className="mt-2 text-sm text-slate-600">
                This is an experimental single-note practice loop. Use the controls below to record and estimate pitch.
              </p>
              <ol className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">1. Pick a target note</li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">2. Play selected target note</li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">3. Record your attempt locally</li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200">4. Estimate pitch locally</li>
                <li className="rounded-xl bg-slate-50 p-3 font-medium ring-1 ring-slate-200 sm:col-span-2">5. Review cents from target</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:max-w-xs">
              <p className="font-semibold">Prototype boundaries</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>This is not a formal score.</li>
                <li>This is not rhythm evaluation.</li>
                <li>Audio is not uploaded.</li>
                <li>No AI API call.</li>
              </ul>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Target note</dt><dd className="mt-1 text-slate-600">{selectedTargetNote}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Target frequency</dt><dd className="mt-1 text-slate-600">{noteFrequencies[selectedTargetNote].toFixed(2)} Hz</dd></div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Recording</dt><dd className="mt-1 text-slate-600">{recordedAudioBlob ? "Recorded attempt ready" : "No recording yet"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Pitch estimate</dt><dd className="mt-1 text-slate-600">{pitchEstimateResult ? "Pitch estimate ready" : "Not estimated yet"}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"><dt className="font-semibold text-slate-700">Comparison</dt><dd className="mt-1 text-slate-600">{pitchComparisonResult ? "Comparison ready" : "Waiting for pitch estimate"}</dd></div>
          </dl>

          {pitchEstimateResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Estimated frequency Hz</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.estimatedFrequencyHz.toFixed(2)}</dd></div>
              <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Nearest note</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.nearestNote}</dd></div>
            </dl>
          ) : null}

          {pitchComparisonResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Comparison hint</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.comparisonHint}</dd></div>
              <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Cents from target</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.centsFromTarget.toFixed(1)}</dd></div>
            </dl>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-emerald-950">Local recording prototype</h2>
              <p className="mt-1 text-sm font-medium text-emerald-800">
                Recording is local-only. Audio is not uploaded. No real pitch/rhythm scoring yet. No AI API call.
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                Start local recording asks your browser for microphone permission with navigator.mediaDevices.getUserMedia({"{ audio: true }"}).
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                Status: {isRecording ? `Recording locally for ${recordingSeconds}s` : recordedAudioUrl ? "Recorded attempt ready for local playback" : "No local recording yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleStartLocalRecording} disabled={isRecording} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">Start local recording</button>
              <button type="button" onClick={handleStopLocalRecording} disabled={!isRecording} className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 disabled:text-slate-400">Stop recording</button>
              <button type="button" onClick={handlePlayRecordedAttempt} disabled={!recordedAudioUrl || isRecording} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Play recorded attempt</button>
              <button type="button" onClick={handleAnalyzeLocalRecording} disabled={!recordedAudioBlob || isRecording || isAnalyzingAudio} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{isAnalyzingAudio ? "Analyzing locally..." : "Analyze local recording"}</button>
              <button type="button" onClick={handleEstimatePitchLocally} disabled={!recordedAudioBlob || isRecording || isEstimatingPitch} className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{isEstimatingPitch ? "Estimating locally..." : "Estimate pitch locally"}</button>
              <button type="button" onClick={handleClearRecording} disabled={!recordedAudioUrl && !recordedAudioBlob && !isRecording && !recordingError && !audioAnalysisError && !audioAnalysisResult && !pitchEstimateError && !pitchEstimateResult} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400">Clear recording</button>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900">
            <p className="font-semibold">Local audio analysis scope</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>This is not pitch detection.</li>
              <li>This is not rhythm evaluation.</li>
              <li>This is only local recording quality analysis.</li>
              <li>Audio is not uploaded.</li>
            </ul>
          </div>
          {recordingError ? <p className="mt-3 text-sm font-semibold text-red-700">{recordingError}</p> : null}
          {audioAnalysisError ? <p className="mt-3 text-sm font-semibold text-red-700">{audioAnalysisError}</p> : null}
          {pitchEstimateError ? <p className="mt-3 text-sm font-semibold text-red-700">{pitchEstimateError}</p> : null}
          {recordedAudioUrl ? <audio className="mt-4 w-full" controls src={recordedAudioUrl}>Your browser does not support audio playback.</audio> : null}
          <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-indigo-900">
            <p className="font-semibold">Experimental local pitch estimate</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>This is not a formal pitch score.</li>
              <li>This is not rhythm evaluation.</li>
              <li>Audio is not uploaded.</li>
              <li>No AI API call.</li>
            </ul>
          </div>
          {pitchEstimateResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Estimated frequency Hz</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.estimatedFrequencyHz.toFixed(2)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Nearest note</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.nearestNote}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Cents offset</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.centsOffset.toFixed(1)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Confidence</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.confidence.toFixed(2)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Frames analyzed</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.framesAnalyzed}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-indigo-200"><dt className="font-semibold text-indigo-950">Valid pitch frames</dt><dd className="mt-1 text-indigo-800">{pitchEstimateResult.validPitchFrames}</dd></div>
            </dl>
          ) : null}
          <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-sm text-violet-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">Experimental target-aware pitch comparison</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>This is not a formal score.</li>
                  <li>This is not rhythm evaluation.</li>
                  <li>Audio is not uploaded.</li>
                  <li>No AI API call.</li>
                  <li>This only compares the local estimated pitch to one selected target note.</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <label className="text-sm font-semibold text-violet-950">
                  Target note selector
                  <select
                    className="mt-2 block rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-900"
                    value={selectedTargetNote}
                    onChange={(event) => setSelectedTargetNote(event.target.value)}
                  >
                    {targetNoteOptions.map((note) => (
                      <option key={note} value={note}>{note}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handlePlaySelectedTargetNote}
                  disabled={isSelectedTargetNotePlaying}
                  className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-violet-300"
                >
                  {isSelectedTargetNotePlaying ? "Playing selected note..." : "Play selected target note"}
                </button>
              </div>
            </div>
            {pitchComparisonResult && pitchEstimateResult ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Target frequency</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.targetFrequencyHz.toFixed(2)} Hz ({pitchComparisonResult.targetNote})</dd></div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Local estimated pitch</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.estimatedFrequencyHz.toFixed(2)} Hz</dd></div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Nearest note</dt><dd className="mt-1 text-violet-800">{pitchEstimateResult.nearestNote}</dd></div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Frames analyzed / valid pitch frames</dt><dd className="mt-1 text-violet-800">{pitchEstimateResult.framesAnalyzed} / {pitchEstimateResult.validPitchFrames}</dd></div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Cents from target</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.centsFromTarget.toFixed(1)}</dd></div>
                <div className="rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200"><dt className="font-semibold text-violet-950">Comparison hint</dt><dd className="mt-1 text-violet-800">{pitchComparisonResult.comparisonHint}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 rounded-xl bg-violet-50 p-4 font-medium text-violet-800">
                Estimate pitch locally to compare the local estimated pitch against the selected target note.
              </p>
            )}
          </div>
          {audioAnalysisResult ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200"><dt className="font-semibold text-emerald-950">Duration seconds</dt><dd className="mt-1 text-emerald-800">{audioAnalysisResult.durationSeconds.toFixed(2)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200"><dt className="font-semibold text-emerald-950">Peak level</dt><dd className="mt-1 text-emerald-800">{audioAnalysisResult.peakLevel.toFixed(4)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200"><dt className="font-semibold text-emerald-950">RMS level</dt><dd className="mt-1 text-emerald-800">{audioAnalysisResult.rmsLevel.toFixed(4)}</dd></div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-200"><dt className="font-semibold text-emerald-950">Simple level hint</dt><dd className="mt-1 text-emerald-800">{audioAnalysisResult.simpleLevelHint}</dd></div>
            </dl>
          ) : null}
        </section>

        {hasMockFeedback ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Mock pitch feedback</h2><p className="mt-2 text-sm text-slate-600">{mockFeedback.pitch} This is not real pitch detection or scoring.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Mock rhythm feedback</h2><p className="mt-2 text-sm text-slate-600">{mockFeedback.rhythm} This is not real rhythm evaluation or scoring.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Mock AI-style learning feedback</h2><p className="mt-2 text-sm text-slate-600">{mockFeedback.learning} No AI API is called.</p></section>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Pitch feedback placeholder</h2><p className="mt-2 text-sm text-slate-600">No real pitch detection is implemented here.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Rhythm feedback placeholder</h2><p className="mt-2 text-sm text-slate-600">No real rhythm evaluation is implemented here.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">AI feedback placeholder</h2><p className="mt-2 text-sm text-slate-600">This page does not call any AI API.</p></section>
          </div>
        )}
      </section>
    </main>
  );
}
