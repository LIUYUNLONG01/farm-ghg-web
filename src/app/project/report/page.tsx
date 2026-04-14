'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { calcEnergyBalance } from "@/lib/calculators/energyBalance";
import { calcEntericCH4 } from "@/lib/calculators/entericCH4";
import { calcFossilFuel } from "@/lib/calculators/fossilFuel";
import { calcManureCH4 } from "@/lib/calculators/manureCH4";
import { calcManureN2O } from "@/lib/calculators/manureN2O";
import { calcProjectSummary } from "@/lib/calculators/projectSummary";
import { loadProjectDraft } from "@/lib/utils/projectDraftStorage";
import { runProjectChecks } from "@/lib/utils/projectChecks";
import type { ProjectDraft } from "@/types/ghg";

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function fmt(value: unknown, digits = 3) {
  return safeNumber(value).toFixed(digits);
}
function getDmiSourceLabel(method: string | undefined) {
  switch (method) {
    case "direct_input": return "直接录入";
    case "feed_ledger": return "饲料台账反推";
    case "temporary_estimate": return "经验值/台账估计";
    case "model_nema_placeholder": return "NEma模型预留";
    case "model_de_placeholder": return "DE%模型预留";
    default: return "未提供";
  }
}
function calcFeedLedgerDMIInfo(draft: ProjectDraft, sourceLivestockIndex: number) {
  const livestock = draft.livestock[sourceLivestockIndex];
  if (!livestock) return { outboundCount: 0, totalDryMatterKg: 0, headDays: 0, dmiKgPerHeadDay: 0 };
  const outboundRows = (draft.feedLedger ?? []).filter(
    (item) => item.direction === "outbound" && item.targetGroupSourceLivestockIndex === sourceLivestockIndex
  );
  const totalDryMatterKg = outboundRows.reduce((sum, item) => {
    const quantityTon = safeNumber(item.quantityTon);
    const dryMatterRate = Math.max(0, 1 - safeNumber(item.moisturePercent) / 100);
    return sum + quantityTon * 1000 * dryMatterRate;
  }, 0);
  let headDays = 0;
  if (livestock.monthlyRecords && livestock.monthlyRecords.length === 12) {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    headDays = livestock.monthlyRecords.reduce((sum, row, index) => {
      return sum + ((safeNumber(row.openingHead) + safeNumber(row.closingHead)) / 2) * monthDays[index];
    }, 0);
  } else {
    headDays = safeNumber(livestock.annualAverageHead) * 365;
  }
  return { outboundCount: outboundRows.length, totalDryMatterKg, headDays, dmiKgPerHeadDay: headDays > 0 ? totalDryMatterKg / headDays : 0 };
}

