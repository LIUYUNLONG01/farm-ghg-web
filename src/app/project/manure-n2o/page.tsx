'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcManureN2O } from "@/lib/calculators/manureN2O";
import {
  manureN2OSchema,
  type ManureN2OFormValues,
} from "@/lib/schemas/manureN2O";
import {
  loadProjectDraft,
  saveManureN2ODraft,
} from "@/lib/utils/projectDraftStorage";
import type { LivestockRecord, ManureN2ORecord } from "@/types/ghg";

function createRowFromLivestock(row: LivestockRecord, index: number) {
  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,
    method: "manualInput" as const,
    managementSystem: "",
    sharePercent: 100,
    nexKgNPerHeadYear: 0,
    ef3KgN2ONPerKgN: 0,
    notes: "",
  };
}

export default function ManureN2OPage() {
  const [projectName, setProjectName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ManureN2OFormValues>({
    resolver: zodResolver(manureN2OSchema),
    defaultValues: {
      rows: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rows",
  });

  const watchedRows = watch("rows") ?? [];

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");
    setLivestockRows(draft.livestock ?? []);

    if (draft.manureN2O && draft.manureN2O.length > 0) {
      reset({
        rows: draft.manureN2O.map((row) => ({
          sourceLivestockIndex: row.sourceLivestockIndex,
          species: row.species,
          stage: row.stage,
          method: "manualInput" as const,
          managementSystem: row.managementSystem,
          sharePercent: row.sharePercent,
          nexKgNPerHeadYear: row.nexKgNPerHeadYear,
          ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
          notes: row.notes ?? "",
        })),
      });
      setStatusMessage("已加载浏览器中的粪污管理 N2O 草稿。");
      return;
    }

    if (draft.livestock && draft.livestock.length > 0) {
      reset({
        rows: draft.livestock.map((row, index) =>
          createRowFromLivestock(row, index)
        ),
      });
    }
  }, [reset]);

  const calculationPreview = useMemo(() => {
    if (!watchedRows || watchedRows.length === 0) {
      return {
        rows: [],
        groups: [],
        totalN2OKgPerYear: 0,
        totalN2OTPerYear: 0,
      };
    }

    const normalizedRows: ManureN2ORecord[] = watchedRows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: "manualInput",
      managementSystem: row.managementSystem,
      sharePercent: Number(row.sharePercent ?? 0),
      nexKgNPerHeadYear: Number(row.nexKgNPerHeadYear ?? 0),
      ef3KgN2ONPerKgN: Number(row.ef3KgN2ONPerKgN ?? 0),
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }));

    return calcManureN2O(livestockRows, normalizedRows);
  }, [watchedRows, livestockRows]);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const errorClass = "mt-2 text-sm text-red-600";

  const onSubmit = (values: ManureN2OFormValues) => {
    const rows: ManureN2ORecord[] = values.rows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species.trim(),
      stage: row.stage.trim(),
      method: "manualInput",
      managementSystem: row.managementSystem.trim(),
      sharePercent: row.sharePercent,
      nexKgNPerHeadYear: row.nexKgNPerHeadYear,
      ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
      notes: row.notes.trim() ? row.notes.trim() : undefined,
    }));

    saveManureN2ODraft(rows);
    setStatusMessage("已保存粪污管理 N2O 草稿。");
  };

  if (livestockRows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有养殖活动数据</h1>
            <p className="mt-3 text-slate-600">
              先完成“基础信息”和“养殖活动数据”这两步，再进入粪污管理 N2O 模块。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/project/new"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                回到基础信息
              </Link>
              <Link
                href="/project/livestock"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                去录入养殖活动
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Manure N2O</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              粪污管理 N2O
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/manure-ch4"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回粪污管理 CH4
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
                <h2 className="text-lg font-semibold">1. 管理方式路径录入</h2>
                <p className="mt-2 text-sm text-slate-600">
                  每一行代表一条“畜种 × 管理方式”路径。一个畜种如果有多种管理方式，就为它新增多行，并保证同一畜种的占比加总为 100%。
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const rowPreview = calculationPreview.rows[index];
                const annualHead = rowPreview?.annualAverageHead ?? 0;
                const factorPerHead =
                  rowPreview?.emissionFactorKgN2OPerHeadYear ?? 0;
                const rowTotal = rowPreview?.rowN2OTPerYear ?? 0;

                return (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">
                          路径 {index + 1}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          年平均存栏：{annualHead}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            append({
                              sourceLivestockIndex:
                                watchedRows[index]?.sourceLivestockIndex ?? 0,
                              species:
                                watchedRows[index]?.species ??
                                livestockRows[0]?.species ??
                                "",
                              stage:
                                watchedRows[index]?.stage ??
                                livestockRows[0]?.stage ??
                                "",
                              method: "manualInput",
                              managementSystem: "",
                              sharePercent: 0,
                              nexKgNPerHeadYear: 0,
                              ef3KgN2ONPerKgN: 0,
                              notes: "",
                            })
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          为该畜种新增管理方式
                        </button>

                        {fields.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            删除
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <input
                      type="hidden"
                      {...register(`rows.${index}.sourceLivestockIndex`, {
                        valueAsNumber: true,
                      })}
                    />
                    <input
                      type="hidden"
                      {...register(`rows.${index}.method`)}
                      value="manualInput"
                    />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          畜种
                        </span>
                        <input
                          {...register(`rows.${index}.species`)}
                          readOnly
                          className={readonlyClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          阶段
                        </span>
                        <input
                          {...register(`rows.${index}.stage`)}
                          readOnly
                          className={readonlyClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          管理方式
                        </span>
                        <input
                          {...register(`rows.${index}.managementSystem`)}
                          className={inputClass}
                          placeholder="例如：固体贮存"
                        />
                        {errors.rows?.[index]?.managementSystem?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.rows[index]?.managementSystem?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          管理方式占比（%）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.sharePercent`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：60"
                        />
                        {errors.rows?.[index]?.sharePercent?.message ? (
                          <p className={errorClass}>
                            {String(errors.rows[index]?.sharePercent?.message)}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Nex（kg N/head/year）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.nexKgNPerHeadYear`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：80"
                        />
                        {errors.rows?.[index]?.nexKgNPerHeadYear?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.rows[index]?.nexKgNPerHeadYear?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          EF3（kg N2O-N/kg N）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.ef3KgN2ONPerKgN`, {
                            valueAsNumber: true,
                          })}
                          className={inputClass}
                          placeholder="例如：0.005"
                        />
                        {errors.rows?.[index]?.ef3KgN2ONPerKgN?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.rows[index]?.ef3KgN2ONPerKgN?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          每头年排放因子预览
                        </span>
                        <div className={readonlyClass}>
                          {factorPerHead.toFixed(3)} kg N2O/head/yr
                        </div>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        备注
                      </span>
                      <textarea
                        {...register(`rows.${index}.notes`)}
                        rows={3}
                        className={inputClass}
                        placeholder="可填写参数来源、管理方式说明等"
                      />
                      {errors.rows?.[index]?.notes?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.notes?.message)}
                        </p>
                      ) : null}
                    </label>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      该路径年度 N2O 预览：{rowTotal.toFixed(3)} t N2O/yr
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.rows?.message ? (
              <p className="mt-4 text-sm text-red-600">
                {String(errors.rows.message)}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">2. 占比校验与汇总</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                当前年度 N2O 预览总量：
                {calculationPreview.totalN2OTPerYear.toFixed(3)} t N2O/yr
              </p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage ? (
                <p className="font-medium text-slate-800">{statusMessage}</p>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2">畜种</th>
                    <th className="border-b border-slate-200 px-3 py-2">阶段</th>
                    <th className="border-b border-slate-200 px-3 py-2">占比合计（%）</th>
                    <th className="border-b border-slate-200 px-3 py-2">状态</th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      合计因子
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      t N2O/yr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calculationPreview.groups.map((group, index) => (
                    <tr key={`${group.species}-${group.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.species}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.stage}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.shareTotalPercent.toFixed(2)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.isShareBalanced ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            已闭合
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            未到 100%
                          </span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.emissionFactorKgN2OPerHeadYear.toFixed(3)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.totalN2OTPerYear.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">3. 计算明细预览</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2">畜种</th>
                    <th className="border-b border-slate-200 px-3 py-2">阶段</th>
                    <th className="border-b border-slate-200 px-3 py-2">管理方式</th>
                    <th className="border-b border-slate-200 px-3 py-2">占比</th>
                    <th className="border-b border-slate-200 px-3 py-2">Nex</th>
                    <th className="border-b border-slate-200 px-3 py-2">EF3</th>
                    <th className="border-b border-slate-200 px-3 py-2">管理氮量</th>
                    <th className="border-b border-slate-200 px-3 py-2">因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">t N2O/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationPreview.rows.map((row, index) => (
                    <tr key={`${row.species}-${row.stage}-${row.managementSystem}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.species}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.stage}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.managementSystem || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.sharePercent.toFixed(2)}%
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.nexKgNPerHeadYear.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.ef3KgN2ONPerKgN.toFixed(4)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.managedNitrogenKgPerYear.toFixed(2)} kg N/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.emissionFactorKgN2OPerHeadYear.toFixed(3)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.rowN2OTPerYear.toFixed(3)}
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
              {isSubmitting ? "保存中..." : "保存粪污管理 N2O 草稿"}
            </button>

            <Link
              href="/project/manure-ch4"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回上一页
            </Link>

            <Link
              href="/project/energy"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              下一步：能源与电力模块
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}