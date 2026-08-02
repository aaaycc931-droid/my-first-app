"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { RecognitionApiClient } from "../../lib/recognition/browserRecognitionApiClient";
import type { RecognitionFilePreviewPort } from "../../lib/recognition/browserRecognitionFilePreview";
import {
  createRecognitionWorkflowController,
  type RecognitionWorkflowController,
  type RecognitionWorkflowEffects,
} from "../../lib/recognition/recognitionWorkflowController";

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
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  useEffect(() => () => controller.dispose(), [controller]);

  return { controller, state };
};
