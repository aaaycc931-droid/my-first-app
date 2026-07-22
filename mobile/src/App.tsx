/* eslint-disable @next/next/no-img-element -- Capacitor loads this bundled local SVG without Next.js. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEarTrainingIntervalPanel } from "../../components/practice/LocalEarTrainingIntervalPanel";
import { LocalIntervalComparisonPanel } from "../../components/practice/LocalIntervalComparisonPanel";
import { LocalEarTrainingMelodyDictationPanel } from "../../components/practice/LocalEarTrainingMelodyDictationPanel";
import { LocalEarTrainingRhythmPanel } from "../../components/practice/LocalEarTrainingRhythmPanel";
import { LocalEarTrainingSinglePitchPanel } from "../../components/practice/LocalEarTrainingSinglePitchPanel";
import { LocalPracticeCustomizerPanel } from "../../components/practice/LocalPracticeCustomizerPanel";
import { LocalVocalExercisePanel } from "../../components/practice/LocalVocalExercisePanel";
import { RealtimePitchMonitorPanel } from "../../components/practice/RealtimePitchMonitorPanel";
import { LocalPianoPanel } from "../../components/piano/LocalPianoPanel";
import {
  stopAllBrowserAudio,
  suspendAllBrowserAudio,
} from "../../lib/audio/browserAudioEngine";
import {
  createEmptyLocalPracticeReviewQueue,
  getLocalPracticeReviewTargetKey,
  updateLocalPracticeReviewQueue,
  type LocalPracticeAnswerResult,
  type LocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import {
  recordCheckedAnswerLearningEvent,
  recordReviewStartedLearningEvent,
  resetLocalLearningHistory,
  resolveLocalLearningSuggestion,
  setLearningSuggestionsEnabled,
  type LocalLearningHistory,
} from "../../lib/learning/learningEventProfile";
import {
  createMobileLifecycleState,
  dismissMobileResetNotice,
  enterMobileBackground,
  enterMobileForeground,
} from "./runtime/mobileLifecycle";
import {
  clearMobilePracticeReviewQueue,
  getBrowserPracticeReviewStorage,
  loadMobilePracticeReviewQueue,
  saveMobilePracticeReviewQueue,
} from "./runtime/mobilePracticeReviewStorage";
import {
  clearMobileLearningHistory,
  loadMobileLearningHistory,
  saveMobileLearningHistory,
} from "./runtime/mobileLearningProfileStorage";
import type { GeneratedLocalVocalExercise } from "../../lib/practice/localVocalExercise";
import type {
  LocalPracticeCustomization,
  ResolvedLocalPracticeCustomization,
} from "../../lib/practice/localPracticeCustomizer";

const LocalEarTrainingHarmonyProgressionPanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingHarmonyProgressionPanel").then((module) => ({
    default: module.LocalEarTrainingHarmonyProgressionPanel,
  })),
);
const LocalEarTrainingScaleModePanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingScaleModePanel").then((module) => ({
    default: module.LocalEarTrainingScaleModePanel,
  })),
);
const LocalEarTrainingSeventhChordPanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingSeventhChordPanel").then((module) => ({ default: module.LocalEarTrainingSeventhChordPanel })),
);
const LocalEarTrainingSeventhChordSpacingPanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingSeventhChordSpacingPanel").then((module) => ({ default: module.LocalEarTrainingSeventhChordSpacingPanel })),
);
const LocalEarTrainingModulationPanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingModulationPanel").then((module) => ({
    default: module.LocalEarTrainingModulationPanel,
  })),
);
const LocalEarTrainingChordPanel = lazy(() =>
  import("../../components/practice/LocalEarTrainingChordPanel").then((module) => ({
    default: module.LocalEarTrainingChordPanel,
  })),
);

const screens = ["home", "custom", "monitor", "pitch", "interval", "compare", "chord", "seventh", "seventh-spacing", "progression", "modulation", "scale", "rhythm", "melody", "piano"] as const;
type Screen = (typeof screens)[number];
type PracticeScreenName = Exclude<Screen, "home" | "custom" | "piano" | "monitor">;

const screenDetails: Record<
  Exclude<Screen, "home">,
  { title: string; summary: string; tone: string }
> = {
  custom: {
    title: "定制练习",
    summary: "选择题型、难度和答案类别，开始一组仅当前会话有效的本地练习。",
    tone: "bg-violet-50 text-violet-950 ring-violet-200",
  },
  monitor: {
    title: "实时音高反馈",
    summary: "实时观察音高曲线；录音需再次主动开始，只留在当前会话且不上传。",
    tone: "bg-cyan-50 text-cyan-950 ring-cyan-200",
  },
  pitch: {
    title: "单音听辨",
    summary: "听一个本地合成音，辨认它的音名。",
    tone: "bg-sky-50 text-sky-900 ring-sky-200",
  },
  interval: {
    title: "音程听辨",
    summary: "听两个依次播放的音，辨认上行或下行音程。",
    tone: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  },
  compare: {
    title: "音程比较与模唱",
    summary: "比较两组音程的大小和方向，再选择是否查看非评分模唱反馈。",
    tone: "bg-emerald-50 text-emerald-950 ring-emerald-200",
  },
  chord: {
    title: "和弦与转位",
    summary: "听三和弦同时或分解发声，辨认和弦性质与最低音位置。",
    tone: "bg-fuchsia-50 text-fuchsia-950 ring-fuchsia-200",
  },
  seventh: { title: "七和弦听辨", summary: "听四个音，辨认七和弦性质与最低音位置。", tone: "bg-indigo-50 text-indigo-950 ring-indigo-200" },
  "seventh-spacing": { title: "七和弦排列", summary: "听四个音，辨认低音上方声部的开放或密集排列。", tone: "bg-amber-50 text-amber-950 ring-amber-200" },
  progression: {
    title: "和声进行",
    summary: "听依次播放的三和弦，辨认级数进行与终止式。",
    tone: "bg-cyan-50 text-cyan-950 ring-cyan-200",
  },
  modulation: {
    title: "调制听辨",
    summary: "听依次播放的和弦，判断音乐从当前调性转向哪里。",
    tone: "bg-blue-50 text-blue-950 ring-blue-200",
  },
  scale: {
    title: "音阶与调式",
    summary: "听从主音上行的音阶，辨认大小调、五声与教会调式。",
    tone: "bg-teal-50 text-teal-950 ring-teal-200",
  },
  rhythm: {
    title: "节奏听辨",
    summary: "听四拍节奏，选择与声音一致的节奏形状。",
    tone: "bg-violet-50 text-violet-900 ring-violet-200",
  },
  melody: {
    title: "旋律听写",
    summary: "完整听完三音短旋律，可使用五种受控方式听写，也可按四拍预备进行会话内非评分回唱。",
    tone: "bg-amber-50 text-amber-950 ring-amber-200",
  },
  piano: {
    title: "本地参考钢琴",
    summary: "使用安装包内的三层钢琴采样辅助找音；不可用时明确降级，不保存弹奏，也不生成成绩。",
    tone: "bg-rose-50 text-rose-950 ring-rose-200",
  },
};

function screenFromHash(): Screen {
  const candidate = window.location.hash.replace(/^#\/?/, "");
  return screens.includes(candidate as Screen) ? (candidate as Screen) : "home";
}

const screenForReviewTarget = (target: LocalPracticeReviewTarget): PracticeScreenName => {
  if (target.kind === "single-pitch") return "pitch";
  if (target.kind === "melody-dictation") return "melody";
  if (target.kind === "chord-inversion") return "chord";
  if (target.kind === "seventh-chord") return "seventh";
  if (target.kind === "seventh-chord-spacing") return "seventh-spacing";
  if (target.kind === "harmony-progression") return "progression";
  if (target.kind === "modulation") return "modulation";
  if (target.kind === "scale-mode") return "scale";
  if (target.kind === "interval-comparison") return "compare";
  return target.kind;
};

const reviewTargetLabel = (target: LocalPracticeReviewTarget): string => {
  const title = screenDetails[screenForReviewTarget(target)].title;
  const detail = target.kind === "interval" ? ` · ${target.direction}` : "";
  return `${title} · ${target.difficulty}${detail}`;
};

const screenForCustomization = (
  customization: LocalPracticeCustomization,
): PracticeScreenName => {
  if (customization.kind === "single-pitch") return "pitch";
  if (customization.kind === "interval") return "interval";
  if (customization.kind === "chord-inversion") return "chord";
  if (customization.kind === "seventh-chord") return "seventh";
  if (customization.kind === "seventh-chord-spacing") return "seventh-spacing";
  if (customization.kind === "harmony-progression") return "progression";
  if (customization.kind === "modulation") return "modulation";
  if (customization.kind === "scale-mode") return "scale";
  if (customization.kind === "rhythm") return "rhythm";
  return "melody";
};

function PracticeScreen({
  screen,
  reviewTarget,
  customPractice,
  onLocalAnswerResult,
  onLeaveReviewTarget,
}: {
  screen: PracticeScreenName;
  reviewTarget: LocalPracticeReviewTarget | null;
  customPractice?: ResolvedLocalPracticeCustomization;
  onLocalAnswerResult: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget: () => void;
}) {
  const sharedProps = { onLocalAnswerResult, onLeaveReviewTarget, customPractice };
  if (screen === "pitch") {
    const target = reviewTarget?.kind === "single-pitch" ? reviewTarget : undefined;
    return <LocalEarTrainingSinglePitchPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-pitch"} initialReviewTarget={target} showLocalPiano expandedLocalCatalog {...sharedProps} />;
  }
  if (screen === "interval") {
    const target = reviewTarget?.kind === "interval" ? reviewTarget : undefined;
    return <LocalEarTrainingIntervalPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-interval"} initialReviewTarget={target} showLocalPiano expandedLocalCatalog {...sharedProps} />;
  }
  if (screen === "compare") {
    const target = reviewTarget?.kind === "interval-comparison" ? reviewTarget : undefined;
    return <LocalIntervalComparisonPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-interval-comparison"} initialReviewTarget={target} onLocalAnswerResult={onLocalAnswerResult} onLeaveReviewTarget={onLeaveReviewTarget} />;
  }
  if (screen === "chord") {
    const target = reviewTarget?.kind === "chord-inversion" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-fuchsia-50 p-4 text-sm text-fuchsia-900">正在载入和弦练习…</p>}><LocalEarTrainingChordPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-chord"} initialReviewTarget={target} showLocalPiano {...sharedProps} /></Suspense>;
  }
  if (screen === "seventh") {
    const target = reviewTarget?.kind === "seventh-chord" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">正在载入七和弦练习…</p>}><LocalEarTrainingSeventhChordPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-seventh"} initialReviewTarget={target} {...sharedProps} /></Suspense>;
  }
  if (screen === "seventh-spacing") {
    const target = reviewTarget?.kind === "seventh-chord-spacing" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">正在载入七和弦排列练习…</p>}><LocalEarTrainingSeventhChordSpacingPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-seventh-spacing"} initialReviewTarget={target} {...sharedProps} /></Suspense>;
  }
  if (screen === "progression") {
    const target = reviewTarget?.kind === "harmony-progression" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-900">正在载入和声进行练习…</p>}><LocalEarTrainingHarmonyProgressionPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-progression"} initialReviewTarget={target} showLocalPiano {...sharedProps} /></Suspense>;
  }
  if (screen === "modulation") {
    const target = reviewTarget?.kind === "modulation" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">正在载入调制听辨练习…</p>}><LocalEarTrainingModulationPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-modulation"} initialReviewTarget={target} showLocalPiano {...sharedProps} /></Suspense>;
  }
  if (screen === "scale") {
    const target = reviewTarget?.kind === "scale-mode" ? reviewTarget : undefined;
    return <Suspense fallback={<p className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900">正在载入音阶与调式练习…</p>}><LocalEarTrainingScaleModePanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-scale"} initialReviewTarget={target} showLocalPiano {...sharedProps} /></Suspense>;
  }
  if (screen === "rhythm") {
    const target = reviewTarget?.kind === "rhythm" ? reviewTarget : undefined;
    return <LocalEarTrainingRhythmPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-rhythm"} initialReviewTarget={target} showLocalPiano expandedLocalCatalog {...sharedProps} />;
  }
  const target = reviewTarget?.kind === "melody-dictation" ? reviewTarget : undefined;
  return <LocalEarTrainingMelodyDictationPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-melody"} initialReviewTarget={target} showLocalPiano expandedLocalCatalog {...sharedProps} />;
}

export function App() {
  const [vocalTarget, setVocalTarget] = useState<GeneratedLocalVocalExercise | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>(screenFromHash);
  const [initialReviewStorageResult] = useState(() =>
    loadMobilePracticeReviewQueue(getBrowserPracticeReviewStorage()),
  );
  const [reviewQueue, setReviewQueue] = useState<LocalPracticeReviewQueue>(
    initialReviewStorageResult.queue,
  );
  const [activeReviewTarget, setActiveReviewTarget] =
    useState<LocalPracticeReviewTarget | null>(null);
  const [activeCustomPractice, setActiveCustomPractice] =
    useState<ResolvedLocalPracticeCustomization | null>(null);
  const [lastCustomSelection, setLastCustomSelection] =
    useState<LocalPracticeCustomization | undefined>(undefined);
  const [reviewNotice, setReviewNotice] = useState<string | null>(
    initialReviewStorageResult.notice,
  );
  const [initialLearningStorageResult] = useState(() =>
    loadMobileLearningHistory(getBrowserPracticeReviewStorage()),
  );
  const [learningHistory, setLearningHistory] = useState<LocalLearningHistory>(
    initialLearningStorageResult.history,
  );
  const [learningNotice, setLearningNotice] = useState<string | null>(
    initialLearningStorageResult.notice,
  );
  const [isClearConfirmationVisible, setIsClearConfirmationVisible] =
    useState(false);
  const [isLearningResetConfirmationVisible, setIsLearningResetConfirmationVisible] =
    useState(false);
  const [lifecycle, setLifecycle] = useState(() =>
    createMobileLifecycleState(!document.hidden),
  );
  const activeScreenRef = useRef(activeScreen);
  const pendingReviewNavigationRef = useRef<PracticeScreenName | null>(null);

  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);

  const stopActiveAudio = useCallback(() => {
    stopAllBrowserAudio();
    void suspendAllBrowserAudio();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      stopActiveAudio();
      const nextScreen = screenFromHash();
      if (nextScreen !== "custom") setActiveCustomPractice(null);
      const shouldKeepReviewTarget = pendingReviewNavigationRef.current === nextScreen;
      pendingReviewNavigationRef.current = null;
      if (!shouldKeepReviewTarget) setActiveReviewTarget(null);
      setActiveScreen(nextScreen);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [stopActiveAudio]);

  const handleLocalAnswerResult = useCallback(
    (result: LocalPracticeAnswerResult) => {
      const targetKey = getLocalPracticeReviewTargetKey(result.target);
      const wasInReviewQueue = reviewQueue.some(
        (target) => getLocalPracticeReviewTargetKey(target) === targetKey,
      );
      const nextQueue = updateLocalPracticeReviewQueue({
        queue: reviewQueue,
        target: result.target,
        isCorrect: result.isCorrect,
      });
      setReviewQueue(nextQueue);
      const saveResult = saveMobilePracticeReviewQueue(
        getBrowserPracticeReviewStorage(),
        nextQueue,
      );
      setReviewNotice(
        saveResult.notice ??
          (result.isCorrect
            ? wasInReviewQueue
              ? "本题已从本机复练中移除。"
              : "本题回答已核对，未加入本机复练。"
              : "已加入本机复练，可从练习首页再次打开。"),
      );
      const nextHistory = recordCheckedAnswerLearningEvent({
        history: learningHistory,
        result,
        practiceMode: activeReviewTarget
          ? "review"
          : activeScreen === "custom" && activeCustomPractice
            ? "custom"
            : "random",
      });
      setLearningHistory(nextHistory);
      setLearningNotice(
        saveMobileLearningHistory(getBrowserPracticeReviewStorage(), nextHistory).notice,
      );
    },
    [activeCustomPractice, activeReviewTarget, activeScreen, learningHistory, reviewQueue],
  );

  const leaveReviewTarget = useCallback(() => {
    stopActiveAudio();
    setActiveReviewTarget(null);
  }, [stopActiveAudio]);

  const startReviewTarget = useCallback(
    (target: LocalPracticeReviewTarget) => {
      stopActiveAudio();
      const nextHistory = recordReviewStartedLearningEvent({ history: learningHistory, target });
      setLearningHistory(nextHistory);
      setLearningNotice(
        saveMobileLearningHistory(getBrowserPracticeReviewStorage(), nextHistory).notice,
      );
      setActiveReviewTarget(target);
      const targetScreen = screenForReviewTarget(target);
      if (screenFromHash() !== targetScreen) {
        pendingReviewNavigationRef.current = targetScreen;
        window.location.hash = targetScreen;
      }
    },
    [learningHistory, stopActiveAudio],
  );

  const clearReviewQueue = useCallback(() => {
    const result = clearMobilePracticeReviewQueue(
      getBrowserPracticeReviewStorage(),
    );
    setIsClearConfirmationVisible(false);
    if (result.notice) {
      setReviewNotice(result.notice);
      return;
    }
    setReviewQueue(createEmptyLocalPracticeReviewQueue());
    setActiveReviewTarget(null);
    setReviewNotice("本机复练记录已清除。");
  }, []);

  const toggleLearningSuggestions = useCallback(() => {
    const nextHistory = setLearningSuggestionsEnabled(
      learningHistory,
      !learningHistory.profile.suggestionsEnabled,
    );
    setLearningHistory(nextHistory);
    setLearningNotice(
      saveMobileLearningHistory(getBrowserPracticeReviewStorage(), nextHistory).notice
        ?? (nextHistory.profile.suggestionsEnabled ? "本机复练建议已开启。" : "本机复练建议已关闭。"),
    );
  }, [learningHistory]);

  const resetLearningProfile = useCallback(() => {
    const clearResult = clearMobileLearningHistory(getBrowserPracticeReviewStorage());
    setIsLearningResetConfirmationVisible(false);
    if (clearResult.notice) {
      setLearningNotice(clearResult.notice);
      return;
    }
    const resetHistory = resetLocalLearningHistory(learningHistory);
    setLearningHistory(resetHistory);
    setLearningNotice(
      saveMobileLearningHistory(getBrowserPracticeReviewStorage(), resetHistory).notice
        ?? "本机学习画像与事件已清空；复练题仍保留。建议开关保持不变。",
    );
  }, [learningHistory]);

  const learningSuggestion = useMemo(
    () => resolveLocalLearningSuggestion(learningHistory, reviewQueue),
    [learningHistory, reviewQueue],
  );

  useEffect(() => {
    const enterBackground = () => {
      stopActiveAudio();
      setLifecycle((current) =>
        enterMobileBackground(current, activeScreenRef.current !== "home"),
      );
    };
    const enterForeground = () => {
      if (document.hidden) return;
      setLifecycle(enterMobileForeground);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) enterBackground();
      else enterForeground();
    };
    const handleNativeLifecycle = (event: Event) => {
      const state = (event as CustomEvent<{ state?: unknown }>).detail?.state;
      if (state === "pause") enterBackground();
      if (state === "resume") enterForeground();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", enterBackground);
    window.addEventListener("freeze", enterBackground);
    window.addEventListener("solfeggio:native-lifecycle", handleNativeLifecycle);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", enterBackground);
      window.removeEventListener("freeze", enterBackground);
      window.removeEventListener("solfeggio:native-lifecycle", handleNativeLifecycle);
      stopActiveAudio();
    };
  }, [stopActiveAudio]);

  const activeTitle = useMemo(
    () =>
      activeScreen === "home"
        ? "本地练习"
        : screenDetails[activeScreen].title,
    [activeScreen],
  );

  return (
    <div className="mobile-shell min-h-screen bg-slate-50 text-slate-950">
      <header className="mobile-topbar border-b border-indigo-900/10 bg-indigo-950 text-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img
            src="./icons/app-icon.svg"
            alt=""
            className="h-11 w-11 rounded-xl bg-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">视唱练耳</p>
            <p className="truncate text-xs text-indigo-100">{activeTitle}</p>
          </div>
          <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-bold text-emerald-950">
            本地模式
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        {lifecycle.shouldShowResetNotice ? (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-200"
            role="status"
          >
            <p>应用从后台恢复后已停止声音并重置当前练习状态，避免残留播放。</p>
            <button
              type="button"
              onClick={() => setLifecycle(dismissMobileResetNotice)}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold underline"
            >
              知道了
            </button>
          </div>
        ) : null}

        {reviewNotice ? (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-2xl bg-indigo-50 p-3 text-sm leading-6 text-indigo-950 ring-1 ring-indigo-200"
            role="status"
          >
            <p>{reviewNotice}</p>
            <button
              type="button"
              onClick={() => setReviewNotice(null)}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold underline"
            >
              关闭
            </button>
          </div>
        ) : null}

        {activeScreen === "home" ? (
          <>
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl shadow-indigo-950/15">
              <p className="text-sm font-semibold text-indigo-100">安卓私测版</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                不联网，也能开始练耳
              </h1>
              <p className="mt-3 text-sm leading-7 text-indigo-100">
                三难度听辨题库、实时音高反馈、声音引擎和参考钢琴已经打包在安装包内。无需访问网页、无需登录，也不会上传你的练习、声音或弹奏。
              </p>
            </section>

            <section className="mt-5" aria-labelledby="practice-heading">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-700">从这里开始</p>
                  <h2 id="practice-heading" className="text-2xl font-black">
                    选择练习
                  </h2>
                </div>
                <p className="text-xs text-slate-500">答案说明，不是正式评分</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(Object.keys(screenDetails) as Array<Exclude<Screen, "home">>).map(
                  (screen, index) => {
                    const detail = screenDetails[screen];
                    return (
                      <a
                        key={screen}
                        href={`#${screen}`}
                        onClick={() => setActiveReviewTarget(null)}
                        className={`min-h-32 rounded-3xl p-5 text-left ring-1 transition active:scale-[0.99] ${detail.tone}`}
                      >
                        <span className="text-xs font-bold opacity-70">
                          {screen === "piano" ? "找音辅助" : screen === "monitor" ? "练声反馈" : `练习 ${index}`}
                        </span>
                        <span className="mt-2 block text-xl font-black">
                          {detail.title}
                        </span>
                        <span className="mt-2 block text-sm leading-6 opacity-80">
                          {detail.summary}
                        </span>
                      </a>
                    );
                  },
                )}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm" aria-labelledby="review-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-700">仅保存在这台手机</p>
                  <h2 id="review-heading" className="text-xl font-black text-indigo-950">
                    本机复练（{reviewQueue.length}）
                  </h2>
                </div>
                {reviewQueue.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsClearConfirmationVisible(true)}
                    className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900"
                  >
                    清除记录
                  </button>
                ) : null}
              </div>
              {reviewQueue.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-indigo-900">
                  暂无复练题。查看答案后，答错的题会加入这里；答对同一道题会从这里移除。
                </p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {reviewQueue.map((target, index) => (
                    <li key={getLocalPracticeReviewTargetKey(target)}>
                      <button
                        type="button"
                        onClick={() => startReviewTarget(target)}
                        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left font-bold text-indigo-950"
                      >
                        <span>{reviewTargetLabel(target)}</span>
                        <span className="shrink-0 text-xs font-semibold text-indigo-600">
                          复练 {index + 1}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {isClearConfirmationVisible ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4" role="alert">
                  <p className="font-bold text-rose-950">确认清除全部本机复练记录？</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">清除后无法恢复，但不会影响继续随机练习。</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={clearReviewQueue} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">确认清除</button>
                    <button type="button" onClick={() => setIsClearConfirmationVisible(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800">取消</button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm" aria-labelledby="learning-profile-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">本机事实，不是能力评分</p>
                  <h2 id="learning-profile-heading" className="text-xl font-black text-emerald-950">学习画像</h2>
                </div>
                <button type="button" aria-pressed={learningHistory.profile.suggestionsEnabled} onClick={toggleLearningSuggestions} className="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900">
                  {learningHistory.profile.suggestionsEnabled ? "关闭建议" : "开启建议"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-950">
                已核对 {learningHistory.profile.checkedCount} 次；其中正确 {learningHistory.profile.correctCount} 次、错误 {learningHistory.profile.incorrectCount} 次；已开始复练 {learningHistory.profile.reviewStartedCount} 次、复练答对 {learningHistory.profile.reviewResolvedCount} 次。
              </p>
              {learningSuggestion ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="font-bold text-emerald-950">建议下一步：{reviewTargetLabel(learningSuggestion.target)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{learningSuggestion.reason}</p>
                  <button type="button" onClick={() => startReviewTarget(learningSuggestion.target)} className="mt-3 min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">开始这题复练</button>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-emerald-900">
                  {learningHistory.profile.suggestionsEnabled ? "当前没有可建议的复练题。" : "复练建议已关闭；练习和复练队列不受影响。"}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {learningHistory.profile.revision > 0 ? (
                  <button type="button" onClick={() => setIsLearningResetConfirmationVisible(true)} className="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900">重置画像</button>
                ) : null}
                {learningNotice ? <p className="text-sm leading-6 text-emerald-900" aria-live="polite">{learningNotice}</p> : null}
              </div>
              {isLearningResetConfirmationVisible ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4" role="alert">
                  <p className="font-bold text-rose-950">确认清空本机学习画像与事件？</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">此操作不可恢复，但不会清除复练题、录音或其他本机数据。</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={resetLearningProfile} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">确认重置</button>
                    <button type="button" onClick={() => setIsLearningResetConfirmationVisible(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800">取消</button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">当前测试边界</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                <li>• 题目、答案和声音全部在手机本地运行。</li>
                <li>• 不保存用户答案与声音；只保存题型、难度、核对结果和复练动作等最小事实。</li>
                <li>• 本机复练最多保留 12 题，可随时清除；卸载或清除应用数据后消失。</li>
                <li>• 学习画像只生成非评分复练建议，可关闭或单独重置，不影响核心练习。</li>
                <li>• 暂不包含账号、云同步、上传和正式评分。</li>
              </ul>
            </section>
          </>
        ) : activeScreen === "custom" ? (
          <section aria-label={screenDetails.custom.title} className="grid gap-4">
            <a
              href="#home"
              onClick={() => {
                stopActiveAudio();
                setActiveCustomPractice(null);
                setActiveReviewTarget(null);
              }}
              className="inline-flex min-h-11 w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm"
            >
              返回练习首页
            </a>
            {activeCustomPractice ? (
              <>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
                  <p className="font-bold">
                    当前定制：{screenDetails[screenForCustomization(activeCustomPractice.customization)].title} · {activeCustomPractice.customization.difficulty}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {activeCustomPractice.answerOptionIds.length} 类答案 · {activeCustomPractice.variantCount} 个稳定组合；仅当前会话有效。
                  </p>
                  <button
                    type="button"
                    className="mt-3 min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900"
                    onClick={() => {
                      stopActiveAudio();
                      setLastCustomSelection(activeCustomPractice.customization);
                      setActiveCustomPractice(null);
                    }}
                  >
                    重新设置
                  </button>
                </div>
                {lifecycle.isForeground ? (
                  <PracticeScreen
                    key={JSON.stringify(activeCustomPractice.customization)}
                    screen={screenForCustomization(activeCustomPractice.customization)}
                    reviewTarget={null}
                    customPractice={activeCustomPractice}
                    onLocalAnswerResult={handleLocalAnswerResult}
                    onLeaveReviewTarget={leaveReviewTarget}
                  />
                ) : null}
              </>
            ) : (
              <LocalPracticeCustomizerPanel
                initialSelection={lastCustomSelection}
                onStart={(resolved) => {
                  stopActiveAudio();
                  setLastCustomSelection(resolved.customization);
                  setActiveReviewTarget(null);
                  setActiveCustomPractice(resolved);
                }}
              />
            )}
          </section>
        ) : activeScreen === "piano" ? (
          <section aria-label={screenDetails.piano.title}>
            <a
              href="#home"
              onClick={() => setActiveReviewTarget(null)}
              className="mb-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm"
            >
              返回练习首页
            </a>
            {lifecycle.isForeground ? <LocalPianoPanel /> : null}
          </section>
        ) : activeScreen === "monitor" ? (
          <section aria-label={screenDetails.monitor.title} className="grid gap-4">
            <a href="#home" onClick={() => setActiveReviewTarget(null)} className="mb-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm">返回练习首页</a>
            {lifecycle.isForeground ? <RealtimePitchMonitorPanel targetExercise={vocalTarget} /> : null}
            {lifecycle.isForeground ? <LocalVocalExercisePanel onTargetChange={setVocalTarget} /> : null}
          </section>
        ) : (
          <section aria-label={screenDetails[activeScreen].title}>
            <a
              href="#home"
              onClick={() => setActiveReviewTarget(null)}
              className="mb-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm"
            >
              返回练习首页
            </a>
            {lifecycle.isForeground ? (
              <PracticeScreen
                screen={activeScreen}
                reviewTarget={activeReviewTarget}
                onLocalAnswerResult={handleLocalAnswerResult}
                onLeaveReviewTarget={leaveReviewTarget}
              />
            ) : null}
          </section>
        )}
      </main>

      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        aria-label="主要练习"
      >
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto pb-1">
          {screens.map((screen) => {
            const label = screen === "home"
              ? "首页"
              : screen === "piano"
                ? "钢琴"
                : screen === "monitor"
                  ? "音高"
                : screenDetails[screen].title.replace("听辨", "");
            return (
              <a
                key={screen}
                href={`#${screen}`}
                onClick={() => setActiveReviewTarget(null)}
                aria-current={activeScreen === screen ? "page" : undefined}
                className={`min-h-12 min-w-16 flex-1 rounded-xl px-1 py-2 text-xs font-bold ${
                  activeScreen === screen
                    ? "bg-indigo-100 text-indigo-950"
                    : "text-slate-500"
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
