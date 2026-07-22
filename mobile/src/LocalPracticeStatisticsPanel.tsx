import { useMemo, useState } from "react";

import {
  buildLocalPracticeStatistics,
  type LocalPracticeStatisticsEvent,
  type LocalPracticeStatisticsWindow,
} from "../../lib/learning/localPracticeStatistics";

const windowLabels: Record<LocalPracticeStatisticsWindow, string> = {
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  all: "全部记录",
};
const practiceModeLabels: Record<LocalPracticeStatisticsEvent["practiceMode"], string> = {
  random: "随机练习",
  review: "本机复练",
  custom: "定制练习",
};
const skillKindLabels: Record<LocalPracticeStatisticsEvent["skillKind"], string> = {
  "single-pitch": "单音听辨",
  interval: "音程听辨",
  "interval-comparison": "音程比较",
  "chord-inversion": "和弦与转位",
  "harmony-progression": "和声进行",
  "scale-mode": "音阶与调式",
  "seventh-chord": "七和弦",
  "seventh-chord-spacing": "七和弦排列",
  modulation: "调制听辨",
  rhythm: "节奏听辨",
  "melody-dictation": "旋律听写",
};

function StatisticsList<T extends string>({
  title,
  buckets,
  labelFor,
}: {
  title: string;
  buckets: Array<{ key: T; factCount: number; checkedCount: number; reviewStartedCount: number }>;
  labelFor: (key: T) => string;
}) {
  const visible = buckets.filter((bucket) => bucket.factCount > 0);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      {visible.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">此时间范围内暂无可显示的本机事实。</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {visible.map((bucket) => (
            <li key={bucket.key} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-950">{labelFor(bucket.key)}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                记录动作 {bucket.factCount} 次 · 已核对 {bucket.checkedCount} 次 · 开始复练 {bucket.reviewStartedCount} 次
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function LocalPracticeStatisticsPanel({
  events,
  now,
}: {
  events: readonly LocalPracticeStatisticsEvent[];
  now?: Date;
}) {
  const [window, setWindow] = useState<LocalPracticeStatisticsWindow>("7d");
  const statistics = useMemo(
    () => buildLocalPracticeStatistics({ events, window, now: now ?? new Date() }),
    [events, now, window],
  );

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl bg-gradient-to-br from-sky-950 to-indigo-800 p-6 text-white">
        <p className="text-sm font-semibold text-sky-100">本机详细练习统计</p>
        <h1 className="mt-2 text-2xl font-black">看见已经发生的练习动作</h1>
        <p className="mt-3 text-sm leading-6 text-sky-100">
          只汇总当前已载入的最小学习事件：练习方式、题目族、核对动作和复练开始动作；不读取核对结果内容，也不作能力判断。
        </p>
      </section>

      <div className="grid grid-cols-3 gap-2" aria-label="统计时间范围">
        {(Object.keys(windowLabels) as LocalPracticeStatisticsWindow[]).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={window === item}
            onClick={() => setWindow(item)}
            className={`min-h-11 rounded-xl px-2 py-2 text-sm font-bold ${window === item ? "bg-indigo-800 text-white" : "border border-slate-300 bg-white text-slate-800"}`}
          >
            {windowLabels[item]}
          </button>
        ))}
      </div>

      {statistics.status === "unavailable" ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5" role="status">
          <h2 className="font-black text-amber-950">统计暂不可用</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">本机事件存在无法解释的数据，本页不会猜测或补造统计。</p>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5">
            <p className="text-sm font-semibold text-indigo-700">{windowLabels[window]}</p>
            <p className="mt-2 text-2xl font-black text-indigo-950">记录动作 {statistics.factCount} 次</p>
            <p className="mt-2 text-sm leading-6 text-indigo-900">已核对 {statistics.checkedCount} 次 · 开始复练 {statistics.reviewStartedCount} 次</p>
          </section>
          <StatisticsList title="按练习方式" buckets={statistics.byPracticeMode} labelFor={(key) => practiceModeLabels[key]} />
          <StatisticsList title="按题目族" buckets={statistics.bySkillKind} labelFor={(key) => skillKindLabels[key]} />
        </>
      )}

      <p className="rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
        来源边界：统计只来自本机学习画像当前保留的最近事件，最多 48 条。“全部记录”指这批当前保留事件，不代表终身历史；课程进度、答案、录音和原始分析证据不在统计来源中。
      </p>
    </div>
  );
}
