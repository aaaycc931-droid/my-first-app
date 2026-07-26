import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LocalScoreProjectStaffPreview,
  type LocalScoreProjectStaffSelection,
} from "../../components/music/LocalScoreProjectStaffPreview";
import {
  createLocalScoreProjectStaffPresentation,
  LOCAL_SCORE_STAFF_HEADER_WIDTH,
  LOCAL_SCORE_STAFF_MEASURE_PADDING,
  LOCAL_SCORE_STAFF_MEASURE_WIDTH,
} from "../../lib/music/localScoreProjectStaffPresentation";
import type {
  LocalNotationProjectScoreDocumentV3,
  LocalScoreProjectEventV2,
} from "../../lib/music/scoreDocument";

const note = ({
  id,
  pitch,
  duration,
  measure,
  augmentationDots = 0,
  tieToNext = false,
  lyric = null,
}: {
  id: string;
  pitch: Extract<LocalScoreProjectEventV2, { type: "note" }>["pitch"];
  duration: LocalScoreProjectEventV2["duration"];
  measure: number;
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

const rest = ({
  id,
  measure,
  augmentationDots = 0,
}: {
  id: string;
  measure: number;
  augmentationDots?: 0 | 1;
}): LocalScoreProjectEventV2 => ({
  id,
  type: "rest",
  pitch: null,
  duration: "quarter",
  measure,
  augmentationDots,
});

const createDocument = ({
  meter = "4/4",
  clef = "treble",
  keySignatureFifths = 0,
  firstVoiceMeasures,
  secondVoiceEvents = [],
}: {
  meter?: LocalNotationProjectScoreDocumentV3["meter"];
  clef?: "treble" | "bass";
  keySignatureFifths?: -1 | 0 | 1;
  firstVoiceMeasures?: readonly Readonly<{
    measureNumber: number;
    events: readonly LocalScoreProjectEventV2[];
  }>[];
  secondVoiceEvents?: readonly LocalScoreProjectEventV2[];
} = {}): LocalNotationProjectScoreDocumentV3 => ({
  schemaVersion: "score-document-v3",
  documentKind: "notation-project",
  documentId: "local.score-project.staff-preview-test",
  revision: 6,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: false,
  source: {
    kind: "local-score-project",
    projectId: "staff-preview-test",
  },
  meter,
  keySignature: { fifths: keySignatureFifths },
  parts: [{
    partId: "part-1",
    staves: [{
      staffId: "staff-1",
      staffKind: "pitched",
      clef,
      voices: [{
        voiceId: "voice-1",
        measures: firstVoiceMeasures ?? [{
          measureNumber: 1,
          events: [
            note({ id: "c4-half", pitch: "C4", duration: "half", measure: 1 }),
            rest({ id: "quarter-rest", measure: 1 }),
            note({ id: "c5-eighth", pitch: "C5", duration: "eighth", measure: 1 }),
            note({ id: "d4-eighth", pitch: "D4", duration: "eighth", measure: 1 }),
          ],
        }, {
          measureNumber: 2,
          events: [
            note({ id: "e4-quarter", pitch: "E4", duration: "quarter", measure: 2 }),
          ],
        }],
      }, {
        voiceId: "voice-2",
        measures: [{
          measureNumber: 1,
          events: secondVoiceEvents,
        }],
      }],
    }],
  }],
});

const createMultiHierarchyDocument = () => {
  const document = createDocument({
    secondVoiceEvents: [
      note({
        id: "second-voice-event",
        pitch: "G4",
        duration: "quarter",
        measure: 1,
      }),
    ],
  });
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
            voiceId: "voice-3",
            measures: [{
              measureNumber: 1,
              events: [
                note({
                  id: "targeted-bass-event",
                  pitch: "C4",
                  duration: "quarter",
                  measure: 1,
                }),
              ],
            }],
          }],
        }],
      },
    ],
  } satisfies LocalNotationProjectScoreDocumentV3;
};

