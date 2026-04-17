'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";

import { calcEnergyBalance } from "@/lib/calculators/energyBalance";
import { calcFossilFuel } from "@/lib/calculators/fossilFuel";
import {
  loadProjectDraft,
  saveEnergyBalanceDraft,
  saveEnergyFuelDraft,
} from "@/lib/utils/projectDraftStorage";
import {
  buildFuelRowFromPreset,
  fuelPresetLibrary,
} from "@/lib/utils/standardFactors";
import type {
  EnergyBalanceRecord,
  FuelCombustionRecord,
  ProjectDraft,
} from "@/types/ghg";

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function fmt(value: unknown, digits = 3): string {
  return safeNumber(value).toFixed(digits);
}

function createEmptyFuelRow(): FuelCombustionRecord {
  return {
    fuelType: "",
    consumptionAmount: 0,
    ncvTJPerUnit: 0,
    carbonContentTonCPerTJ: 0,
    oxidationFactor: 0,
    parameterSourceType: "manual_input",
    parameterSourceLabel: "手工输入",
    notes: "",
  };
}

function createEmptyEnergyBalance(): EnergyBalanceRecord {
  return {
    purchasedElectricityMWh: 0,
    purchasedElectricityEFtCO2PerMWh: 0,
    purchasedHeatGJ: 0,
    purchasedHeatEFtCO2PerGJ: 0,
    exportedElectricityMWh: 0,
    exportedElectricityEFtCO2PerMWh: 0,
    exportedHeatGJ: 0,
    exportedHeatEFtCO2PerGJ: 0,
  };
}

