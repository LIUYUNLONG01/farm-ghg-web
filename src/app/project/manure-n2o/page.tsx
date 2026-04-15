'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcManureN2O } from "@/lib/calculators/manureN2O";
import {
  manureN2OSchema,
  type ManureN2OFormInput,
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

// ── helpers ────────────────────────────────────────────────────────────────
function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function toOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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
  if (sourceType === "default_library") return "rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700";
  if (sourceType === "preset_template") return "rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700";
  return "rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700";
}
function getLivestockDmiSourceLabel(row: LivestockRecord): string {
  switch (row.dmiMethod) {
    case "direct_input": return "直接录入 DMI";
    case "feed_ledger": return "按饲料台账反推 DMI";
    case "temporary_estimate": return "经验值/台账估计";
    case "model_nema_placeholder": return "预留 NEma 模型估算";
    case "model_de_placeholder": return "预留 DE% 模型估算";
    default: return "未提供";
  }
}
function getLivestockDmiValue(row: LivestockRecord): number | undefined {
  const dmi = safeNumber(row.dmiKgPerHeadDay);
  return dmi > 0 ? dmi : undefined;
}

function createRegionalRow(row: LivestockRecord, index: number, standardVersion: StandardVersion, projectRegion: string) {
  const regional = getRegionalDirectN2OFactor(standardVersion, projectRegion, row.species);
  return {
    sourceLivestockIndex: index,
    species: row.species, stage: row.stage,
    method: "regionalDefaultEF" as const,
    regionalEmissionFactor: regional?.emissionFactor ?? 0,
    managementSystem: "", sharePercent: 100,
    nexKgNPerHeadYear: 0, ef3KgN2ONPerKgN: 0,
    ef3VolatilizationKgN2ONPerKgN: undefined,
    fracGasMS: undefined,
    ef3LeachingKgN2ONPerKgN: undefined,
    fracLeachMS: undefined,
    parameterSourceType: regional ? ("default_library" as const) : ("manual_input" as const),
    parameterSourceLabel: regional ? `...` : "待选择推荐因子或参数法",
    notes: regional ? `...` : "",
  };
}

