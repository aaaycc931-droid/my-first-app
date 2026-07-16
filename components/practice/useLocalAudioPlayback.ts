"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";

export type LocalAudioPlaybackState = "空闲" | "准备中" | "播放中";

type SchedulePlayback = (
  context: AudioContext,
  channel: BrowserAudioChannel,
) => number;

export function useLocalAudioPlayback() {
  const channelRef = useRef<BrowserAudioChannel | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const [state, setState] = useState<LocalAudioPlaybackState>("空闲");

  const getChannel = () => {
    if (!channelRef.current) channelRef.current = createBrowserAudioChannel();
    return channelRef.current;
  };

  const stop = useCallback(() => {
    requestRef.current += 1;
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    channelRef.current?.stop();
    if (mountedRef.current) setState("空闲");
  }, []);

  const play = useCallback(
    async (schedule: SchedulePlayback): Promise<string | null> => {
      stopAllBrowserAudio();
      const request = requestRef.current + 1;
      requestRef.current = request;
      setState("准备中");

      try {
        const channel = getChannel();
        const context = await channel.prepareForUserGesture();
        if (!mountedRef.current || request !== requestRef.current) return null;

        const durationMs = schedule(context, channel);
        if (!Number.isFinite(durationMs) || durationMs <= 0) {
          throw new Error("本地音频时长无效");
        }
        if (!mountedRef.current || request !== requestRef.current) {
          channel.stop();
          return null;
        }

        setState("播放中");
        finishTimerRef.current = window.setTimeout(() => {
          if (request !== requestRef.current) return;
          stop();
        }, durationMs);
        return null;
      } catch {
        if (request === requestRef.current) stop();
        return "当前手机暂时无法播放本地声音。请确认媒体音量已开启后重试。";
      }
    },
    [stop],
  );

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = subscribeBrowserAudioStopAll(stop);
    return () => {
      unsubscribe();
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  return {
    isPlaying: state === "准备中" || state === "播放中",
    playbackState: state,
    play,
    stop,
  };
}