describe("本地谱项目五线谱 pure presentation", () => {
  it("按第一声部、小节和拍位生成确定性图形 token", () => {
    const document = createDocument({
      secondVoiceEvents: [
        note({
          id: "hidden-second-voice",
          pitch: "G4",
          duration: "quarter",
          measure: 1,
        }),
      ],
    });
    const left = createLocalScoreProjectStaffPresentation(document);
    const right = createLocalScoreProjectStaffPresentation(document);

    expect(left).toEqual(right);
    expect(left.status).toBe("ready");
    if (left.status !== "ready") throw new Error(left.reason);
    expect(left.documentId).toBe(document.documentId);
    expect(left.revision).toBe(6);
    expect(left.meterNumerator).toBe(4);
    expect(left.meterDenominator).toBe(4);
    expect(left.width).toBe(
      LOCAL_SCORE_STAFF_HEADER_WIDTH
      + 2 * LOCAL_SCORE_STAFF_MEASURE_WIDTH
      + LOCAL_SCORE_STAFF_MEASURE_PADDING,
    );
    expect(left.measures.map((measure) => ({
      number: measure.measureNumber,
      barline: measure.barlineX,
      used: measure.usedBeats,
    }))).toEqual([
      { number: 1, barline: 336, used: 4 },
      { number: 2, barline: 576, used: 1 },
    ]);
    expect(left.tokens.map((token) => ({
      id: token.eventId,
      onset: token.onsetBeat,
      duration: token.durationBeats,
      x: token.x,
      y: token.y,
      type: token.type,
    }))).toEqual([
      {
        id: "c4-half",
        onset: 0,
        duration: 2,
        x: 120,
        y: 96,
        type: "note",
      },
      {
        id: "quarter-rest",
        onset: 2,
        duration: 1,
        x: 216,
        y: 66,
        type: "rest",
      },
      {
        id: "c5-eighth",
        onset: 3,
        duration: 0.5,
        x: 264,
        y: 54,
        type: "note",
      },
      {
        id: "d4-eighth",
        onset: 3.5,
        duration: 0.5,
        x: 288,
        y: 90,
        type: "note",
      },
      {
        id: "e4-quarter",
        onset: 4,
        duration: 1,
        x: 360,
        y: 84,
        type: "note",
      },
    ]);
    expect(left.tokens.some((token) => token.eventId === "hidden-second-voice"))
      .toBe(false);

    const c4 = left.tokens[0];
    const restToken = left.tokens[1];
    const c5 = left.tokens[2];
    expect(c4?.type).toBe("note");
    if (c4?.type !== "note") throw new Error("expected C4 note");
    expect(c4.head).toBe("open");
    expect(c4.ledgerLineYs).toEqual([96]);
    expect(c4.hasEighthFlag).toBe(false);
    expect(restToken?.type).toBe("rest");
    expect(c5?.type).toBe("note");
    if (c5?.type !== "note") throw new Error("expected C5 note");
    expect(c5.head).toBe("filled");
    expect(c5.hasEighthFlag).toBe(true);
    expect(left.warnings).toEqual([
      "当前声部（声部组 part-1／谱表 staff-1／声部 voice-1）第 2 小节未填满 4/4。",
    ]);
  });

  it("按精确 part、staff、voice 目标呈现并保留完整事件 location", () => {
    const document = createMultiHierarchyDocument();
    const secondVoice = createLocalScoreProjectStaffPresentation(document, {
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-2",
    });
    expect(secondVoice.status).toBe("ready");
    if (secondVoice.status !== "ready") throw new Error(secondVoice.reason);
    expect(secondVoice.tokens.map((token) => token.eventId))
      .toEqual(["second-voice-event"]);
    expect(secondVoice.tokens[0]?.location).toEqual({
      partId: "part-1",
      staffId: "staff-1",
      voiceId: "voice-2",
      measureNumber: 1,
    });

    const otherStaff = createLocalScoreProjectStaffPresentation(document, {
      partId: "part-2",
      staffId: "staff-2",
      voiceId: "voice-3",
    });
    expect(otherStaff.status).toBe("ready");
    if (otherStaff.status !== "ready") throw new Error(otherStaff.reason);
    expect(otherStaff.clef).toBe("bass");
    expect(otherStaff.tokens.map((token) => token.eventId))
      .toEqual(["targeted-bass-event"]);
    expect(otherStaff.tokens[0]?.location).toEqual({
      partId: "part-2",
      staffId: "staff-2",
      voiceId: "voice-3",
      measureNumber: 1,
    });

    const missingExactTuple = createLocalScoreProjectStaffPresentation(
      document,
      {
        partId: "part-1",
        staffId: "staff-2",
        voiceId: "voice-3",
      },
    );
    expect(missingExactTuple.status).toBe("blocked");
    if (missingExactTuple.status !== "blocked") {
      throw new Error("expected blocked");
    }
    expect(missingExactTuple.reason).toContain(
      "声部组 part-1／谱表 staff-2／声部 voice-3",
    );
  });

  it.each([
    ["2/4", 2],
    ["3/4", 3],
    ["4/4", 4],
  ] as const)("支持 %s 并按拍号容量布置小节", (meter, beats) => {
    const events = Array.from({ length: beats }, (_, index) =>
      note({
        id: `note-${index}`,
        pitch: "G4",
        duration: "quarter",
        measure: 1,
      }));
    const presentation = createLocalScoreProjectStaffPresentation(
      createDocument({
        meter,
        firstVoiceMeasures: [{ measureNumber: 1, events }],
      }),
    );
    expect(presentation.status).toBe("ready");
    if (presentation.status !== "ready") throw new Error(presentation.reason);
    expect(presentation.meterNumerator).toBe(beats);
    expect(presentation.measures[0]?.usedBeats).toBe(beats);
    expect(presentation.warnings).toEqual([]);
  });

  it("小节过满时 fail closed", () => {
    const presentation = createLocalScoreProjectStaffPresentation(
      createDocument({
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({ id: "half-1", pitch: "C4", duration: "half", measure: 1 }),
            note({ id: "half-2", pitch: "D4", duration: "half", measure: 1 }),
            note({ id: "half-3", pitch: "E4", duration: "half", measure: 1 }),
          ],
        }],
      }),
    );
    expect(presentation.status).toBe("blocked");
    if (presentation.status !== "blocked") throw new Error("expected blocked");
    expect(presentation.reason).toContain("超过 4/4");
  });

  it("附点参与拍位与容量计算，并为延音线和歌词生成中文可访问描述", () => {
    const presentation = createLocalScoreProjectStaffPresentation(
      createDocument({
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({
              id: "dotted-half",
              pitch: "C4",
              duration: "half",
              measure: 1,
              augmentationDots: 1,
              lyric: "春",
            }),
            note({
              id: "tie-source",
              pitch: "E4",
              duration: "quarter",
              measure: 1,
              tieToNext: true,
            }),
          ],
        }, {
          measureNumber: 2,
          events: [
            note({
              id: "tie-target",
              pitch: "E4",
              duration: "quarter",
              measure: 2,
            }),
          ],
        }],
      }),
    );

    expect(presentation.status).toBe("ready");
    if (presentation.status !== "ready") throw new Error(presentation.reason);
    expect(presentation.measures[0]?.usedBeats).toBe(4);
    expect(presentation.tokens.map((token) => ({
      id: token.eventId,
      onset: token.onsetBeat,
      duration: token.durationBeats,
      x: token.x,
    }))).toEqual([
      { id: "dotted-half", onset: 0, duration: 3, x: 120 },
      { id: "tie-source", onset: 3, duration: 1, x: 264 },
      { id: "tie-target", onset: 4, duration: 1, x: 360 },
    ]);
    const dotted = presentation.tokens[0];
    const tieSource = presentation.tokens[1];
    expect(dotted?.accessibleLabel).toContain("附点二分音符");
    expect(dotted?.accessibleLabel).toContain("歌词“春”");
    expect(tieSource?.type).toBe("note");
    if (tieSource?.type !== "note") throw new Error("expected note");
    expect(tieSource.tieTargetEventId).toBe("tie-target");
    expect(tieSource.accessibleLabel).toContain("与下一音符用延音线相连");
  });

  it("拒绝跨越未填满小节间隙的延音线，避免预览与播放规则分裂", () => {
    const presentation = createLocalScoreProjectStaffPresentation(
      createDocument({
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({
              id: "gap-source",
              pitch: "E4",
              duration: "quarter",
              measure: 1,
              tieToNext: true,
            }),
          ],
        }, {
          measureNumber: 2,
          events: [
            note({
              id: "gap-target",
              pitch: "E4",
              duration: "quarter",
              measure: 2,
            }),
          ],
        }],
      }),
    );

    expect(presentation.status).toBe("blocked");
    if (presentation.status !== "blocked") throw new Error("expected blocked");
    expect(presentation.reason).toContain("延音线");
    expect(presentation.reason).toContain("时值连续");
  });

  it("接受小节线处时值连续的附点多段延音链并保留各事件 token", () => {
    const presentation = createLocalScoreProjectStaffPresentation(
      createDocument({
        meter: "2/4",
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({
              id: "chain-start",
              pitch: "D4",
              duration: "half",
              measure: 1,
              tieToNext: true,
            }),
          ],
        }, {
          measureNumber: 2,
          events: [
            note({
              id: "chain-middle",
              pitch: "D4",
              duration: "quarter",
              measure: 2,
              augmentationDots: 1,
              tieToNext: true,
            }),
            note({
              id: "chain-end",
              pitch: "D4",
              duration: "eighth",
              measure: 2,
            }),
          ],
        }],
      }),
    );

    expect(presentation.status).toBe("ready");
    if (presentation.status !== "ready") throw new Error(presentation.reason);
    expect(presentation.warnings).toEqual([]);
    expect(presentation.tokens.map((token) => ({
      id: token.eventId,
      onset: token.onsetBeat,
      duration: token.durationBeats,
      tieTarget: token.type === "note" ? token.tieTargetEventId : null,
    }))).toEqual([
      { id: "chain-start", onset: 0, duration: 2, tieTarget: "chain-middle" },
      { id: "chain-middle", onset: 2, duration: 1.5, tieTarget: "chain-end" },
      { id: "chain-end", onset: 3.5, duration: 0.5, tieTarget: null },
    ]);
  });

  it("按高低音谱号定位音符与通用加线，并为调号覆盖的自然音加还原号", () => {
    const trebleSharp = createLocalScoreProjectStaffPresentation(
      createDocument({
        keySignatureFifths: 1,
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({ id: "f4", pitch: "F4", duration: "quarter", measure: 1 }),
          ],
        }],
      }),
    );
    const bassFlat = createLocalScoreProjectStaffPresentation(
      createDocument({
        clef: "bass",
        keySignatureFifths: -1,
        firstVoiceMeasures: [{
          measureNumber: 1,
          events: [
            note({ id: "c4", pitch: "C4", duration: "quarter", measure: 1 }),
            note({ id: "b4", pitch: "B4", duration: "quarter", measure: 1 }),
            note({ id: "c5", pitch: "C5", duration: "quarter", measure: 1 }),
          ],
        }],
      }),
    );

    expect(trebleSharp.status).toBe("ready");
    expect(bassFlat.status).toBe("ready");
    if (trebleSharp.status !== "ready" || bassFlat.status !== "ready") {
      throw new Error("expected ready presentations");
    }
    expect(trebleSharp.clefLabel).toBe("高音谱号");
    expect(trebleSharp.keySignatureLabel).toBe("一个升号（F♯）");
    expect(trebleSharp.tokens[0]).toMatchObject({
      eventId: "f4",
      y: 78,
      accidental: "natural",
      ledgerLineYs: [],
    });
    expect(trebleSharp.tokens[0]?.accessibleLabel).toContain("还原号");

    expect(bassFlat.clefLabel).toBe("低音谱号");
    expect(bassFlat.keySignatureLabel).toBe("一个降号（B♭）");
    expect(bassFlat.staffLineYs).toEqual([96, 108, 120, 132, 144]);
    expect(bassFlat.tokens.map((token) => ({
      id: token.eventId,
      y: token.y,
      accidental: token.type === "note" ? token.accidental : null,
      ledgers: token.type === "note" ? token.ledgerLineYs : [],
    }))).toEqual([
      { id: "c4", y: 84, accidental: null, ledgers: [84] },
      {
        id: "b4",
        y: 48,
        accidental: "natural",
        ledgers: [84, 72, 60, 48],
      },
      {
        id: "c5",
        y: 42,
        accidental: null,
        ledgers: [84, 72, 60, 48],
      },
    ]);
  });
});

