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
    case "direct_input":
      return "直接录入";
    case "feed_ledger":
      return "饲料台账反推";
    case "temporary_estimate":
      return "经验值/台账估计";
    case "model_nema_placeholder":
      return "NEma模型预留";
    case "model_de_placeholder":
      return "DE%模型预留";
    default:
      return "未提供";
  }
}

function calcFeedLedgerDMIInfo(draft: ProjectDraft, sourceLivestockIndex: number) {
  const livestock = draft.livestock[sourceLivestockIndex];
  if (!livestock) {
    return {
      outboundCount: 0,
      totalDryMatterKg: 0,
      headDays: 0,
      dmiKgPerHeadDay: 0,
    };
  }

  const outboundRows = (draft.feedLedger ?? []).filter(
    (item) =>
      item.direction === "outbound" &&
      item.targetGroupSourceLivestockIndex === sourceLivestockIndex
  );

  const totalDryMatterKg = outboundRows.reduce((sum, item) => {
    const quantityTon = safeNumber(item.quantityTon);
    const moisturePercent = safeNumber(item.moisturePercent);
    const dryMatterRate = Math.max(0, 1 - moisturePercent / 100);
    return sum + quantityTon * 1000 * dryMatterRate;
  }, 0);

  let headDays = 0;
  if (livestock.monthlyRecords && livestock.monthlyRecords.length === 12) {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    headDays = livestock.monthlyRecords.reduce((sum, row, index) => {
      const avgHead =
        (safeNumber(row.openingHead) + safeNumber(row.closingHead)) / 2;
      return sum + avgHead * monthDays[index];
    }, 0);
  } else {
    headDays = safeNumber(livestock.annualAverageHead) * 365;
  }

  const dmiKgPerHeadDay = headDays > 0 ? totalDryMatterKg / headDays : 0;

  return {
    outboundCount: outboundRows.length,
    totalDryMatterKg,
    headDays,
    dmiKgPerHeadDay,
  };
}

