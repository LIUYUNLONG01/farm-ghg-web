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
import {
  commonManagementSystemPresets,
  getManureN2ODefaultFactor,
  getParameterSourceDisplay,
  getRegionalDirectN2OFactor,
  resolveRegionGroup,
} from "@/lib/utils/standardFactors";
import type {
  LivestockRecord,
  ManureN2ORecord,
  StandardVersion,
} from "@/types/ghg";

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown, digits = 3): string {
  return safeNumber(value).toFixed(digits);
}

function mergeNote(existing: string | undefined, incoming: string) {
  const left = (existing ?? "").trim();
  const right = incoming.trim();
  if (!left) return right;
  if (left.includes(right)) return left;
  return `${left}；${right}`;
}

function sourceBadgeClass(sourceType: string) {
  if (sourceType === "default_library") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700";
  }
  if (sourceType === "preset_template") {
    return "rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700";
  }
  return "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700";
}

function getLivestockDmiSourceLabel(row: LivestockRecord): string {
  switch (row.dmiMethod) {
    case "direct_input":
      return "直接录入 DMI";
    case "feed_ledger":
      return "按饲料台账反推 DMI";
    case "temporary_estimate":
      return "经验值/台账估计";
    case "model_nema_placeholder":
      return "预留 NEma 模型估算";
    case "model_de_placeholder":
      return "预留 DE% 模型估算";
    default:
      return "未提供";
  }
}

function getLivestockDmiValue(row: LivestockRecord): number | undefined {
  const dmi = safeNumber(row.dmiKgPerHeadDay);
  return dmi > 0 ? dmi : undefined;
}

function createRegionalRow(
  row: LivestockRecord,
  index: number,
  standardVersion: StandardVersion,
  projectRegion: string
) {
  const regional = getRegionalDirectN2OFactor(
    standardVersion,
    projectRegion,
    row.species
  );

  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,
    method: "regionalDefaultEF" as const,
    regionalEmissionFactor: regional?.emissionFactor ?? 0,
    managementSystem: "",
    sharePercent: 100,
    nexKgNPerHeadYear: 0,
    ef3KgN2ONPerKgN: 0,
    parameterSourceType: regional ? ("default_library" as const) : ("manual_input" as const),
    parameterSourceLabel: regional
      ? `${standardVersion} 表C.10：${regional.regionGroup} / ${row.species}`
      : "待选择推荐因子或参数法",
    notes: regional
      ? `表C.10 区域化推荐因子已按初始化自动带入：${regional.regionGroup} / ${row.species}`
      : "",
  };
}

function createParameterRow(row: LivestockRecord, index: number) {
  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,
    method: "parameterCalculation" as const,
    regionalEmissionFactor: undefined,
    managementSystem: "",
    sharePercent: 0,
    nexKgNPerHeadYear: 0,
    ef3KgN2ONPerKgN: 0,
    parameterSourceType: "manual_input" as const,
    parameterSourceLabel: "新增参数法路径",
    notes: "",
  };
}

