import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalScoreProjectNumberedPreview } from "../../components/music/LocalScoreProjectNumberedPreview";
import {
  createLocalScoreProjectNumberedPresentation,
} from "../../lib/music/localScoreProjectNumberedPresentation";
import type {
  LocalNotationProjectScoreDocumentV2,
  LocalScoreProjectEventV2,
} from "../../lib/music/scoreDocument";

const note = ({
  id,
  pitch,
  duration = "quarter",
  measure = 1,
  augmentationDots = 0,
  tieToNext = false,
  lyric = null,
}: {
  id: string;
  pitch: Extract<LocalScoreProjectEventV2, { type: "note" }>["pitch"];
  duration?: LocalScoreProjectEventV2["duration"];
  measure?: number;
  augmentationDots?: 0 | 1;
  tieToNext?: boolean;
  lyric?: string | null;
}): LocalScoreProjectEventV2 => ({
  id,
  type: "note",
  pitch,
  duration,
  measure,
  augmentationDots,
  tieToNext,
  lyric,
});

const rest = (id: string): LocalScoreProjectEventV2 => ({
  id,
  type: "rest",
  pitch: null,
  duration: "quarter",
  measure: 1,
  augmentationDots: 0,
});

const createDocument = (
  events: readonly LocalScoreProjectEventV2[] = [
    note({ id: "c4-half", pitch: "C4", duration: "half" }),
    rest("rest"),
    note({ id: "c5-eighth", pitch: "C5", duration: "eighth" }),
    note({ id: "d4-eighth", pitch: "D4", duration: "eighth" }),
  ],
): LocalNotationProjectScoreDocumentV2 => ({
  schemaVersion: "score-document-v2",
  documentKind: "notation-project",
  documentId: "local.score-project.numbered-preview-test",
  revision: 7,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "numbered-preview-test",
  },
  meter: "4/4",
  parts: [{
    partId: "part-1",
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef: "treble",
      voices: [{
        voiceId: "voice-1",
        measures: [{ measureNumber: 1, events }],
      }],
    }],
  }],
});

describe("本地谱项目固定 C 简谱 pure presentation", () => {
  it("以同一事件身份确定性呈现音级、休止和时值", () => {
    const left = createLocalScoreProjectNumberedPresentation(createDocument());
    const right = createLocalScoreProjectNumberedPresentation(createDocument());
    expect(left).toEqual(right);
    expect(left.status).toBe("ready");
    if (left.status !== "ready") throw new Error(left.reason);
    expect(left.documentId).toBe("local.score-project.numbered-preview-test");
    expect(left.revision).toBe(7);
    expect(left.tokens.map((token) => ({
      id: token.eventId,
      degree: token.degree,
      duration: token.duration,
      octave: token.type === "note" ? token.octave : null,
      underline: token.underlineCount,
      sustain: token.sustainDashes,
    }))).toEqual([
      {
        id: "c4-half",
        degree: 1,
        duration: "half",
        octave: "base",
        underline: 0,
        sustain: 1,
      },
      {
        id: "rest",
        degree: 0,
        duration: "quarter",
        octave: null,
        underline: 0,
        sustain: 0,
      },
      {
        id: "c5-eighth",
        degree: 1,
        duration: "eighth",
        octave: "upper",
        underline: 1,
        sustain: 0,
      },
      {
        id: "d4-eighth",
        degree: 2,
        duration: "eighth",
        octave: "base",
        underline: 1,
        sustain: 0,
      },
    ]);
  });

  it("保留附点、延音和歌词，并复用连续性 fail-closed 门禁", () => {
    const valid = createLocalScoreProjectNumberedPresentation(createDocument([
      note({
        id: "tie-source",
        pitch: "C4",
        duration: "quarter",
        augmentationDots: 1,
        tieToNext: true,
        lyric: "春",
      }),
      note({
        id: "tie-target",
        pitch: "C4",
        duration: "eighth",
      }),
      note({ id: "g4-half", pitch: "G4", duration: "half" }),
    ]));
    expect(valid.status).toBe("ready");
    if (valid.status !== "ready") throw new Error(valid.reason);
    const source = valid.tokens[0];
    expect(source?.augmentationDots).toBe(1);
    expect(source?.type).toBe("note");
    if (source?.type !== "note") throw new Error("expected note");
    expect(source.tieTargetEventId).toBe("tie-target");
    expect(source.lyric).toBe("春");
    expect(source.accessibleLabel).toContain("附点四分");
    expect(source.accessibleLabel).toContain("延音线");
    expect(source.accessibleLabel).toContain("歌词“春”");

    const invalid = createLocalScoreProjectNumberedPresentation(createDocument([
      note({
        id: "bad-source",
        pitch: "C4",
        tieToNext: true,
      }),
      note({ id: "bad-target", pitch: "D4" }),
      rest("fill-1"),
      rest("fill-2"),
    ]));
    expect(invalid.status).toBe("blocked");
    if (invalid.status !== "blocked") throw new Error("expected blocked");
    expect(invalid.reason).toContain("延音线");
  });
});

describe("本地谱项目固定 C 简谱组件", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  it("共享选择和播放事件 ID，并支持键盘选择", async () => {
    const onSelectEvent = vi.fn();
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createDocument()}
          selectedEventId="c4-half"
          activeEventIds={["c5-eighth"]}
          onSelectEvent={onSelectEvent}
        />,
      );
    });

    expect(container?.querySelector(
      '[data-event-id="c4-half"]',
    )?.getAttribute("data-selected")).toBe("true");
    expect(container?.querySelector(
      '[data-event-id="c5-eighth"]',
    )?.getAttribute("data-active")).toBe("true");
    expect(container?.querySelector(
      '[data-testid="local-score-numbered-octave-dot-c5-eighth"]',
    )).not.toBeNull();
    expect(container?.querySelector(
      '[data-testid="local-score-numbered-playback-cursor-c5-eighth"]',
    )).not.toBeNull();

    const target = container?.querySelector<HTMLElement>(
      '[data-event-id="d4-eighth"]',
    );
    await act(async () => {
      target?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onSelectEvent).toHaveBeenLastCalledWith({
      eventId: "d4-eighth",
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
    });
  });

  it("空声部保留中文可访问空态", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview document={createDocument([])} />,
      );
    });
    expect(container?.textContent).toContain(
      "当前第一声部没有音符或休止符",
    );
    expect(container?.querySelectorAll("[data-event-id]")).toHaveLength(0);
  });
});
