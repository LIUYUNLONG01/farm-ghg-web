import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const coreFeatures = [
  {
    title: "统一活动数据底座",
    description: "围绕群体定义、月度动态、生产性能与饲料台账，构建可追溯的养殖活动数据基础。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-green-700">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: "多模块排放核算",
    description: "支持肠道发酵 CH₄、粪污管理 CH₄、粪污管理 N₂O、能源与购入/输出电力热力核算。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-green-700">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: "检查与报告输出",
    description: "自动开展数据完整性检查，汇总模块结果，并生成适合打印和归档的核算报告页面。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-green-700">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
];

const workflow = [
  "填写基础信息与核算边界",
  "建立群体记录与月度动态",
  "录入饲料台账并反推 DMI",
  "完成 CH₄ / N₂O / 能源模块核算",
  "查看检查结果、总结果与报告页",
];

const modules = [
  { name: "养殖活动数据", path: "/project/livestock", summary: "群体定义、月度动态、生产性能、DMI 与饲料台账。" },
  { name: "肠道发酵 CH₄", path: "/project/enteric", summary: "支持推荐因子法、计算法与实测/手工因子法。" },
  { name: "粪污管理 CH₄", path: "/project/manure-ch4", summary: "支持区域化推荐因子法与多管理路径参数法。" },
  { name: "粪污管理 N₂O", path: "/project/manure-n2o", summary: "支持区域化推荐因子法与多管理路径参数法。" },
  { name: "能源与电力热力", path: "/project/energy", summary: "支持化石燃料燃烧、购入/输出电力热力核算。" },
  { name: "结果、检查与报告", path: "/project/results", summary: "提供总结果页、质量检查页与报告页。" },
];

const standards = ["GB/T 32151.22-2024", "NY/T 4243-2022"];
const flowNodes = [
  { label: "基础信息 & 核算边界" },
  { label: "群体动态 & 饲料台账 → DMI" },
];
const flowModules = ["肠道 CH₄", "粪污 CH₄", "粪污 N₂O", "能源/电力"];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700 tracking-wide">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
            </svg>
          </div>
          养殖场碳核算平台
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 font-medium">
            GB/T 32151.22
          </span>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:inline">
                {user.name || user.email}
              </span>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white font-medium hover:bg-green-900 transition flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  管理后台
                </Link>
              )}
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition"
            >
              登录
            </Link>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-green-50 to-teal-50 border-b border-green-100 px-6 py-20 lg:px-8 lg:py-24">
        <div className="absolute w-[500px] h-[500px] rounded-full border border-green-100 -top-48 -right-24 opacity-50 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-green-100 -bottom-24 left-[10%] opacity-40 pointer-events-none" />

        <div className="relative mx-auto max-w-6xl grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              {["养殖场温室气体核算", "中国大陆部署路线", "IPCC Tier 2"].map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full border border-green-200 bg-white text-green-800 font-medium tracking-wide">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900">
              养殖场<span className="text-green-700">温室气体</span>
              <br />排放核算平台
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-8 text-gray-600 font-light">
              面向养殖企业、科研团队与核算应用场景，支持从活动数据采集、参数法与推荐因子法核算、结果校核到报告生成的完整绿色核算流程。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm transition hover:bg-green-900 hover:-translate-y-px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                开始新建项目
              </Link>
              <Link href="/project/report" className="inline-flex items-center gap-1 px-6 py-3 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-800 transition hover:border-green-400 hover:-translate-y-px">
                查看报告页样式 →
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
              {[
                { label: "核心边界", val: "肠道发酵、粪污管理、能源与电力热力" },
                { label: "活动底座", val: "群体定义、月度动态、饲料台账与 DMI 反推" },
                { label: "输出能力", val: "检查页、总结果页、报告页与打印导出" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-medium text-gray-400 tracking-widest uppercase">{s.label}</div>
                  <div className="mt-2 text-[13px] text-gray-700 leading-6">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block rounded-[28px] border border-green-100 bg-white p-6 shadow-lg shadow-green-900/5">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
              <div className="text-[11px] font-semibold text-green-600 tracking-widest uppercase mb-2">平台定位</div>
              <div className="font-serif text-xl font-bold text-green-900 leading-snug">
                从活动数据到底稿报告的一体化核算工作台
              </div>
              <div className="mt-4 h-px bg-green-100" />
              <p className="mt-4 text-[13px] leading-7 text-gray-600">
                以统一活动数据底座为核心，贯通 DMI、群体动态、粪污路径占比与能源数据，减少模块之间的口径断裂。
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {standards.map((s) => (
                <div key={s} className="rounded-xl border border-green-100 bg-white px-3 py-2.5 text-[11px] font-medium text-green-800">{s}</div>
              ))}
              <div className="col-span-2 rounded-xl border border-green-100 bg-white px-3 py-2.5 text-[11px] font-medium text-green-800">
                支持推荐因子法、参数法与活动数据驱动核算逻辑
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
          <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />Core Features
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-gray-900">平台核心能力</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {coreFeatures.map((item) => (
            <div key={item.title} className="group relative rounded-2xl border border-green-100 bg-white p-6 shadow-sm overflow-hidden transition hover:-translate-y-1 hover:shadow-md">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-teal-400 rounded-t-2xl opacity-0 transition group-hover:opacity-100" />
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4">{item.icon}</div>
              <h3 className="text-[15px] font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-7 text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section className="border-y border-green-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 items-start">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
                <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />Workflow
              </div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-gray-900">推荐使用流程</h2>
              <div className="mt-6 flex flex-col gap-3">
                {workflow.map((item, i) => (
                  <div key={item} className="flex items-start gap-4 rounded-2xl border border-green-100 bg-gray-50 p-4 transition hover:bg-white hover:border-green-200">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-xs font-semibold flex items-center justify-center">{i + 1}</div>
                    <span className="pt-0.5 text-[13px] leading-7 text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-green-100 bg-white p-6">
              <div className="text-[11px] font-semibold text-green-600 tracking-widest uppercase mb-4">数据流向示意</div>
              {flowNodes.map((n) => (
                <div key={n.label}>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-[13px] text-green-900 font-medium mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />{n.label}
                  </div>
                  <div className="text-center text-green-200 text-base my-1">↓</div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 mb-1.5">
                {flowModules.map((m) => (
                  <div key={m} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100 text-[12px] text-green-900 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />{m}
                  </div>
                ))}
              </div>
              <div className="text-center text-green-200 text-base my-1">↓</div>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-100 border border-green-200 text-[13px] text-green-900 font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-700 flex-shrink-0" />汇总核查 & 报告输出
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
          <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />Modules
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-gray-900">核算模块导航</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <Link key={item.name} href={item.path} className="group rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-400 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">{item.name}</h3>
                <span className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md border border-green-100 text-green-600 font-medium transition group-hover:bg-green-50 group-hover:border-green-400">进入 →</span>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-gray-400">{item.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-green-900/40 px-6 py-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            养殖场温室气体排放核算平台
          </div>
          <div>{new Date().getFullYear()} · farmghg.cn</div>
        </div>
      </footer>
    </main>
  );
}