function syncRowsWithLivestock(
  livestockRows: LivestockRecord[],
  existingRows: ManureN2ORecord[],
  standardVersion: StandardVersion,
  projectRegion: string
) {
  const nextRows: Array<{
    sourceLivestockIndex: number;
    species: string;
    stage: string;
    method: "regionalDefaultEF" | "parameterCalculation";
    regionalEmissionFactor?: number;
    managementSystem: string;
    sharePercent: number;
    nexKgNPerHeadYear: number;
    ef3KgN2ONPerKgN: number;
    parameterSourceType: "default_library" | "manual_input" | "preset_template";
    parameterSourceLabel: string;
    notes: string;
  }> = [];

  livestockRows.forEach((livestockRow, sourceIndex) => {
    const rowsForSource = existingRows.filter(
      (item) => item.sourceLivestockIndex === sourceIndex
    );

    if (rowsForSource.length === 0) {
      nextRows.push(
        createRegionalRow(
          livestockRow,
          sourceIndex,
          standardVersion,
          projectRegion
        )
      );
      return;
    }

    const parameterRows = rowsForSource.filter(
      (item) => item.method === "parameterCalculation"
    );

    if (parameterRows.length > 0) {
      parameterRows.forEach((row) => {
        const shouldRefreshDefaults =
          row.parameterSourceType === "default_library" &&
          row.managementSystem &&
          row.managementSystem.trim() !== "";

        if (shouldRefreshDefaults) {
          const matched = getManureN2ODefaultFactor(
            standardVersion,
            livestockRow.species,
            row.managementSystem ?? ""
          );

          if (matched) {
            nextRows.push({
              sourceLivestockIndex: sourceIndex,
              species: livestockRow.species,
              stage: livestockRow.stage,
              method: "parameterCalculation",
              regionalEmissionFactor: undefined,
              managementSystem: row.managementSystem ?? "",
              sharePercent: row.sharePercent ?? 0,
              nexKgNPerHeadYear: matched.nexKgNPerHeadYear,
              ef3KgN2ONPerKgN: matched.ef3KgN2ONPerKgN,
              parameterSourceType: "default_library",
              parameterSourceLabel: `${standardVersion} ${matched.sourceLabel}`,
              notes: mergeNote(
                row.notes,
                `参数法默认值已按当前养殖活动口径重新同步：${matched.note}`
              ),
            });
            return;
          }
        }

        nextRows.push({
          sourceLivestockIndex: sourceIndex,
          species: livestockRow.species,
          stage: livestockRow.stage,
          method: "parameterCalculation",
          regionalEmissionFactor: undefined,
          managementSystem: row.managementSystem ?? "",
          sharePercent: row.sharePercent ?? 0,
          nexKgNPerHeadYear: row.nexKgNPerHeadYear ?? 0,
          ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN ?? 0,
          parameterSourceType: row.parameterSourceType ?? "manual_input",
          parameterSourceLabel:
            row.parameterSourceLabel ?? "参数法：待带入默认值或手工填写",
          notes: row.notes ?? "",
        });
      });

      return;
    }

    const regionalRow = rowsForSource[0];
    const shouldRefreshDefault = regionalRow.parameterSourceType === "default_library";
    const regional = shouldRefreshDefault
      ? getRegionalDirectN2OFactor(
          standardVersion,
          projectRegion,
          livestockRow.species
        )
      : null;

    nextRows.push({
      sourceLivestockIndex: sourceIndex,
      species: livestockRow.species,
      stage: livestockRow.stage,
      method: "regionalDefaultEF",
      regionalEmissionFactor: shouldRefreshDefault
        ? regional?.emissionFactor ?? 0
        : regionalRow.regionalEmissionFactor ?? 0,
      managementSystem: "",
      sharePercent: 100,
      nexKgNPerHeadYear: 0,
      ef3KgN2ONPerKgN: 0,
      parameterSourceType: shouldRefreshDefault
        ? regional
          ? "default_library"
          : "manual_input"
        : regionalRow.parameterSourceType ?? "manual_input",
      parameterSourceLabel: shouldRefreshDefault
        ? regional
          ? `${standardVersion} 表C.10：${regional.regionGroup} / ${livestockRow.species}`
          : "未匹配区域化推荐因子，需手动填写"
        : regionalRow.parameterSourceLabel ?? "手工输入",
      notes: shouldRefreshDefault
        ? regional
          ? mergeNote(
              regionalRow.notes,
              `表C.10 区域化推荐因子已按当前养殖活动口径重新同步：${regional.regionGroup} / ${livestockRow.species}`
            )
          : regionalRow.notes ?? ""
        : regionalRow.notes ?? "",
    });
  });

  return nextRows;
}

