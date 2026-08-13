"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import { browserPracticeStandaloneMetronomePort } from "../../lib/metronome/practiceStandaloneMetronome";
import {
  createPracticeStandaloneMetronomeController,
  type PracticeStandaloneMetronomeController,
} from "../../lib/practice/practiceStandaloneMetronomeController";

export const createPracticeStandaloneMetronomeLifecycle = (
  controller: PracticeStandaloneMetronomeController,
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

export function usePracticeStandaloneMetronomeController() {
  const [controller] = useState(() =>
    createPracticeStandaloneMetronomeController(
      browserPracticeStandaloneMetronomePort,
    ),
  );
  const [lifecycle] = useState(() =>
    createPracticeStandaloneMetronomeLifecycle(controller),
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

  useEffect(() => {
    const stopOnBlur = () => controller.stop();
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") controller.stop();
    };
    window.addEventListener("blur", stopOnBlur);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("blur", stopOnBlur);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [controller]);

  return {
    ...snapshot,
    start: (
      request: Parameters<PracticeStandaloneMetronomeController["start"]>[0],
    ) => {
      if (controller.getSnapshot().status !== "idle") {
        return Promise.resolve(false);
      }
      stopAllBrowserAudio();
      return controller.start(request);
    },
    stop: controller.stop,
  };
}
