"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  createPianoPlaybackRuntimeController,
  type PianoPlaybackRuntimeController,
  type PianoPlaybackRuntimeEvent,
} from "../../lib/piano/pianoPlaybackRuntimeController";

type PianoPlaybackActions = {
  pressKey: (pointerId: string, keyId: string, velocity: number) => void;
  releasePointer: (pointerId: string) => void;
  setSustain: (down: boolean) => void;
  stopAll: () => void;
};

export const createPianoPlaybackRuntimeControllerLifecycle = (
  controller: PianoPlaybackRuntimeController,
) => {
  let activeEffectCount = 0;
  return {
    mount: () => {
      activeEffectCount += 1;
    },
    unmount: () => {
      activeEffectCount -= 1;
      void Promise.resolve().then(() => {
        if (activeEffectCount === 0) controller.dispose();
      });
    },
  };
};

export function usePianoPlaybackRuntimeController(
  actions: PianoPlaybackActions,
) {
  const [controller] = useState(() =>
    createPianoPlaybackRuntimeController({
      setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
      clearTimer: (timer) =>
        globalThis.clearTimeout(
          timer as ReturnType<typeof globalThis.setTimeout>,
        ),
      pressKey: actions.pressKey,
      releasePointer: actions.releasePointer,
      setSustain: actions.setSustain,
      stopAll: actions.stopAll,
    }),
  );
  const [lifecycle] = useState(() =>
    createPianoPlaybackRuntimeControllerLifecycle(controller),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    lifecycle.mount();
    return lifecycle.unmount;
  }, [lifecycle]);

  return {
    ...snapshot,
    play: (request: {
      events: readonly PianoPlaybackRuntimeEvent[];
      baseDelayMs: number;
      loop: boolean;
    }) => controller.play(request),
    stop: controller.stop,
    cancel: controller.cancel,
  };
}
