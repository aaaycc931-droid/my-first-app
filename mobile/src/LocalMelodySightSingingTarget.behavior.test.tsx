import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalMelodySightSingingTarget } from "../../components/practice/LocalMelodySightSingingTarget";
import { createLocalEarTrainingMelodyQuestion } from "../../lib/practice/localEarTrainingMelodyDictation";
import { createLocalMelodyImitationTimeline } from "../../lib/practice/localMelodyImitation";
import { createLocalMelodySightSingingTarget } from "../../lib/practice/localMelodySightSinging";

let root: Root | null = null;

const renderTarget = async (
  variantId: string,
  noteIds?: readonly ["c4", "c4", "c5"],
) => {
  const builtInQuestion = createLocalEarTrainingMelodyQuestion({
    difficulty: "挑战",
    sequence: 0,
    variantId,
    catalogMode: "expanded-local-v2",
  });
  const question = noteIds ? {
    ...builtInQuestion,
    melody: { ...builtInQuestion.melody, noteIds: [...noteIds] },
  } : builtInQuestion;
  const timeline = createLocalMelodyImitationTimeline({ question });
  const target = createLocalMelodySightSingingTarget({ timeline });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <StrictMode><LocalMelodySightSingingTarget target={target} /></StrictMode>,
  ));
  return container;
};

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
});

describe("Android 挂载三音旋律视唱可见目标", () => {
  it("初始即同时显示五线谱、固定唱名与逐位可访问名称，且没有编辑或播放语义", async () => {
    const container = await renderTarget("melody:challenge-19-b4-f-sharp-4-c5");
    const target = container.querySelector<HTMLElement>('[data-testid="melody-sight-singing-target"]');
    expect(target).not.toBeNull();
    expect(target?.querySelectorAll('[data-testid="melody-sight-singing-staff-line"]')).toHaveLength(5);
    expect(target?.querySelector('[data-testid="melody-sight-singing-treble-clef"]')?.textContent).toBe("𝄞");
    expect(target?.querySelectorAll('[data-testid^="melody-sight-singing-solfege-"]')).toHaveLength(3);

    const staffLabel = target?.querySelector("svg")?.getAttribute("aria-label") ?? "";
    expect(staffLabel).toContain("第 1 个音");
    expect(staffLabel).toContain("B4");
    expect(staffLabel).toContain("F♯4");
    expect(staffLabel).toContain("C5");
    expect(target?.textContent).toContain("si");
    expect(target?.textContent).toContain("升 fa");
    expect(target?.textContent).toContain("高音 do");

    expect(target?.querySelector('[data-testid="melody-sight-singing-sharp-1"]')).not.toBeNull();
    expect(target?.querySelector('[data-testid="melody-sight-singing-notehead-2"]')?.getAttribute("cy")).toBe("54");
    expect(target?.querySelectorAll("select, button, input, audio")).toHaveLength(0);
    expect(target?.textContent).not.toMatch(/草稿|编辑|隐藏|播放|听题资格/);
  });

  it("正确显示 C4 下加线，并为重复音保留三个有序音位", async () => {
    const container = await renderTarget("melody:challenge-01-c4-d4-e4", ["c4", "c4", "c5"]);
    const target = container.querySelector<HTMLElement>('[data-testid="melody-sight-singing-target"]');
    expect(target?.querySelector('[data-testid="melody-sight-singing-c4-ledger-0"]')).not.toBeNull();
    expect(target?.querySelector('[data-testid="melody-sight-singing-c4-ledger-1"]')).not.toBeNull();
    expect(target?.querySelectorAll('[data-testid^="melody-sight-singing-notehead-"]')).toHaveLength(3);
    expect(target?.querySelectorAll('[data-testid^="melody-sight-singing-solfege-"]')).toHaveLength(3);

    const labels = Array.from(
      target?.querySelectorAll<HTMLElement>('ol[aria-label="当前三音固定唱名目标"] li') ?? [],
      (item) => item.getAttribute("aria-label") ?? "",
    );
    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain("C4");
    expect(labels[1]).toContain("C4");
    expect(labels[2]).toContain("C5");
  });
});
