"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { browserPracticeRhythmRuntimePort } from "../../lib/metronome/practiceRhythmRuntime";
import {
  createPracticeRhythmRuntimeController,
  type PracticeRhythmRunPlan,
  type PracticeRhythmRuntimeController,
} from "../../lib/practice/practiceRhythmRuntimeController";

export const createPracticeRhythmRuntimeControllerLifecycle = (
  controller: PracticeRhythmRuntimeController,
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

export function usePracticeRhythmRuntimeController() {
  const [controller] = useState(() =>
    createPracticeRhythmRuntimeController(browserPracticeRhythmRuntimePort),
  );
  const [lifecycle] = useState(() =>
    createPracticeRhythmRuntimeControllerLifecycle(controller),
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
    start: (plan: PracticeRhythmRunPlan) => controller.start(plan),
    rejectStart: controller.rejectStart,
    tap: controller.tap,
    stop: controller.stop,
    reset: controller.reset,
    cancel: controller.cancel,
  };
}
