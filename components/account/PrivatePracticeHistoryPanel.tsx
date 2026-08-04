"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  formatPrivatePracticeCompletedAt,
  type PrivatePracticeHistoryResult,
} from "../../lib/account/privatePracticeHistory";
import { getSupabaseBrowserClient } from "../../lib/platform/supabaseBrowser";
import { loadSupabasePrivatePracticeHistory } from "../../lib/platform/supabasePrivatePracticeHistory";

type HistoryStatus = "loading" | "ready" | "error";

type HistoryViewState = {
  userId: string | null;
  status: HistoryStatus;
  history: PrivatePracticeHistoryResult;
};

const EMPTY_HISTORY: PrivatePracticeHistoryResult = {
  items: [],
  ignoredCount: 0,
};

export function PrivatePracticeHistoryPanel({
  userId,
  timeZone,
}: {
  userId: string;
  timeZone: string;
}) {
  const [viewState, setViewState] = useState<HistoryViewState>({
    userId: null,
    status: "loading",
    history: EMPTY_HISTORY,
  });
  const requestGenerationRef = useRef(0);

  const loadHistory = useCallback(async (showLoading: boolean) => {
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    if (showLoading) {
      setViewState({ userId, status: "loading", history: EMPTY_HISTORY });
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      if (requestGenerationRef.current === requestGeneration) {
        setViewState({ userId, status: "error", history: EMPTY_HISTORY });
      }
      return;
    }

    try {
      const result = await loadSupabasePrivatePracticeHistory(client, userId);
      if (requestGenerationRef.current !== requestGeneration) return;
      setViewState({ userId, status: "ready", history: result });
    } catch {
      if (requestGenerationRef.current !== requestGeneration) return;
      setViewState({ userId, status: "error", history: EMPTY_HISTORY });
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const startInitialLoad = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadHistory(false);
    };
    void startInitialLoad();
    return () => {
      cancelled = true;
      requestGenerationRef.current += 1;
    };
  }, [loadHistory]);

  const { status, history } =
    viewState.userId === userId
      ? viewState
      : { status: "loading" as const, history: EMPTY_HISTORY };

  return (
    <section className="mt-5 max-w-3xl rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-emerald-950">最近私人练习记录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            只显示当前账户最近 20 条已完成的系统课程核对记录。它们不是分数、等级或正式能力评价。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory(true)}
          disabled={status === "loading"}
          className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:text-emerald-300"
        >
          {status === "loading" ? "正在读取…" : "刷新记录"}
        </button>
      </div>

      <div aria-live="polite">
        {status === "loading" ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            正在读取当前账户的私人练习记录…
          </p>
        ) : null}
        {status === "error" ? (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">
            <p>私人练习记录暂时无法读取。没有显示旧账户或不完整数据。</p>
            <button
              type="button"
              onClick={() => void loadHistory(true)}
              className="mt-2 font-semibold underline"
            >
              重新读取
            </button>
          </div>
        ) : null}
        {status === "ready" && history.items.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            当前账户还没有可显示的系统课程练习记录。完成课程题目并查看答案后，记录会出现在这里。
          </p>
        ) : null}
      </div>

      {status === "ready" && history.items.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {history.items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.exerciseTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[item.courseTitle, item.lessonTitle, item.kindLabel, item.difficulty]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    本次核对：
                    <span className="font-semibold">
                      {item.matchesAnswer ? "与题目答案一致" : "与题目答案不一致"}
                    </span>
                    。此结果只用于回看和复练。
                  </p>
                  <time
                    dateTime={item.completedAt}
                    className="mt-1 block text-xs text-slate-500"
                  >
                    {formatPrivatePracticeCompletedAt(item.completedAt, timeZone)}
                  </time>
                </div>
                <Link
                  href={item.retryHref}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  再练一次
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {status === "ready" && history.ignoredCount > 0 ? (
        <p className="mt-3 text-xs leading-5 text-amber-800">
          有 {history.ignoredCount} 条旧记录缺少当前可验证的非评分字段，因此未显示。
        </p>
      ) : null}
    </section>
  );
}
