import assert from "node:assert/strict";

import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, it } from "vitest";

import type { RecognitionApiClient } from "../../lib/recognition/browserRecognitionApiClient";
import type { RecognitionFilePreviewPort } from "../../lib/recognition/browserRecognitionFilePreview";
import type { RecognitionWorkflowController } from "../../lib/recognition/recognitionWorkflowController";
import { useRecognitionWorkflowController } from "./useRecognitionWorkflowController";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const apiClient: RecognitionApiClient = {
  recognizeImage: async () => ({ notes: [] }),
  importMusicXML: async () => ({ notes: [] }),
  recognizeAudiverisPdf: async () => ({
    noteCount: 0,
    firstNotes: [],
    source: "audiveris",
    inputType: "pdf",
  }),
};
const workflowEffects = {
  invalidateSharedResult: () => undefined,
  clearPlayError: () => undefined,
};

describe("useRecognitionWorkflowController", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  it("survives StrictMode effect replay and disposes after the real unmount", async () => {
    const revokedUrls: string[] = [];
    const previewPort: RecognitionFilePreviewPort = {
      createPreviewUrl: (file) => `blob:${file.name}`,
      revokePreviewUrl: (url) => revokedUrls.push(url),
    };
    let controller: RecognitionWorkflowController | null = null;

    const Harness = () => {
      const workflow = useRecognitionWorkflowController(
        apiClient,
        previewPort,
        workflowEffects,
      );
      controller = workflow.controller;
      return <span>{workflow.state.fileName}</span>;
    };

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <StrictMode>
          <Harness />
        </StrictMode>,
      ),
    );
    await Promise.resolve();

    const mountedController = controller as RecognitionWorkflowController | null;
    assert.ok(mountedController);
    await act(async () => {
      assert.equal(
        mountedController.selectImage(
          new File(["image"], "score.png", { type: "image/png" }),
        ).accepted,
        true,
      );
    });
    assert.equal(container.textContent, "score.png");
    assert.deepEqual(revokedUrls, []);

    await act(async () => root?.unmount());
    root = null;
    await Promise.resolve();
    assert.deepEqual(revokedUrls, ["blob:score.png"]);
    assert.equal(
      mountedController.selectImage(
        new File(["replacement"], "replacement.png", { type: "image/png" }),
      ).accepted,
      false,
    );
  });
});
