'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcEnergyBalance } from "@/lib/calculators/energyBalance";
import { calcFossilFuel } from "@/lib/calculators/fossilFuel";
import {
  energyModuleSchema,
  type EnergyModuleFormValues,
} from "@/lib/schemas/energy";
import {
  loadProjectDraft,
  saveEnergyDraft,
} from "@/lib/utils/projectDraftStorage";
import type {
  EnergyBalanceRecord,
  FuelCombustionRecord,
} from "@/types/ghg";

function createEmptyFuelRow() {
  return {
    fuelType: "",
    consumptionAmount: 0,
    ncvTJPerUnit: 0,
    carbonContentTonCPerTJ: 0,
    oxidationFactor: 1,
    notes: "",
  };
}

const defaultEnergyBalance: EnergyBalanceRecord = {
  purchasedElectricityMWh: 0,
  purchasedElectricityEFtCO2PerMWh: 0,
  purchasedHeatGJ: 0,
  purchasedHeatEFtCO2PerGJ: 0,
  exportedElectricityMWh: 0,
  exportedElectricityEFtCO2PerMWh: 0,
  exportedHeatGJ: 0,
  exportedHeatEFtCO2PerGJ: 0,
};

export default function EnergyPage() {
  const [projectName, setProjectName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EnergyModuleFormValues>({
    resolver: zodResolver(energyModuleSchema),
    defaultValues: {
      fuelRows: [createEmptyFuelRow()],
      energyBalance: defaultEnergyBalance,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fuelRows",
  });

  const watchedFuelRows = watch("fuelRows") ?? [];
  const watchedEnergyBalance = watch("energyBalance") ?? defaultEnergyBalance;

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");

    reset({
      fuelRows:
        draft.energyFuel && draft.energyFuel.length > 0
          ? draft.energyFuel.map((row) => ({
              fuelType: row.fuelType,
              consumptionAmount: row.consumptionAmount,
              ncvTJPerUnit: row.ncvTJPerUnit,
              carbonContentTonCPerTJ: row.carbonContentTonCPerTJ,
              oxidationFactor: row.oxidationFactor,
              notes: row.notes ?? "",
            }))
          : [createEmptyFuelRow()],
      energyBalance: draft.energyBalance ?? defaultEnergyBalance,
    });

    if (
      (draft.energyFuel && draft.energyFuel.length > 0) ||
      draft.energyBalance
    ) {
      setStatusMessage("已加载浏览器中的能源模块草稿。");
    }
  }, [reset]);

  const fuelPreview = useMemo(() => {
    const normalizedRows: FuelCombustionRecord[] = watchedFuelRows
      .filter((row) => row.fuelType?.trim() !== "")
      .map((row) => ({
        fuelType: row.fuelType.trim(),
        consumptionAmount: Number(row.consumptionAmount ?? 0),
        ncvTJPerUnit: Number(row.ncvTJPerUnit ?? 0),
        carbonContentTonCPerTJ: Number(row.carbonContentTonCPerTJ ?? 0),
        oxidationFactor: Number(row.oxidationFactor ?? 0),
        notes: row.notes?.trim() ? row.notes.trim() : undefined,
      }));

    return calcFossilFuel(normalizedRows);
  }, [watchedFuelRows]);

  const energyBalancePreview = useMemo(() => {
    const normalized: EnergyBalanceRecord = {
      purchasedElectricityMWh: Number(
        watchedEnergyBalance.purchasedElectricityMWh ?? 0
      ),
      purchasedElectricityEFtCO2PerMWh: Number(
        watchedEnergyBalance.purchasedElectricityEFtCO2PerMWh ?? 0
      ),
      purchasedHeatGJ: Number(watchedEnergyBalance.purchasedHeatGJ ?? 0),
      purchasedHeatEFtCO2PerGJ: Number(
        watchedEnergyBalance.purchasedHeatEFtCO2PerGJ ?? 0
      ),
      exportedElectricityMWh: Number(
        watchedEnergyBalance.exportedElectricityMWh ?? 0
      ),
      exportedElectricityEFtCO2PerMWh: Number(
        watchedEnergyBalance.exportedElectricityEFtCO2PerMWh ?? 0
      ),
      exportedHeatGJ: Number(watchedEnergyBalance.exportedHeatGJ ?? 0),
      exportedHeatEFtCO2PerGJ: Number(
        watchedEnergyBalance.exportedHeatEFtCO2PerGJ ?? 0
      ),
    };

    return calcEnergyBalance(normalized);
  }, [watchedEnergyBalance]);

  const totalEnergyRelatedTCO2 =
    fuelPreview.totalCO2TPerYear + energyBalancePreview.netPurchasedTCO2;

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const errorClass = "mt-2 text-sm text-red-600";

  const onSubmit = (values: EnergyModuleFormValues) => {
    const fuelRows: FuelCombustionRecord[] = values.fuelRows
      .filter((row) => row.fuelType.trim() !== "")
      .map((row) => ({
        fuelType: row.fuelType.trim(),
        consumptionAmount: row.consumptionAmount,
        ncvTJPerUnit: row.ncvTJPerUnit,
        carbonContentTonCPerTJ: row.carbonContentTonCPerTJ,
        oxidationFactor: row.oxidationFactor,
        notes: row.notes.trim() ? row.notes.trim() : undefined,
      }));

    const energyBalance: EnergyBalanceRecord = {
      purchasedElectricityMWh: values.energyBalance.purchasedElectricityMWh,
      purchasedElectricityEFtCO2PerMWh:
        values.energyBalance.purchasedElectricityEFtCO2PerMWh,
      purchasedHeatGJ: values.energyBalance.purchasedHeatGJ,
      purchasedHeatEFtCO2PerGJ: values.energyBalance.purchasedHeatEFtCO2PerGJ,
      exportedElectricityMWh: values.energyBalance.exportedElectricityMWh,
      exportedElectricityEFtCO2PerMWh:
        values.energyBalance.exportedElectricityEFtCO2PerMWh,
      exportedHeatGJ: values.energyBalance.exportedHeatGJ,
      exportedHeatEFtCO2PerGJ: values.energyBalance.exportedHeatEFtCO2PerGJ,
    };

    saveEnergyDraft(fuelRows, energyBalance);
    setStatusMessage("已保存能源模块草稿。");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Energy Module</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              能源与购入/输出电力热力
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"}
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">1. 化石燃料燃烧</h2>
                <p className="mt-2 text-sm text-slate-600">
                  当前按“消耗量 × 低位发热量 × 单位热值含碳量 × 碳氧化率 × 44/12”预览 tCO₂/yr。
                </p>
              </div>

              <button
                type="button"
                onClick={() => append(createEmptyFuelRow())}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                新增燃料行
              </button>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const rowPreview = fuelPreview.rows[index];

                return (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold">
                        燃料记录 {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
                          {...register(`fuelRows.${index}.fuelType`)}
                          className={inputClass}
                          placeholder="例如：柴油"
                        />
                        {errors.fuelRows?.[index]?.fuelType?.message ? (
                          <p className={errorClass}>
                            {String(errors.fuelRows[index]?.fuelType?.message)}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          消耗量
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`fuelRows.${index}.consumptionAmount`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：100"
                        />
                        {errors.fuelRows?.[index]?.consumptionAmount?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.fuelRows[index]?.consumptionAmount?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          低位发热量（TJ/单位）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`fuelRows.${index}.ncvTJPerUnit`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：0.000043"
                        />
                        {errors.fuelRows?.[index]?.ncvTJPerUnit?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.fuelRows[index]?.ncvTJPerUnit?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          单位热值含碳量（tC/TJ）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(
                            `fuelRows.${index}.carbonContentTonCPerTJ`,
                            {
                              valueAsNumber: true,
                            }
                          )}
                          className={inputClass}
                          placeholder="例如：20.2"
                        />
                        {errors.fuelRows?.[index]?.carbonContentTonCPerTJ?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.fuelRows[index]?.carbonContentTonCPerTJ
                                ?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          碳氧化率（0-1）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`fuelRows.${index}.oxidationFactor`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：0.98"
                        />
                        {errors.fuelRows?.[index]?.oxidationFactor?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.fuelRows[index]?.oxidationFactor?.message
                            )}
                          </p>
                        ) : null}
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        备注
                      </span>
                      <textarea
                        {...register(`fuelRows.${index}.notes`)}
                        rows={3}
                        className={inputClass}
                        placeholder="可填写燃料来源、单位说明等"
                      />
                      {errors.fuelRows?.[index]?.notes?.message ? (
                        <p className={errorClass}>
                          {String(errors.fuelRows[index]?.notes?.message)}
                        </p>
                      ) : null}
                    </label>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className={readonlyClass}>
                        排放因子预览：
                        {(rowPreview?.emissionFactorTCO2PerUnit ?? 0).toFixed(6)}
                        {" "}tCO₂/单位
                      </div>
                      <div className={readonlyClass}>
                        年度排放预览：
                        {(rowPreview?.rowCO2TPerYear ?? 0).toFixed(3)}
                        {" "}tCO₂/yr
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">2. 购入/输出电力热力</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  购入电力（MWh）
                </span>
                <input
                  type="number"
                  step="any"
                  {...register("energyBalance.purchasedElectricityMWh", {
                    valueAsNumber: true,
                  })}
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
                  {...register(
                    "energyBalance.purchasedElectricityEFtCO2PerMWh",
                    {
                      valueAsNumber: true,
                    }
                  )}
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
                  {...register("energyBalance.purchasedHeatGJ", {
                    valueAsNumber: true,
                  })}
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
                  {...register("energyBalance.purchasedHeatEFtCO2PerGJ", {
                    valueAsNumber: true,
                  })}
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
                  {...register("energyBalance.exportedElectricityMWh", {
                    valueAsNumber: true,
                  })}
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
                  {...register("energyBalance.exportedElectricityEFtCO2PerMWh", {
                    valueAsNumber: true,
                  })}
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
                  {...register("energyBalance.exportedHeatGJ", {
                    valueAsNumber: true,
                  })}
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
                  {...register("energyBalance.exportedHeatEFtCO2PerGJ", {
                    valueAsNumber: true,
                  })}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">3. 汇总预览</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className={readonlyClass}>
                化石燃料燃烧：
                {fuelPreview.totalCO2TPerYear.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                购入电力热力：
                {energyBalancePreview.totalPurchasedTCO2.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                输出电力热力：
                {energyBalancePreview.totalExportedTCO2.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                净购入电力热力：
                {energyBalancePreview.netPurchasedTCO2.toFixed(3)} tCO₂/yr
              </div>
              <div className={readonlyClass}>
                能源模块总预览：
                {totalEnergyRelatedTCO2.toFixed(3)} tCO₂/yr
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>净购入预览 = 购入排放 - 输出排放</p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage ? (
                <p className="font-medium text-slate-800">{statusMessage}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">4. 化石燃料计算明细</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2">燃料</th>
                    <th className="border-b border-slate-200 px-3 py-2">消耗量</th>
                    <th className="border-b border-slate-200 px-3 py-2">NCV</th>
                    <th className="border-b border-slate-200 px-3 py-2">含碳量</th>
                    <th className="border-b border-slate-200 px-3 py-2">氧化率</th>
                    <th className="border-b border-slate-200 px-3 py-2">因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">tCO₂/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelPreview.rows.map((row, index) => (
                    <tr key={`${row.fuelType}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.fuelType}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.consumptionAmount}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.ncvTJPerUnit.toFixed(6)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.carbonContentTonCPerTJ.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.oxidationFactor.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.emissionFactorTCO2PerUnit.toFixed(6)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.rowCO2TPerYear.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "保存中..." : "保存能源模块草稿"}
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
        </form>
      </div>
    </main>
  );
}