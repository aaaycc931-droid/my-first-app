"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import type { MetronomeConfig, MetronomeMeter } from "../../lib/metronome/metronomeConfig";
import type { MetronomeBeatMetadata } from "../../lib/metronome/metronomeGrid";
import {
  BrowserMetronomeScheduler,
  type MetronomeSchedulerOptions,
} from "../../lib/metronome/metronomeScheduler";

export type LocalScoreProjectMetronomeScheduler = {
  start: () => Promise<void>;
  stop: () => void;
};

export type LocalScoreProjectMetronomeSchedulerFactory = (
  options: MetronomeSchedulerOptions,
) => LocalScoreProjectMetronomeScheduler;

const createDefaultScheduler: LocalScoreProjectMetronomeSchedulerFactory =
  (options) => new BrowserMetronomeScheduler(options);

export function useLocalScoreProjectMetronome({
  bpm,
  meter,
  revision,
  createScheduler = createDefaultScheduler,
}: {
  bpm: number;
  meter: MetronomeMeter;
  revision: number;
  createScheduler?: LocalScoreProjectMetronomeSchedulerFactory;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [beat, setBeat] = useState<MetronomeBeatMetadata | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const schedulerRef = useRef<LocalScoreProjectMetronomeScheduler | null>(null);
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    schedulerRef.current?.stop();
    schedulerRef.current = null;
    setIsStarting(false);
    setIsRunning(false);
    setBeat(null);
  }, []);

  const start = useCallback(async () => {
    if (schedulerRef.current) return false;
    stop();
    stopAllBrowserAudio();
    setNotice(null);
    setIsStarting(true);
    const generation = generationRef.current;
    let scheduler: LocalScoreProjectMetronomeScheduler;
    const config: MetronomeConfig = {
      bpm,
      meter,
      countIn: { enabled: false, bars: 0 },
      subdivision: "quarter",
    };
    scheduler = createScheduler({
      config,
      onBeat: (nextBeat) => {
        if (
          schedulerRef.current === scheduler
          && generationRef.current === generation
        ) setBeat(nextBeat);
      },
    });
    schedulerRef.current = scheduler;
    try {
      await scheduler.start();
      if (
        schedulerRef.current !== scheduler
        || generationRef.current !== generation
      ) {
        scheduler.stop();
        return false;
      }
      setIsStarting(false);
      setIsRunning(true);
      return true;
    } catch {
      scheduler.stop();
      if (schedulerRef.current === scheduler) schedulerRef.current = null;
      if (generationRef.current === generation) {
        setIsStarting(false);
        setIsRunning(false);
        setBeat(null);
        setNotice("当前设备无法启动本机节拍器，请检查媒体音量，或稍后重试。");
      }
      return false;
    }
  }, [bpm, createScheduler, meter, stop]);

  useEffect(() => subscribeBrowserAudioStopAll(stop), [stop]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [stop]);

  useEffect(
    () => () => stop(),
    [bpm, meter, revision, stop],
  );

  return { beat, isRunning, isStarting, notice, start, stop };
}
