import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalScoreProjectNumberedPreview } from "../../components/music/LocalScoreProjectNumberedPreview";
import {
  addLocalScoreProjectEvent,
  createLocalScoreProject,
} from "../../lib/music/localScoreProject";
import {
  createLocalScoreProjectNumberedPresentation,
} from "../../lib/music/localScoreProjectNumberedPresentation";
import type {
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV6,
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

const createDocument = ({
  events = [
    note({ id: "c4-half", pitch: "C4", duration: "half" }),
    rest("rest"),
    note({ id: "c5-eighth", pitch: "C5", duration: "eighth" }),
    note({ id: "d4-eighth", pitch: "D4", duration: "eighth" }),
  ],
  clef = "treble",
  keySignatureFifths = 0,
}: {
  events?: readonly LocalScoreProjectEventV2[];
  clef?: "treble" | "bass";
  keySignatureFifths?: -1 | 0 | 1;
} = {}): LocalNotationProjectScoreDocumentV3 => ({
  schemaVersion: "score-document-v3",
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
  keySignature: { fifths: keySignatureFifths },
  parts: [{
    partId: "part-1",
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef,
      voices: [{
        voiceId: "voice-1",
        measures: [{ measureNumber: 1, events }],
      }],
    }],
  }],
});

const createMultiHierarchyDocument = () => {
  const document = createDocument();
  return {
    ...document,
    parts: [
      ...document.parts,
      {
        partId: "part-2",
        staves: [{
          staffId: "staff-2",
          staffKind: "pitched" as const,
          clef: "bass" as const,
          voices: [{
            voiceId: "voice-2",
            measures: [{
              measureNumber: 1,
              events: [
                note({ id: "targeted-c5", pitch: "C5" }),
                rest("targeted-rest"),
              ],
            }],
          }],
        }],
      },
    ],
  } satisfies LocalNotationProjectScoreDocumentV3;
};

const createCreditsDocument = (): LocalNotationProjectScoreDocumentV6 => {
  const legacy = createDocument();
  return {
    ...legacy,
    schemaVersion: "score-document-v6",
    scoreCredits: {
      title: "同一首歌",
      subtitle: "固定 C 视图",
      creators: [
        { role: "composer", name: "作曲者" },
        { role: "lyricist", name: "作词者" },
        { role: "arranger", name: "编曲者" },
      ],
      rightsNotice: "仅用于页眉展示",
    },
    parts: legacy.parts.map((part) => ({
      ...part,
      name: "钢琴",
      instrument: { kind: "unassigned" as const },
    })),
  };
};

