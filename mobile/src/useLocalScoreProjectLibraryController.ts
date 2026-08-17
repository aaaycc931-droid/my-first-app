"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  createLocalScoreProjectLibraryController,
  type LocalScoreProjectLibraryController,
  type LocalScoreProjectLibraryPort,
} from "../../lib/music/localScoreProjectLibraryController";
import {
  deleteLocalScoreProject,
  listLocalScoreProjects,
  loadLocalScoreProject,
  type LocalScoreProjectStore,
} from "./runtime/localScoreProjectStorage";

export const createLocalScoreProjectLibraryControllerLifecycle = (
  controller: LocalScoreProjectLibraryController,
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

export function useLocalScoreProjectLibraryController({
  store,
  publishNotice,
}: {
  store: LocalScoreProjectStore;
  publishNotice: (notice: string | null) => void;
}) {
  const [port] = useState<LocalScoreProjectLibraryPort>(() => ({
    list: () => listLocalScoreProjects({ store }),
    load: (projectId) => loadLocalScoreProject({ store, projectId }),
    delete: (project) => deleteLocalScoreProject({ store, project }),
  }));
  const [controller] = useState(() =>
    createLocalScoreProjectLibraryController({ port, publishNotice }),
  );
  const [lifecycle] = useState(() =>
    createLocalScoreProjectLibraryControllerLifecycle(controller),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    lifecycle.mount();
    void controller.refresh();
    return lifecycle.unmount;
  }, [controller, lifecycle]);

  return {
    ...snapshot,
    refresh: controller.refresh,
    upsertProject: controller.upsertProject,
    openProject: controller.openProject,
    requestDelete: controller.requestDelete,
    cancelDelete: controller.cancelDelete,
    confirmDelete: controller.confirmDelete,
  };
}
