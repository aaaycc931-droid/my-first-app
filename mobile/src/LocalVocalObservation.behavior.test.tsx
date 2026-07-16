import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { LocalVocalObservationPanel } from "../../components/practice/LocalVocalObservationPanel";
import type { RealtimePitchCurvePoint } from "../../lib/practice/realtimePitchCurve";

let root: Root | null = null;

const series = (count: number, midiAt: (seconds: number) => number): RealtimePitchCurvePoint[] => Array.from({ length: count }, (_, index) => ({ timestampMs: index * 50, midi: midiAt(index * 0.05), state: "reliable", confidence: 0.92 }));

const renderPanels = async (points: RealtimePitchCurvePoint[], twice = false) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<StrictMode><LocalVocalObservationPanel points={points} />{twice ? <LocalVocalObservationPanel points={points} label="已保存片段" /> : null}</StrictMode>));
  return container;
};

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

describe("P103 Android 本地音高观察", () => {
  it("空数据逐项说明不足且不伪造零值结论", async () => {
    const container = await renderPanels([]);
    expect(container.textContent).toContain("可靠人声不足 1.5 秒");
    expect(container.textContent).toContain("需要至少 2.5 秒");
    expect(container.textContent).not.toContain("典型短期波动约 0 音分");
  });

  it("稳定长音与周期候选显示可解释中文证据", async () => {
    const container = await renderPanels(series(80, (seconds) => 69 + 0.35 * Math.sin(2 * Math.PI * 5 * seconds)));
    expect(container.textContent).toContain("A4–A4");
    expect(container.textContent).toContain("约 5.0 次/秒");
    expect(container.textContent).toContain("探索性候选");
    expect(container.textContent).toContain("local-vocal-observation-v1");
  });

  it("同时显示当前与历史观察时标题 id 保持唯一", async () => {
    const container = await renderPanels(series(60, () => 69), true);
    const ids = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelectorAll("section[aria-labelledby]")).toHaveLength(2);
  });
});
