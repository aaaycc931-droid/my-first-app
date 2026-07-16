/* eslint-disable @next/next/no-img-element -- Capacitor loads this bundled local SVG without Next.js. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEarTrainingIntervalPanel } from "../../components/practice/LocalEarTrainingIntervalPanel";
import { LocalEarTrainingMelodyDictationPanel } from "../../components/practice/LocalEarTrainingMelodyDictationPanel";
import { LocalEarTrainingRhythmPanel } from "../../components/practice/LocalEarTrainingRhythmPanel";
import { LocalEarTrainingSinglePitchPanel } from "../../components/practice/LocalEarTrainingSinglePitchPanel";
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

const screens = ["home", "pitch", "interval", "rhythm", "melody", "piano"] as const;
type Screen = (typeof screens)[number];
type PracticeScreenName = Exclude<Screen, "home" | "piano">;

const screenDetails: Record<
  Exclude<Screen, "home">,
  { title: string; summary: string; tone: string }
> = {
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
  rhythm: {
    title: "节奏听辨",
    summary: "听四拍节奏，选择与声音一致的节奏形状。",
    tone: "bg-violet-50 text-violet-900 ring-violet-200",
  },
  melody: {
    title: "旋律听写",
    summary: "听三个音组成的短旋律，按顺序填写音名。",
    tone: "bg-amber-50 text-amber-950 ring-amber-200",
  },
  piano: {
    title: "本地参考钢琴",
    summary: "使用手机本地合成参考音辅助找音，不保存弹奏，也不生成成绩。",
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
  return target.kind;
};

const reviewTargetLabel = (target: LocalPracticeReviewTarget): string => {
  const title = screenDetails[screenForReviewTarget(target)].title;
  const detail = target.kind === "interval" ? ` · ${target.direction}` : "";
  return `${title} · ${target.difficulty}${detail}`;
};

function PracticeScreen({
  screen,
  reviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
}: {
  screen: PracticeScreenName;
  reviewTarget: LocalPracticeReviewTarget | null;
  onLocalAnswerResult: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget: () => void;
}) {
  const sharedProps = { onLocalAnswerResult, onLeaveReviewTarget };
  if (screen === "pitch") {
    const target = reviewTarget?.kind === "single-pitch" ? reviewTarget : undefined;
    return <LocalEarTrainingSinglePitchPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-pitch"} initialReviewTarget={target} showLocalPiano {...sharedProps} />;
  }
  if (screen === "interval") {
    const target = reviewTarget?.kind === "interval" ? reviewTarget : undefined;
    return <LocalEarTrainingIntervalPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-interval"} initialReviewTarget={target} showLocalPiano {...sharedProps} />;
  }
  if (screen === "rhythm") {
    const target = reviewTarget?.kind === "rhythm" ? reviewTarget : undefined;
    return <LocalEarTrainingRhythmPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-rhythm"} initialReviewTarget={target} showLocalPiano {...sharedProps} />;
  }
  const target = reviewTarget?.kind === "melody-dictation" ? reviewTarget : undefined;
  return <LocalEarTrainingMelodyDictationPanel key={target ? getLocalPracticeReviewTargetKey(target) : "random-melody"} initialReviewTarget={target} showLocalPiano {...sharedProps} />;
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>(screenFromHash);
  const [initialReviewStorageResult] = useState(() =>
    loadMobilePracticeReviewQueue(getBrowserPracticeReviewStorage()),
  );
  const [reviewQueue, setReviewQueue] = useState<LocalPracticeReviewQueue>(
    initialReviewStorageResult.queue,
  );
  const [activeReviewTarget, setActiveReviewTarget] =
    useState<LocalPracticeReviewTarget | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(
    initialReviewStorageResult.notice,
  );
  const [isClearConfirmationVisible, setIsClearConfirmationVisible] =
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
    },
    [reviewQueue],
  );

  const leaveReviewTarget = useCallback(() => {
    stopActiveAudio();
    setActiveReviewTarget(null);
  }, [stopActiveAudio]);

  const startReviewTarget = useCallback(
    (target: LocalPracticeReviewTarget) => {
      stopActiveAudio();
      setActiveReviewTarget(target);
      const targetScreen = screenForReviewTarget(target);
      if (screenFromHash() !== targetScreen) {
        pendingReviewNavigationRef.current = targetScreen;
        window.location.hash = targetScreen;
      }
    },
    [stopActiveAudio],
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
                四类核心题目、声音引擎和参考钢琴已经打包在安装包内。无需访问网页、无需登录，也不会上传你的练习或弹奏。
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
                          {screen === "piano" ? "找音辅助" : `练习 ${index + 1}`}
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

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">当前测试边界</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                <li>• 题目、答案和声音全部在手机本地运行。</li>
                <li>• 当前作答与声音不保存；答错题的最小复现信息可加入本机复练。</li>
                <li>• 本机复练最多保留 12 题，可随时清除；卸载或清除应用数据后消失。</li>
                <li>• 暂不包含账号、云同步、上传和正式评分。</li>
              </ul>
            </section>
          </>
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
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1">
          {screens.map((screen) => {
            const label = screen === "home"
              ? "首页"
              : screen === "piano"
                ? "钢琴"
                : screenDetails[screen].title.replace("听辨", "");
            return (
              <a
                key={screen}
                href={`#${screen}`}
                onClick={() => setActiveReviewTarget(null)}
                aria-current={activeScreen === screen ? "page" : undefined}
                className={`min-h-12 rounded-xl px-1 py-2 text-xs font-bold ${
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
