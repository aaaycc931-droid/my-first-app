"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import { createBrowserNotationReferencePlaybackPort } from "../../lib/audio/notationReferencePlayback";
import {
  createNotationReferencePlaybackController,
  type NotationReferencePlaybackController,
} from "../../lib/practice/notationReferencePlaybackController";

export const createNotationReferencePlaybackControllerLifecycle = (
  controller: NotationReferencePlaybackController,
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

export function useNotationReferencePlaybackController() {
  const [controller] = useState(() =>
    createNotationReferencePlaybackController(
      createBrowserNotationReferencePlaybackPort(),
    ),
  );
  const [lifecycle] = useState(() =>
    createNotationReferencePlaybackControllerLifecycle(controller),
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

  useEffect(
    () => subscribeBrowserAudioStopAll(controller.stop),
    [controller],
  );

  return {
    ...snapshot,
    playTone: (
      request: Parameters<NotationReferencePlaybackController["playTone"]>[0],
    ) => {
      stopAllBrowserAudio();
      return controller.playTone(request);
    },
    playMelody: (
      request: Parameters<NotationReferencePlaybackController["playMelody"]>[0],
    ) => {
      stopAllBrowserAudio();
      return controller.playMelody(request);
    },
    stop: controller.stop,
  };
}
