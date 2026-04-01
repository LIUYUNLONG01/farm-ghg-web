'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [energyBalance, setEnergyBalance] = useState<EnergyBalanceRecord>(
    createEmptyEnergyBalance()
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const loaded = loadProjectDraft();
    if (!loaded) return;

    setDraft(loaded);
    setFuelRows(loaded.energyFuel ?? []);
    setEnergyBalance(loaded.energyBalance ?? createEmptyEnergyBalance());
    setStatusMessage("已加载浏览器中的能源模块草稿。");
  }, []);

  const fossilFuelPreview = useMemo(() => {
    return calcFossilFuel(fuelRows);
  }, [fuelRows]);

  const energyBalancePreview = useMemo(() => {
    return calcEnergyBalance(energyBalance);
  }, [energyBalance]);

  const energyModuleTotal =
    fossilFuelPreview.totalCO2TPerYear + energyBalancePreview.netPurchasedTCO2;

  const projectName = draft?.base.enterpriseName || "未命名项目";
  const standardVersion = draft?.base.standardVersion || "未选择";

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";

  const addEmptyFuelRow = () => {
    setFuelRows((prev) => [...prev, createEmptyFuelRow()]);
  };

  const addFuelFromPreset = (presetId: string) => {
    const row = buildFuelRowFromPreset(presetId);
    if (!row) return;

    setFuelRows((prev) => [...prev, row]);
    setStatusMessage(`已插入燃料模板：${row.fuelType}`);
  };

  const updateFuelRow = (
    index: number,
    key: keyof FuelCombustionRecord,
    value: string | number
  ) => {
    setFuelRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const next = {
          ...row,
          [key]:
            typeof row[key] === "number"
              ? Number(value)
              : value,
        } as FuelCombustionRecord;

        return next;
      })
    );
  };

  const removeFuelRow = (index: number) => {
    setFuelRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEnergyBalance = (
    key: keyof EnergyBalanceRecord,
    value: string | number
  ) => {
    setEnergyBalance((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const saveEnergyModule = () => {
    saveEnergyFuelDraft(fuelRows);
    saveEnergyBalanceDraft(energyBalance);
    setStatusMessage("已保存能源模块草稿。");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Energy Module</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              能源与购入/输出电力热力
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName} · 标准版本：{standardVersion}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/manure-n2o"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回粪污管理 N2O
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回首页
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">1. 化石燃料燃烧</h2>
              <p className="mt-2 text-sm text-slate-600">
                已接入“常见燃料模板”。模板里的低位发热量值按标准常见写法直接带入，计算时会自动兼容 GJ/单位 和 TJ/单位 两种输入。
              </p>
            </div>

            <button
              type="button"
              onClick={addEmptyFuelRow}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              新增空白燃料行
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {fuelPresetLibrary.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => addFuelFromPreset(preset.id)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                添加模板：{preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {fuelRows.map((row, index) => {
              const previewRow = fossilFuelPreview.rows[index];

              return (
                <div
                  key={`${row.fuelType}-${index}`}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">燃料记录 {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeFuelRow(index)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        燃料种类
                      </span>
                      <input
                        value={row.fuelType}
                        onChange={(e) =>
                          updateFuelRow(index, "fuelType", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        消耗量
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={row.consumptionAmount}
                        onChange={(e) =>
                          updateFuelRow(index, "consumptionAmount", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        低位发热量（常用按 GJ/单位 填）
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={row.ncvTJPerUnit}
                        onChange={(e) =>
                          updateFuelRow(index, "ncvTJPerUnit", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        单位热值含碳量（tC/TJ）
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={row.carbonContentTonCPerTJ}
                        onChange={(e) =>
                          updateFuelRow(index, "carbonContentTonCPerTJ", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        氧化率（0-1）
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={row.oxidationFactor}
                        onChange={(e) =>
                          updateFuelRow(index, "oxidationFactor", e.target.value)
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      备注
                    </span>
                    <textarea
                      rows={3}
                      value={row.notes ?? ""}
                      onChange={(e) => updateFuelRow(index, "notes", e.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className={readonlyClass}>
                      排放因子预览：{fmt(previewRow?.emissionFactorTCO2PerUnit, 6)} tCO₂/单位
                    </div>
                    <div className={readonlyClass}>
                      年度排放预览：{fmt(previewRow?.rowCO2TPerYear, 3)} tCO₂/yr
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">2. 购入/输出电力热力</h2>
          <p className="mt-2 text-sm text-slate-600">
            这里仍支持手工输入。如果排放因子为 0，则对应结果自然为 0。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                购入电力（MWh）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.purchasedElectricityMWh}
                onChange={(e) =>
                  updateEnergyBalance("purchasedElectricityMWh", e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                购入电力排放因子（tCO₂/MWh）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.purchasedElectricityEFtCO2PerMWh}
                onChange={(e) =>
                  updateEnergyBalance(
                    "purchasedElectricityEFtCO2PerMWh",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                购入热力（GJ）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.purchasedHeatGJ}
                onChange={(e) =>
                  updateEnergyBalance("purchasedHeatGJ", e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                购入热力排放因子（tCO₂/GJ）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.purchasedHeatEFtCO2PerGJ}
                onChange={(e) =>
                  updateEnergyBalance("purchasedHeatEFtCO2PerGJ", e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                输出电力（MWh）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.exportedElectricityMWh}
                onChange={(e) =>
                  updateEnergyBalance("exportedElectricityMWh", e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                输出电力排放因子（tCO₂/MWh）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.exportedElectricityEFtCO2PerMWh}
                onChange={(e) =>
                  updateEnergyBalance(
                    "exportedElectricityEFtCO2PerMWh",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                输出热力（GJ）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.exportedHeatGJ}
                onChange={(e) =>
                  updateEnergyBalance("exportedHeatGJ", e.target.value)
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                输出热力排放因子（tCO₂/GJ）
              </span>
              <input
                type="number"
                step="any"
                value={energyBalance.exportedHeatEFtCO2PerGJ}
                onChange={(e) =>
                  updateEnergyBalance("exportedHeatEFtCO2PerGJ", e.target.value)
                }
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold">3. 汇总预览</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={readonlyClass}>
              化石燃料燃烧：{fmt(fossilFuelPreview.totalCO2TPerYear)} tCO₂/yr
            </div>
            <div className={readonlyClass}>
              购入电力热力：{fmt(energyBalancePreview.totalPurchasedTCO2)} tCO₂/yr
            </div>
            <div className={readonlyClass}>
              输出电力热力：{fmt(energyBalancePreview.totalExportedTCO2)} tCO₂/yr
            </div>
            <div className={readonlyClass}>
              净购入电力热力：{fmt(energyBalancePreview.netPurchasedTCO2)} tCO₂/yr
            </div>
            <div className={readonlyClass}>
              能源模块总预览：{fmt(energyModuleTotal)} tCO₂/yr
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>净购入预览 = 购入排放 - 输出排放</p>
            <p>保存方式：浏览器本地草稿</p>
            {statusMessage ? <p className="font-medium text-slate-800">{statusMessage}</p> : null}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">4. 化石燃料计算明细</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">燃料</th>
                  <th className="border-b border-slate-200 px-3 py-2">消耗量</th>
                  <th className="border-b border-slate-200 px-3 py-2">NCV输入值</th>
                  <th className="border-b border-slate-200 px-3 py-2">NCV(TJ/单位)</th>
                  <th className="border-b border-slate-200 px-3 py-2">含碳量</th>
                  <th className="border-b border-slate-200 px-3 py-2">氧化率</th>
                  <th className="border-b border-slate-200 px-3 py-2">因子</th>
                  <th className="border-b border-slate-200 px-3 py-2">tCO₂/yr</th>
                </tr>
              </thead>
              <tbody>
                {fossilFuelPreview.rows.map((row, index) => (
                  <tr key={`${row.fuelType}-${index}`}>
                    <td className="border-b border-slate-100 px-3 py-2">{row.fuelType}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.consumptionAmount)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.ncvInputValue, 6)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.ncvTJPerUnit, 6)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.carbonContentTonCPerTJ, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.oxidationFactor, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.emissionFactorTCO2PerUnit, 6)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{fmt(row.rowCO2TPerYear)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveEnergyModule}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            保存能源模块草稿
          </button>

          <Link
            href="/project/manure-n2o"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            返回上一页
          </Link>

          <Link
            href="/project/results"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            下一步：总结果页
          </Link>
        </div>
      </div>
    </main>
  );
}