"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  createLocalScoreProjectMusicXmlImportController,
  type LocalScoreProjectMusicXmlImportController,
  type LocalScoreProjectMusicXmlImportFile,
} from "../../lib/music/localScoreProjectMusicXmlImportController";
import {
  createBrowserLocalScoreProjectMusicXmlImportFilePort,
} from "../../lib/platform/browserLocalScoreProjectMusicXmlImportFile";

export const createLocalScoreProjectMusicXmlImportControllerLifecycle = <
  TFile extends LocalScoreProjectMusicXmlImportFile,
>(controller: LocalScoreProjectMusicXmlImportController<TFile>) => {
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

export function useLocalScoreProjectMusicXmlImportController({
  now,
  createId,
}: {
  now: () => string;
  createId: () => string;
}) {
  const [controller] = useState(() =>
    createLocalScoreProjectMusicXmlImportController<File>({
      filePort: createBrowserLocalScoreProjectMusicXmlImportFilePort(),
      now,
      createId,
    }),
  );
  const [lifecycle] = useState(() =>
    createLocalScoreProjectMusicXmlImportControllerLifecycle(controller),
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
    consumeConfirmedDraft: controller.consumeConfirmedDraft,
  };
}
