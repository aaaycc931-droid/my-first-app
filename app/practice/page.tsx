"use client";

import { useEffect, useRef, useState } from "react";

type PracticeFlowState = "idle" | "listening" | "attempting" | "feedback";

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
    setFlowState((currentState) =>
      currentState === "listening" ? "idle" : currentState,
    );
  };

  useEffect(() => {
    recordedAudioUrlRef.current = recordedAudioUrl;
  }, [recordedAudioUrl]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      shouldDiscardRecordingRef.current = true;
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

  const handleStartMockAttempt = () => {
    stopPlayback();
    setHasMockFeedback(false);
    setFlowState("attempting");
  };

  const handleStartLocalRecording = async () => {
    stopPlayback();
    setHasMockFeedback(false);
    setRecordingError("");
    setRecordingSeconds(0);
    revokeRecordedAudioUrl(recordedAudioUrl);
    setRecordedAudioUrl(null);

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
    setRecordingError("");
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
              <button type="button" onClick={stopPlayback} disabled={!isListening} className="rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 disabled:text-slate-400">Stop playback</button>
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
              <button type="button" onClick={handleClearRecording} disabled={!recordedAudioUrl && !isRecording && !recordingError} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400">Clear recording</button>
            </div>
          </div>
          {recordingError ? <p className="mt-3 text-sm font-semibold text-red-700">{recordingError}</p> : null}
          {recordedAudioUrl ? <audio className="mt-4 w-full" controls src={recordedAudioUrl}>Your browser does not support audio playback.</audio> : null}
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