export default function ManureN2OPage() {
  const [projectName, setProjectName] = useState("");
  const [standardVersion, setStandardVersion] =
    useState<StandardVersion>("NYT4243_2022");
  const [projectRegion, setProjectRegion] = useState("");
  const [regionGroup, setRegionGroup] = useState<string>("未识别");
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
  } = useForm<ManureN2OFormValues>({
    resolver: zodResolver(manureN2OSchema),
    defaultValues: {
      rows: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "rows",
  });

  const watchedRows = watch("rows") ?? [];

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    const livestock = draft.livestock ?? [];
    const manureDraft = draft.manureN2O ?? [];

    setProjectName(draft.base.enterpriseName || "未命名项目");
    setStandardVersion(draft.base.standardVersion);
    setProjectRegion(draft.base.region || "");
    setRegionGroup(resolveRegionGroup(draft.base.region || "") ?? "未识别");
    setLivestockRows(livestock);

    const syncedRows = syncRowsWithLivestock(
      livestock,
      manureDraft,
      draft.base.standardVersion,
      draft.base.region || ""
    );

    reset({
      rows: syncedRows.map((row) => ({
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        method: row.method,
        regionalEmissionFactor: row.regionalEmissionFactor,
        managementSystem: row.managementSystem,
        sharePercent: row.sharePercent,
        nexKgNPerHeadYear: row.nexKgNPerHeadYear,
        ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
        parameterSourceType: row.parameterSourceType,
        parameterSourceLabel: row.parameterSourceLabel,
        notes: row.notes,
      })),
    });

    if (manureDraft.length > 0) {
      setStatusMessage(
        "已加载粪污管理 N2O 草稿，并按当前养殖活动数据重新同步了畜种和阶段。"
      );
    } else {
      setStatusMessage("已按当前地区初始化粪污管理 N2O 模块。");
    }
  }, [reset]);

  const calculationPreview = calcManureN2O(
    livestockRows,
    watchedRows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: row.method,
      regionalEmissionFactor: row.regionalEmissionFactor,
      managementSystem: row.managementSystem?.trim()
        ? row.managementSystem.trim()
        : undefined,
      sharePercent: row.sharePercent,
      nexKgNPerHeadYear: row.nexKgNPerHeadYear,
      ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
      parameterSourceType: row.parameterSourceType,
      parameterSourceLabel: row.parameterSourceLabel,
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }))
  );

  const groupedIndexes = useMemo(() => {
    return livestockRows.map((_, sourceIndex) =>
      watchedRows
        .map((row, index) => ({ row, index }))
        .filter((item) => item.row.sourceLivestockIndex === sourceIndex)
        .map((item) => item.index)
    );
  }, [livestockRows, watchedRows]);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const errorClass = "mt-2 text-sm text-red-600";

  const replaceRowsForSource = (
    sourceIndex: number,
    nextRowsForSource: ManureN2OFormValues["rows"]
  ) => {
    const otherRows = watchedRows.filter(
      (row) => row.sourceLivestockIndex !== sourceIndex
    );

    const nextRows = [...otherRows, ...nextRowsForSource].sort((a, b) => {
      if (a.sourceLivestockIndex !== b.sourceLivestockIndex) {
        return a.sourceLivestockIndex - b.sourceLivestockIndex;
      }
      return 0;
    });

    reset({ rows: nextRows });
  };

  const switchGroupToRegional = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;

    const nextRow = createRegionalRow(
      livestockRow,
      sourceIndex,
      standardVersion,
      projectRegion
    );

    replaceRowsForSource(sourceIndex, [nextRow]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已切换为推荐因子法。`);
  };

  const switchGroupToParameter = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;

    const currentGroup = watchedRows.filter(
      (row) => row.sourceLivestockIndex === sourceIndex
    );
    const currentParameterRows = currentGroup.filter(
      (row) => row.method === "parameterCalculation"
    );

    if (currentParameterRows.length > 0) {
      replaceRowsForSource(sourceIndex, currentParameterRows);
      setStatusMessage(`第 ${sourceIndex + 1} 个畜种已切换为参数法。`);
      return;
    }

    replaceRowsForSource(sourceIndex, [createParameterRow(livestockRow, sourceIndex)]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已切换为参数法。`);
  };

  const addParameterPathForSource = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;

    const currentGroup = watchedRows.filter(
      (row) => row.sourceLivestockIndex === sourceIndex
    );
    const parameterRows = currentGroup.filter(
      (row) => row.method === "parameterCalculation"
    );

    const nextRowsForSource = [
      ...parameterRows,
      createParameterRow(livestockRow, sourceIndex),
    ];

    replaceRowsForSource(sourceIndex, nextRowsForSource);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已新增一条参数法路径。`);
  };

  const removeParameterPath = (sourceIndex: number, rowIndex: number) => {
    const currentGroup = watchedRows.filter(
      (row) => row.sourceLivestockIndex === sourceIndex
    );
    const parameterRows = currentGroup.filter(
      (row) => row.method === "parameterCalculation"
    );

    if (parameterRows.length <= 1) {
      setStatusMessage("至少保留一条参数法路径，或切换到推荐因子法。");
      return;
    }

    const nextRowsForSource = currentGroup.filter((_, index) => {
      const originalIndex = groupedIndexes[sourceIndex][index];
      return originalIndex !== rowIndex;
    });

    replaceRowsForSource(sourceIndex, nextRowsForSource);
    setStatusMessage(`已删除第 ${sourceIndex + 1} 个畜种的一条参数法路径。`);
  };

  const applyRegionalDefaultForSource = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;

    const matched = getRegionalDirectN2OFactor(
      standardVersion,
      projectRegion,
      livestockRow.species
    );

    if (!matched) {
      setStatusMessage(
        `第 ${sourceIndex + 1} 个畜种未匹配到区域化推荐因子，请检查地区或动物类别。`
      );
      return;
    }

    const nextRow = createRegionalRow(
      livestockRow,
      sourceIndex,
      standardVersion,
      projectRegion
    );

    replaceRowsForSource(sourceIndex, [nextRow]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已带入表 C.10 推荐因子。`);
  };

  const applyParameterDefaultForRow = (rowIndex: number) => {
    const row = watchedRows[rowIndex];
    if (!row) return;

    const matched = getManureN2ODefaultFactor(
      standardVersion,
      row.species,
      row.managementSystem || ""
    );

    if (!matched) {
      setStatusMessage(
        `第 ${rowIndex + 1} 条路径未匹配到参数法默认值，请先选择标准化管理方式。`
      );
      return;
    }

    setValue(`rows.${rowIndex}.method`, "parameterCalculation", {
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.regionalEmissionFactor`, undefined, {
      shouldValidate: false,
    });
    setValue(`rows.${rowIndex}.nexKgNPerHeadYear`, matched.nexKgNPerHeadYear, {
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.ef3KgN2ONPerKgN`, matched.ef3KgN2ONPerKgN, {
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.parameterSourceType`, "default_library", {
      shouldValidate: true,
    });
    setValue(
      `rows.${rowIndex}.parameterSourceLabel`,
      `${standardVersion} ${matched.sourceLabel}`,
      {
        shouldValidate: true,
      }
    );
    setValue(
      `rows.${rowIndex}.notes`,
      mergeNote(
        watchedRows[rowIndex]?.notes,
        `参数法默认值已带入：${matched.note}`
      ),
      { shouldValidate: true }
    );

    setStatusMessage(`第 ${rowIndex + 1} 条路径已带入参数法默认值。`);
  };

  const fillManagementSystemPreset = (rowIndex: number, label: string) => {
    setValue(`rows.${rowIndex}.managementSystem`, label, {
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.parameterSourceType`, "manual_input", {
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.parameterSourceLabel`, "手工选择管理方式", {
      shouldValidate: true,
    });
  };

  const markRowManual = (rowIndex: number, label: string) => {
    setValue(`rows.${rowIndex}.parameterSourceType`, "manual_input", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`rows.${rowIndex}.parameterSourceLabel`, label, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = (values: ManureN2OFormValues) => {
    const rows: ManureN2ORecord[] = values.rows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species.trim(),
      stage: row.stage.trim(),
      method: row.method,
      regionalEmissionFactor: row.regionalEmissionFactor,
      managementSystem: row.managementSystem?.trim()
        ? row.managementSystem.trim()
        : undefined,
      sharePercent: row.sharePercent,
      nexKgNPerHeadYear: row.nexKgNPerHeadYear,
      ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
      parameterSourceType: row.parameterSourceType,
      parameterSourceLabel: row.parameterSourceLabel,
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
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Manure N2O</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              粪污管理 N2O
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"} · 标准版本：{standardVersion}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              地区：{projectRegion || "未填写"} · 区域组：{regionGroup}
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
            <div className="mb-4">
              <h2 className="text-lg font-semibold">1. 推荐因子法 / 参数法</h2>
              <p className="mt-2 text-sm text-slate-600">
                这一轮把养殖活动页里的扩展活动数据贯通到 manure N2O。参数法仍沿用 C.8/C.9，但页面会显示当前群体的 DMI、体重、饲养方式和群体类型，作为后续接 Nex 自动估算的准备数据。
              </p>
            </div>

            <div className="space-y-8">
              {livestockRows.map((livestockRow, sourceIndex) => {
                const rowIndexes = groupedIndexes[sourceIndex] ?? [];
                const groupRows = rowIndexes.map((index) => watchedRows[index]);
                const primaryRow = groupRows[0];
                const mode =
                  groupRows.some((row) => row?.method === "parameterCalculation")
                    ? "parameterCalculation"
                    : "regionalDefaultEF";

                const parameterRows = rowIndexes.filter(
                  (index) => watchedRows[index]?.method === "parameterCalculation"
                );

                const shareTotal = parameterRows.reduce(
                  (sum, index) => sum + safeNumber(watchedRows[index]?.sharePercent),
                  0
                );

                const groupPreview = calculationPreview.groups.find(
                  (item) => item.sourceLivestockIndex === sourceIndex
                );

                const livestockDmi = getLivestockDmiValue(livestockRow);

                return (
                  <div
                    key={`${livestockRow.species}-${livestockRow.stage}-${sourceIndex}`}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">
                          畜种 {sourceIndex + 1}：{livestockRow.species} / {livestockRow.stage}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          年平均存栏：{fmt(groupPreview?.annualAverageHead)}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => switchGroupToRegional(sourceIndex)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          切到推荐因子法
                        </button>
                        <button
                          type="button"
                          onClick={() => switchGroupToParameter(sourceIndex)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          切到参数法
                        </button>
                      </div>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className={readonlyClass}>畜种：{livestockRow.species}</div>
                      <div className={readonlyClass}>阶段：{livestockRow.stage}</div>
                      <div className={readonlyClass}>
                        当前路径：
                        {mode === "regionalDefaultEF" ? "推荐因子法" : "参数法"}
                      </div>
                      <div className={readonlyClass}>
                        该畜种 N2O：
                        {fmt(groupPreview?.totalN2OTPerYear)} t/yr
                      </div>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className={readonlyClass}>
                        生产功能：{livestockRow.productionPurpose ?? "未填"}
                      </div>
                      <div className={readonlyClass}>
                        群体类型：{livestockRow.populationMode ?? "未填"}
                      </div>
                      <div className={readonlyClass}>
                        饲养方式：{livestockRow.feedingSituation ?? "未填"}
                      </div>
                      <div className={readonlyClass}>
                        DMI来源：{getLivestockDmiSourceLabel(livestockRow)}
                      </div>
                      <div className={readonlyClass}>
                        当前DMI：{livestockDmi !== undefined ? `${fmt(livestockDmi, 4)} kg DM/头·日` : "未提供"}
                      </div>
                      <div className={readonlyClass}>
                        期初体重：{livestockRow.openingWeightKg !== undefined ? `${fmt(livestockRow.openingWeightKg)} kg` : "未填"}
                      </div>
                      <div className={readonlyClass}>
                        期末体重：{livestockRow.closingWeightKg !== undefined ? `${fmt(livestockRow.closingWeightKg)} kg` : "未填"}
                      </div>
                      <div className={readonlyClass}>
                        日增重：{livestockRow.averageDailyGainKg !== undefined ? `${fmt(livestockRow.averageDailyGainKg, 4)} kg/d` : "未填"}
                      </div>
                    </div>

                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      这一步先把活动数据贯通到 manure N2O 页面。下一轮如果你愿意，我可以继续把 Nex 的自动估算口径接上：让参数法在有 DMI / 体重 / 群体信息时，优先给出“估算值 + 可手工覆盖”的模式。
                    </div>

                    {mode === "regionalDefaultEF" && primaryRow ? (
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              区域化推荐因子路径
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              来源标签：{primaryRow.parameterSourceLabel}
                            </p>
                          </div>
                          <span className={sourceBadgeClass(primaryRow.parameterSourceType)}>
                            {getParameterSourceDisplay(primaryRow.parameterSourceType)}
                          </span>
                        </div>

                        <input
                          type="hidden"
                          {...register(`rows.${rowIndexes[0]}.sourceLivestockIndex`, {
                            valueAsNumber: true,
                          })}
                        />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.species`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.stage`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.method`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.parameterSourceType`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.parameterSourceLabel`)} />

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className={readonlyClass}>地区：{projectRegion || "-"}</div>
                          <div className={readonlyClass}>区域组：{regionGroup}</div>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              区域化推荐因子（kg N2O/头·年）
                            </span>
                            <input
                              type="number"
                              step="any"
                              {...register(`rows.${rowIndexes[0]}.regionalEmissionFactor`, {
                                valueAsNumber: true,
                                onChange: () =>
                                  markRowManual(rowIndexes[0], "手工覆盖表 C.10 推荐因子"),
                              })}
                              className={inputClass}
                            />
                            {errors.rows?.[rowIndexes[0]]?.regionalEmissionFactor?.message ? (
                              <p className={errorClass}>
                                {String(
                                  errors.rows[rowIndexes[0]]?.regionalEmissionFactor?.message
                                )}
                              </p>
                            ) : null}
                          </label>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => applyRegionalDefaultForSource(sourceIndex)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              带入表 C.10 推荐因子
                            </button>
                          </div>
                        </div>

                        <label className="mt-4 block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            备注
                          </span>
                          <textarea
                            {...register(`rows.${rowIndexes[0]}.notes`, {
                              onChange: () =>
                                markRowManual(rowIndexes[0], "手工补充说明"),
                            })}
                            rows={3}
                            className={inputClass}
                          />
                        </label>
                      </div>
                    ) : null}

                    {mode === "parameterCalculation" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm text-slate-700">
                            参数法当前占比合计：{fmt(shareTotal, 2)}%
                            {Math.abs(shareTotal - 100) < 0.5 ? (
                              <span className="ml-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                已闭合
                              </span>
                            ) : (
                              <span className="ml-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                未到 100%
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => addParameterPathForSource(sourceIndex)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          >
                            新增管理方式路径
                          </button>
                        </div>

                        {parameterRows.map((rowIndex, pathIndex) => {
                          const row = watchedRows[rowIndex];

                          return (
                            <div
                              key={fields[rowIndex]?.id ?? `${sourceIndex}-${pathIndex}`}
                              className="rounded-2xl border border-slate-200 p-4"
                            >
                              <div className="mb-4 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    参数路径 {pathIndex + 1}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    来源标签：{row?.parameterSourceLabel}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={sourceBadgeClass(row?.parameterSourceType ?? "manual_input")}>
                                    {getParameterSourceDisplay(row?.parameterSourceType ?? "manual_input")}
                                  </span>

                                  {parameterRows.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeParameterPath(sourceIndex, rowIndex)
                                      }
                                      className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      删除路径
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              <input
                                type="hidden"
                                {...register(`rows.${rowIndex}.sourceLivestockIndex`, {
                                  valueAsNumber: true,
                                })}
                              />
                              <input type="hidden" {...register(`rows.${rowIndex}.species`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.stage`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.method`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.parameterSourceType`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.parameterSourceLabel`)} />

                              <div className="mb-4 flex flex-wrap gap-2">
                                {commonManagementSystemPresets.map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                      fillManagementSystemPreset(rowIndex, preset.label)
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
                                    管理方式
                                  </span>
                                  <input
                                    {...register(`rows.${rowIndex}.managementSystem`, {
                                      onChange: () =>
                                        markRowManual(rowIndex, "手工修改参数法路径"),
                                    })}
                                    className={inputClass}
                                    placeholder="例如：固体贮存"
                                  />
                                  {errors.rows?.[rowIndex]?.managementSystem?.message ? (
                                    <p className={errorClass}>
                                      {String(errors.rows[rowIndex]?.managementSystem?.message)}
                                    </p>
                                  ) : null}
                                </label>

                                <label className="block">
                                  <span className="mb-2 block text-sm font-medium text-slate-700">
                                    占比（%）
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    {...register(`rows.${rowIndex}.sharePercent`, {
                                      valueAsNumber: true,
                                      onChange: () =>
                                        markRowManual(rowIndex, "手工修改参数法路径"),
                                    })}
                                    className={inputClass}
                                  />
                                  {errors.rows?.[rowIndex]?.sharePercent?.message ? (
                                    <p className={errorClass}>
                                      {String(errors.rows[rowIndex]?.sharePercent?.message)}
                                    </p>
                                  ) : null}
                                </label>

                                <label className="block">
                                  <span className="mb-2 block text-sm font-medium text-slate-700">
                                    Nex（kg N/头·年）
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    {...register(`rows.${rowIndex}.nexKgNPerHeadYear`, {
                                      valueAsNumber: true,
                                      onChange: () =>
                                        markRowManual(rowIndex, "手工修改参数法路径"),
                                    })}
                                    className={inputClass}
                                  />
                                  {errors.rows?.[rowIndex]?.nexKgNPerHeadYear?.message ? (
                                    <p className={errorClass}>
                                      {String(errors.rows[rowIndex]?.nexKgNPerHeadYear?.message)}
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
                                    {...register(`rows.${rowIndex}.ef3KgN2ONPerKgN`, {
                                      valueAsNumber: true,
                                      onChange: () =>
                                        markRowManual(rowIndex, "手工修改参数法路径"),
                                    })}
                                    className={inputClass}
                                  />
                                  {errors.rows?.[rowIndex]?.ef3KgN2ONPerKgN?.message ? (
                                    <p className={errorClass}>
                                      {String(errors.rows[rowIndex]?.ef3KgN2ONPerKgN?.message)}
                                    </p>
                                  ) : null}
                                </label>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => applyParameterDefaultForRow(rowIndex)}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  带入 C.8/C.9 参数法默认值
                                </button>
                              </div>

                              <label className="mt-4 block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                  备注
                                </span>
                                <textarea
                                  {...register(`rows.${rowIndex}.notes`, {
                                    onChange: () =>
                                      markRowManual(rowIndex, "手工补充说明"),
                                  })}
                                  rows={3}
                                  className={inputClass}
                                  placeholder="可填写参数来源、路径选择说明等"
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">2. 汇总预览</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>当前地区：{projectRegion || "-"}；区域组：{regionGroup}</p>
              <p>
                当前年度 N2O 预览总量：
                {fmt(calculationPreview.totalN2OTPerYear)} t N2O/yr
              </p>
              <p>这里的动物/阶段始终跟随养殖活动页同步；同时已把 DMI、体重、饲养方式等活动数据贯通到本页，作为后续 Nex 自动估算的准备数据。</p>
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
                    <th className="border-b border-slate-200 px-3 py-2">合计因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">t N2O/yr</th>
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
                        {fmt(group.shareTotalPercent, 2)}
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
                        {fmt(group.emissionFactorKgN2OPerHeadYear)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(group.totalN2OTPerYear)}
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
                    <th className="border-b border-slate-200 px-3 py-2">方法</th>
                    <th className="border-b border-slate-200 px-3 py-2">管理方式</th>
                    <th className="border-b border-slate-200 px-3 py-2">占比</th>
                    <th className="border-b border-slate-200 px-3 py-2">区域推荐因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">Nex</th>
                    <th className="border-b border-slate-200 px-3 py-2">EF3</th>
                    <th className="border-b border-slate-200 px-3 py-2">管理氮量</th>
                    <th className="border-b border-slate-200 px-3 py-2">合成因子</th>
                    <th className="border-b border-slate-200 px-3 py-2">t N2O/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationPreview.rows.map((row, index) => (
                    <tr key={`${row.species}-${row.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">{row.species}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.stage}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{row.method}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.managementSystem || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.sharePercent, 2)}%
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.regionalEmissionFactor)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.nexKgNPerHeadYear)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.ef3KgN2ONPerKgN, 4)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.managedNitrogenKgPerYear, 2)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.emissionFactorKgN2OPerHeadYear)} kg/head/yr
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(row.rowN2OTPerYear)}
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