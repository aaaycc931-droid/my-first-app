const projects = [
  {
    title: "数据洞察平台",
    description: "为增长团队设计的实时看板，帮助快速发现业务机会并跟踪关键指标。",
    tags: ["Next.js", "Analytics", "UX"],
  },
  {
    title: "品牌官网重塑",
    description: "以内容策略和视觉系统为核心，提升访问转化率与跨端体验一致性。",
    tags: ["Design System", "SEO", "Tailwind"],
  },
  {
    title: "移动端任务工具",
    description: "轻量的任务管理体验，聚焦高频工作流、快捷操作和清晰的信息层级。",
    tags: ["TypeScript", "Mobile", "Product"],
  },
];

const highlights = ["产品策略", "前端开发", "体验设计", "快速原型"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-mist text-ink">
      <section className="relative px-6 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-br from-cyan-100 via-white to-amber-100" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/80 bg-white/70 px-5 py-3 shadow-soft backdrop-blur">
          <span className="text-sm font-semibold tracking-[0.3em] text-slate-500">PORTFOLIO</span>
          <a className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" href="#contact">
            联系我
          </a>
        </nav>

        <div className="mx-auto grid max-w-6xl gap-12 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm">
              你好，我是 Alex，一名产品型前端开发者
            </p>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              打造清晰、有温度且高效的数字产品体验。
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              我结合设计思维、工程实现与业务洞察，帮助团队把复杂问题转化为简洁、可靠、可持续迭代的产品。
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="rounded-full bg-cyan-600 px-7 py-3 text-center font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700" href="#projects">
                查看项目
              </a>
              <a className="rounded-full border border-slate-300 bg-white px-7 py-3 text-center font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700" href="#about">
                了解更多
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/80 p-6 shadow-soft backdrop-blur">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-cyan-800 p-8 text-white">
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">Current Focus</p>
              <h2 className="mt-8 text-3xl font-semibold">从 0 到 1 构建可验证的产品原型</h2>
              <div className="mt-10 grid grid-cols-2 gap-3">
                {highlights.map((item) => (
                  <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 lg:px-16" id="projects">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">Projects</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight">精选项目</h2>
            </div>
            <p className="max-w-xl text-slate-600">覆盖策略、设计与前端落地，关注真实场景中的效率、可用性与增长结果。</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {projects.map((project) => (
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={project.title}>
                <h3 className="text-2xl font-semibold">{project.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{project.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 lg:px-16" id="about">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] bg-white p-8 shadow-soft md:grid-cols-[0.8fr_1.2fr] md:p-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">About</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">关于我</h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-slate-600">
            <p>
              我擅长将模糊的业务需求拆解为可执行的产品路径，并用现代前端技术快速验证想法。我的工作方式强调沟通、迭代和可维护性。
            </p>
            <p>
              近期我专注于 AI 产品体验、数据可视化和设计系统，希望与重视用户价值的团队一起创造长期有影响力的产品。
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-12 sm:px-10 lg:px-16" id="contact">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-ink px-8 py-12 text-white shadow-soft md:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Contact</p>
          <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight">有项目想法？我们聊聊。</h2>
              <p className="mt-4 max-w-2xl text-slate-300">欢迎联系我讨论产品设计、前端开发或从 0 到 1 的原型验证。</p>
            </div>
            <a className="inline-flex justify-center rounded-full bg-white px-7 py-3 font-semibold text-ink transition hover:bg-cyan-100" href="mailto:hello@example.com">
              hello@example.com
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
