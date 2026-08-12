"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { createBrowserPracticeRecordingAnalysisPort } from "../../lib/audio/practiceRecordingAnalysis";
import {
  createPracticeRecordingAnalysisController,
  type PracticeRecordingAnalysisController,
} from "../../lib/practice/practiceRecordingAnalysisController";
import { estimateLocalPitch } from "../../lib/practice/pitchEstimate";
import { detectAudioOnsets } from "../../lib/rhythm/audioOnsetDetection";

export const createPracticeRecordingAnalysisControllerLifecycle = (
  controller: PracticeRecordingAnalysisController,
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

export function usePracticeRecordingAnalysisController() {
  const [controller] = useState(() =>
    createPracticeRecordingAnalysisController({
      port: createBrowserPracticeRecordingAnalysisPort(),
      estimatePitch: (audio) =>
        estimateLocalPitch({
          length: audio.channels[0]?.length ?? 0,
          numberOfChannels: audio.channels.length,
          sampleRate: audio.sampleRate,
          getChannelData: (channelIndex) =>
            audio.channels[channelIndex] ?? new Float32Array(),
        }),
      detectOnsets: detectAudioOnsets,
    }),
  );
  const [lifecycle] = useState(() =>
    createPracticeRecordingAnalysisControllerLifecycle(controller),
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
    clear: controller.clear,
    analyzeLevel: controller.analyzeLevel,
    estimatePitch: controller.estimatePitch,
    detectOnsets: controller.detectOnsets,
  };
}
