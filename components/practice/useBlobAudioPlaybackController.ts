"use client";

import { useCallback, useEffect, useState } from "react";

import {
  browserBlobAudioPlaybackPort,
  createBlobAudioPlaybackController,
  type BlobAudioPlaybackController,
  type BlobAudioPlaybackPort,
  type BlobAudioPlaybackSnapshot,
} from "../../lib/audio/blobAudioPlayback";
import { subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";

export function useBlobAudioPlaybackController(
  port: BlobAudioPlaybackPort = browserBlobAudioPlaybackPort,
) {
  const [controller] = useState(() => createBlobAudioPlaybackController(port));
  const [snapshot, setSnapshot] = useState<BlobAudioPlaybackSnapshot>(
    controller.getSnapshot(),
  );

  useEffect(
    () => controller.subscribe(() => setSnapshot(controller.getSnapshot())),
    [controller],
  );

  useEffect(
    () => subscribeBrowserAudioStopAll(() => controller.stop()),
    [controller],
  );

  useEffect(() => () => controller.stop(), [controller]);

  const play = useCallback<BlobAudioPlaybackController["play"]>(
    (request) => controller.play(request),
    [controller],
  );
  const stop = useCallback(() => controller.stop(), [controller]);

  return { snapshot, play, stop };
}
