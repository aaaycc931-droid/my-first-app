"use client";

import { useCallback, useEffect, useState } from "react";

import type { LocalNotationProjectScoreDocumentV1 } from "../../lib/music/scoreDocument";
import type { PianoVoiceProvider } from "../../lib/piano/pianoAudioProvider";
import {
  useLocalScoreProjectMetronome,
  type LocalScoreProjectMetronomeSchedulerFactory,
} from "./useLocalScoreProjectMetronome";
import {
  useLocalScoreProjectPlayback,
} from "./useLocalScoreProjectPlayback";
import type { LocalPianoAudioChannelFactory } from "./useLocalPianoAudio";

export type LocalScoreProjectTransportMode =
  | "idle"
  | "score-playing"
  | "metronome-starting"
  | "metronome-running";

type NoticeOwner = {
  source: "score" | "metronome";
  configIdentity: string;
} | null;

export function useLocalScoreProjectTransport({
  document: scoreDocument,
  bpm,
  createAudioChannel,
  voiceProvider,
  createMetronomeScheduler,
}: {
  document: LocalNotationProjectScoreDocumentV1;
  bpm: number;
  createAudioChannel?: LocalPianoAudioChannelFactory;
  voiceProvider?: PianoVoiceProvider;
  createMetronomeScheduler?: LocalScoreProjectMetronomeSchedulerFactory;
}) {
  const playback = useLocalScoreProjectPlayback({
    document: scoreDocument,
    bpm,
    createAudioChannel,
    voiceProvider,
  });
  const metronome = useLocalScoreProjectMetronome({
    bpm,
    meter: scoreDocument.meter,
    revision: scoreDocument.revision,
    createScheduler: createMetronomeScheduler,
  });
  const [noticeOwner, setNoticeOwner] = useState<NoticeOwner>(null);
  const configIdentity =
    `${bpm}:${scoreDocument.meter}:${scoreDocument.revision}`;
  const stopPlayback = playback.stop;
  const startScorePlayback = playback.play;
  const stopMetronome = metronome.stop;
  const startMetronomeScheduler = metronome.start;

  const stop = useCallback(() => {
    stopPlayback();
    stopMetronome();
    setNoticeOwner(null);
  }, [stopMetronome, stopPlayback]);

  const playScore = useCallback(() => {
    stopMetronome();
    setNoticeOwner({ source: "score", configIdentity });
    return startScorePlayback();
  }, [configIdentity, startScorePlayback, stopMetronome]);

  const startMetronome = useCallback(async () => {
    stopPlayback();
    setNoticeOwner({ source: "metronome", configIdentity });
    return startMetronomeScheduler();
  }, [configIdentity, startMetronomeScheduler, stopPlayback]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") stop();
    };
    window.addEventListener("blur", stop);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", stop);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [stop]);

  const mode: LocalScoreProjectTransportMode = playback.isPlaying
    ? "score-playing"
    : metronome.isStarting
      ? "metronome-starting"
      : metronome.isRunning
        ? "metronome-running"
        : "idle";

  return {
    mode,
    plan: playback.plan,
    activeSourceEventIds: playback.activeSourceEventIds,
    beat: metronome.beat,
    notice: noticeOwner?.configIdentity === configIdentity
      ? noticeOwner.source === "score"
        ? playback.notice
        : metronome.notice
      : null,
    keyboardState: playback.keyboardState,
    timbre: playback.timbre,
    playScore,
    startMetronome,
    stop,
    retryAudio: playback.retryAudio,
  };
}