function createParameterRow(row: LivestockRecord, index: number) {
  return {
    sourceLivestockIndex: index,
    species: row.species, stage: row.stage,
    method: "parameterCalculation" as const,
    regionalEmissionFactor: undefined,
    managementSystem: "", sharePercent: 0,
    nexKgNPerHeadYear: 0, ef3KgN2ONPerKgN: 0,
    ef3VolatilizationKgN2ONPerKgN: undefined,
    fracGasMS: undefined,
    ef3LeachingKgN2ONPerKgN: undefined,
    fracLeachMS: undefined,
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
    sourceLivestockIndex: number; species: string; stage: string;
    method: "regionalDefaultEF" | "parameterCalculation";
    regionalEmissionFactor?: number; managementSystem: string;
    sharePercent: number; nexKgNPerHeadYear: number; ef3KgN2ONPerKgN: number;
    parameterSourceType: "default_library" | "manual_input" | "preset_template";
    parameterSourceLabel: string; notes: string;
  }> = [];

  livestockRows.forEach((livestockRow, sourceIndex) => {
    const rowsForSource = existingRows.filter((item) => item.sourceLivestockIndex === sourceIndex);

    if (rowsForSource.length === 0) {
      nextRows.push(createRegionalRow(livestockRow, sourceIndex, standardVersion, projectRegion));
      return;
    }

    const parameterRows = rowsForSource.filter((item) => item.method === "parameterCalculation");

    if (parameterRows.length > 0) {
      parameterRows.forEach((row) => {
        const shouldRefreshDefaults = row.parameterSourceType === "default_library" && row.managementSystem && row.managementSystem.trim() !== "";
        if (shouldRefreshDefaults) {
          const matched = getManureN2ODefaultFactor(standardVersion, livestockRow.species, row.managementSystem ?? "");
          if (matched) {
            nextRows.push({
              sourceLivestockIndex: sourceIndex,
              species: livestockRow.species, stage: livestockRow.stage,
              method: "parameterCalculation",
              regionalEmissionFactor: undefined,
              managementSystem: row.managementSystem ?? "",
              sharePercent: row.sharePercent ?? 0,
              nexKgNPerHeadYear: matched.nexKgNPerHeadYear,
              ef3KgN2ONPerKgN: matched.ef3KgN2ONPerKgN,
              parameterSourceType: "default_library",
              parameterSourceLabel: `${standardVersion} ${matched.sourceLabel}`,
              notes: mergeNote(row.notes, `参数法默认值已按当前养殖活动口径重新同步：${matched.note}`),
            });
            return;
          }
        }
        nextRows.push({
          sourceLivestockIndex: sourceIndex,
          species: livestockRow.species, stage: livestockRow.stage,
          method: "parameterCalculation",
          regionalEmissionFactor: undefined,
          managementSystem: row.managementSystem ?? "",
          sharePercent: row.sharePercent ?? 0,
          nexKgNPerHeadYear: row.nexKgNPerHeadYear ?? 0,
          ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN ?? 0,
          parameterSourceType: row.parameterSourceType ?? "manual_input",
          parameterSourceLabel: row.parameterSourceLabel ?? "参数法：待带入默认值或手工填写",
          notes: row.notes ?? "",
        });
      });
      return;
    }

    const regionalRow = rowsForSource[0];
    const shouldRefreshDefault = regionalRow.parameterSourceType === "default_library";
    const regional = shouldRefreshDefault ? getRegionalDirectN2OFactor(standardVersion, projectRegion, livestockRow.species) : null;

    nextRows.push({
      sourceLivestockIndex: sourceIndex,
      species: livestockRow.species, stage: livestockRow.stage,
      method: "regionalDefaultEF",
      regionalEmissionFactor: shouldRefreshDefault ? regional?.emissionFactor ?? 0 : regionalRow.regionalEmissionFactor ?? 0,
      managementSystem: "", sharePercent: 100, nexKgNPerHeadYear: 0, ef3KgN2ONPerKgN: 0,
      parameterSourceType: shouldRefreshDefault ? (regional ? "default_library" : "manual_input") : regionalRow.parameterSourceType ?? "manual_input",
      parameterSourceLabel: shouldRefreshDefault
        ? (regional ? `${standardVersion} 表C.10：${regional.regionGroup} / ${livestockRow.species}` : "未匹配区域化推荐因子，需手动填写")
        : regionalRow.parameterSourceLabel ?? "手工输入",
      notes: shouldRefreshDefault
        ? (regional ? mergeNote(regionalRow.notes, `表C.10 区域化推荐因子已按当前养殖活动口径重新同步：${regional.regionGroup} / ${livestockRow.species}`) : regionalRow.notes ?? "")
        : regionalRow.notes ?? "",
    });
  });

  return nextRows;
}

