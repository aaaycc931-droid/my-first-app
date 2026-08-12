"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { createBrowserRecognitionNotesPlaybackPort } from "../../lib/audio/recognitionNotesPlayback";
import {
  createRecognitionNotesPlaybackController,
  type RecognitionNotesPlaybackController,
} from "../../lib/recognition/recognitionNotesPlaybackController";

export const createRecognitionNotesPlaybackControllerLifecycle = (
  controller: RecognitionNotesPlaybackController,
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

export function useRecognitionNotesPlaybackController() {
  const [controller] = useState(() =>
    createRecognitionNotesPlaybackController(
      createBrowserRecognitionNotesPlaybackPort(),
    ),
  );
  const [lifecycle] = useState(() =>
    createRecognitionNotesPlaybackControllerLifecycle(controller),
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
    play: controller.play,
    stop: controller.stop,
    clearError: controller.clearError,
  };
}