describe("本地谱项目固定 C 简谱 pure presentation", () => {
  it("与五线谱共享同一份完整谱面标题与署名页眉", () => {
    const document = createCreditsDocument();
    const presentation =
      createLocalScoreProjectNumberedPresentation(document);
    expect(presentation.status).toBe("ready");
    if (presentation.status !== "ready") throw new Error(presentation.reason);
    expect(presentation.scoreCredits).toEqual(document.scoreCredits);
  });

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
    const valid = createLocalScoreProjectNumberedPresentation(createDocument({
      events: [
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
      ],
    }));
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

    const invalid = createLocalScoreProjectNumberedPresentation(createDocument({
      events: [
      note({
        id: "bad-source",
        pitch: "C4",
        tieToNext: true,
      }),
      note({ id: "bad-target", pitch: "D4" }),
      rest("fill-1"),
      rest("fill-2"),
      ],
    }));
    expect(invalid.status).toBe("blocked");
    if (invalid.status !== "blocked") throw new Error("expected blocked");
    expect(invalid.reason).toContain("延音线");
  });

  it("谱号和调号变化只透传中文上下文，不改变固定 C token", () => {
    const events = [
      note({ id: "c4", pitch: "C4" }),
      note({ id: "f4", pitch: "F4" }),
      note({ id: "b4", pitch: "B4" }),
      note({ id: "c5", pitch: "C5" }),
    ] as const;
    const combinations = ([
      ["treble", -1],
      ["treble", 0],
      ["treble", 1],
      ["bass", -1],
      ["bass", 0],
      ["bass", 1],
    ] as const).map(([clef, keySignatureFifths]) =>
      createLocalScoreProjectNumberedPresentation(createDocument({
        events,
        clef,
        keySignatureFifths,
      })));

    for (const presentation of combinations) {
      expect(presentation.status).toBe("ready");
    }
    const ready = combinations.map((presentation) => {
      if (presentation.status !== "ready") throw new Error(presentation.reason);
      return presentation;
    });
    const canonicalTokens = ready.map((presentation) =>
      presentation.tokens.map((token) => ({
        eventId: token.eventId,
        degree: token.degree,
        octave: token.type === "note" ? token.octave : null,
        onsetBeat: token.onsetBeat,
        duration: token.duration,
      })));
    canonicalTokens.slice(1).forEach((tokens) => {
      expect(tokens).toEqual(canonicalTokens[0]);
    });
    expect(ready.map((presentation) => presentation.keySignatureLabel))
      .toEqual([
        "一个降号（B♭）",
        "无升降号",
        "一个升号（F♯）",
        "一个降号（B♭）",
        "无升降号",
        "一个升号（F♯）",
      ]);
    expect(canonicalTokens[0]?.map(({ degree }) => degree)).toEqual([1, 4, 7, 1]);
  });

  it("按精确目标派生简谱 token，目标不存在时 fail closed", () => {
    const document = createMultiHierarchyDocument();
    const presentation = createLocalScoreProjectNumberedPresentation(
      document,
      {
        partId: "part-2",
        staffId: "staff-2",
        voiceId: "voice-2",
      },
    );
    expect(presentation.status).toBe("ready");
    if (presentation.status !== "ready") throw new Error(presentation.reason);
    expect(presentation.tokens.map((token) => ({
      id: token.eventId,
      degree: token.degree,
      location: token.location,
    }))).toEqual([
      {
        id: "targeted-c5",
        degree: 1,
        location: {
          partId: "part-2",
          staffId: "staff-2",
          voiceId: "voice-2",
          measureNumber: 1,
        },
      },
      {
        id: "targeted-rest",
        degree: 0,
        location: {
          partId: "part-2",
          staffId: "staff-2",
          voiceId: "voice-2",
          measureNumber: 1,
        },
      },
    ]);

    const missing = createLocalScoreProjectNumberedPresentation(document, {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-2",
    });
    expect(missing.status).toBe("blocked");
    if (missing.status !== "blocked") throw new Error("expected blocked");
    expect(missing.reason).toContain(
      "声部组 part-1／谱表 staff-2／声部 voice-2",
    );
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

  it("只在有谱面信息时显示完整页眉", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createCreditsDocument()}
        />,
      );
    });
    const header = container?.querySelector(
      '[data-testid="local-score-project-score-credits"]',
    );
    expect(header?.textContent).toContain("同一首歌");
    expect(header?.textContent).toContain("固定 C 视图");
    expect(header?.textContent).toContain("作曲：作曲者");
    expect(header?.textContent).toContain("作词：作词者");
    expect(header?.textContent).toContain("编曲：编曲者");
    expect(header?.textContent).toContain("仅用于页眉展示");
  });

  it("渲染与五线谱共享的 canonical 和弦名称并提供无障碍名称", async () => {
    const base = createLocalScoreProject({
      projectId: "numbered-chord-symbol",
      title: "和弦名称简谱",
      now: "2026-07-26T02:10:00.000Z",
    });
    const document = addLocalScoreProjectEvent({
      project: base,
      expectedRevision: base.document.revision,
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
      eventId: "numbered-chord-note",
      input: {
        type: "note",
        pitch: "C4",
        duration: "quarter",
        chordSymbol: "Cmaj7",
      },
      now: "2026-07-26T02:10:01.000Z",
    }).document;

    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview document={document} />,
      );
    });

    expect(container?.querySelector(
      '[data-testid="local-score-numbered-chord-symbol-numbered-chord-note"]',
    )?.textContent).toBe("Cmaj7");
    expect(container?.querySelector(
      '[data-event-id="numbered-chord-note"]',
    )?.getAttribute("aria-label")).toContain("和弦名称“Cmaj7”");
    expect(container?.querySelector('[role="group"]')?.getAttribute("aria-label"))
      .toContain("和弦名称“Cmaj7”");
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

  it("显示当前谱面调号并明确固定 C 不随调号变化", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createDocument({
            clef: "bass",
            keySignatureFifths: 1,
          })}
        />,
      );
    });

    expect(container?.textContent).toContain(
      "固定 C 为 1，不随当前调号（一个升号（F♯））变化",
    );
    expect(container?.querySelector('[role="group"]')?.getAttribute("aria-label"))
      .toContain("当前谱面调号一个升号（F♯），固定 C 音级不随调号变化");
  });

  it("空声部保留中文可访问空态", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createDocument({ events: [] })}
        />,
      );
    });
    expect(container?.textContent).toContain(
      "当前声部（声部组 part-1／谱表 staff-1／声部 voice-1）没有音符或休止符",
    );
    expect(container?.querySelectorAll("[data-event-id]")).toHaveLength(0);
  });

  it("指定声部标题和 aria 包含身份并回传精确 location", async () => {
    const onSelectEvent = vi.fn();
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createMultiHierarchyDocument()}
          target={{
            partId: "part-2",
            staffId: "staff-2",
            voiceId: "voice-2",
          }}
          onSelectEvent={onSelectEvent}
        />,
      );
    });

    expect(container?.querySelector("section")?.getAttribute("aria-label"))
      .toContain("当前声部固定 C 简谱（声部组 part-2／谱表 staff-2／声部 voice-2）");
    expect(container?.textContent).toContain(
      "当前声部固定 C 简谱（声部组 part-2／谱表 staff-2／声部 voice-2）",
    );
    expect(container?.querySelector('[data-event-id="c4-half"]')).toBeNull();
    const target = container?.querySelector<HTMLElement>(
      '[data-event-id="targeted-c5"]',
    );
    await act(async () => {
      target?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onSelectEvent).toHaveBeenLastCalledWith({
      eventId: "targeted-c5",
      location: {
        partId: "part-2",
        staffId: "staff-2",
        voiceId: "voice-2",
        measureNumber: 1,
      },
    });
  });

  it("指定声部不存在时停止生成简谱并标明目标身份", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectNumberedPreview
          document={createMultiHierarchyDocument()}
          target={{
            partId: "part-1",
            staffId: "staff-2",
            voiceId: "voice-2",
          }}
        />,
      );
    });

    expect(container?.querySelector("section")?.getAttribute("aria-label"))
      .toContain("声部组 part-1／谱表 staff-2／声部 voice-2");
    expect(container?.querySelector('[role="alert"]')?.textContent)
      .toContain("未找到指定的当前声部");
    expect(container?.querySelectorAll("[data-event-id]")).toHaveLength(0);
  });
});
