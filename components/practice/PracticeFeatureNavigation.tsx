export type PracticeFeatureView =
  | "sheet-music"
  | "notation-practice"
  | "local-melody"
  | "rhythm"
  | "onset"
  | "feedback";

type PracticeFeatureNavigationItem = {
  id: PracticeFeatureView;
  label: string;
  description: string;
};

const practiceFeatureNavigationItems: PracticeFeatureNavigationItem[] = [
  {
    id: "sheet-music",
    label: "乐谱预览",
    description:
      "选择本地乐谱图片、检查草稿并确认创建临时乐谱练习目标。",
  },
  {
    id: "notation-practice",
    label: "临时乐谱练习",
    description: "按已确认的临时乐谱目标逐事件练习；当前不录音、不评分。",
  },
  {
    id: "local-melody",
    label: "本地旋律",
    description:
      "按顺序完成本地音频导入、目标音高曲线草稿、选区检查与临时练习目标。",
  },
  {
    id: "rhythm",
    label: "节拍与节奏",
    description: "使用节拍器、点击练习与会话内延迟校准观察节奏稳定性，不评分。",
  },
  {
    id: "onset",
    label: "起音诊断",
    description: "从最新本地录音检测起音候选，并查看非评分节奏诊断反馈。",
  },
  {
    id: "feedback",
    label: "练习反馈",
    description: "录音、音高估计、导入目标音高反馈与本次会话练习记录。",
  },
];

type PracticeFeatureNavigationProps = {
  activeView: PracticeFeatureView;
  onActiveViewChange: (view: PracticeFeatureView) => void;
};

export function PracticeFeatureNavigation({
  activeView,
  onActiveViewChange,
}: PracticeFeatureNavigationProps) {
  const activeItem =
    practiceFeatureNavigationItems.find((item) => item.id === activeView) ??
    practiceFeatureNavigationItems[0];

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            功能导航
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            练习模式主显示区
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            点击下方功能按钮，只切换当前主显示区内容；不会清除本地旋律草稿、临时目标、节拍、起音或录音反馈等当前会话数据。
          </p>
        </div>
        <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          当前功能区：{activeItem.label}
        </p>
      </div>

      <div
        className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6"
        role="tablist"
        aria-label="练习模式功能导航"
      >
        {practiceFeatureNavigationItems.map((item) => {
          const isActive = item.id === activeView;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onActiveViewChange(item.id)}
              className={`rounded-2xl p-4 text-left ring-1 transition ${
                isActive
                  ? "scale-[1.01] bg-emerald-700 text-white shadow-md ring-2 ring-emerald-300"
                  : "bg-slate-50 text-slate-800 ring-slate-200 hover:bg-emerald-50 hover:ring-emerald-200"
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-base font-bold">
                {item.label}
                {isActive ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                    正在显示
                  </span>
                ) : null}
              </span>
              <span
                className={`mt-2 block text-sm leading-5 ${isActive ? "text-emerald-50" : "text-slate-600"}`}
              >
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
