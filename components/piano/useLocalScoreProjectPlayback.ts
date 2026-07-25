"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createLocalScoreProjectPlaybackPlan,
  type LocalScoreProjectPlaybackEvent,
  type LocalScoreProjectPlaybackVoiceSelection,
} from "../../lib/music/localScoreProjectPlayback";
import type { LocalNotationProjectScoreDocumentV1 } from "../../lib/music/scoreDocument";
import { getFullPianoKeys } from "../../lib/piano/localPianoKeyboard";
import type { PianoVoiceProvider } from "../../lib/piano/pianoAudioProvider";
import {
  useLocalPianoAudio,
  type LocalPianoAudioChannelFactory,
} from "./useLocalPianoAudio";

export type LocalScoreProjectPlaybackState = "空闲" | "播放中";

const PLAYBACK_VELOCITY = 0.68;

export function useLocalScoreProjectPlayback({
  document,
  bpm,
  voiceSelection = "all",
  createAudioChannel,
  voiceProvider,
}: {
  document: LocalNotationProjectScoreDocumentV1;
  bpm: number;
  voiceSelection?: LocalScoreProjectPlaybackVoiceSelection;
  createAudioChannel?: LocalPianoAudioChannelFactory;
  voiceProvider?: PianoVoiceProvider;
}) {
  const keys = useMemo(() => getFullPianoKeys(), []);
  const keyIdByMidi = useMemo(
    () => new Map(keys.map((key) => [key.midi, key.id])),
    [keys],
  );
  const plan = useMemo(
    () => createLocalScoreProjectPlaybackPlan({
      document,
      bpm,
      voiceSelection,
    }),
    [bpm, document, voiceSelection],
  );
  const planIdentity = plan.status === "ready" ? plan.scheduleId : plan.reason;
  const [activePlanIdentity, setActivePlanIdentity] = useState<string | null>(null);
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null);
  const timersRef = useRef(new Set<number>());
  const runRef = useRef(0);

  const clearSchedule = useCallback(() => {
    runRef.current += 1;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setActivePlanIdentity(null);
  }, []);

  const handleExternalAudioStop = useCallback(() => {
    clearSchedule();
  }, [clearSchedule]);

  const {
    keyboardState,
    timbre,
    notice: audioNotice,
    pressKey,
    releasePointer,
    stopAll: stopAllAudio,
    retryAudio,
  } = useLocalPianoAudio({
    keys,
    createChannel: createAudioChannel,
    voiceProvider,
    onExternalAudioStop: handleExternalAudioStop,
  });

  const stop = useCallback(() => {
    clearSchedule();
    stopAllAudio();
  }, [clearSchedule, stopAllAudio]);

  const executeEvent = useCallback(
    (event: LocalScoreProjectPlaybackEvent) => {
      if (event.type === "all-notes-off") {
        clearSchedule();
        stopAllAudio();
        return;
      }

      const keyId = keyIdByMidi.get(event.midi);
      if (!keyId) {
        clearSchedule();
        stopAllAudio();
        setPlaybackNotice("播放计划包含本地钢琴范围外的音高，已停止。");
        return;
      }
      if (event.type === "note-on") {
        pressKey(event.pointerId, keyId, PLAYBACK_VELOCITY);
      } else {
        releasePointer(event.pointerId);
      }
    },
    [
      clearSchedule,
      keyIdByMidi,
      pressKey,
      releasePointer,
      stopAllAudio,
    ],
  );

  const play = useCallback(() => {
    stop();
    setPlaybackNotice(null);
    if (plan.status === "blocked") {
      setPlaybackNotice(plan.reason);
      return false;
    }

    const run = runRef.current;
    setActivePlanIdentity(planIdentity);
    const eventsByDelay = new Map<number, LocalScoreProjectPlaybackEvent[]>();
    plan.events.forEach((event) => {
      const group = eventsByDelay.get(event.delayMs);
      if (group) group.push(event);
      else eventsByDelay.set(event.delayMs, [event]);
    });

    eventsByDelay.forEach((events, delayMs) => {
      const executeGroup = () => {
        if (runRef.current !== run) return;
        events.forEach(executeEvent);
      };
      if (delayMs <= 0) {
        executeGroup();
        return;
      }
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        executeGroup();
      }, delayMs);
      timersRef.current.add(timer);
    });
    return true;
  }, [executeEvent, plan, planIdentity, stop]);

  useEffect(() => () => {
    runRef.current += 1;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    stopAllAudio();
  }, [planIdentity, stopAllAudio]);

  const isPlaying = activePlanIdentity === planIdentity;
  const playbackState: LocalScoreProjectPlaybackState =
    isPlaying ? "播放中" : "空闲";

  return {
    plan,
    playbackState,
    isPlaying,
    notice: playbackNotice ?? audioNotice,
    keyboardState,
    timbre,
    play,
    stop,
    retryAudio,
  };
}