// ── component ──────────────────────────────────────────────────────────────
export default function ManureN2OPage() {
  const [projectName, setProjectName] = useState("");
  const [standardVersion, setStandardVersion] = useState<StandardVersion>("NYT4243_2022");
  const [projectRegion, setProjectRegion] = useState("");
  const [regionGroup, setRegionGroup] = useState<string>("未识别");
  const [statusMessage, setStatusMessage] = useState("");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<ManureN2OFormInput, unknown, ManureN2OFormValues>({
      resolver: zodResolver(manureN2OSchema),
      defaultValues: { rows: [] },
    });

  const { fields } = useFieldArray({ control, name: "rows" });
  const watchedRows = watch("rows") ?? [];

  useEffect(() => {
    (async () => {
    const draft = await loadProjectDraft();
    if (!draft) return;
    const livestock = draft.livestock ?? [];
    const manureDraft = draft.manureN2O ?? [];
    setProjectName(draft.base.enterpriseName || "未命名项目");
    setStandardVersion(draft.base.standardVersion);
    setProjectRegion(draft.base.region || "");
    setRegionGroup(resolveRegionGroup(draft.base.region || "") ?? "未识别");
    setLivestockRows(livestock);
    const syncedRows = syncRowsWithLivestock(livestock, manureDraft, draft.base.standardVersion, draft.base.region || "");
    reset({ rows: syncedRows.map((row) => ({ ...row })) });
    setStatusMessage(manureDraft.length > 0
      ? "已加载粪污管理 N₂O 草稿，并按当前养殖活动数据重新同步了畜种和阶段。"
      : "已按当前地区初始化粪污管理 N₂O 模块。"
    );
    })();
  }, [reset]);

  const calculationPreview = calcManureN2O(
    livestockRows,
    watchedRows.map((row): ManureN2ORecord => ({
      sourceLivestockIndex: safeNumber(row.sourceLivestockIndex),
      species: row.species ?? "", stage: row.stage ?? "",
      method: row.method,
      regionalEmissionFactor: toOptionalNumber(row.regionalEmissionFactor),
      managementSystem: row.managementSystem?.trim() ? row.managementSystem.trim() : undefined,
      sharePercent: toOptionalNumber(row.sharePercent),
      nexKgNPerHeadYear: toOptionalNumber(row.nexKgNPerHeadYear),
      ef3KgN2ONPerKgN: toOptionalNumber(row.ef3KgN2ONPerKgN),
      parameterSourceType: row.parameterSourceType ?? "manual_input",
      parameterSourceLabel: row.parameterSourceLabel ?? "手工输入",
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }))
  );

  const groupedIndexes = useMemo(() => {
    return livestockRows.map((_, sourceIndex) =>
      watchedRows.map((row, index) => ({ row, index }))
        .filter((item) => item.row.sourceLivestockIndex === sourceIndex)
        .map((item) => item.index)
    );
  }, [livestockRows, watchedRows]);

  // ── style tokens ──────────────────────────────────────────────────────────
  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const readonlyClass = "w-full rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-900 font-medium";
  const errorClass = "mt-1.5 text-xs text-red-500";

  // ── handlers ──────────────────────────────────────────────────────────────
  const replaceRowsForSource = (sourceIndex: number, nextRowsForSource: ManureN2OFormInput["rows"]) => {
    const otherRows = watchedRows.filter((row) => row.sourceLivestockIndex !== sourceIndex);
    const nextRows = [...otherRows, ...nextRowsForSource].sort((a, b) => safeNumber(a.sourceLivestockIndex) - safeNumber(b.sourceLivestockIndex));
    reset({ rows: nextRows });
  };

  const switchGroupToRegional = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;
    replaceRowsForSource(sourceIndex, [createRegionalRow(livestockRow, sourceIndex, standardVersion, projectRegion)]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已切换为推荐因子法。`);
  };

  const switchGroupToParameter = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;
    const currentGroup = watchedRows.filter((row) => row.sourceLivestockIndex === sourceIndex);
    const currentParameterRows = currentGroup.filter((row) => row.method === "parameterCalculation");
    if (currentParameterRows.length > 0) {
      replaceRowsForSource(sourceIndex, currentParameterRows);
    } else {
      replaceRowsForSource(sourceIndex, [createParameterRow(livestockRow, sourceIndex)]);
    }
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已切换为参数法。`);
  };

  const addParameterPathForSource = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;
    const currentGroup = watchedRows.filter((row) => row.sourceLivestockIndex === sourceIndex);
    const parameterRows = currentGroup.filter((row) => row.method === "parameterCalculation");
    replaceRowsForSource(sourceIndex, [...parameterRows, createParameterRow(livestockRow, sourceIndex)]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已新增一条参数法路径。`);
  };

  const removeParameterPath = (sourceIndex: number, rowIndex: number) => {
    const currentGroup = watchedRows.filter((row) => row.sourceLivestockIndex === sourceIndex);
    const parameterRows = currentGroup.filter((row) => row.method === "parameterCalculation");
    if (parameterRows.length <= 1) { setStatusMessage("至少保留一条参数法路径，或切换到推荐因子法。"); return; }
    const nextRowsForSource = currentGroup.filter((_, index) => groupedIndexes[sourceIndex][index] !== rowIndex);
    replaceRowsForSource(sourceIndex, nextRowsForSource);
    setStatusMessage(`已删除第 ${sourceIndex + 1} 个畜种的一条参数法路径。`);
  };

  const applyRegionalDefaultForSource = (sourceIndex: number) => {
    const livestockRow = livestockRows[sourceIndex];
    if (!livestockRow) return;
    const matched = getRegionalDirectN2OFactor(standardVersion, projectRegion, livestockRow.species);
    if (!matched) { setStatusMessage(`第 ${sourceIndex + 1} 个畜种未匹配到区域化推荐因子，请检查地区或动物类别。`); return; }
    replaceRowsForSource(sourceIndex, [createRegionalRow(livestockRow, sourceIndex, standardVersion, projectRegion)]);
    setStatusMessage(`第 ${sourceIndex + 1} 个畜种已带入表 C.10 推荐因子。`);
  };

  const applyParameterDefaultForRow = (rowIndex: number) => {
    const row = watchedRows[rowIndex];
    if (!row) return;
    const matched = getManureN2ODefaultFactor(standardVersion, row.species, row.managementSystem || "");
    if (!matched) { setStatusMessage(`第 ${rowIndex + 1} 条路径未匹配到参数法默认值，请先选择标准化管理方式。`); return; }
    setValue(`rows.${rowIndex}.method`, "parameterCalculation", { shouldValidate: true });
    setValue(`rows.${rowIndex}.regionalEmissionFactor`, undefined, { shouldValidate: false });
    setValue(`rows.${rowIndex}.nexKgNPerHeadYear`, matched.nexKgNPerHeadYear, { shouldValidate: true });
    setValue(`rows.${rowIndex}.ef3KgN2ONPerKgN`, matched.ef3KgN2ONPerKgN, { shouldValidate: true });
    setValue(`rows.${rowIndex}.parameterSourceType`, "default_library", { shouldValidate: true });
    setValue(`rows.${rowIndex}.parameterSourceLabel`, `${standardVersion} ${matched.sourceLabel}`, { shouldValidate: true });
    setValue(`rows.${rowIndex}.notes`, mergeNote(watchedRows[rowIndex]?.notes, `参数法默认值已带入：${matched.note}`), { shouldValidate: true });
    setStatusMessage(`第 ${rowIndex + 1} 条路径已带入参数法默认值。`);
  };

  const fillManagementSystemPreset = (rowIndex: number, label: string) => {
    setValue(`rows.${rowIndex}.managementSystem`, label, { shouldValidate: true });
    setValue(`rows.${rowIndex}.parameterSourceType`, "manual_input", { shouldValidate: true });
    setValue(`rows.${rowIndex}.parameterSourceLabel`, "手工选择管理方式", { shouldValidate: true });
  };

  const markRowManual = (rowIndex: number, label: string) => {
    setValue(`rows.${rowIndex}.parameterSourceType`, "manual_input", { shouldDirty: true, shouldValidate: true });
    setValue(`rows.${rowIndex}.parameterSourceLabel`, label, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (values: ManureN2OFormValues) => {
    const rows: ManureN2ORecord[] = values.rows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species.trim(), stage: row.stage.trim(),
      method: row.method,
      regionalEmissionFactor: row.regionalEmissionFactor,
      managementSystem: row.managementSystem?.trim() ? row.managementSystem.trim() : undefined,
      sharePercent: row.sharePercent,
      nexKgNPerHeadYear: row.nexKgNPerHeadYear,
      ef3KgN2ONPerKgN: row.ef3KgN2ONPerKgN,
      parameterSourceType: row.parameterSourceType,
      parameterSourceLabel: row.parameterSourceLabel,
      notes: row.notes.trim() ? row.notes.trim() : undefined,
    }));
    saveManureN2ODraft(rows);
    setStatusMessage("已保存粪污管理 N₂O 草稿。");
  };

  // ── empty state ────────────────────────────────────────────────────────────
  if (livestockRows.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900">还没有养殖活动数据</h1>
            <p className="mt-3 text-sm text-gray-500 leading-7">先完成「基础信息」和「养殖活动数据」这两步，再进入粪污管理 N₂O 模块。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/project/new" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">回到基础信息</Link>
              <Link href="/project/livestock" className="px-5 py-2.5 rounded-xl border border-green-100 text-green-800 text-sm font-medium hover:bg-green-50 transition">去录入养殖活动</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── main render ────────────────────────────────────────────────────────────
  const autoSaveStatus = useAutoSave(
    watchedRows,
    async () => {
      await saveManureN2ODraft(watchedRows as ManureN2ORecord[]);
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
        <div className="flex items-center gap-2">
          <AutoSaveIndicator status={autoSaveStatus} />
          <Link href="/project/manure-ch4" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回粪污管理 CH₄</Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            Manure N₂O
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">粪污管理 N₂O</h1>
          <p className="mt-2 text-sm text-gray-400">
            当前项目：{projectName || "未命名项目"} · 标准版本：{standardVersion}
            · 地区：{projectRegion || "未填写"} · 区域组：{regionGroup}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* SECTION 1 */}
          <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
            <div className="p-6 border-b border-green-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                推荐因子法 / 参数法
              </h2>
              <p className="mt-1 text-xs text-gray-400 leading-6 max-w-2xl">
                参数法沿用 C.8/C.9，页面会显示当前群体的 DMI、体重、饲养方式和群体类型，作为后续接 Nex 自动估算的准备数据。
              </p>
            </div>

            <div className="divide-y divide-green-50">
              {livestockRows.map((livestockRow, sourceIndex) => {
                const rowIndexes = groupedIndexes[sourceIndex] ?? [];
                const groupRows = rowIndexes.map((index) => watchedRows[index]);
                const primaryRow = groupRows[0];
                const mode = groupRows.some((row) => row?.method === "parameterCalculation") ? "parameterCalculation" : "regionalDefaultEF";
                const parameterRows = rowIndexes.filter((index) => watchedRows[index]?.method === "parameterCalculation");
                const shareTotal = parameterRows.reduce((sum, index) => sum + safeNumber(watchedRows[index]?.sharePercent), 0);
                const groupPreview = calculationPreview.groups.find((item) => item.sourceLivestockIndex === sourceIndex);
                const livestockDmi = getLivestockDmiValue(livestockRow);

                return (
                  <div key={`${livestockRow.species}-${livestockRow.stage}-${sourceIndex}`} className="p-6">

                    {/* group header */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-7 h-7 rounded-full border-2 border-green-200 text-green-700 text-xs font-bold flex items-center justify-center">{sourceIndex + 1}</span>
                          <h3 className="text-sm font-semibold text-gray-800">{livestockRow.species} / {livestockRow.stage}</h3>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${mode === "regionalDefaultEF" ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                            {mode === "regionalDefaultEF" ? "推荐因子法" : "参数法"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 pl-9">
                          年平均存栏：{fmt(groupPreview?.annualAverageHead)} · 该畜种 N₂O：{fmt(groupPreview?.totalN2OTPerYear)} t/yr
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button type="button" onClick={() => switchGroupToRegional(sourceIndex)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-white hover:bg-green-50 transition">切到推荐因子法</button>
                        <button type="button" onClick={() => switchGroupToParameter(sourceIndex)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition">切到参数法</button>
                      </div>
                    </div>

                    {/* activity data summary */}
                    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className={readonlyClass}>畜种：{livestockRow.species}</div>
                      <div className={readonlyClass}>阶段：{livestockRow.stage}</div>
                      <div className={readonlyClass}>生产功能：{livestockRow.productionPurpose ?? "未填"}</div>
                      <div className={readonlyClass}>群体类型：{livestockRow.populationMode ?? "未填"}</div>
                      <div className={readonlyClass}>饲养方式：{livestockRow.feedingSituation ?? "未填"}</div>
                      <div className={readonlyClass}>DMI 来源：{getLivestockDmiSourceLabel(livestockRow)}</div>
                      <div className={readonlyClass}>当前 DMI：{livestockDmi !== undefined ? `${fmt(livestockDmi, 4)} kg DM/头·日` : "未提供"}</div>
                      <div className={readonlyClass}>期初体重：{livestockRow.openingWeightKg !== undefined ? `${fmt(livestockRow.openingWeightKg)} kg` : "未填"}</div>
                      <div className={readonlyClass}>期末体重：{livestockRow.closingWeightKg !== undefined ? `${fmt(livestockRow.closingWeightKg)} kg` : "未填"}</div>
                      <div className={readonlyClass}>日增重：{livestockRow.averageDailyGainKg !== undefined ? `${fmt(livestockRow.averageDailyGainKg, 4)} kg/d` : "未填"}</div>
                    </div>

                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-6">
                      活动数据已从养殖活动页贯通到本页。下一轮可继续把 Nex 自动估算接上：在有 DMI / 体重 / 群体信息时优先给出「估算值 + 可手工覆盖」模式。
                    </div>

                    {/* regional EF mode */}
                    {mode === "regionalDefaultEF" && primaryRow ? (
                      <div className="rounded-xl border border-green-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">区域化推荐因子路径</p>
                            <p className="mt-0.5 text-xs text-gray-400">{primaryRow.parameterSourceLabel}</p>
                          </div>
                          <span className={sourceBadgeClass(primaryRow.parameterSourceType ?? "manual_input")}>
                            {getParameterSourceDisplay(primaryRow.parameterSourceType ?? "manual_input")}
                          </span>
                        </div>

                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.sourceLivestockIndex`, { valueAsNumber: true })} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.species`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.stage`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.method`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.parameterSourceType`)} />
                        <input type="hidden" {...register(`rows.${rowIndexes[0]}.parameterSourceLabel`)} />

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className={readonlyClass}>地区：{projectRegion || "-"}</div>
                          <div className={readonlyClass}>区域组：{regionGroup}</div>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">区域化推荐因子（kg N₂O/头·年）</span>
                            <input type="number" step="any"
                              {...register(`rows.${rowIndexes[0]}.regionalEmissionFactor`, { valueAsNumber: true, onChange: () => markRowManual(rowIndexes[0], "手工覆盖表 C.10 推荐因子") })}
                              className={inputClass}
                            />
                            {errors.rows?.[rowIndexes[0]]?.regionalEmissionFactor?.message && (
                              <p className={errorClass}>{String(errors.rows[rowIndexes[0]]?.regionalEmissionFactor?.message)}</p>
                            )}
                          </label>
                          <div className="flex items-end">
                            <button type="button" onClick={() => applyRegionalDefaultForSource(sourceIndex)} className="w-full text-sm px-4 py-2.5 rounded-xl border border-green-200 bg-white text-green-700 hover:bg-green-50 transition font-medium">
                              带入表 C.10 推荐因子
                            </button>
                          </div>
                        </div>

                        <label className="mt-4 block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                          <textarea {...register(`rows.${rowIndexes[0]}.notes`, { onChange: () => markRowManual(rowIndexes[0], "手工补充说明") })} rows={2} className={inputClass} />
                        </label>
                      </div>
                    ) : null}

                    {/* parameter mode */}
                    {mode === "parameterCalculation" ? (
                      <div className="space-y-3">
                        {/* share status bar */}
                        <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                          <div className="flex items-center gap-3 text-sm text-green-800 font-medium">
                            参数法当前占比合计：{fmt(shareTotal, 2)}%
                            {Math.abs(shareTotal - 100) < 0.5 ? (
                              <span className="rounded-full bg-green-200 border border-green-300 px-2.5 py-0.5 text-xs font-semibold text-green-800">已闭合</span>
                            ) : (
                              <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">未到 100%</span>
                            )}
                          </div>
                          <button type="button" onClick={() => addParameterPathForSource(sourceIndex)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-white text-green-700 hover:bg-green-50 transition font-medium">
                            + 新增管理方式路径
                          </button>
                        </div>

                        {parameterRows.map((rowIndex, pathIndex) => {
                          const row = watchedRows[rowIndex];
                          return (
                            <div key={fields[rowIndex]?.id ?? `${sourceIndex}-${pathIndex}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <p className="text-sm font-semibold text-gray-700">参数路径 {pathIndex + 1}</p>
                                  <p className="mt-0.5 text-xs text-gray-400">{row?.parameterSourceLabel}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={sourceBadgeClass(row?.parameterSourceType ?? "manual_input")}>
                                    {getParameterSourceDisplay(row?.parameterSourceType ?? "manual_input")}
                                  </span>
                                  {parameterRows.length > 1 && (
                                    <button type="button" onClick={() => removeParameterPath(sourceIndex, rowIndex)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">删除路径</button>
                                  )}
                                </div>
                              </div>

                              <input type="hidden" {...register(`rows.${rowIndex}.sourceLivestockIndex`, { valueAsNumber: true })} />
                              <input type="hidden" {...register(`rows.${rowIndex}.species`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.stage`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.method`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.parameterSourceType`)} />
                              <input type="hidden" {...register(`rows.${rowIndex}.parameterSourceLabel`)} />

                              {/* preset chips */}
                              <div className="mb-4 flex flex-wrap gap-2">
                                {commonManagementSystemPresets.map((preset) => (
                                  <button key={preset.id} type="button" onClick={() => fillManagementSystemPreset(rowIndex, preset.label)}
                                    className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs text-green-700 hover:bg-green-50 transition">
                                    填入：{preset.label}
                                  </button>
                                ))}
                              </div>

                              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">管理方式</span>
                                  <input {...register(`rows.${rowIndex}.managementSystem`, { onChange: () => markRowManual(rowIndex, "手工修改参数法路径") })} className={inputClass} placeholder="例如：固体贮存" />
                                  {errors.rows?.[rowIndex]?.managementSystem?.message && <p className={errorClass}>{String(errors.rows[rowIndex]?.managementSystem?.message)}</p>}
                                </label>
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">占比（%）</span>
                                  <input type="number" step="any" {...register(`rows.${rowIndex}.sharePercent`, { valueAsNumber: true, onChange: () => markRowManual(rowIndex, "手工修改参数法路径") })} className={inputClass} />
                                  {errors.rows?.[rowIndex]?.sharePercent?.message && <p className={errorClass}>{String(errors.rows[rowIndex]?.sharePercent?.message)}</p>}
                                </label>
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">Nex（kg N/头·年）</span>
                                  <input type="number" step="any" {...register(`rows.${rowIndex}.nexKgNPerHeadYear`, { valueAsNumber: true, onChange: () => markRowManual(rowIndex, "手工修改参数法路径") })} className={inputClass} />
                                  {errors.rows?.[rowIndex]?.nexKgNPerHeadYear?.message && <p className={errorClass}>{String(errors.rows[rowIndex]?.nexKgNPerHeadYear?.message)}</p>}
                                </label>
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">EF3（kg N₂O-N/kg N）</span>
                                  <input type="number" step="any" {...register(`rows.${rowIndex}.ef3KgN2ONPerKgN`, { valueAsNumber: true, onChange: () => markRowManual(rowIndex, "手工修改参数法路径") })} className={inputClass} />
                                  {errors.rows?.[rowIndex]?.ef3KgN2ONPerKgN?.message && <p className={errorClass}>{String(errors.rows[rowIndex]?.ef3KgN2ONPerKgN?.message)}</p>}
                                </label>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => applyParameterDefaultForRow(rowIndex)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-white text-green-700 hover:bg-green-50 transition font-medium">
                                  带入 C.8/C.9 参数法默认值
                                </button>
                              </div>

                              <label className="mt-4 block">
                                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                                <textarea {...register(`rows.${rowIndex}.notes`, { onChange: () => markRowManual(rowIndex, "手工补充说明") })} rows={2} className={inputClass} placeholder="可填写参数来源、路径选择说明等" />
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

          {/* SECTION 2: summary */}
          <section className="rounded-2xl border border-dashed border-green-200 bg-green-50/50 p-6">
            <h2 className="text-sm font-semibold text-green-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              汇总预览
            </h2>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-white px-4 py-3">
                <div className="text-xs text-green-600 font-medium mb-1">当前地区 / 区域组</div>
                <div className="text-sm font-semibold text-green-900">{projectRegion || "-"} / {regionGroup}</div>
              </div>
              <div className="rounded-xl border border-green-200 bg-white px-4 py-3">
                <div className="text-xs text-green-600 font-medium mb-1">年度 N₂O 总量</div>
                <div className="text-sm font-semibold text-green-900">{fmt(calculationPreview.totalN2OTPerYear)} t N₂O/yr</div>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-green-100 text-left">
                    {["畜种","阶段","占比合计（%）","状态","合计因子","t N₂O/yr"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {calculationPreview.groups.map((group, index) => (
                    <tr key={`${group.species}-${group.stage}-${index}`} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2.5 text-gray-700">{group.species}</td>
                      <td className="px-3 py-2.5 text-gray-500">{group.stage}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(group.shareTotalPercent, 2)}</td>
                      <td className="px-3 py-2.5">
                        {group.isShareBalanced
                          ? <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">已闭合</span>
                          : <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">未到 100%</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(group.emissionFactorKgN2OPerHeadYear)} kg/head/yr</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-green-800">{fmt(group.totalN2OTPerYear)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-green-700 leading-6 space-y-1">
              <p>动物/阶段始终跟随养殖活动页同步；DMI、体重、饲养方式等活动数据已贯通到本页，作为后续 Nex 自动估算的准备数据。</p>
              {statusMessage && <p className="font-semibold text-green-900 mt-2 pt-2 border-t border-green-200">{statusMessage}</p>}
            </div>
          </section>

          {/* SECTION 3: detail table */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              计算明细预览
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-green-50 text-left">
                    {["畜种","阶段","方法","管理方式","占比","区域推荐因子","Nex","EF3","管理氮量","合成因子","t N₂O/yr"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {calculationPreview.rows.map((row, index) => (
                    <tr key={`${row.species}-${row.stage}-${index}`} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2.5 text-gray-700">{row.species}</td>
                      <td className="px-3 py-2.5 text-gray-500">{row.stage}</td>
                      <td className="px-3 py-2.5 text-gray-500">{row.method}</td>
                      <td className="px-3 py-2.5 text-gray-500">{row.managementSystem || "-"}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.sharePercent, 2)}%</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.regionalEmissionFactor)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.nexKgNPerHeadYear)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.ef3DirectKgN2ONPerKgN, 4)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.managedNitrogenKgPerYear, 2)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(row.emissionFactorKgN2OPerHeadYear)} kg/head/yr</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-green-800">{fmt(row.rowN2OTPerYear)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {isSubmitting ? "保存中..." : "保存粪污管理 N₂O 草稿"}
            </button>
            <Link href="/project/manure-ch4" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">返回上一页</Link>
            <Link href="/project/energy" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 transition">下一步：能源与电力模块 →</Link>
          </div>
        </form>
      </div>
    </main>
  );
}