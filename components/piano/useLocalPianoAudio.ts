"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import {
  createLocalPianoKeyboardState,
  pressLocalPianoKey,
  releaseLocalPianoPointer,
  resetLocalPianoKeyboard,
  setLocalPianoSustain,
  setLocalPianoVolume,
  type LocalPianoKey,
  type LocalPianoKeyboardState,
  type LocalPianoPointerId,
} from "../../lib/piano/localPianoKeyboard";
import {
  type PianoTimbreDescriptor,
  type PianoVoiceHandle,
  type PianoVoiceProvider,
} from "../../lib/piano/pianoAudioProvider";
import { SPLENDID_GRAND_PIANO_PROVIDER } from "../../lib/piano/splendidGrandPiano";
import type { PianoPerformanceEventInput } from "../../lib/piano/pianoPerformance";

export type LocalPianoAudioChannel = Pick<
  BrowserAudioChannel,
  "prepareForUserGesture" | "stop" | "trackSource"
>;

export type LocalPianoAudioChannelFactory = () => LocalPianoAudioChannel;

type ActiveVoice = {
  channel: LocalPianoAudioChannel;
  voice: PianoVoiceHandle;
  watchdogTimer: number;
};

type PendingVoice = {
  channel: LocalPianoAudioChannel;
  request: number;
  timeoutTimer: number;
};

type ReleasingVoice = {
  channel: LocalPianoAudioChannel;
  timer: number;
};

export const LOCAL_PIANO_VOICE_WATCHDOG_MS = 10_000;
export const LOCAL_PIANO_PREPARE_TIMEOUT_MS = 5_000;