export default function EnergyPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [fuelRows, setFuelRows] = useState<FuelCombustionRecord[]>([]);
  const [energyBalance, setEnergyBalance] = useState<EnergyBalanceRecord>(createEmptyEnergyBalance());
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    (async () => {
    const loaded = await loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
    setFuelRows(loaded.energyFuel ?? []);
    setEnergyBalance(loaded.energyBalance ?? createEmptyEnergyBalance());
    setStatusMessage("已加载浏览器中的能源模块草稿。");
    })();
  }, []);

  const fossilFuelPreview = useMemo(() => calcFossilFuel(fuelRows), [fuelRows]);
  const energyBalancePreview = useMemo(() => calcEnergyBalance(energyBalance), [energyBalance]);
  const energyModuleTotal = fossilFuelPreview.totalCO2TPerYear + energyBalancePreview.netPurchasedTCO2;

  const projectName = draft?.base.enterpriseName || "未命名项目";
  const standardVersion = draft?.base.standardVersion || "未选择";

  // ── style tokens ──────────────────────────────────────────────────────────
  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const readonlyClass = "w-full rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-900 font-medium";

  // ── handlers ──────────────────────────────────────────────────────────────
  const addEmptyFuelRow = () => setFuelRows((prev) => [...prev, createEmptyFuelRow()]);

  const addFuelFromPreset = (presetId: string) => {
    const row = buildFuelRowFromPreset(presetId);
    if (!row) return;
    setFuelRows((prev) => [...prev, row]);
    setStatusMessage(`已插入燃料模板：${row.fuelType}`);
  };

  const updateFuelRow = (index: number, key: keyof FuelCombustionRecord, value: string | number) => {
    setFuelRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [key]: typeof row[key] === "number" ? Number(value) : value } as FuelCombustionRecord;
      })
    );
  };

  const removeFuelRow = (index: number) => setFuelRows((prev) => prev.filter((_, i) => i !== index));

  const updateEnergyBalance = (key: keyof EnergyBalanceRecord, value: string | number) => {
    setEnergyBalance((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const saveEnergyModule = () => {
    saveEnergyFuelDraft(fuelRows);
    saveEnergyBalanceDraft(energyBalance);
    setStatusMessage("已保存能源模块草稿。");
  };

  const autoSaveData = { fuelRows, energyBalance };
  const autoSaveStatus = useAutoSave(
    autoSaveData,
    async () => {
      await saveEnergyFuelDraft(fuelRows);
      await saveEnergyBalanceDraft(energyBalance);
    },
    2000
  );

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
          <Link href="/project/manure-n2o" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回粪污管理 N₂O</Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            能源模块
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">能源与购入/输出电力热力</h1>
          <p className="mt-2 text-sm text-gray-400">当前项目：{projectName} · 标准版本：{standardVersion}</p>
        </div>

        <div className="space-y-5">

          {/* SECTION 1: 化石燃料 */}
          <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-green-50">
              <div>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  化石燃料燃烧
                </h2>
                <p className="mt-1 text-xs text-gray-400 leading-6 max-w-2xl">
                  已接入“常见燃料模板”。低位发热量按常见写法带入，计算时自动兼容 GJ/单位 和 TJ/单位 两种输入。
                </p>
              </div>
              <button type="button" onClick={addEmptyFuelRow}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                新增空白燃料行
              </button>
            </div>

            {/* preset chips */}
            <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
              {fuelPresetLibrary.map((preset) => (
                <button key={preset.id} type="button" onClick={() => addFuelFromPreset(preset.id)}
                  className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs text-green-700 hover:bg-green-50 transition font-medium">
                  + 模板：{preset.label}
                </button>
              ))}
            </div>

            {/* fuel rows */}
            <div className="divide-y divide-green-50">
              {fuelRows.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">暂无燃料记录，点击右上角按钮或使用模板新增</div>
              )}
              {fuelRows.map((row, index) => {
                const previewRow = fossilFuelPreview.rows[index];
                return (
                  <div key={`${row.fuelType}-${index}`} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full border-2 border-green-200 text-green-700 text-xs font-bold flex items-center justify-center">{index + 1}</span>
                        <span className="text-sm font-semibold text-gray-700">{row.fuelType || "未命名燃料"}</span>
                      </div>
                      <button type="button" onClick={() => removeFuelRow(index)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">删除</button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">燃料种类</span>
                        <input value={row.fuelType} onChange={(e) => updateFuelRow(index, "fuelType", e.target.value)} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">消耗量</span>
                        <input type="number" step="any" value={row.consumptionAmount} onChange={(e) => updateFuelRow(index, "consumptionAmount", e.target.value)} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">低位发热量（常用 GJ/单位）</span>
                        <input type="number" step="any" value={row.ncvTJPerUnit} onChange={(e) => updateFuelRow(index, "ncvTJPerUnit", e.target.value)} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">单位热值含碳量（tC/TJ）</span>
                        <input type="number" step="any" value={row.carbonContentTonCPerTJ} onChange={(e) => updateFuelRow(index, "carbonContentTonCPerTJ", e.target.value)} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">氧化率（0–1）</span>
                        <input type="number" step="any" value={row.oxidationFactor} onChange={(e) => updateFuelRow(index, "oxidationFactor", e.target.value)} className={inputClass} />
                      </label>
                    </div>

                    <label className="block mb-4">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                      <textarea rows={2} value={row.notes ?? ""} onChange={(e) => updateFuelRow(index, "notes", e.target.value)} className={inputClass} />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className={readonlyClass}>排放因子预览：{fmt(previewRow?.emissionFactorTCO2PerUnit, 6)} tCO₂/单位</div>
                      <div className={readonlyClass}>年度排放预览：{fmt(previewRow?.rowCO2TPerYear, 3)} tCO₂/年</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: 购入/输出电力热力 */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              购入/输出电力热力
            </h2>
            <p className="mt-1 mb-5 text-xs text-gray-400 leading-6">手工输入。排放因子为 0 时，对应结果自然为 0。</p>

            {/* purchased */}
            <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">购入</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
              {[
                { label: "购入电力（MWh）", key: "purchasedElectricityMWh" as const },
                { label: "购入电力排放因子（tCO₂/MWh）", key: "purchasedElectricityEFtCO2PerMWh" as const },
                { label: "购入热力（GJ）", key: "purchasedHeatGJ" as const },
                { label: "购入热力排放因子（tCO₂/GJ）", key: "purchasedHeatEFtCO2PerGJ" as const },
              ].map(({ label, key }) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                  <input type="number" step="any" value={energyBalance[key]} onChange={(e) => updateEnergyBalance(key, e.target.value)} className={inputClass} />
                </label>
              ))}
            </div>

            {/* exported */}
            <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3">输出</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "输出电力（MWh）", key: "exportedElectricityMWh" as const },
                { label: "输出电力排放因子（tCO₂/MWh）", key: "exportedElectricityEFtCO2PerMWh" as const },
                { label: "输出热力（GJ）", key: "exportedHeatGJ" as const },
                { label: "输出热力排放因子（tCO₂/GJ）", key: "exportedHeatEFtCO2PerGJ" as const },
              ].map(({ label, key }) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                  <input type="number" step="any" value={energyBalance[key]} onChange={(e) => updateEnergyBalance(key, e.target.value)} className={inputClass} />
                </label>
              ))}
            </div>
          </section>

          {/* SECTION 3: 汇总预览 */}
          <section className="rounded-2xl border border-dashed border-green-200 bg-green-50/50 p-6">
            <h2 className="text-sm font-semibold text-green-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              汇总预览
            </h2>

            {/* hero total */}
            <div className="rounded-xl bg-green-700 px-5 py-4 mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-green-200 uppercase tracking-widest mb-1">能源模块排放总量</div>
                <div className="text-3xl font-bold text-white">{fmt(energyModuleTotal)}</div>
                <div className="text-xs text-green-200 mt-0.5">tCO₂/年</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-green-400 opacity-60">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
              {[
                { label: "化石燃料燃烧", val: `${fmt(fossilFuelPreview.totalCO2TPerYear)} tCO₂/年` },
                { label: "购入电力热力", val: `${fmt(energyBalancePreview.totalPurchasedTCO2)} tCO₂/年` },
                { label: "输出电力热力", val: `${fmt(energyBalancePreview.totalExportedTCO2)} tCO₂/年` },
                { label: "净购入电力热力", val: `${fmt(energyBalancePreview.netPurchasedTCO2)} tCO₂/年` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-green-200 bg-white px-4 py-3">
                  <div className="text-xs text-green-600 font-medium mb-1">{s.label}</div>
                  <div className="text-sm font-semibold text-green-900">{s.val}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-green-700 leading-6 space-y-1">
              <p>净购入 = 购入排放 − 输出排放</p>
              {statusMessage && <p className="font-semibold text-green-900 mt-2 pt-2 border-t border-green-200">{statusMessage}</p>}
            </div>
          </section>

          {/* SECTION 4: 明细表 */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
              化石燃料计算明细
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-green-50 text-left">
                    {["燃料","消耗量","低位发热量输入值（NCV）","低位发热量（NCV）（TJ/单位）","单位热值含碳量","氧化率","排放因子","CO₂ 排放量（t/年）"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {fossilFuelPreview.rows.map((row, index) => (
                    <tr key={`${row.fuelType}-${index}`} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2.5 text-gray-700">{row.fuelType}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.consumptionAmount)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.ncvInputValue, 6)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.ncvTJPerUnit, 6)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.carbonContentTonCPerGJ, 3)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.oxidationFactor, 3)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.emissionFactorTCO2PerUnit, 6)}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-green-800">{fmt(row.rowCO2TPerYear)}</td>
                    </tr>
                  ))}
                  {fossilFuelPreview.rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-400">暂无燃料记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={saveEnergyModule}
              className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 transition">
              保存能源模块草稿
            </button>
            <Link href="/project/manure-n2o" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">返回上一页</Link>
            <Link href="/project/results" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 transition">下一步：总结果页 →</Link>
          </div>

        </div>
      </div>
    </main>
  );
}