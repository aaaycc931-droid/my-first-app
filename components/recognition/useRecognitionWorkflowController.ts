"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { RecognitionApiClient } from "../../lib/recognition/browserRecognitionApiClient";
import type { RecognitionFilePreviewPort } from "../../lib/recognition/browserRecognitionFilePreview";
import {
  createRecognitionWorkflowController,
  type RecognitionWorkflowController,
  type RecognitionWorkflowEffects,
} from "../../lib/recognition/recognitionWorkflowController";

const createControllerLifecycle = (
  controller: RecognitionWorkflowController,
): Readonly<{
  mount: () => void;
  unmount: () => void;
}> => {
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

export const useRecognitionWorkflowController = (
  apiClient: RecognitionApiClient,
  previewPort: RecognitionFilePreviewPort,
  effects: RecognitionWorkflowEffects,
): Readonly<{
  controller: RecognitionWorkflowController;
  state: ReturnType<RecognitionWorkflowController["getState"]>;
}> => {
  const controller = useMemo(
    () =>
      createRecognitionWorkflowController(apiClient, previewPort, effects),
    [apiClient, effects, previewPort],
  );
  const lifecycle = useMemo(
    () => createControllerLifecycle(controller),
    [controller],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  useEffect(() => {
    lifecycle.mount();
    return lifecycle.unmount;
  }, [lifecycle]);

  return { controller, state };
};