export default function ReportPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  useEffect(() => {
    const loaded = loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
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
        purchasedElectricityMWh: 0,
        purchasedElectricityEFtCO2PerMWh: 0,
        purchasedHeatGJ: 0,
        purchasedHeatEFtCO2PerGJ: 0,
        exportedElectricityMWh: 0,
        exportedElectricityEFtCO2PerMWh: 0,
        exportedHeatGJ: 0,
        exportedHeatEFtCO2PerGJ: 0,
      }
    );

    return {
      summary,
      checks,
      enteric,
      manureCH4,
      manureN2O,
      fossilFuel,
      energyBalance,
    };
  }, [draft]);

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  if (!draft || !reportData) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有可生成的报告草稿</h1>
            <p className="mt-3 text-slate-600">
              请先完成前面的模块录入，再进入报告页。
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

  const { summary, checks, enteric, manureCH4, manureN2O, fossilFuel, energyBalance } =
    reportData;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12 print:px-0">
        <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm font-medium text-slate-500">Project Report</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              核算报告页
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              打印 / 导出 PDF
            </button>
            <Link
              href="/project/checks"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              返回检查页
            </Link>
          </div>
        </div>

        <section className={cardClass}>
          <h2 className="text-2xl font-bold">畜禽养殖项目温室气体核算报告（页面版）</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
            <div>项目名称：{draft.base.enterpriseName || "未命名项目"}</div>
            <div>核算年度：{draft.base.year}</div>
            <div>地区：{draft.base.region}</div>
            <div>标准版本：{draft.base.standardVersion}</div>
          </div>
          {draft.base.notes ? (
            <p className="mt-4 text-sm text-slate-600">备注：{draft.base.notes}</p>
          ) : null}
        </section>

        <section className={`${cardClass} mt-6`}>
          <h3 className="text-lg font-semibold">一、总体结果</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              总 CO₂e：{fmt(summary.totalCO2eTPerYear)} tCO₂e/yr
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              CH₄ 总量：{fmt(summary.totalCH4TPerYear)} t/yr
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              N₂O 总量：{fmt(summary.totalN2OTPerYear)} t/yr
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              CO₂ 总量：{fmt(summary.totalCO2TPerYear)} t/yr
            </div>
          </div>

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
                    <td className="border-b border-slate-100 px-3 py-2">{module.name}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{module.gas}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(module.massTPerYear)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(module.co2eTPerYear)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <h3 className="text-lg font-semibold">二、活动数据底座（群体 + 月度动态 + DMI）</h3>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">序号</th>
                  <th className="border-b border-slate-200 px-3 py-2">动物</th>
                  <th className="border-b border-slate-200 px-3 py-2">阶段</th>
                  <th className="border-b border-slate-200 px-3 py-2">生产功能</th>
                  <th className="border-b border-slate-200 px-3 py-2">群体类型</th>
                  <th className="border-b border-slate-200 px-3 py-2">年平均存栏</th>
                  <th className="border-b border-slate-200 px-3 py-2">年出栏量</th>
                  <th className="border-b border-slate-200 px-3 py-2">饲养周期</th>
                  <th className="border-b border-slate-200 px-3 py-2">DMI来源</th>
                  <th className="border-b border-slate-200 px-3 py-2">DMI</th>
                </tr>
              </thead>
              <tbody>
                {draft.livestock.map((row, index) => {
                  const feedInfo = calcFeedLedgerDMIInfo(draft, index);

                  return (
                    <tr key={`${row.species}-${row.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">{index + 1}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.species}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.stage}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.productionPurpose ?? "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.populationMode ?? "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{fmt(row.annualAverageHead)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{fmt(row.annualOutputHead, 0)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.feedingDays ?? "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{getDmiSourceLabel(row.dmiMethod)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.dmiMethod === "feed_ledger"
                          ? `${fmt(feedInfo.dmiKgPerHeadDay, 4)}`
                          : `${fmt(row.dmiKgPerHeadDay, 4)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <h3 className="text-lg font-semibold">三、饲料台账（用于 DMI 反推）</h3>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">方向</th>
                  <th className="border-b border-slate-200 px-3 py-2">饲料名称</th>
                  <th className="border-b border-slate-200 px-3 py-2">日期</th>
                  <th className="border-b border-slate-200 px-3 py-2">数量（t）</th>
                  <th className="border-b border-slate-200 px-3 py-2">含水率（%）</th>
                  <th className="border-b border-slate-200 px-3 py-2">干物质量（kg DM）</th>
                  <th className="border-b border-slate-200 px-3 py-2">目标群体</th>
                </tr>
              </thead>
              <tbody>
                {(draft.feedLedger ?? []).map((row) => {
                  const dryMatterKg =
                    safeNumber(row.quantityTon) *
                    1000 *
                    Math.max(0, 1 - safeNumber(row.moisturePercent) / 100);

                  const targetText =
                    row.targetGroupSourceLivestockIndex !== undefined &&
                    draft.livestock[row.targetGroupSourceLivestockIndex]
                      ? `${row.targetGroupSourceLivestockIndex + 1}. ${
                          draft.livestock[row.targetGroupSourceLivestockIndex].species
                        } / ${
                          draft.livestock[row.targetGroupSourceLivestockIndex].stage
                        }`
                      : "-";

                  return (
                    <tr key={row.id}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.direction === "inbound" ? "入库" : "出库"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.feedName}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.recordDate || "-"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{fmt(row.quantityTon)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{fmt(row.moisturePercent, 2)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{fmt(dryMatterKg, 2)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{targetText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <h3 className="text-lg font-semibold">四、模块结果详情</h3>

          <div className="mt-4 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold">肠道发酵 CH₄</h4>
              <p className="mt-2 text-sm text-slate-600">
                总量：{fmt(enteric.totalCH4TPerYear)} t/yr
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold">粪污管理 CH₄</h4>
              <p className="mt-2 text-sm text-slate-600">
                总量：{fmt(manureCH4.totalCH4TPerYear)} t/yr
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold">粪污管理 N₂O</h4>
              <p className="mt-2 text-sm text-slate-600">
                总量：{fmt(manureN2O.totalN2OTPerYear)} t/yr
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-semibold">能源模块</h4>
              <p className="mt-2 text-sm text-slate-600">
                化石燃料：{fmt(fossilFuel.totalCO2TPerYear)} tCO₂/yr
              </p>
              <p className="mt-1 text-sm text-slate-600">
                净购入电力热力：{fmt(energyBalance.netPurchasedTCO2)} tCO₂/yr
              </p>
            </div>
          </div>
        </section>

        <section className={`${cardClass} mt-6`}>
          <h3 className="text-lg font-semibold">五、质量检查摘要</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              错误：{checks.errorCount}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              提醒：{checks.warningCount}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              正常：{checks.okCount}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              导出状态：{checks.isReadyForExport ? "可导出" : "建议先修正错误"}
            </div>
          </div>
        </section>

        <div className="mt-6 flex gap-3 print:hidden">
          <Link
            href="/project/checks"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            返回检查页
          </Link>
          <Link
            href="/project/results"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            返回总结果页
          </Link>
        </div>
      </div>
    </main>
  );
}