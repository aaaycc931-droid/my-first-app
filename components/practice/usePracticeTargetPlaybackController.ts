"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import { createBrowserPracticeTargetPlaybackPort } from "../../lib/audio/practiceTargetPlayback";
import {
  createPracticeTargetPlaybackController,
  type PracticeTargetPlaybackController,
} from "../../lib/practice/practiceTargetPlaybackController";

export const createPracticeTargetPlaybackControllerLifecycle = (
  controller: PracticeTargetPlaybackController,
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

export function usePracticeTargetPlaybackController() {
  const [controller] = useState<PracticeTargetPlaybackController>(() =>
    createPracticeTargetPlaybackController(
      createBrowserPracticeTargetPlaybackPort(),
    ),
  );
  const [lifecycle] = useState(() =>
    createPracticeTargetPlaybackControllerLifecycle(controller),
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
    playSequence: (
      request: Parameters<PracticeTargetPlaybackController["playSequence"]>[0],
    ) => {
      stopAllBrowserAudio();
      return controller.playSequence(request);
    },
    playNote: (
      request: Parameters<PracticeTargetPlaybackController["playNote"]>[0],
    ) => {
      stopAllBrowserAudio();
      return controller.playNote(request);
    },
    stop: controller.stop,
  };
}
