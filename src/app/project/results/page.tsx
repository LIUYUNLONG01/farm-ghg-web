'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { calcProjectSummary } from "@/lib/calculators/projectSummary";
import { loadProjectDraft } from "@/lib/utils/projectDraftStorage";
import type { ProjectDraft } from "@/types/ghg";

export default function ResultsPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [gwpCH4, setGwpCH4] = useState(27.9);
  const [gwpN2O, setGwpN2O] = useState(273);
  const [statusMessage, setStatusMessage] = useState("");

  const refreshDraft = useCallback(() => {
    const loaded = loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
    setStatusMessage(`已刷新：${new Date().toLocaleTimeString()}`);
  }, []);

  useEffect(() => { refreshDraft(); }, [refreshDraft]);

  useEffect(() => {
    const handleFocus = () => refreshDraft();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshDraft();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshDraft]);

  const summary = useMemo(() => {
    if (!draft) return null;
    return calcProjectSummary(draft, Number(gwpCH4 || 0), Number(gwpN2O || 0));
  }, [draft, gwpCH4, gwpN2O]);

  if (!draft) {
    return (
      <main className="min-h-screen bg-gray-50 font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
            </div>
            养殖场碳核算平台
          </div>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </nav>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-amber-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">还没有项目草稿</h1>
            <p className="mt-3 text-sm text-gray-500 leading-7">请先完成前面的模块录入，再查看总结果页。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/project/new" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">去新建项目</Link>
              <Link href="/" className="px-5 py-2.5 rounded-xl border border-green-100 text-green-800 text-sm font-medium hover:bg-green-50 transition">返回首页</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!summary) return null;

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const readonlyClass = "w-full rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-900 font-medium";

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
          </div>
          养殖场碳核算平台
        </div>
        <div className="flex gap-2">
          <button onClick={refreshDraft} className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">刷新结果</button>
          <Link href="/project/energy" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回能源模块</Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            Project Results
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">总结果页</h1>
          <p className="mt-2 text-sm text-gray-400 leading-7">
            当前项目：{draft.base.enterpriseName || "未命名项目"} · 核算年度：{draft.base.year}
            {statusMessage && <span className="ml-3 text-green-500">{statusMessage}</span>}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-4">

          {/* GWP PARAMS */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm xl:col-span-1">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              CO₂e 换算参数
            </h2>
            <p className="text-xs text-gray-400 leading-6 mb-4">CH₄ 默认值可按标准缺省值 27.9 使用。</p>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">CH₄ 的 GWP</span>
                <input type="number" step="any" value={gwpCH4} onChange={(e) => setGwpCH4(Number(e.target.value))} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">N₂O 的 GWP</span>
                <input type="number" step="any" value={gwpN2O} onChange={(e) => setGwpN2O(Number(e.target.value))} className={inputClass} />
              </label>
            </div>
          </section>

          {/* TOTALS OVERVIEW */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm xl:col-span-3">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              总量概览
            </h2>

            {/* Hero number */}
            <div className="rounded-xl bg-green-700 p-5 mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-green-200 uppercase tracking-widest mb-1">总排放量</div>
                <div className="text-3xl font-bold text-white">{summary.totalCO2eTPerYear.toFixed(3)}</div>
                <div className="text-xs text-green-200 mt-0.5">tCO₂e / 年</div>
              </div>
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-green-500 opacity-60">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
              </svg>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "CH₄ 总量", val: `${summary.totalCH4TPerYear.toFixed(3)} t/yr` },
                { label: "N₂O 总量", val: `${summary.totalN2OTPerYear.toFixed(3)} t/yr` },
                { label: "CO₂ 总量", val: `${summary.totalCO2TPerYear.toFixed(3)} t/yr` },
                { label: "化石燃料燃烧", val: `${summary.fossilFuelCO2TPerYear.toFixed(3)} tCO₂/yr` },
                { label: "净购入电力热力", val: `${summary.netPurchasedEnergyCO2TPerYear.toFixed(3)} tCO₂/yr` },
                { label: "能源模块总量", val: `${summary.energyModuleTotalCO2TPerYear.toFixed(3)} tCO₂/yr` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-green-100 bg-green-50 p-3">
                  <div className="text-[11px] text-green-600 font-medium mb-1">{s.label}</div>
                  <div className="text-sm font-semibold text-green-900">{s.val}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* MODULE TABLE */}
        <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm mt-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            模块汇总表
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-green-50 text-left text-[11px] font-semibold text-green-700 uppercase tracking-wide">
                  <th className="px-4 py-3 rounded-tl-xl">模块</th>
                  <th className="px-4 py-3">气体</th>
                  <th className="px-4 py-3">质量（t/yr）</th>
                  <th className="px-4 py-3 rounded-tr-xl">CO₂e（tCO₂e/yr）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {summary.modules.map((module) => (
                  <tr key={module.key} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700">{module.name}</td>
                    <td className="px-4 py-3 text-gray-500">{module.gas}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{module.massTPerYear.toFixed(3)}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{module.co2eTPerYear.toFixed(3)}</td>
                  </tr>
                ))}
                <tr className="bg-green-50 font-semibold">
                  <td className="px-4 py-3 text-green-900">能源模块总量</td>
                  <td className="px-4 py-3 text-green-700">CO₂</td>
                  <td className="px-4 py-3 font-mono text-green-900">{summary.energyModuleTotalCO2TPerYear.toFixed(3)}</td>
                  <td className="px-4 py-3 font-mono text-green-900">{summary.energyModuleTotalCO2eTPerYear.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MODULE STATUS */}
        <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm mt-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            已完成模块状态
          </h2>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "基础信息", val: "已录入" },
              { label: "养殖活动", val: `${draft.livestock?.length ?? 0} 条` },
              { label: "肠道发酵 CH₄", val: `${draft.enteric?.length ?? 0} 条` },
              { label: "粪污管理 CH₄", val: `${draft.manureCH4?.length ?? 0} 条` },
              { label: "粪污管理 N₂O", val: `${draft.manureN2O?.length ?? 0} 条` },
              { label: "燃料燃烧", val: `${draft.energyFuel?.length ?? 0} 条` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <span className="text-xs text-green-700 font-medium">{s.label}</span>
                <span className="text-xs font-semibold text-green-900">{s.val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM ACTIONS */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/project/energy" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">返回上一页</Link>
          <Link href="/project/checks" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 transition">下一步：质量检查页 →</Link>
          <Link href="/project/report" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 transition">去报告导出页</Link>
        </div>
      </div>
    </main>
  );
}