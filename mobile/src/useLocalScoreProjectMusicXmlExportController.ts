"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  createLocalScoreProjectMusicXmlExportController,
  type LocalScoreProjectMusicXmlExportController,
  type LocalScoreProjectMusicXmlExportDownloadPort,
} from "../../lib/music/localScoreProjectMusicXmlExportController";

export const createLocalScoreProjectMusicXmlExportControllerLifecycle = (
  controller: LocalScoreProjectMusicXmlExportController,
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

export function useLocalScoreProjectMusicXmlExportController({
  downloadPort,
  publishNotice,
}: {
  downloadPort: LocalScoreProjectMusicXmlExportDownloadPort;
  publishNotice: (notice: string | null) => void;
}) {
  const [controller] = useState(() =>
    createLocalScoreProjectMusicXmlExportController({
      downloadPort,
      publishNotice,
    }),
  );
  const [lifecycle] = useState(() =>
    createLocalScoreProjectMusicXmlExportControllerLifecycle(controller),
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
    inspect: controller.inspect,
    changeFormat: controller.changeFormat,
    clear: controller.clear,
    invalidate: controller.invalidate,
    confirmAndDownload: controller.confirmAndDownload,
  };
}
