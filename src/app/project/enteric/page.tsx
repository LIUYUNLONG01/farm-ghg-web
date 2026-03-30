'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcEntericCH4 } from "@/lib/calculators/entericCH4";
import {
  entericCH4Schema,
  type EntericCH4FormValues,
} from "@/lib/schemas/entericCH4";
import {
  loadProjectDraft,
  saveEntericDraft,
} from "@/lib/utils/projectDraftStorage";
import { buildEntericDefaultsForLivestock } from "@/lib/utils/standardFactors";
import { getParameterSourceDisplayLabel } from "@/lib/utils/parameterSource";
import type {
  EntericRecord,
  LivestockRecord,
  StandardVersion,
} from "@/types/ghg";

function isTrue(value: unknown) {
  return value === true || value === "true";
}

export default function EntericPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [standardVersion, setStandardVersion] =
    useState<StandardVersion>("NYT4243_2022");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntericCH4FormValues>({
    resolver: zodResolver(entericCH4Schema),
    defaultValues: {
      rows: [],
    },
  });

  const watchedRows = watch("rows");

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");
    setStandardVersion(draft.base.standardVersion);
    setLivestockRows(draft.livestock ?? []);

    if (draft.enteric && draft.enteric.length > 0) {
      reset({
        rows: draft.enteric.map((row) => ({
          sourceLivestockIndex: row.sourceLivestockIndex,
          species: row.species,
          stage: row.stage,
          method: row.method,
          emissionFactor: row.emissionFactor,
          parameterSource: row.parameterSource,
          parameterSourceLabel: row.parameterSourceLabel,
          isOverridden: row.isOverridden,
          notes: row.notes ?? "",
        })),
      });
      setStatusMessage("已加载浏览器中的肠道发酵草稿。");
      return;
    }

    if (draft.livestock && draft.livestock.length > 0) {
      reset({
        rows: buildEntericDefaultsForLivestock(
          draft.base.standardVersion,
          draft.livestock
        ).map((row) => ({
          sourceLivestockIndex: row.sourceLivestockIndex,
          species: row.species,
          stage: row.stage,
          method: row.method,
          emissionFactor: row.emissionFactor,
          parameterSource: row.parameterSource,
          parameterSourceLabel: row.parameterSourceLabel,
          isOverridden: row.isOverridden,
          notes: row.notes ?? "",
        })),
      });
      setStatusMessage("已按标准版本自动带入可匹配的默认因子；未匹配项请手动填写。");
    }
  }, [reset]);

  const calculationPreview = useMemo(() => {
    if (!watchedRows || watchedRows.length === 0) {
      return {
        rows: [],
        totalCH4KgPerYear: 0,
        totalCH4TPerYear: 0,
      };
    }

    const normalizedRows: EntericRecord[] = watchedRows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: row.method,
      emissionFactor: Number(row.emissionFactor ?? 0),
      unit: "kg CH4/head/year",
      parameterSource: row.parameterSource,
      parameterSourceLabel: row.parameterSourceLabel,
      isOverridden: isTrue(row.isOverridden),
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }));

    return calcEntericCH4(livestockRows, normalizedRows);
  }, [watchedRows, livestockRows]);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const badgeClass =
    "rounded-full px-3 py-1 text-xs font-medium";
  const errorClass = "mt-2 text-sm text-red-600";

  const markRowAsManual = (index: number, label = "人工修改后已锁定") => {
    setValue(`rows.${index}.parameterSource`, "manual", { shouldValidate: true });
    setValue(`rows.${index}.parameterSourceLabel`, label, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.isOverridden`, true, { shouldValidate: true });
  };

  const applyDefaults = () => {
    const draft = loadProjectDraft();
    if (!draft) return;

    const nextRows = watchedRows.map((row, index) => {
      if (isTrue(row.isOverridden)) return row;

      const defaults = buildEntericDefaultsForLivestock(
        draft.base.standardVersion,
        [{ species: row.species, stage: row.stage, annualAverageHead: 1 }]
      )[0];

      return {
        ...row,
        sourceLivestockIndex: index,
        emissionFactor: defaults.emissionFactor,
        parameterSource: defaults.parameterSource,
        parameterSourceLabel: defaults.parameterSourceLabel,
        isOverridden: false,
        notes: defaults.notes ?? row.notes,
      };
    });

    reset({ rows: nextRows });
    setStatusMessage("已为未锁定的记录重新带入默认因子。");
  };

  const applyDefaultForRow = (index: number) => {
    const draft = loadProjectDraft();
    if (!draft) return;

    const row = watchedRows[index];
    if (!row) return;

    const defaults = buildEntericDefaultsForLivestock(
      draft.base.standardVersion,
      [{ species: row.species, stage: row.stage, annualAverageHead: 1 }]
    )[0];

    setValue(`rows.${index}.emissionFactor`, defaults.emissionFactor, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.parameterSource`, defaults.parameterSource, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.parameterSourceLabel`, defaults.parameterSourceLabel, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.isOverridden`, false, { shouldValidate: true });
    setValue(`rows.${index}.notes`, defaults.notes ?? "", {
      shouldValidate: true,
    });

    setStatusMessage(`第 ${index + 1} 行已恢复为默认值。`);
  };

  const onSubmit = (values: EntericCH4FormValues) => {
    const rows: EntericRecord[] = values.rows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species.trim(),
      stage: row.stage.trim(),
      method: row.method,
      emissionFactor: row.emissionFactor,
      unit: "kg CH4/head/year",
      parameterSource: row.parameterSource,
      parameterSourceLabel: row.parameterSourceLabel,
      isOverridden: isTrue(row.isOverridden),
      notes: row.notes.trim() ? row.notes.trim() : undefined,
    }));

    saveEntericDraft(rows);
    setStatusMessage("已保存肠道发酵 CH4 参数草稿。");
  };

  if (livestockRows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有养殖活动数据</h1>
            <p className="mt-3 text-slate-600">
              先完成“基础信息”和“养殖活动数据”这两步，再进入肠道发酵模块。
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
            <p className="text-sm font-medium text-slate-500">Enteric CH4</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              肠道发酵 CH4
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"} · 标准版本：{standardVersion}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/livestock"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回养殖活动
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
                <h2 className="text-lg font-semibold">1. 因子录入</h2>
                <p className="mt-2 text-sm text-slate-600">
                  当前支持按标准版本自动带入默认因子。手工修改排放因子后，该行会自动锁定，不会被“为全部记录带入默认因子”覆盖。
                </p>
              </div>

              <button
                type="button"
                onClick={applyDefaults}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                为全部未锁定记录带入默认值
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {watchedRows?.map((row, index) => {
                const rowPreview = calculationPreview.rows[index];
                const head = rowPreview?.annualAverageHead ?? 0;
                const preview = rowPreview?.ch4TPerYear ?? 0;
                const sourceText = getParameterSourceDisplayLabel(
                  row.parameterSource
                );
                const isLocked = isTrue(row.isOverridden);

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">
                          记录 {index + 1}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          年平均存栏：{head}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${badgeClass} ${
                            row.parameterSource === "defaultLibrary"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          来源：{sourceText}
                        </span>

                        <span
                          className={`${badgeClass} ${
                            isLocked
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isLocked ? "已人工锁定" : "未锁定"}
                        </span>

                        <button
                          type="button"
                          onClick={() => applyDefaultForRow(index)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          恢复该行默认值
                        </button>
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
                      {...register(`rows.${index}.parameterSource`)}
                    />
                    <input
                      type="hidden"
                      {...register(`rows.${index}.parameterSourceLabel`)}
                    />
                    <input
                      type="hidden"
                      {...register(`rows.${index}.isOverridden`)}
                    />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                          取值方式
                        </span>
                        <select
                          {...register(`rows.${index}.method`, {
                            onChange: (e) => {
                              if (e.target.value === "customEF") {
                                markRowAsManual(index, "选择了自定义值");
                              }
                            },
                          })}
                          className={inputClass}
                        >
                          <option value="defaultEF">默认推荐值</option>
                          <option value="customEF">自定义值</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          排放因子
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.emissionFactor`, {
                            valueAsNumber: true,
                            onChange: () =>
                              markRowAsManual(index, "排放因子已人工修改"),
                          })}
                          className={inputClass}
                          placeholder="kg CH4/head/year"
                        />
                        {errors.rows?.[index]?.emissionFactor?.message ? (
                          <p className={errorClass}>
                            {String(errors.rows[index]?.emissionFactor?.message)}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          年度 CH4 预览
                        </span>
                        <div className={readonlyClass}>
                          {preview.toFixed(3)} t CH4/yr
                        </div>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        参数来源说明
                      </span>
                      <input
                        {...register(`rows.${index}.parameterSourceLabel`)}
                        readOnly
                        className={readonlyClass}
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        备注
                      </span>
                      <textarea
                        {...register(`rows.${index}.notes`)}
                        rows={3}
                        className={inputClass}
                        placeholder="可填写因子来源、特殊说明等"
                      />
                      {errors.rows?.[index]?.notes?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.notes?.message)}
                        </p>
                      ) : null}
                    </label>
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
            <h2 className="text-lg font-semibold">2. 当前状态</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>本页已连接养殖活动记录</p>
              <p>
                当前年度 CH4 预览总量：
                {calculationPreview.totalCH4TPerYear.toFixed(3)} t CH4/yr
              </p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage ? (
                <p className="font-medium text-slate-800">{statusMessage}</p>
              ) : null}
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
                    <th className="border-b border-slate-200 px-3 py-2">年平均存栏</th>
                    <th className="border-b border-slate-200 px-3 py-2">排放因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">来源</th>
                    <th className="border-b border-slate-200 px-3 py-2">锁定</th>
                    <th className="border-b border-slate-200 px-3 py-2">kg CH4/yr</th>
                    <th className="border-b border-slate-200 px-3 py-2">t CH4/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationPreview.rows.map((resultRow, index) => (
                    <tr key={`${resultRow.species}-${resultRow.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.species}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.stage}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.annualAverageHead}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.emissionFactor}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {getParameterSourceDisplayLabel(
                          watchedRows[index]?.parameterSource ?? "manual"
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {isTrue(watchedRows[index]?.isOverridden) ? "是" : "否"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.ch4KgPerYear.toFixed(2)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {resultRow.ch4TPerYear.toFixed(3)}
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
              {isSubmitting ? "保存中..." : "保存肠道发酵草稿"}
            </button>

            <Link
              href="/project/livestock"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回上一页
            </Link>

            <Link
              href="/project/manure-ch4"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              下一步：粪污管理 CH4
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}