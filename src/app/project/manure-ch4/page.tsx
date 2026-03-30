'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcManureCH4 } from "@/lib/calculators/manureCH4";
import {
  manureCH4Schema,
  type ManureCH4FormValues,
} from "@/lib/schemas/manureCH4";
import {
  loadProjectDraft,
  saveManureCH4Draft,
} from "@/lib/utils/projectDraftStorage";
import {
  commonManagementSystemPresets,
  getManureCH4DefaultFactor,
} from "@/lib/utils/standardFactors";
import { getParameterSourceDisplayLabel } from "@/lib/utils/parameterSource";
import type {
  LivestockRecord,
  ManureCH4Record,
  StandardVersion,
} from "@/types/ghg";

function createRowFromLivestock(row: LivestockRecord, index: number) {
  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,
    method: "manualInput" as const,
    managementSystem: "",
    sharePercent: 100,
    vsKgPerHeadPerDay: 0,
    boM3PerKgVS: 0,
    mcfPercent: 0,
    parameterSource: "manual" as const,
    parameterSourceLabel: "尚未带入默认参数",
    isOverridden: false,
    notes: "",
  };
}

function mergeNote(existing: string | undefined, incoming: string) {
  const left = (existing ?? "").trim();
  const right = incoming.trim();

  if (!left) return right;
  if (left.includes(right)) return left;
  return `${left}；${right}`;
}

function isTrue(value: unknown) {
  return value === true || value === "true";
}

