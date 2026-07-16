/* eslint-disable @next/next/no-img-element -- Capacitor loads this bundled local SVG without Next.js. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalEarTrainingIntervalPanel } from "../../components/practice/LocalEarTrainingIntervalPanel";
import { LocalEarTrainingMelodyDictationPanel } from "../../components/practice/LocalEarTrainingMelodyDictationPanel";
import { LocalEarTrainingRhythmPanel } from "../../components/practice/LocalEarTrainingRhythmPanel";
import { LocalEarTrainingSinglePitchPanel } from "../../components/practice/LocalEarTrainingSinglePitchPanel";
import {
  stopAllBrowserAudio,
  suspendAllBrowserAudio,
} from "../../lib/audio/browserAudioEngine";
import {
  createMobileLifecycleState,
  dismissMobileResetNotice,
  enterMobileBackground,
  enterMobileForeground,
} from "./runtime/mobileLifecycle";

const screens = ["home", "pitch", "interval", "rhythm", "melody"] as const;
type Screen = (typeof screens)[number];

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
};

function screenFromHash(): Screen {
  const candidate = window.location.hash.replace(/^#\/?/, "");
  return screens.includes(candidate as Screen) ? (candidate as Screen) : "home";
}

function PracticeScreen({ screen }: { screen: Exclude<Screen, "home"> }) {
  if (screen === "pitch") return <LocalEarTrainingSinglePitchPanel />;
  if (screen === "interval") return <LocalEarTrainingIntervalPanel />;
  if (screen === "rhythm") return <LocalEarTrainingRhythmPanel />;
  return <LocalEarTrainingMelodyDictationPanel />;
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>(screenFromHash);
  const [lifecycle, setLifecycle] = useState(() =>
    createMobileLifecycleState(!document.hidden),
  );
  const activeScreenRef = useRef(activeScreen);

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
      setActiveScreen(screenFromHash());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [stopActiveAudio]);

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
            <p>应用从后台恢复后已停止声音并重置当前题目，避免残留播放。</p>
            <button
              type="button"
              onClick={() => setLifecycle(dismissMobileResetNotice)}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold underline"
            >
              知道了
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
                四类核心题目和声音引擎已经打包在安装包内。无需访问网页、无需登录，也不会上传你的练习。
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
                        className={`min-h-32 rounded-3xl p-5 text-left ring-1 transition active:scale-[0.99] ${detail.tone}`}
                      >
                        <span className="text-xs font-bold opacity-70">
                          练习 {index + 1}
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

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">当前测试边界</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                <li>• 题目、答案和声音全部在手机本地运行。</li>
                <li>• 练习进度只保留在当前页面，关闭后会清除。</li>
                <li>• 暂不包含账号、云同步、上传和正式评分。</li>
              </ul>
            </section>
          </>
        ) : (
          <section aria-label={screenDetails[activeScreen].title}>
            <a
              href="#home"
              className="mb-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm"
            >
              返回练习首页
            </a>
            {lifecycle.isForeground ? <PracticeScreen screen={activeScreen} /> : null}
          </section>
        )}
      </main>

      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        aria-label="主要练习"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {screens.map((screen) => {
            const label =
              screen === "home"
                ? "首页"
                : screenDetails[screen].title.replace("听辨", "");
            return (
              <a
                key={screen}
                href={`#${screen}`}
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