describe("本地谱项目五线谱 SVG 预览", () => {
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

  it("呈现时值、休止、拍号、小节线以及独立选择和播放高亮", async () => {
    const onSelectEvent =
      vi.fn<(selection: LocalScoreProjectStaffSelection) => void>();
    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={createDocument()}
          selectedEventId="c4-half"
          activeEventIds={["quarter-rest"]}
          onSelectEvent={onSelectEvent}
        />,
      );
    });

    const svg = container?.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toContain(
      "当前声部五线谱预览（声部组 part-1／谱表 staff-1／声部 voice-1），高音谱号，调号无升降号，拍号 4/4，共 2 小节",
    );
    expect(svg?.getAttribute("aria-label")).toContain(
      "第 1 小节第 2 个事件，四分休止符",
    );
    expect(container?.querySelectorAll('[data-testid="local-score-staff-line"]'))
      .toHaveLength(5);
    expect(container?.querySelector('[data-testid="local-score-meter"]')?.textContent)
      .toBe("44");
    expect(container?.querySelector('[data-testid="local-score-barline-1"]'))
      .not.toBeNull();
    expect(container?.querySelector('[data-testid="local-score-barline-2"]'))
      .not.toBeNull();
    expect(container?.querySelector('[data-testid="local-score-ledger-c4-half-96"]'))
      .not.toBeNull();
    expect(container?.querySelector('[data-testid="local-score-notehead-c4-half"]')?.getAttribute("fill"))
      .toBe("#ffffff");
    expect(container?.querySelector('[data-testid="local-score-quarter-rest-quarter-rest"]'))
      .not.toBeNull();
    expect(container?.querySelector('[data-testid="local-score-eighth-flag-c5-eighth"]'))
      .not.toBeNull();

    const selected = container?.querySelector<SVGGElement>(
      '[data-event-id="c4-half"]',
    );
    const active = container?.querySelector<SVGGElement>(
      '[data-event-id="quarter-rest"]',
    );
    expect(selected?.getAttribute("data-selected")).toBe("true");
    expect(selected?.getAttribute("aria-pressed")).toBe("true");
    expect(selected?.getAttribute("aria-label")).toContain("已选择");
    expect(active?.getAttribute("data-active")).toBe("true");
    expect(active?.getAttribute("aria-current")).toBe("true");
    expect(active?.getAttribute("aria-label")).toContain("正在播放");
    expect(container?.querySelector(
      '[data-testid="local-score-playback-cursor-quarter-rest"]',
    )).not.toBeNull();

    await act(async () => {
      active?.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onSelectEvent).toHaveBeenLastCalledWith({
      eventId: "quarter-rest",
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 1,
      },
    });

    const keyboardTarget = container?.querySelector<SVGGElement>(
      '[data-event-id="e4-quarter"]',
    );
    await act(async () => {
      keyboardTarget?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onSelectEvent).toHaveBeenLastCalledWith({
      eventId: "e4-quarter",
      location: {
        partId: "part-1",
        staffId: "staff-1",
        voiceId: "voice-1",
        measureNumber: 2,
      },
    });
  });

  it("渲染低音谱号、降号、还原号和中文可访问上下文", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={createDocument({
            clef: "bass",
            keySignatureFifths: -1,
            firstVoiceMeasures: [{
              measureNumber: 1,
              events: [
                note({
                  id: "bass-b4",
                  pitch: "B4",
                  duration: "quarter",
                  measure: 1,
                }),
              ],
            }],
          })}
        />,
      );
    });

    expect(container?.querySelector('[data-testid="local-score-bass-clef"]')
      ?.textContent).toBe("𝄢");
    expect(container?.querySelector('[data-testid="local-score-key-signature"]')
      ?.textContent).toBe("♭");
    expect(container?.querySelector('[data-testid="local-score-natural-bass-b4"]'))
      .not.toBeNull();
    expect(container?.querySelector("svg")?.getAttribute("aria-label"))
      .toContain("低音谱号，调号一个降号（B♭）");
    expect(container?.querySelector('[data-event-id="bass-b4"]')
      ?.getAttribute("aria-label")).toContain("还原号");
  });

  it("空声部保留可访问空态且不伪造事件", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={createDocument({
            firstVoiceMeasures: [{ measureNumber: 1, events: [] }],
          })}
        />,
      );
    });
    expect(container?.querySelector("svg")?.getAttribute("aria-label"))
      .toContain("当前没有音符或休止符");
    expect(container?.querySelectorAll("[data-event-id]")).toHaveLength(0);
    expect(container?.textContent).toContain(
      "当前声部（声部组 part-1／谱表 staff-1／声部 voice-1）没有音符或休止符",
    );
  });

  it("为指定声部显示可辨身份并回传精确 location", async () => {
    const onSelectEvent =
      vi.fn<(selection: LocalScoreProjectStaffSelection) => void>();
    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={createMultiHierarchyDocument()}
          target={{
            partId: "part-2",
            staffId: "staff-2",
            voiceId: "voice-3",
          }}
          onSelectEvent={onSelectEvent}
        />,
      );
    });

    expect(container?.querySelector("section")?.getAttribute("aria-label"))
      .toContain("当前声部图形五线谱（声部组 part-2／谱表 staff-2／声部 voice-3）");
    expect(container?.textContent).toContain(
      "当前声部图形预览（声部组 part-2／谱表 staff-2／声部 voice-3）",
    );
    expect(container?.querySelector('[data-event-id="c4-half"]')).toBeNull();
    const target = container?.querySelector<SVGGElement>(
      '[data-event-id="targeted-bass-event"]',
    );
    await act(async () => {
      target?.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onSelectEvent).toHaveBeenLastCalledWith({
      eventId: "targeted-bass-event",
      location: {
        partId: "part-2",
        staffId: "staff-2",
        voiceId: "voice-3",
        measureNumber: 1,
      },
    });
  });

  it("指定声部不存在时显示带目标身份的 fail-closed 错误", async () => {
    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={createMultiHierarchyDocument()}
          target={{
            partId: "part-1",
            staffId: "staff-2",
            voiceId: "voice-3",
          }}
        />,
      );
    });

    expect(container?.querySelector("section")?.getAttribute("aria-label"))
      .toContain("声部组 part-1／谱表 staff-2／声部 voice-3");
    expect(container?.querySelector('[role="alert"]')?.textContent)
      .toContain("未找到指定的当前声部");
    expect(container?.querySelectorAll("[data-event-id]")).toHaveLength(0);
  });

  it("以附点、跨小节延音线和歌词呈现 v2 事件，同时保留选择与播放状态", async () => {
    const onSelectEvent =
      vi.fn<(selection: LocalScoreProjectStaffSelection) => void>();
    const document = createDocument({
      firstVoiceMeasures: [{
        measureNumber: 1,
        events: [
          note({
            id: "dotted-half",
            pitch: "C4",
            duration: "half",
            measure: 1,
            augmentationDots: 1,
            lyric: "春",
          }),
          note({
            id: "tie-source",
            pitch: "E4",
            duration: "quarter",
            measure: 1,
            tieToNext: true,
          }),
        ],
      }, {
        measureNumber: 2,
        events: [
          note({
            id: "tie-target",
            pitch: "E4",
            duration: "quarter",
            measure: 2,
          }),
        ],
      }],
    });

    await act(async () => {
      root?.render(
        <LocalScoreProjectStaffPreview
          document={document}
          selectedEventId="dotted-half"
          activeEventIds={["tie-source", "tie-target"]}
          onSelectEvent={onSelectEvent}
        />,
      );
    });

    expect(container?.querySelector(
      '[data-testid="local-score-augmentation-dot-dotted-half"]',
    )).not.toBeNull();
    expect(container?.querySelector(
      '[data-testid="local-score-tie-tie-source-tie-target"]',
    )).not.toBeNull();
    expect(container?.querySelector(
      '[data-testid="local-score-lyric-dotted-half"]',
    )?.textContent).toBe("春");
    expect(container?.querySelector(
      '[data-event-id="dotted-half"]',
    )?.getAttribute("aria-label")).toContain("歌词“春”，已选择");
    expect(container?.querySelector(
      '[data-event-id="tie-source"]',
    )?.getAttribute("aria-label")).toContain("延音线");
    expect(container?.querySelector(
      '[data-event-id="tie-source"]',
    )?.getAttribute("aria-current")).toBe("true");
    expect(container?.querySelector(
      '[data-event-id="tie-target"]',
    )?.getAttribute("aria-current")).toBe("true");
  });

  it("为合法的附点多段延音链分别绘制可识别弧线", async () => {
    const document = createDocument({
      meter: "2/4",
      firstVoiceMeasures: [{
        measureNumber: 1,
        events: [
          note({
            id: "chain-start",
            pitch: "D4",
            duration: "half",
            measure: 1,
            tieToNext: true,
          }),
        ],
      }, {
        measureNumber: 2,
        events: [
          note({
            id: "chain-middle",
            pitch: "D4",
            duration: "quarter",
            measure: 2,
            augmentationDots: 1,
            tieToNext: true,
          }),
          note({
            id: "chain-end",
            pitch: "D4",
            duration: "eighth",
            measure: 2,
          }),
        ],
      }],
    });

    await act(async () => {
      root?.render(<LocalScoreProjectStaffPreview document={document} />);
    });

    expect(container?.querySelector(
      '[data-testid="local-score-tie-chain-start-chain-middle"]',
    )).not.toBeNull();
    expect(container?.querySelector(
      '[data-testid="local-score-tie-chain-middle-chain-end"]',
    )).not.toBeNull();
    expect(container?.querySelector(
      '[data-testid="local-score-augmentation-dot-chain-middle"]',
    )).not.toBeNull();
    expect(container?.querySelectorAll('[data-testid^="local-score-tie-"]'))
      .toHaveLength(2);
  });
});
