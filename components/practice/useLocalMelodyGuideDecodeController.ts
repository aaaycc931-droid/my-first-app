"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { createBrowserLocalMelodyGuideDecodePort } from "../../lib/audio/localMelodyGuideDecode";
import {
  createLocalMelodyGuideDecodeController,
  type LocalMelodyGuideDecodeController,
} from "../../lib/practice/localMelodyGuideDecodeController";

export const createLocalMelodyGuideDecodeControllerLifecycle = (
  controller: LocalMelodyGuideDecodeController,
) => {
  let activeEffectCount = 0;
  return {
    mount: () => {
      activeEffectCount += 1;
      controller.attach();
    },
    unmount: () => {
      activeEffectCount -= 1;
      void Promise.resolve().then(() => {
        if (activeEffectCount === 0) controller.detach();
      });
    },
  };
};

export function useLocalMelodyGuideDecodeController() {
  const [controller] = useState(() =>
    createLocalMelodyGuideDecodeController({
      port: createBrowserLocalMelodyGuideDecodePort(),
    }),
  );
  const [lifecycle] = useState(() =>
    createLocalMelodyGuideDecodeControllerLifecycle(controller),
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
    select: controller.select,
    clear: controller.clear,
  };
}
