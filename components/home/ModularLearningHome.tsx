"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  createDefaultModulePreferences,
  moveVisibleModule,
  practiceModulePreferenceStorageKey,
  practiceModules,
  reconcileModulePreferences,
  toggleVisibleModule,
  type LearningMode,
  type PracticeModulePreferences,
} from "../../lib/product/practiceModuleRegistry";

const modeCopy: Record<LearningMode, { label: string; description: string }> = {
  hobby: {
    label: "兴趣入门",
    description: "先从容易理解的听辨与短旋律开始，不显示不必要的专业复杂度。",
  },
  exam: {
    label: "艺考训练",
    description: "组合视唱、节奏、听写与乐谱练习，面向更系统的专业训练。",
  },
};

export function ModularLearningHome() {
  const [preferences, setPreferences] = useState<PracticeModulePreferences>(() =>
    createDefaultModulePreferences("hobby"),
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(practiceModulePreferenceStorageKey);
      if (stored) setPreferences(reconcileModulePreferences(JSON.parse(stored)));
    } catch {
      // Corrupt or unavailable storage falls back to the safe hobby preset.
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      window.localStorage.setItem(
        practiceModulePreferenceStorageKey,
        JSON.stringify(preferences),
      );
    } catch {
      // The home remains usable when storage is blocked.
    }
  }, [hasLoaded, preferences]);

  const visibleModules = useMemo(
    () =>
      preferences.visibleModuleIds
        .map((id) => practiceModules.find((module) => module.id === id))
        .filter((module): module is (typeof practiceModules)[number] => Boolean(module)),
    [preferences.visibleModuleIds],
  );

  const setMode = (mode: LearningMode) =>
    setPreferences(createDefaultModulePreferences(mode));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-10">
          <p className="text-sm font-bold tracking-wide text-indigo-200">视唱练耳学习平台</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">按你的目标组合练习首页</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-indigo-100">兴趣入门与艺考训练共用同一套练习内核，只调整推荐顺序和复杂度。你可以隐藏、恢复或重新排列模块。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/learn" className="rounded-xl bg-white px-4 py-3 font-bold text-indigo-900">查看系统课程</Link>
            <Link href="/account" className="rounded-xl border border-white/40 px-4 py-3 font-bold text-white">私人学习账户</Link>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black">选择学习方式</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(["hobby", "exam"] as LearningMode[]).map((mode) => (
              <button key={mode} type="button" aria-pressed={preferences.mode === mode} onClick={() => setMode(mode)} className={`rounded-2xl border p-4 text-left ${preferences.mode === mode ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200 hover:border-indigo-300"}`}>
                <span className="block text-lg font-black">{modeCopy[mode].label}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{modeCopy[mode].description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-bold text-indigo-700">当前模式：{modeCopy[preferences.mode].label}</p><h2 className="mt-1 text-2xl font-black">我的练习模块</h2></div>
            <button type="button" onClick={() => setIsEditing((value) => !value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-800">{isEditing ? "完成调整" : "调整模块"}</button>
          </div>

          {isEditing ? (
            <div className="mt-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="font-bold text-indigo-950">显示、隐藏和排序</p>
              <p className="mt-1 text-sm leading-6 text-indigo-800">设置只保存在当前浏览器。规划中的模块可以先显示，但不能进入未完成的功能。</p>
              <div className="mt-4 space-y-2">
                {practiceModules.map((module) => {
                  const visibleIndex = preferences.visibleModuleIds.indexOf(module.id);
                  return <div key={module.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-indigo-100"><label className="mr-auto flex items-center gap-3 font-semibold"><input type="checkbox" checked={visibleIndex >= 0} onChange={() => setPreferences((current) => toggleVisibleModule(current, module.id))} />{module.title}{module.availability === "planned" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">规划中</span> : null}</label><button type="button" disabled={visibleIndex <= 0} onClick={() => setPreferences((current) => moveVisibleModule(current, module.id, -1))} className="rounded-lg border px-2 py-1 disabled:opacity-30" aria-label={`上移${module.title}`}>上移</button><button type="button" disabled={visibleIndex < 0 || visibleIndex === preferences.visibleModuleIds.length - 1} onClick={() => setPreferences((current) => moveVisibleModule(current, module.id, 1))} className="rounded-lg border px-2 py-1 disabled:opacity-30" aria-label={`下移${module.title}`}>下移</button></div>;
                })}
              </div>
              <button type="button" onClick={() => setPreferences(createDefaultModulePreferences(preferences.mode))} className="mt-4 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 font-bold text-indigo-900">恢复当前模式推荐组合</button>
            </div>
          ) : null}

          {visibleModules.length === 0 ? <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-bold">当前没有显示练习模块</p><button type="button" onClick={() => setPreferences(createDefaultModulePreferences(preferences.mode))} className="mt-3 rounded-xl bg-indigo-700 px-4 py-2.5 font-bold text-white">恢复推荐组合</button></div> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleModules.map((module, index) => <article key={module.id} className="flex min-h-56 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold text-indigo-600">模块 {index + 1}</p><h3 className="mt-2 text-xl font-black">{module.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{module.description}</p>{module.availability === "available" ? <Link href={module.href} className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-center font-bold text-white">开始练习</Link> : <button type="button" disabled className="mt-5 rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-500">规划中，暂不可用</button>}</article>)}</div>}
        </section>
      </div>
    </main>
  );
}
