"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  createLocalScoreProjectMutationController,
  type LocalScoreProjectMutationController,
  type LocalScoreProjectMutationPort,
} from "../../lib/music/localScoreProjectMutationController";
import {
  persistLocalScoreProjectChange,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

export const createLocalScoreProjectMutationControllerLifecycle = (
  controller: LocalScoreProjectMutationController,
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

export function useLocalScoreProjectMutationController({
  store,
  publishNotice,
}: {
  store: LocalScoreProjectStore;
  publishNotice: (notice: string | null) => void;
}) {
  const [port] = useState<LocalScoreProjectMutationPort>(() => ({
    persist: (currentProject, proposedProject) =>
      persistLocalScoreProjectChange({
        store,
        currentProject,
        proposedProject,
      }),
  }));
  const [controller] = useState(() =>
    createLocalScoreProjectMutationController({ port, publishNotice }),
  );
  const [lifecycle] = useState(() =>
    createLocalScoreProjectMutationControllerLifecycle(controller),
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
    persistMutation: controller.persistMutation,
  };
}
