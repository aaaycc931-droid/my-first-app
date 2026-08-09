"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { browserBlobAudioPlaybackPort, createBlobAudioPlaybackController } from "../../lib/audio/blobAudioPlayback";
import { subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";
import { browserMediaRecorderCapturePort, type MediaRecorderCapturePort } from "../../lib/audio/mediaRecorder";
import { browserRealtimePitchInputPort } from "../../lib/audio/realtimePitchInput";
import {
  createRealtimePitchMonitorController,
  type RealtimePitchMonitorController,
  type RealtimePitchMonitorStartResult,
  type RealtimePitchMonitorStatus,
  type RealtimePitchRecordingStatus,
} from "../../lib/practice/realtimePitchMonitorController";

export type {
  RealtimePitchMonitorStartResult,
  RealtimePitchMonitorStatus,
  RealtimePitchRecordingStatus,
};

export function useRealtimePitchMonitor(
  mediaRecorderPort: MediaRecorderCapturePort = browserMediaRecorderCapturePort,
) {
  const [controller] = useState<RealtimePitchMonitorController>(() =>
    createRealtimePitchMonitorController({
      inputPort: browserRealtimePitchInputPort,
      recorderPort: mediaRecorderPort,
      playback: createBlobAudioPlaybackController(browserBlobAudioPlaybackPort),
    }));
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    controller.attach();
    return () => controller.detach();
  }, [controller]);

  useEffect(
    () => subscribeBrowserAudioStopAll(controller.handleGlobalStop),
    [controller],
  );

  return {
    ...snapshot,
    start: controller.start,
    stop: controller.stop,
    clear: controller.clear,
    startRecording: controller.startRecording,
    stopRecording: controller.stopRecording,
    playRecording: controller.playRecording,
    stopPlayback: controller.stopPlayback,
    discardRecording: controller.discardRecording,
    suppressNextGlobalStop: controller.suppressNextGlobalStop,
  };
}
