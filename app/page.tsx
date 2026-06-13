const navItems = [
  { label: "项目", href: "#projects" },
  { label: "能力", href: "#services" },
  { label: "关于", href: "#about" },
];

const projects = [
  {
    title: "数据洞察平台",
    description: "为增长团队设计的实时看板，帮助快速发现业务机会并跟踪关键指标。",
    metric: "32% 决策效率提升",
    gradient: "from-cyan-500 to-blue-600",
    tags: ["Next.js", "Analytics", "UX"],
  },
  {
    title: "品牌官网重塑",
    description: "以内容策略和视觉系统为核心，提升访问转化率与跨端体验一致性。",
    metric: "2.4x 线索转化增长",
    gradient: "from-violet-500 to-fuchsia-600",
    tags: ["Design System", "SEO", "Tailwind"],
  },
  {
    title: "移动端任务工具",
    description: "轻量的任务管理体验，聚焦高频工作流、快捷操作和清晰的信息层级。",
    metric: "4.8/5 用户满意度",
    gradient: "from-amber-400 to-orange-600",
    tags: ["TypeScript", "Mobile", "Product"],
  },
  {
    title: "AI 原型实验室",
    description: "整合用户研究、提示词编排和快速迭代流程，将概念验证压缩到一周内。",
    metric: "7 天完成 MVP",
    gradient: "from-emerald-400 to-teal-600",
    tags: ["AI", "Prototype", "Research"],
  },
];

const highlights = ["产品策略", "前端开发", "体验设计", "快速原型"];

const services = [
  "从业务目标拆解产品路线图",
  "构建设计系统与响应式界面",
  "用可运行原型验证核心假设",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-mist text-ink">
      <section className="relative px-4 pb-16 pt-4 sm:px-8 lg:px-16">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.28),_transparent_34%),linear-gradient(135deg,_#ecfeff_0%,_#f8fafc_42%,_#fff7ed_100%)]" />
        <div className="absolute right-0 top-20 -z-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute bottom-16 left-0 -z-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />

        <header className="sticky top-4 z-20 mx-auto max-w-6xl">
          <nav className="flex items-center justify-between rounded-full border border-white/80 bg-white/75 px-4 py-3 shadow-soft backdrop-blur-xl sm:px-6">
            <a className="text-sm font-black tracking-[0.28em] text-slate-800" href="#top" aria-label="返回首页">
              ALEX<span className="text-cyan-600">.</span>
            </a>
            <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 sm:flex">
              {navItems.map((item) => (
                <a className="transition hover:text-cyan-700" href={item.href} key={item.href}>
                  {item.label}
                </a>
              ))}
            </div>
            <a className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 sm:px-5" href="#contact">
              联系我
            </a>
          </nav>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 pb-12 pt-20 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20" id="top">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-cyan-100 bg-white/80 px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm backdrop-blur">
              你好，我是 Alex，一名产品型前端开发者
            </p>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              打造清晰、有温度且高效的数字产品体验。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              我结合设计思维、工程实现与业务洞察，帮助团队把复杂问题转化为简洁、可靠、可持续迭代的产品。
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="rounded-full bg-cyan-600 px-7 py-3 text-center font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:-translate-y-0.5 hover:bg-cyan-700" href="#projects">
                查看项目
              </a>
              <a className="rounded-full border border-slate-300 bg-white/80 px-7 py-3 text-center font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700" href="#services">
                了解能力
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/75 p-4 shadow-soft backdrop-blur sm:p-6">
            <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-cyan-950 to-cyan-700 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200 sm:text-sm">Current Focus</p>
              <h2 className="mt-8 text-2xl font-bold sm:text-3xl">从 0 到 1 构建可验证的产品原型</h2>
              <div className="mt-10 grid grid-cols-2 gap-3">
                {highlights.map((item) => (
                  <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-10 rounded-3xl bg-white/10 p-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-5xl font-black">12+</span>
                  <span className="max-w-40 text-right text-sm text-cyan-100">跨行业产品与增长项目经验</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-16" id="projects">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-700">Projects</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">精选项目</h2>
            </div>
            <p className="max-w-xl text-slate-600">覆盖策略、设计与前端落地，关注真实场景中的效率、可用性与增长结果。</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {projects.map((project) => (
              <article className="group flex min-h-80 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft" key={project.title}>
                <div className={`h-28 bg-gradient-to-br ${project.gradient} p-5 text-white`}>
                  <p className="text-sm font-bold">{project.metric}</p>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-bold">{project.title}</h3>
                  <p className="mt-4 flex-1 leading-7 text-slate-600">{project.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 lg:px-16" id="services">
        <div className="mx-auto grid max-w-6xl gap-4 rounded-[2rem] border border-white bg-white/80 p-6 shadow-soft backdrop-blur md:grid-cols-3 md:p-10">
          {services.map((service, index) => (
            <div className="rounded-3xl bg-slate-50 p-6" key={service}>
              <span className="text-sm font-black text-cyan-700">0{index + 1}</span>
              <p className="mt-4 text-xl font-bold leading-8">{service}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-16" id="about">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] bg-white p-8 shadow-soft md:grid-cols-[0.8fr_1.2fr] md:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-700">About</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">关于我</h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-slate-600">
            <p>我擅长将模糊的业务需求拆解为可执行的产品路径，并用现代前端技术快速验证想法。我的工作方式强调沟通、迭代和可维护性。</p>
            <p>近期我专注于 AI 产品体验、数据可视化和设计系统，希望与重视用户价值的团队一起创造长期有影响力的产品。</p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 pt-6 sm:px-8 lg:px-16" id="contact">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-ink px-6 py-12 text-white shadow-soft md:px-12">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-200">Contact</p>
          <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">有项目想法？我们聊聊。</h2>
              <p className="mt-4 max-w-2xl text-slate-300">欢迎联系我讨论产品设计、前端开发或从 0 到 1 的原型验证。</p>
            </div>
            <a className="inline-flex justify-center rounded-full bg-white px-7 py-3 font-bold text-ink transition hover:bg-cyan-100" href="mailto:hello@example.com">
              hello@example.com
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 px-4 py-8 text-sm text-slate-500 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Alex Portfolio. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-cyan-700" href="#projects">项目</a>
            <a className="hover:text-cyan-700" href="#about">关于</a>
            <a className="hover:text-cyan-700" href="#contact">联系</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
