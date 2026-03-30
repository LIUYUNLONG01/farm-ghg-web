'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { calcProjectSummary } from "@/lib/calculators/projectSummary";
import { loadProjectDraft } from "@/lib/utils/projectDraftStorage";
import type { ProjectDraft } from "@/types/ghg";

export default function ResultsPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [gwpCH4, setGwpCH4] = useState(28);
  const [gwpN2O, setGwpN2O] = useState(265);

  useEffect(() => {
    const loaded = loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
  }, []);

  const summary = useMemo(() => {
    if (!draft) return null;
    return calcProjectSummary(draft, Number(gwpCH4 || 0), Number(gwpN2O || 0));
  }, [draft, gwpCH4, gwpN2O]);

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";

  if (!draft) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有项目草稿</h1>
            <p className="mt-3 text-slate-600">
              请先完成前面的模块录入，再查看总结果页。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/project/new"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                去新建项目
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Project Results</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              总结果页
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{draft.base.enterpriseName || "未命名项目"} ·
              核算年度：{draft.base.year}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/energy"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回能源模块
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回首页
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <section className={`${cardClass} xl:col-span-1`}>
            <h2 className="text-lg font-semibold">1. CO₂e 换算参数</h2>
            <p className="mt-2 text-sm text-slate-600">
              这里先做成可调参数，避免提前把标准中的换算值写死。后续你确认具体标准口径后，可以再固化到参数库。
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  CH4 的 GWP
                </span>
                <input
                  type="number"
                  step="any"
                  value={gwpCH4}
                  onChange={(e) => setGwpCH4(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  N2O 的 GWP
                </span>
                <input
                  type="number"
                  step="any"
                  value={gwpN2O}
                  onChange={(e) => setGwpN2O(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                />
              </label>
            </div>
          </section>

          <section className={`${cardClass} xl:col-span-3`}>
            <h2 className="text-lg font-semibold">2. 总量概览</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={readonlyClass}>
                总 CO₂e：
                {summary.totalCO2eTPerYear.toFixed(3)} tCO₂e/yr
              </div>
              <div className={readonlyClass}>
                CH4 总量：
                {summary.totalCH4TPerYear.toFixed(3)} t/yr
              </div>
              <div className={readonlyClass}>
                N2O 总量：
                {summary.totalN2OTPerYear.toFixed(3)} t/yr
              </div>
              <div className={readonlyClass}>
                CO2 总量：
                {summary.totalCO2TPerYear.toFixed(3)} t/yr
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className={readonlyClass}>
                化石燃料燃烧：
                {summary.fossilFuelCO2TPerYear.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                购入电力热力：
                {summary.purchasedEnergyCO2TPerYear.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                输出电力热力：
                {summary.exportedEnergyCO2TPerYear.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                净购入电力热力：
                {summary.netPurchasedEnergyCO2TPerYear.toFixed(3)} tCO₂/yr
              </div>
            </div>
          </section>
        </div>

        <section className={`${cardClass} mt-6`}>
          <h2 className="text-lg font-semibold">3. 模块汇总表</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">模块</th>
                  <th className="border-b border-slate-200 px-3 py-2">气体</th>
                  <th className="border-b border-slate-200 px-3 py-2">质量（t/yr）</th>
                  <th className="border-b border-slate-200 px-3 py-2">CO₂e（tCO₂e/yr）</th>
                </tr>
              </thead>
              <tbody>
                {summary.modules.map((module) => (
                  <tr key={module.key}>
                    <td className="border-b border-slate-100 px-3 py-2">
                      {module.name}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      {module.gas}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      {module.massTPerYear.toFixed(3)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      {module.co2eTPerYear.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <h2 className="text-lg font-semibold">4. 当前已完成模块状态</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={readonlyClass}>
              基础信息：已录入
            </div>
            <div className={readonlyClass}>
              养殖活动：{draft.livestock?.length ?? 0} 条
            </div>
            <div className={readonlyClass}>
              肠道发酵 CH4：{draft.enteric?.length ?? 0} 条
            </div>
            <div className={readonlyClass}>
              粪污管理 CH4：{draft.manureCH4?.length ?? 0} 条
            </div>
            <div className={readonlyClass}>
              粪污管理 N2O：{draft.manureN2O?.length ?? 0} 条
            </div>
            <div className={readonlyClass}>
              燃料燃烧：{draft.energyFuel?.length ?? 0} 条
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/project/energy"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            返回上一页
          </Link>

          <button
            type="button"
            disabled
            className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-400"
          >
            下一步：报告导出（待开发）
          </button>
        </div>
      </div>
    </main>
  );
}