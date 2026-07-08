import type { ReactNode } from "react";

type PracticeFeatureSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PracticeFeatureSectionHeader({
  eyebrow,
  title,
  description,
  children,
}: PracticeFeatureSectionHeaderProps) {
  return (
    <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-700">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-emerald-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
            {description}
          </p>
        </div>
        <p className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-emerald-800 shadow-sm lg:max-w-xs">
          切换功能区不会清除当前会话数据；本页不写入
          localStorage，也不改变路由。
        </p>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
