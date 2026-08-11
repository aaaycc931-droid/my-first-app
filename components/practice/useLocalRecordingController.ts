"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  browserBlobAudioPlaybackPort,
  createBlobAudioPlaybackController,
} from "../../lib/audio/blobAudioPlayback";
import {
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
} from "../../lib/audio/browserAudioEngine";
import {
  browserLocalRecordingInputPort,
  browserLocalRecordingPreviewPort,
} from "../../lib/audio/localRecordingInput";
import { browserMediaRecorderCapturePort } from "../../lib/audio/mediaRecorder";
import {
  createLocalRecordingController,
  type LocalRecordingController,
} from "../../lib/practice/localRecordingController";

const createControllerLifecycle = (controller: LocalRecordingController) => {
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

export function useLocalRecordingController() {
  const [controller] = useState<LocalRecordingController>(() =>
    createLocalRecordingController({
      inputPort: browserLocalRecordingInputPort,
      previewPort: browserLocalRecordingPreviewPort,
      recorderPort: browserMediaRecorderCapturePort,
      playback: createBlobAudioPlaybackController(
        browserBlobAudioPlaybackPort,
      ),
    }),
  );
  const [lifecycle] = useState(() => createControllerLifecycle(controller));
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
    () => subscribeBrowserAudioStopAll(controller.handleGlobalStop),
    [controller],
  );

  return {
    ...snapshot,
    start: () => {
      stopAllBrowserAudio();
      return controller.start();
    },
    stop: controller.stop,
    clear: controller.clear,
    play: () => {
      stopAllBrowserAudio();
      return controller.play();
    },
    stopPlayback: controller.stopPlayback,
  };
}