export default function ManureCH4Page() {
  const [projectName, setProjectName] = useState("");
  const [standardVersion, setStandardVersion] =
    useState<StandardVersion>("NYT4243_2022");
  const [statusMessage, setStatusMessage] = useState("");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ManureCH4FormValues>({
    resolver: zodResolver(manureCH4Schema),
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
    setStandardVersion(draft.base.standardVersion);
    setLivestockRows(draft.livestock ?? []);

    if (draft.manureCH4 && draft.manureCH4.length > 0) {
      reset({
        rows: draft.manureCH4.map((row) => ({
          sourceLivestockIndex: row.sourceLivestockIndex,
          species: row.species,
          stage: row.stage,
          method: "manualInput" as const,
          managementSystem: row.managementSystem,
          sharePercent: row.sharePercent,
          vsKgPerHeadPerDay: row.vsKgPerHeadPerDay,
          boM3PerKgVS: row.boM3PerKgVS,
          mcfPercent: row.mcfPercent,
          parameterSource: row.parameterSource,
          parameterSourceLabel: row.parameterSourceLabel,
          isOverridden: row.isOverridden,
          notes: row.notes ?? "",
        })),
      });
      setStatusMessage("已加载浏览器中的粪污管理 CH4 草稿。");
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
        totalCH4KgPerYear: 0,
        totalCH4TPerYear: 0,
      };
    }

    const normalizedRows: ManureCH4Record[] = watchedRows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: "manualInput",
      managementSystem: row.managementSystem,
      sharePercent: Number(row.sharePercent ?? 0),
      vsKgPerHeadPerDay: Number(row.vsKgPerHeadPerDay ?? 0),
      boM3PerKgVS: Number(row.boM3PerKgVS ?? 0),
      mcfPercent: Number(row.mcfPercent ?? 0),
      parameterSource: row.parameterSource,
      parameterSourceLabel: row.parameterSourceLabel,
      isOverridden: isTrue(row.isOverridden),
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }));

    return calcManureCH4(livestockRows, normalizedRows);
  }, [watchedRows, livestockRows]);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const badgeClass =
    "rounded-full px-3 py-1 text-xs font-medium";
  const errorClass = "mt-2 text-sm text-red-600";

  const markRowAsManual = (index: number, label = "参数已人工修改并锁定") => {
    setValue(`rows.${index}.parameterSource`, "manual", { shouldValidate: true });
    setValue(`rows.${index}.parameterSourceLabel`, label, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.isOverridden`, true, { shouldValidate: true });
  };

  const markRowPending = (index: number, label = "管理方式已修改，待重新确认参数") => {
    setValue(`rows.${index}.parameterSource`, "manual", { shouldValidate: true });
    setValue(`rows.${index}.parameterSourceLabel`, label, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.isOverridden`, false, { shouldValidate: true });
  };

  const applyDefaultsForRow = (index: number) => {
    const row = watchedRows[index];
    if (!row) return;

    const matched = getManureCH4DefaultFactor(
      standardVersion,
      row.species,
      row.managementSystem
    );

    if (!matched) {
      setStatusMessage(
        `第 ${index + 1} 行未匹配到默认参数，请先使用常见管理方式名称，或手动填写。`
      );
      return;
    }

    setValue(`rows.${index}.vsKgPerHeadPerDay`, matched.vsKgPerHeadPerDay, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.boM3PerKgVS`, matched.boM3PerKgVS, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.mcfPercent`, matched.mcfPercent, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.parameterSource`, "defaultLibrary", {
      shouldValidate: true,
    });
    setValue(`rows.${index}.parameterSourceLabel`, matched.sourceLabel, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.isOverridden`, false, { shouldValidate: true });
    setValue(
      `rows.${index}.notes`,
      mergeNote(
        row.notes,
        `${matched.sourceLabel}：${matched.note ?? "已自动带入默认值。"}`
      ),
      { shouldValidate: true }
    );

    setStatusMessage(`第 ${index + 1} 行已带入默认参数。`);
  };

  const applyDefaultsForAll = () => {
    let matchedCount = 0;

    const nextRows = watchedRows.map((row) => {
      if (isTrue(row.isOverridden)) return row;

      const matched = getManureCH4DefaultFactor(
        standardVersion,
        row.species,
        row.managementSystem
      );

      if (!matched) return row;

      matchedCount += 1;

      return {
        ...row,
        vsKgPerHeadPerDay: matched.vsKgPerHeadPerDay,
        boM3PerKgVS: matched.boM3PerKgVS,
        mcfPercent: matched.mcfPercent,
        parameterSource: "defaultLibrary" as const,
        parameterSourceLabel: matched.sourceLabel,
        isOverridden: false,
        notes: mergeNote(
          row.notes,
          `${matched.sourceLabel}：${matched.note ?? "已自动带入默认值。"}`
        ),
      };
    });

    reset({ rows: nextRows });

    setStatusMessage(
      matchedCount > 0
        ? `已为 ${matchedCount} 条未锁定记录带入默认参数。`
        : "没有匹配到可带入的默认参数，或所有记录都已锁定。"
    );
  };

  const fillManagementSystemPreset = (index: number, label: string) => {
    setValue(`rows.${index}.managementSystem`, label, { shouldValidate: true });
    markRowPending(index);
  };

  const onSubmit = (values: ManureCH4FormValues) => {
    const rows: ManureCH4Record[] = values.rows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species.trim(),
      stage: row.stage.trim(),
      method: "manualInput",
      managementSystem: row.managementSystem.trim(),
      sharePercent: row.sharePercent,
      vsKgPerHeadPerDay: row.vsKgPerHeadPerDay,
      boM3PerKgVS: row.boM3PerKgVS,
      mcfPercent: row.mcfPercent,
      parameterSource: row.parameterSource,
      parameterSourceLabel: row.parameterSourceLabel,
      isOverridden: isTrue(row.isOverridden),
      notes: row.notes.trim() ? row.notes.trim() : undefined,
    }));

    saveManureCH4Draft(rows);
    setStatusMessage("已保存粪污管理 CH4 草稿。");
  };

  if (livestockRows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有养殖活动数据</h1>
            <p className="mt-3 text-slate-600">
              先完成“基础信息”和“养殖活动数据”这两步，再进入粪污管理 CH4 模块。
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
            <p className="text-sm font-medium text-slate-500">Manure CH4</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              粪污管理 CH4
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"} · 标准版本：{standardVersion}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/enteric"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回肠道发酵 CH4
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
                  当前支持按“畜种 + 管理方式”自动带入 `VS / B₀ / MCF` 默认值。手工修改后该行会自动锁定，不会被“为全部记录带入默认参数”覆盖。
                </p>
              </div>

              <button
                type="button"
                onClick={applyDefaultsForAll}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                为全部未锁定记录带入默认参数
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {commonManagementSystemPresets.map((preset) => (
                <span
                  key={preset.id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {preset.label}
                </span>
              ))}
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const rowPreview = calculationPreview.rows[index];
                const annualHead = rowPreview?.annualAverageHead ?? 0;
                const factorPerHead =
                  rowPreview?.emissionFactorKgPerHeadYear ?? 0;
                const rowTotal = rowPreview?.rowCH4TPerYear ?? 0;
                const isLocked = isTrue(watchedRows[index]?.isOverridden);

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

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${badgeClass} ${
                            watchedRows[index]?.parameterSource === "defaultLibrary"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          来源：
                          {getParameterSourceDisplayLabel(
                            watchedRows[index]?.parameterSource ?? "manual"
                          )}
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
                              vsKgPerHeadPerDay: 0,
                              boM3PerKgVS: 0,
                              mcfPercent: 0,
                              parameterSource: "manual",
                              parameterSourceLabel: "尚未带入默认参数",
                              isOverridden: false,
                              notes: "",
                            })
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          为该畜种新增管理方式
                        </button>

                        <button
                          type="button"
                          onClick={() => applyDefaultsForRow(index)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          恢复该行默认值
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

                    <div className="mb-4 flex flex-wrap gap-2">
                      {commonManagementSystemPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            fillManagementSystemPreset(index, preset.label)
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          填入：{preset.label}
                        </button>
                      ))}
                    </div>

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
                          {...register(`rows.${index}.managementSystem`, {
                            onChange: () => markRowPending(index),
                          })}
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
                          VS（kg/head/day）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.vsKgPerHeadPerDay`, {
                            valueAsNumber: true,
                            onChange: () =>
                              markRowAsManual(index, "VS 已人工修改并锁定"),
                          })}
                          className={inputClass}
                          placeholder="例如：2.8"
                        />
                        {errors.rows?.[index]?.vsKgPerHeadPerDay?.message ? (
                          <p className={errorClass}>
                            {String(
                              errors.rows[index]?.vsKgPerHeadPerDay?.message
                            )}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          B₀（m³ CH4/kg VS）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.boM3PerKgVS`, {
                            valueAsNumber: true,
                            onChange: () =>
                              markRowAsManual(index, "B₀ 已人工修改并锁定"),
                          })}
                          className={inputClass}
                          placeholder="例如：0.24"
                        />
                        {errors.rows?.[index]?.boM3PerKgVS?.message ? (
                          <p className={errorClass}>
                            {String(errors.rows[index]?.boM3PerKgVS?.message)}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          MCF（%）
                        </span>
                        <input
                          type="number"
                          step="any"
                          {...register(`rows.${index}.mcfPercent`, {
                            valueAsNumber: true,
                            onChange: () =>
                              markRowAsManual(index, "MCF 已人工修改并锁定"),
                          })}
                          className={inputClass}
                          placeholder="例如：35"
                        />
                        {errors.rows?.[index]?.mcfPercent?.message ? (
                          <p className={errorClass}>
                            {String(errors.rows[index]?.mcfPercent?.message)}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          每头年排放因子预览
                        </span>
                        <div className={readonlyClass}>
                          {factorPerHead.toFixed(3)} kg CH4/head/yr
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
                        placeholder="可填写参数来源、管理方式说明等"
                      />
                      {errors.rows?.[index]?.notes?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.notes?.message)}
                        </p>
                      ) : null}
                    </label>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      该路径年度 CH4 预览：{rowTotal.toFixed(3)} t CH4/yr
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
                当前年度 CH4 预览总量：
                {calculationPreview.totalCH4TPerYear.toFixed(3)} t CH4/yr
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
                      t CH4/yr
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
                        {group.emissionFactorKgPerHeadYear.toFixed(3)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {group.totalCH4TPerYear.toFixed(3)}
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
                    <th className="border-b border-slate-200 px-3 py-2">VS</th>
                    <th className="border-b border-slate-200 px-3 py-2">B₀</th>
                    <th className="border-b border-slate-200 px-3 py-2">MCF</th>
                    <th className="border-b border-slate-200 px-3 py-2">来源</th>
                    <th className="border-b border-slate-200 px-3 py-2">锁定</th>
                    <th className="border-b border-slate-200 px-3 py-2">因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">t CH4/yr</th>
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
                        {row.vsKgPerHeadPerDay.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.boM3PerKgVS.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.mcfPercent.toFixed(2)}%
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
                        {row.emissionFactorKgPerHeadYear.toFixed(3)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.rowCH4TPerYear.toFixed(3)}
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
              {isSubmitting ? "保存中..." : "保存粪污管理 CH4 草稿"}
            </button>

            <Link
              href="/project/enteric"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回上一页
            </Link>

            <Link
              href="/project/manure-n2o"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              下一步：粪污管理 N2O
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}