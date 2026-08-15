"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import { createBrowserLocalVocalReferencePlaybackPort } from "../../lib/audio/localVocalReferencePlayback";
import {
  createLocalVocalReferencePlaybackController,
  type LocalVocalReferencePlaybackController,
} from "../../lib/practice/localVocalReferencePlaybackController";

export const createLocalVocalReferencePlaybackControllerLifecycle = (
  controller: LocalVocalReferencePlaybackController,
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

export function useLocalVocalReferencePlaybackController(
  createController = () => createLocalVocalReferencePlaybackController(
    createBrowserLocalVocalReferencePlaybackPort(),
  ),
) {
  const [controller] = useState(createController);
  const [lifecycle] = useState(() =>
    createLocalVocalReferencePlaybackControllerLifecycle(controller),
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
    play: (
      request: Parameters<LocalVocalReferencePlaybackController["play"]>[0],
    ) => {
      stopAllBrowserAudio();
      return controller.play(request);
    },
    stop: controller.stop,
  };
}