// ── print styles injected once ─────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  body { background: white !important; font-size: 11px; }
  .print\\:hidden { display: none !important; }
  .report-card { border: 1px solid #e5e7eb !important; box-shadow: none !important; page-break-inside: avoid; }
  .report-section { page-break-inside: avoid; }
  table { font-size: 10px; }
  th, td { padding: 4px 8px !important; }
  h2, h3, h4 { color: #1a1f14 !important; }
  .report-hero { background: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default function ReportPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  useEffect(() => {
    (async () => {
    const loaded = await loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
    })();
  }, []);

  const reportData = useMemo(() => {
    if (!draft) return null;
    const summary = calcProjectSummary(draft, 27.9, 273);
    const checks = runProjectChecks(draft);
    const enteric = calcEntericCH4(draft.livestock ?? [], draft.enteric ?? []);
    const manureCH4 = calcManureCH4(draft.livestock ?? [], draft.manureCH4 ?? []);
    const manureN2O = calcManureN2O(draft.livestock ?? [], draft.manureN2O ?? []);
    const fossilFuel = calcFossilFuel(draft.energyFuel ?? []);
    const energyBalance = calcEnergyBalance(
      draft.energyBalance ?? {
        purchasedElectricityMWh: 0, purchasedElectricityEFtCO2PerMWh: 0,
        purchasedHeatGJ: 0, purchasedHeatEFtCO2PerGJ: 0,
        exportedElectricityMWh: 0, exportedElectricityEFtCO2PerMWh: 0,
        exportedHeatGJ: 0, exportedHeatEFtCO2PerGJ: 0,
      }
    );
    return { summary, checks, enteric, manureCH4, manureN2O, fossilFuel, energyBalance };
  }, [draft]);

  // ── empty state ────────────────────────────────────────────────────────────
  if (!draft || !reportData) {
    return (
      <main className="min-h-screen bg-gray-50 font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
            </div>
            养殖场碳核算平台
          </div>
        </nav>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-amber-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">还没有可生成的报告草稿</h1>
            <p className="mt-3 text-sm text-gray-500 leading-7">请先完成前面的模块录入，再进入报告页。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/project/new" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">去新建项目</Link>
              <Link href="/" className="px-5 py-2.5 rounded-xl border border-green-100 text-green-800 text-sm font-medium hover:bg-green-50 transition">返回首页</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { summary, checks, enteric, manureCH4, manureN2O, fossilFuel, energyBalance } = reportData;

  // shared table style
  const thClass = "px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap bg-green-50";
  const tdClass = "px-3 py-2.5 text-gray-700 border-b border-green-50";
  const tdMono = "px-3 py-2.5 font-mono text-gray-700 border-b border-green-50";

  return (
    <>
      {/* inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <main className="min-h-screen bg-gray-50 font-sans text-gray-900">

        {/* ── SCREEN NAV (hidden on print) ── */}
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
            </div>
            养殖场碳核算平台
          </div>
          <div className="flex gap-2">
            <Link href="/project/checks" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回检查页</Link>
            <Link href="/project/results" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回总结果页</Link>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-6 py-10 print:px-4 print:py-6">

          {/* ── SCREEN PAGE HEADER (hidden on print) ── */}
          <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
                <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
                Project Report
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">核算报告页</h1>
              <p className="mt-2 text-sm text-gray-400">打印或导出 PDF 后可用于归档提交</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              打印 / 导出 PDF
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════
              REPORT BODY — visible on screen AND print
          ═══════════════════════════════════════════════════ */}

          {/* ── 封面信息 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            {/* green accent header */}
            <div className="report-hero rounded-t-2xl bg-green-700 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-1">畜禽养殖项目温室气体核算报告</div>
                <h2 className="font-serif text-2xl font-bold text-white">{draft.base.enterpriseName || "未命名项目"}</h2>
              </div>
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-green-500 opacity-40">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
              </svg>
            </div>
            <div className="px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
                {[
                  { label: "项目名称", val: draft.base.enterpriseName || "未命名项目" },
                  { label: "核算年度", val: String(draft.base.year) },
                  { label: "地区", val: draft.base.region || "-" },
                  { label: "标准版本", val: draft.base.standardVersion },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                    <div className="text-[11px] font-medium text-green-600 uppercase tracking-wide mb-1">{item.label}</div>
                    <div className="text-sm font-semibold text-green-900">{item.val}</div>
                  </div>
                ))}
              </div>
              {draft.base.notes && (
                <p className="mt-4 text-xs text-gray-500 leading-6">备注：{draft.base.notes}</p>
              )}
            </div>
          </section>

          {/* ── 一、总体结果 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            <div className="px-6 pt-5 pb-4 border-b border-green-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">一</span>
                总体结果
              </h3>
            </div>

            {/* hero total */}
            <div className="px-6 pt-5">
              <div className="rounded-xl bg-green-700 px-5 py-4 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-green-200 uppercase tracking-widest mb-1">总排放量（GWP：CH₄=27.9，N₂O=273）</div>
                  <div className="text-3xl font-bold text-white">{fmt(summary.totalCO2eTPerYear)}</div>
                  <div className="text-xs text-green-200 mt-0.5">tCO₂e / 年</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
                {[
                  { label: "CH₄ 总量", val: `${fmt(summary.totalCH4TPerYear)} t/yr` },
                  { label: "N₂O 总量", val: `${fmt(summary.totalN2OTPerYear)} t/yr` },
                  { label: "CO₂ 总量", val: `${fmt(summary.totalCO2TPerYear)} t/yr` },
                  { label: "能源模块", val: `${fmt(summary.energyModuleTotalCO2TPerYear)} tCO₂/yr` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                    <div className="text-[11px] font-medium text-green-600 mb-1">{s.label}</div>
                    <div className="text-sm font-semibold text-green-900">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* modules table */}
            <div className="px-6 pb-5 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {["模块","气体","质量（t/yr）","CO₂e（tCO₂e/yr）"].map((h) => (
                      <th key={h} className={`${thClass} border-b border-green-100 first:rounded-tl-xl last:rounded-tr-xl`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.modules.map((module) => (
                    <tr key={module.key} className="hover:bg-gray-50 transition">
                      <td className={tdClass}>{module.name}</td>
                      <td className={tdClass}>{module.gas}</td>
                      <td className={tdMono}>{fmt(module.massTPerYear)}</td>
                      <td className={`${tdMono} font-semibold text-green-800`}>{fmt(module.co2eTPerYear)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50">
                    <td className="px-3 py-2.5 font-semibold text-green-900">能源模块总量</td>
                    <td className="px-3 py-2.5 text-green-700">CO₂</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-green-900">{fmt(summary.energyModuleTotalCO2TPerYear)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-green-900">{fmt(summary.energyModuleTotalCO2eTPerYear)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 二、活动数据底座 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            <div className="px-6 pt-5 pb-4 border-b border-green-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">二</span>
                活动数据底座（群体 + 月度动态 + DMI）
              </h3>
            </div>
            <div className="px-6 py-5 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {["序号","动物","阶段","生产功能","群体类型","年均存栏","年出栏量","饲养周期","DMI 来源","DMI"].map((h) => (
                      <th key={h} className={`${thClass} border-b border-green-100`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.livestock.map((row, index) => {
                    const feedInfo = calcFeedLedgerDMIInfo(draft, index);
                    return (
                      <tr key={`${row.species}-${row.stage}-${index}`} className="hover:bg-gray-50 transition">
                        <td className={tdClass}>{index + 1}</td>
                        <td className={tdClass}>{row.species}</td>
                        <td className={tdClass}>{row.stage}</td>
                        <td className={tdClass}>{row.productionPurpose ?? "-"}</td>
                        <td className={tdClass}>{row.populationMode ?? "-"}</td>
                        <td className={tdMono}>{fmt(row.annualAverageHead)}</td>
                        <td className={tdMono}>{fmt(row.annualOutputHead, 0)}</td>
                        <td className={tdClass}>{row.feedingDays ?? "-"}</td>
                        <td className={tdClass}>{getDmiSourceLabel(row.dmiMethod)}</td>
                        <td className={tdMono}>
                          {row.dmiMethod === "feed_ledger"
                            ? fmt(feedInfo.dmiKgPerHeadDay, 4)
                            : fmt(row.dmiKgPerHeadDay, 4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 三、饲料台账 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            <div className="px-6 pt-5 pb-4 border-b border-green-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">三</span>
                饲料台账（用于 DMI 反推）
              </h3>
            </div>
            <div className="px-6 py-5 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {["方向","饲料名称","日期","数量（t）","含水率（%）","干物质量（kg DM）","目标群体"].map((h) => (
                      <th key={h} className={`${thClass} border-b border-green-100`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(draft.feedLedger ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400">暂无台账记录</td></tr>
                  )}
                  {(draft.feedLedger ?? []).map((row) => {
                    const dryMatterKg = safeNumber(row.quantityTon) * 1000 * Math.max(0, 1 - safeNumber(row.moisturePercent) / 100);
                    const targetText = row.targetGroupSourceLivestockIndex !== undefined && draft.livestock[row.targetGroupSourceLivestockIndex]
                      ? `${row.targetGroupSourceLivestockIndex + 1}. ${draft.livestock[row.targetGroupSourceLivestockIndex].species} / ${draft.livestock[row.targetGroupSourceLivestockIndex].stage}`
                      : "-";
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition">
                        <td className={tdClass}>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${row.direction === "inbound" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                            {row.direction === "inbound" ? "入库" : "出库"}
                          </span>
                        </td>
                        <td className={tdClass}>{row.feedName}</td>
                        <td className={tdClass}>{row.recordDate || "-"}</td>
                        <td className={tdMono}>{fmt(row.quantityTon)}</td>
                        <td className={tdMono}>{fmt(row.moisturePercent, 2)}</td>
                        <td className={tdMono}>{fmt(dryMatterKg, 2)}</td>
                        <td className={tdClass}>{targetText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 四、模块结果详情 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            <div className="px-6 pt-5 pb-4 border-b border-green-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">四</span>
                模块结果详情
              </h3>
            </div>
            <div className="px-6 py-5 grid gap-4 xl:grid-cols-2">
              {[
                {
                  title: "肠道发酵 CH₄",
                  lines: [`总量：${fmt(enteric.totalCH4TPerYear)} t/yr`],
                },
                {
                  title: "粪污管理 CH₄",
                  lines: [`总量：${fmt(manureCH4.totalCH4TPerYear)} t/yr`],
                },
                {
                  title: "粪污管理 N₂O",
                  lines: [`总量：${fmt(manureN2O.totalN2OTPerYear)} t/yr`],
                },
                {
                  title: "能源模块",
                  lines: [
                    `化石燃料：${fmt(fossilFuel.totalCO2TPerYear)} tCO₂/yr`,
                    `净购入电力热力：${fmt(energyBalance.netPurchasedTCO2)} tCO₂/yr`,
                  ],
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-green-100 bg-green-50 px-5 py-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">{item.title}</h4>
                  {item.lines.map((line) => (
                    <p key={line} className="text-xs text-green-700 leading-6">{line}</p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ── 五、质量检查摘要 ── */}
          <section className="report-card report-section rounded-2xl border border-green-100 bg-white shadow-sm mb-5">
            <div className="px-6 pt-5 pb-4 border-b border-green-50">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">五</span>
                质量检查摘要
              </h3>
            </div>
            <div className="px-6 py-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <div className="text-[11px] font-medium text-red-500 uppercase tracking-wide mb-1">错误</div>
                <div className="text-2xl font-bold text-red-600">{checks.errorCount}</div>
                <div className="text-xs text-red-400 mt-0.5">项</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <div className="text-[11px] font-medium text-amber-500 uppercase tracking-wide mb-1">提醒</div>
                <div className="text-2xl font-bold text-amber-600">{checks.warningCount}</div>
                <div className="text-xs text-amber-400 mt-0.5">项</div>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <div className="text-[11px] font-medium text-green-600 uppercase tracking-wide mb-1">正常</div>
                <div className="text-2xl font-bold text-green-700">{checks.okCount}</div>
                <div className="text-xs text-green-400 mt-0.5">项</div>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${checks.isReadyForExport ? "border-green-200 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">导出状态</div>
                <div className={`text-sm font-semibold mt-1 ${checks.isReadyForExport ? "text-green-700" : "text-amber-700"}`}>
                  {checks.isReadyForExport ? "✓ 可导出" : "建议先修正错误"}
                </div>
              </div>
            </div>
          </section>

          {/* ── 页脚 ── */}
          <div className="mt-4 text-center text-xs text-gray-400 print:mt-8">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              养殖场温室气体排放核算平台 · {draft.base.enterpriseName || "未命名项目"} · {draft.base.year} 年度核算报告
            </span>
          </div>

          {/* ── screen bottom actions (hidden on print) ── */}
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <Link href="/project/checks" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">返回检查页</Link>
            <Link href="/project/results" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 transition">返回总结果页</Link>
          </div>

        </div>
      </main>
    </>
  );
}