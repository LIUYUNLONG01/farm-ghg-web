import Link from "next/link";

export default function Home() {
  const modules = [
    "化石燃料燃烧",
    "肠道发酵 CH4",
    "粪污管理 CH4 / N2O",
    "沼气、电力与热力",
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-slate-500">
            Farm GHG Web · Starter
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            养殖场温室气体排放核算系统
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            第一版目标：录入基础数据，计算各排放源排放量，输出标准化结果。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/project/new"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
            >
              开始新建项目
            </Link>

            <span className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600">
              当前阶段：项目骨架搭建
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((item) => (
            <section
              key={item}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{item}</h2>
              <p className="mt-2 text-sm text-slate-500">
                当前状态：待接入计算模块
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h3 className="text-base font-semibold">你现在完成了什么</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. 已创建 Next.js + TypeScript + Tailwind 项目</li>
            <li>2. 已建立目录骨架和基础数据模型</li>
            <li>3. 已增加“新建项目”页面入口</li>
          </ul>
        </div>
      </div>
    </main>
  );
}