export function useLocalPianoAudio({
  keys,
  createChannel = createBrowserAudioChannel,
  voiceProvider = SPLENDID_GRAND_PIANO_PROVIDER,
  onPerformanceEvent,
  onExternalAudioStop,
}: {
  keys: readonly LocalPianoKey[];
  createChannel?: LocalPianoAudioChannelFactory;
  voiceProvider?: PianoVoiceProvider;
  onPerformanceEvent?: (event: PianoPerformanceEventInput) => void;
  onExternalAudioStop?: () => void;
}) {
  const [keyboardState, setKeyboardState] = useState<LocalPianoKeyboardState>(
    () => createLocalPianoKeyboardState(),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [resolvedTimbre, setResolvedTimbre] = useState<{
    providerId: string;
    descriptor: PianoTimbreDescriptor;
  }>(() => ({ providerId: voiceProvider.descriptor.id, descriptor: voiceProvider.descriptor }));
  const timbre = resolvedTimbre.providerId === voiceProvider.descriptor.id
    ? resolvedTimbre.descriptor
    : voiceProvider.descriptor;
  const stateRef = useRef(keyboardState);
  const keysById = useMemo(() => new Map(keys.map((key) => [key.id, key])), [keys]);
  const voicesRef = useRef(new Map<string, ActiveVoice>());
  const pendingRef = useRef(new Map<string, PendingVoice>());
  const releasingRef = useRef(new Set<ReleasingVoice>());
  const retryPreparationRef = useRef<PendingVoice | null>(null);
  const requestRef = useRef(0);
  const velocityRef = useRef(new Map<string, number>());
  const mountedRef = useRef(true);
  const isStartingOwnAudioRef = useRef(false);

  const commitState = useCallback((nextState: LocalPianoKeyboardState) => {
    stateRef.current = nextState;
    if (mountedRef.current) setKeyboardState(nextState);
  }, []);

  const stopVoice = useCallback((keyId: string, immediately = false) => {
    const pending = pendingRef.current.get(keyId);
    if (pending) {
      pendingRef.current.delete(keyId);
      window.clearTimeout(pending.timeoutTimer);
      pending.channel.stop();
    }

    const voice = voicesRef.current.get(keyId);
    if (!voice) return;
    voicesRef.current.delete(keyId);
    window.clearTimeout(voice.watchdogTimer);
    if (immediately) {
      voice.voice.release(true);
      voice.channel.stop();
      return;
    }

    try {
      voice.voice.release();
      const releasing = {} as ReleasingVoice;
      releasing.channel = voice.channel;
      releasing.timer = window.setTimeout(() => {
        voice.channel.stop();
        releasingRef.current.delete(releasing);
      }, 150);
      releasingRef.current.add(releasing);
    } catch {
      voice.channel.stop();
    }
  }, []);

  const startVoice = useCallback(
    async (keyId: string) => {
      if (voicesRef.current.has(keyId) || pendingRef.current.has(keyId)) return;
      const key = keysById.get(keyId);
      if (!key) return;

      if (voicesRef.current.size === 0 && pendingRef.current.size === 0) {
        isStartingOwnAudioRef.current = true;
        try {
          stopAllBrowserAudio();
        } finally {
          isStartingOwnAudioRef.current = false;
        }
      }

      const channel = createChannel();
      let rejectTimeout: ((error: Error) => void) | null = null;
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        rejectTimeout = reject;
      });
      const pending = {
        channel,
        request: requestRef.current,
        timeoutTimer: window.setTimeout(() => {
          rejectTimeout?.(new Error("钢琴音频准备超时"));
        }, LOCAL_PIANO_PREPARE_TIMEOUT_MS),
      };
      pendingRef.current.set(keyId, pending);
      if (mountedRef.current) setNotice(null);

      try {
        const context = await Promise.race([
          channel.prepareForUserGesture(),
          timeoutPromise,
        ]);
        if (
          pendingRef.current.get(keyId) !== pending
          || pending.request !== requestRef.current
          || !stateRef.current.activeKeyIds.includes(keyId)
          || !mountedRef.current
        ) {
          channel.stop();
          return;
        }
        if (voicesRef.current.has(keyId)) {
          pendingRef.current.delete(keyId);
          channel.stop();
          return;
        }

        const voice = await Promise.race([
          voiceProvider.startVoice({
            context,
            channel,
            event: {
              type: "note-on",
              note: key.midi,
              velocity: velocityRef.current.get(keyId) ?? 0.65,
              channel: 0,
              atMs: performance.now(),
            },
            frequencyHz: key.frequencyHz,
            volume: stateRef.current.volume,
            isCancelled: () => (
              pendingRef.current.get(keyId) !== pending
              || pending.request !== requestRef.current
              || !stateRef.current.activeKeyIds.includes(keyId)
              || !mountedRef.current
            ),
          }),
          timeoutPromise,
        ]);
        window.clearTimeout(pending.timeoutTimer);
        if (
          pendingRef.current.get(keyId) !== pending
          || pending.request !== requestRef.current
          || !stateRef.current.activeKeyIds.includes(keyId)
          || !mountedRef.current
        ) {
          voice.release(true);
          channel.stop();
          return;
        }
        pendingRef.current.delete(keyId);
        if (mountedRef.current) {
          setResolvedTimbre({
            providerId: voiceProvider.descriptor.id,
            descriptor: voice.timbre,
          });
          if (voiceProvider.descriptor.kind === "sampled" && voice.timbre.kind === "compatibility-synth") {
            setNotice("本地钢琴采样暂不可用，已自动切换到兼容降级音色。");
          }
        }
        const watchdogTimer = window.setTimeout(() => {
          const previous = stateRef.current;
          const pointers = Object.fromEntries(
            Object.entries(previous.pointers).filter(([, activeKeyId]) => activeKeyId !== keyId),
          );
          const next = {
            ...previous,
            pointers,
            activeKeyIds: previous.activeKeyIds.filter((activeKeyId) => activeKeyId !== keyId),
            latchedKeyIds: previous.latchedKeyIds.filter((activeKeyId) => activeKeyId !== keyId),
          };
          commitState(next);
          stopVoice(keyId, true);
          if (mountedRef.current) {
            setNotice("单个参考音已自动停止，以避免琴键释放事件丢失后持续发声。");
          }
        }, LOCAL_PIANO_VOICE_WATCHDOG_MS);
        voicesRef.current.set(keyId, {
          channel,
          voice,
          watchdogTimer,
        });
      } catch {
        window.clearTimeout(pending.timeoutTimer);
        if (pendingRef.current.get(keyId) === pending) {
          pendingRef.current.delete(keyId);
        }
        channel.stop();
        if (mountedRef.current && stateRef.current.activeKeyIds.includes(keyId)) {
          setNotice("当前手机暂时无法播放钢琴参考音。请确认媒体音量已开启后松开琴键重试。");
        }
      }
    },
    [commitState, createChannel, keysById, stopVoice, voiceProvider],
  );

  const reconcileVoices = useCallback(
    (previous: LocalPianoKeyboardState, next: LocalPianoKeyboardState) => {
      previous.activeKeyIds.forEach((keyId) => {
        if (!next.activeKeyIds.includes(keyId)) stopVoice(keyId);
      });
      next.activeKeyIds.forEach((keyId) => {
        if (!voicesRef.current.has(keyId) && !pendingRef.current.has(keyId)) {
          void startVoice(keyId);
        }
      });
    },
    [startVoice, stopVoice],
  );

  const pressKey = useCallback(
    (pointerId: LocalPianoPointerId, keyId: string, velocity = 0.65) => {
      const previous = stateRef.current;
      const next = pressLocalPianoKey(previous, pointerId, keyId);
      if (next === previous && !previous.activeKeyIds.includes(keyId)) {
        if (mountedRef.current) setNotice("最多可同时弹奏 32 个音，请先松开一个琴键。");
        return false;
      }
      velocityRef.current.set(keyId, Math.max(0.05, Math.min(1, velocity)));
      if (!previous.activeKeyIds.includes(keyId) && next.activeKeyIds.includes(keyId)) {
        const key = keysById.get(keyId);
        if (key) onPerformanceEvent?.({
          type: "note-on",
          keyId,
          note: key.midi,
          velocity: Math.max(0.05, Math.min(1, velocity)),
        });
      }
      commitState(next);
      if (previous.latchedKeyIds.includes(keyId) && !next.latchedKeyIds.includes(keyId)) {
        stopVoice(keyId, true);
        void startVoice(keyId);
      } else {
        reconcileVoices(previous, next);
      }
      return true;
    },
    [commitState, keysById, onPerformanceEvent, reconcileVoices, startVoice, stopVoice],
  );

  const releasePointer = useCallback(
    (pointerId: LocalPianoPointerId) => {
      const previous = stateRef.current;
      const next = releaseLocalPianoPointer(previous, pointerId);
      if (next === previous) return;
      const releasedKeyIds = Object.values(previous.pointers).filter(
        (keyId) => !Object.values(next.pointers).includes(keyId),
      );
      releasedKeyIds.forEach((keyId) => {
        const key = keysById.get(keyId);
        if (key) onPerformanceEvent?.({ type: "note-off", keyId, note: key.midi });
      });
      commitState(next);
      reconcileVoices(previous, next);
    },
    [commitState, keysById, onPerformanceEvent, reconcileVoices],
  );

  const setSustainEnabled = useCallback(
    (enabled: boolean) => {
      const previous = stateRef.current;
      const next = setLocalPianoSustain(previous, enabled);
      if (next !== previous) onPerformanceEvent?.({ type: "pedal", down: enabled });
      commitState(next);
      reconcileVoices(previous, next);
    },
    [commitState, onPerformanceEvent, reconcileVoices],
  );

  const changeVolume = useCallback(
    (volume: number) => {
      const next = setLocalPianoVolume(stateRef.current, volume);
      commitState(next);
      voicesRef.current.forEach((voice) => {
        try {
          voice.voice.setVolume(next.volume);
        } catch {
          // A voice may finish between the input event and this update.
        }
      });
    },
    [commitState],
  );

  const stopAll = useCallback(() => {
    if (stateRef.current.activeKeyIds.length > 0) {
      onPerformanceEvent?.({ type: "all-notes-off" });
    }
    requestRef.current += 1;
    pendingRef.current.forEach(({ channel, timeoutTimer }) => {
      window.clearTimeout(timeoutTimer);
      channel.stop();
    });
    pendingRef.current.clear();
    const retryPreparation = retryPreparationRef.current;
    if (retryPreparation) {
      window.clearTimeout(retryPreparation.timeoutTimer);
      retryPreparation.channel.stop();
      retryPreparationRef.current = null;
    }
    voicesRef.current.forEach((voice) => {
      window.clearTimeout(voice.watchdogTimer);
      voice.channel.stop();
    });
    voicesRef.current.clear();
    velocityRef.current.clear();
    releasingRef.current.forEach(({ channel, timer }) => {
      window.clearTimeout(timer);
      channel.stop();
    });
    releasingRef.current.clear();
    commitState(resetLocalPianoKeyboard(stateRef.current));
  }, [commitState, onPerformanceEvent]);

  const retryAudio = useCallback(async () => {
    setNotice(null);
    if (stateRef.current.activeKeyIds.length > 0) {
      stateRef.current.activeKeyIds.forEach((keyId) => {
        if (!voicesRef.current.has(keyId) && !pendingRef.current.has(keyId)) {
          void startVoice(keyId);
        }
      });
      return;
    }

    const channel = createChannel();
    let rejectTimeout: ((error: Error) => void) | null = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject;
    });
    const pending = {
      channel,
      request: requestRef.current,
      timeoutTimer: window.setTimeout(() => {
        rejectTimeout?.(new Error("钢琴音频准备超时"));
      }, LOCAL_PIANO_PREPARE_TIMEOUT_MS),
    };
    retryPreparationRef.current = pending;
    try {
      await Promise.race([channel.prepareForUserGesture(), timeoutPromise]);
      if (retryPreparationRef.current !== pending || !mountedRef.current) return;
      setNotice("声音已重新启用，请再按琴键。");
    } catch {
      if (retryPreparationRef.current === pending && mountedRef.current) {
        setNotice("当前手机暂时无法播放钢琴参考音。请确认媒体音量已开启后重试。");
      }
    } finally {
      window.clearTimeout(pending.timeoutTimer);
      channel.stop();
      if (retryPreparationRef.current === pending) retryPreparationRef.current = null;
    }
  }, [createChannel, startVoice]);

  useEffect(() => {
    const releaseWindowPointer = (event: PointerEvent) => releasePointer(event.pointerId);
    const stopOnBlur = () => stopAll();
    const stopWhenHidden = () => {
      if (document.hidden) stopAll();
    };
    window.addEventListener("pointerup", releaseWindowPointer);
    window.addEventListener("pointercancel", releaseWindowPointer);
    window.addEventListener("blur", stopOnBlur);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("pointerup", releaseWindowPointer);
      window.removeEventListener("pointercancel", releaseWindowPointer);
      window.removeEventListener("blur", stopOnBlur);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [releasePointer, stopAll]);

  useEffect(
    () => subscribeBrowserAudioStopAll(() => {
      if (!isStartingOwnAudioRef.current) {
        stopAll();
        onExternalAudioStop?.();
      }
    }),
    [onExternalAudioStop, stopAll],
  );

  useEffect(() => {
    mountedRef.current = true;
    const pendingVoices = pendingRef.current;
    const activeVoices = voicesRef.current;
    const releasingVoices = releasingRef.current;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      pendingVoices.forEach(({ channel, timeoutTimer }) => {
        window.clearTimeout(timeoutTimer);
        channel.stop();
      });
      pendingVoices.clear();
      const retryPreparation = retryPreparationRef.current;
      if (retryPreparation) {
        window.clearTimeout(retryPreparation.timeoutTimer);
        retryPreparation.channel.stop();
        retryPreparationRef.current = null;
      }
      activeVoices.forEach((voice) => {
        window.clearTimeout(voice.watchdogTimer);
        voice.channel.stop();
      });
      activeVoices.clear();
      releasingVoices.forEach(({ channel, timer }) => {
        window.clearTimeout(timer);
        channel.stop();
      });
      releasingVoices.clear();
    };
  }, []);

  return {
    keyboardState,
    timbre,
    notice,
    pressKey,
    releasePointer,
    setSustainEnabled,
    changeVolume,
    stopAll,
    retryAudio,
  };
}
