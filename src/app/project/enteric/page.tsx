'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcEntericCH4 } from "@/lib/calculators/entericCH4";
import {
  entericCH4Schema,
  type EntericCH4FormInput,
  type EntericCH4FormValues,
} from "@/lib/schemas/entericCH4";
import {
  loadProjectDraft,
  saveEntericDraft,
} from "@/lib/utils/projectDraftStorage";
import {
  buildEntericDefaultsForLivestock,
  getEntericDefaultFactor,
  getEntericYmDefault,
  getParameterSourceDisplay,
} from "@/lib/utils/standardFactors";
import type {
  EntericRecord,
  LivestockRecord,
  StandardVersion,
} from "@/types/ghg";

const monthFields = [
  { key: "janHead", label: "1月" },
  { key: "febHead", label: "2月" },
  { key: "marHead", label: "3月" },
  { key: "aprHead", label: "4月" },
  { key: "mayHead", label: "5月" },
  { key: "junHead", label: "6月" },
  { key: "julHead", label: "7月" },
  { key: "augHead", label: "8月" },
  { key: "sepHead", label: "9月" },
  { key: "octHead", label: "10月" },
  { key: "novHead", label: "11月" },
  { key: "decHead", label: "12月" },
] as const;

type EntericFormRowInput = EntericCH4FormInput["rows"][number];

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

function sourceBadgeClass(sourceType: string) {
  if (sourceType === "default_library") {
    return "rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700";
  }
  if (sourceType === "preset_template") {
    return "rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700";
  }
  return "rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700";
}

function mergeNote(existing: string | undefined, incoming: string) {
  const left = (existing ?? "").trim();
  const right = incoming.trim();
  if (!left) return right;
  if (left.includes(right)) return left;
  return `${left}；${right}`;
}

function getLivestockDmiSourceLabel(row: LivestockRecord): string {
  switch (row.dmiMethod) {
    case "direct_input": return "养殖活动页直接录入干物质采食量（DMI）";
    case "feed_ledger": return "养殖活动页按饲料台账反推干物质采食量（DMI）";
    case "temporary_estimate": return "养殖活动页暂用经验值或台账估计干物质采食量（DMI）";
    case "model_nema_placeholder": return "养殖活动页后续按维持净能模型（NEma）估算干物质采食量（DMI）";
    case "model_de_placeholder": return "养殖活动页后续按日粮可消化能占总能比例（DE）模型估算干物质采食量（DMI）";
    default: return "养殖活动页未提供干物质采食量（DMI）来源";
  }
}

function getLivestockDmiValue(row: LivestockRecord): number | undefined {
  const dmi = safeNumber(row.dmiKgPerHeadDay);
  return dmi > 0 ? dmi : undefined;
}

function getActivityDataMethodLabel(
  method: EntericRecord["activityDataMethod"] | EntericFormRowInput["activityDataMethod"] | string | undefined
): string {
  switch (method) {
    case "annualAveragePopulation":
      return "直接录入年平均存栏（AP）";
    case "monthlyAveragePopulation":
      return "录入 12 个月存栏并自动平均";
    case "turnoverCalculation":
      return "年度饲养量（NA）× 生长天数（DA）/ 365";
    default:
      return "未识别";
  }
}

function getEntericMethodLabel(
  method: EntericRecord["method"] | EntericFormRowInput["method"] | string | undefined
): string {
  switch (method) {
    case "defaultEF":
      return "推荐因子法";
    case "calculatedEF":
      return "公式计算法";
    case "measuredEF":
      return "实测或手工因子法";
    default:
      return "未识别";
  }
}

function createRowFromLivestock(row: LivestockRecord, index: number, standardVersion: StandardVersion): EntericFormRowInput {
  const defaultFactor = buildEntericDefaultsForLivestock(standardVersion, [row])[0];
  const useTurnover = row.populationMode === "turnover" && safeNumber(row.annualOutputHead) > 0 && safeNumber(row.feedingDays) > 0 && safeNumber(row.feedingDays) < 365;
  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,
    activityDataMethod: useTurnover ? "turnoverCalculation" : "annualAveragePopulation",
    annualAveragePopulation: useTurnover ? undefined : row.annualAverageHead,
    janHead: undefined, febHead: undefined, marHead: undefined, aprHead: undefined,
    mayHead: undefined, junHead: undefined, julHead: undefined, augHead: undefined,
    sepHead: undefined, octHead: undefined, novHead: undefined, decHead: undefined,
    annualThroughput: useTurnover ? row.annualOutputHead : undefined,
    daysAlive: useTurnover ? row.feedingDays : undefined,
    method: "defaultEF",
    emissionFactor: defaultFactor?.emissionFactor ?? 0,
    dmiKgPerHeadDay: getLivestockDmiValue(row),
    ymPercent: undefined,
    geMJPerHeadDay: undefined,
    parameterSourceType: defaultFactor?.parameterSourceType ?? "manual_input",
    parameterSourceLabel: defaultFactor?.parameterSourceLabel ?? "未匹配默认因子，需手动填写",
    notes: getLivestockDmiValue(row) !== undefined
      ? mergeNote(defaultFactor?.notes, `干物质采食量（DMI）已从养殖活动页同步：${getLivestockDmiSourceLabel(row)}`)
      : defaultFactor?.notes ?? "",
  };
}

function syncEntericRowWithLivestock(livestockRow: LivestockRecord, index: number, standardVersion: StandardVersion, existingRow?: Partial<EntericRecord>): EntericFormRowInput {
  const baseRow = createRowFromLivestock(livestockRow, index, standardVersion);
  const livestockDmi = getLivestockDmiValue(livestockRow);
  if (!existingRow) return baseRow;
  const useTurnover = livestockRow.populationMode === "turnover" && safeNumber(livestockRow.annualOutputHead) > 0 && safeNumber(livestockRow.feedingDays) > 0 && safeNumber(livestockRow.feedingDays) < 365;
  const synced: EntericFormRowInput = {
    ...baseRow,
    sourceLivestockIndex: index,
    species: livestockRow.species,
    stage: livestockRow.stage,
    activityDataMethod: (existingRow.activityDataMethod as EntericFormRowInput["activityDataMethod"]) ?? (useTurnover ? "turnoverCalculation" : "annualAveragePopulation"),
    // ★ 关键修复：年平均存栏（AP）始终从养殖活动页强制同步，不再被旧草稿覆盖
    annualAveragePopulation: useTurnover ? undefined : livestockRow.annualAverageHead,
    janHead: existingRow.janHead, febHead: existingRow.febHead, marHead: existingRow.marHead,
    aprHead: existingRow.aprHead, mayHead: existingRow.mayHead, junHead: existingRow.junHead,
    julHead: existingRow.julHead, augHead: existingRow.augHead, sepHead: existingRow.sepHead,
    octHead: existingRow.octHead, novHead: existingRow.novHead, decHead: existingRow.decHead,
    annualThroughput: useTurnover ? livestockRow.annualOutputHead : undefined,
    daysAlive: useTurnover ? livestockRow.feedingDays : undefined,
    method: existingRow.method === "customEF" ? "measuredEF" : ((existingRow.method as EntericFormRowInput["method"]) ?? baseRow.method),
    dmiKgPerHeadDay: livestockDmi !== undefined ? livestockDmi : existingRow.dmiKgPerHeadDay,
    ymPercent: existingRow.ymPercent,
    geMJPerHeadDay: existingRow.geMJPerHeadDay,
    parameterSourceType: existingRow.parameterSourceType ?? baseRow.parameterSourceType,
    parameterSourceLabel: existingRow.parameterSourceLabel ?? baseRow.parameterSourceLabel,
    notes: livestockDmi !== undefined
      ? mergeNote(existingRow.notes, `干物质采食量（DMI）已按当前养殖活动口径同步：${getLivestockDmiSourceLabel(livestockRow)}`)
      : existingRow.notes ?? baseRow.notes,
  };

  if (synced.method === "defaultEF") {
    const matched = getEntericDefaultFactor(standardVersion, livestockRow.species, livestockRow.stage);
    return {
      ...synced,
      emissionFactor: matched?.emissionFactor ?? 0,
      parameterSourceType: matched ? "default_library" : "manual_input",
      parameterSourceLabel: matched ? `${standardVersion} ${matched.sourceTable}：${matched.label}` : "未匹配默认因子，需手动填写",
      notes: matched ? mergeNote(synced.notes, `${matched.sourceTable} ${matched.label} 已按当前养殖活动口径重新同步。`) : synced.notes,
    };
  }

  if (synced.method === "calculatedEF" && synced.parameterSourceType === "default_library") {
    const ymMatched = getEntericYmDefault(standardVersion, livestockRow.species, livestockRow.stage);
    if (ymMatched) {
      return {
        ...synced,
        ymPercent: ymMatched.ymPercent,
        parameterSourceLabel: `${standardVersion} ${ymMatched.sourceTable}：${ymMatched.label}`,
        notes: mergeNote(synced.notes, `${ymMatched.sourceTable} ${ymMatched.label} 的甲烷能量转化率（Ym）已按当前养殖活动口径重新同步。`),
      };
    }
  }

  return { ...synced, emissionFactor: existingRow.emissionFactor ?? baseRow.emissionFactor };
}

export default function EntericPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [projectName, setProjectName] = useState("");
  const [standardVersion, setStandardVersion] = useState<StandardVersion>("NYT4243_2022");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<EntericCH4FormInput, unknown, EntericCH4FormValues>({
      resolver: zodResolver(entericCH4Schema),
      defaultValues: { rows: [] },
    });

  const watchedRows = watch("rows") ?? [];

  useEffect(() => {
    (async () => {
      const draft = await loadProjectDraft();
      if (!draft) return;
      const livestock = draft.livestock ?? [];
      const entericDraft = draft.enteric ?? [];
      setProjectName(draft.base.enterpriseName || "未命名项目");
      setStandardVersion(draft.base.standardVersion);
      setLivestockRows(livestock);
      const syncedRows = livestock.map((livestockRow, index) => {
        const existingRow = entericDraft.find((item) => item.sourceLivestockIndex === index);
        return syncEntericRowWithLivestock(livestockRow, index, draft.base.standardVersion, existingRow);
      });
      reset({ rows: syncedRows });
      setStatusMessage(
        entericDraft.length > 0
          ? "已加载肠道发酵草稿，并按当前养殖活动数据重新同步了畜种、阶段、年平均存栏（AP）和干物质采食量（DMI）。"
          : "已按标准版本初始化肠道发酵模块。"
      );
    })();
  }, [reset]);

  const calculationPreview = calcEntericCH4(
    livestockRows,
    watchedRows.map((row): EntericRecord => ({
      sourceLivestockIndex: safeNumber(row.sourceLivestockIndex),
      species: row.species ?? "",
      stage: row.stage ?? "",
      activityDataMethod: row.activityDataMethod,
      annualAveragePopulation: toOptionalNumber(row.annualAveragePopulation),
      janHead: toOptionalNumber(row.janHead),
      febHead: toOptionalNumber(row.febHead),
      marHead: toOptionalNumber(row.marHead),
      aprHead: toOptionalNumber(row.aprHead),
      mayHead: toOptionalNumber(row.mayHead),
      junHead: toOptionalNumber(row.junHead),
      julHead: toOptionalNumber(row.julHead),
      augHead: toOptionalNumber(row.augHead),
      sepHead: toOptionalNumber(row.sepHead),
      octHead: toOptionalNumber(row.octHead),
      novHead: toOptionalNumber(row.novHead),
      decHead: toOptionalNumber(row.decHead),
      annualThroughput: toOptionalNumber(row.annualThroughput),
      daysAlive: toOptionalNumber(row.daysAlive),
      method: row.method,
      emissionFactor: safeNumber(row.emissionFactor),
      dmiKgPerHeadDay: toOptionalNumber(row.dmiKgPerHeadDay),
      ymPercent: toOptionalNumber(row.ymPercent),
      geMJPerHeadDay: toOptionalNumber(row.geMJPerHeadDay),
      unit: "kg CH4/head/year",
      parameterSourceType: row.parameterSourceType ?? "manual_input",
      parameterSourceLabel: row.parameterSourceLabel ?? "手工输入",
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }))
  );

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const readonlyClass =
    "w-full rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-900 font-medium";
  const errorClass = "mt-1.5 text-xs text-red-500";

  const syncDmiFromLivestock = (index: number) => {
    const livestockRow = livestockRows[index];
    if (!livestockRow) return;
    const livestockDmi = getLivestockDmiValue(livestockRow);
    if (livestockDmi === undefined) {
      setStatusMessage(`第 ${index + 1} 行对应群体当前没有可同步的干物质采食量（DMI）。`);
      return;
    }
    setValue(`rows.${index}.dmiKgPerHeadDay`, livestockDmi, { shouldValidate: true });
    setValue(
      `rows.${index}.notes`,
      mergeNote(watchedRows[index]?.notes, `干物质采食量（DMI）已从养殖活动页重新同步：${getLivestockDmiSourceLabel(livestockRow)}`),
      { shouldValidate: true }
    );
    setStatusMessage(`第 ${index + 1} 行已从养殖活动页同步干物质采食量（DMI）。`);
  };

  const applyDefaultFactorForRow = (index: number) => {
    const row = watchedRows[index];
    if (!row) return;
    const matched = getEntericDefaultFactor(standardVersion, row.species ?? "", row.stage ?? "");
    if (!matched) {
      setStatusMessage(`第 ${index + 1} 行未匹配到推荐因子，请手动填写或改用计算法/实测法。`);
      return;
    }
    setValue(`rows.${index}.method`, "defaultEF", { shouldValidate: true });
    setValue(`rows.${index}.emissionFactor`, matched.emissionFactor, { shouldValidate: true });
    setValue(`rows.${index}.ymPercent`, undefined, { shouldValidate: false });
    setValue(`rows.${index}.geMJPerHeadDay`, undefined, { shouldValidate: false });
    setValue(`rows.${index}.parameterSourceType`, "default_library", { shouldValidate: true });
    setValue(`rows.${index}.parameterSourceLabel`, `${standardVersion} ${matched.sourceTable}：${matched.label}`, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.notes`, mergeNote(watchedRows[index]?.notes, `${matched.sourceTable} ${matched.label} 已自动带入默认值。`), {
      shouldValidate: true,
    });
    setStatusMessage(`第 ${index + 1} 行已带入推荐因子。`);
  };

  const applyDefaultFactorForAll = () => {
    const nextRows: EntericFormRowInput[] = watchedRows.map((row, index) => {
      const matched = getEntericDefaultFactor(standardVersion, row.species ?? "", row.stage ?? "");
      const livestockRow = livestockRows[index];
      const livestockDmi = livestockRow ? getLivestockDmiValue(livestockRow) : undefined;
      if (!matched) return row;
      return {
        ...row,
        method: "defaultEF",
        emissionFactor: matched.emissionFactor,
        dmiKgPerHeadDay: livestockDmi ?? row.dmiKgPerHeadDay,
        ymPercent: undefined,
        geMJPerHeadDay: undefined,
        parameterSourceType: "default_library",
        parameterSourceLabel: `${standardVersion} ${matched.sourceTable}：${matched.label}`,
        notes: mergeNote(row.notes, `${matched.sourceTable} ${matched.label} 已自动带入默认值。`),
      };
    });
    reset({ rows: nextRows });
    setStatusMessage("已按当前标准版本为全部可匹配记录带入推荐因子，并同步干物质采食量（DMI）。");
  };

  const markRowManual = (index: number, label: string) => {
    setValue(`rows.${index}.parameterSourceType`, "manual_input", { shouldDirty: true, shouldValidate: true });
    setValue(`rows.${index}.parameterSourceLabel`, label, { shouldDirty: true, shouldValidate: true });
  };

  const handleMethodChange = (index: number, value: "defaultEF" | "calculatedEF" | "measuredEF") => {
    const row = watchedRows[index];
    const livestockRow = livestockRows[index];
    if (!row) return;

    if (value === "defaultEF") {
      const matched = getEntericDefaultFactor(standardVersion, row.species ?? "", row.stage ?? "");
      setValue(`rows.${index}.method`, "defaultEF", { shouldValidate: true });
      if (!matched) {
        markRowManual(index, "未匹配默认因子，需手动填写");
        setStatusMessage(`第 ${index + 1} 行切换到推荐因子法，但未匹配到默认值，请手动填写。`);
        return;
      }
      setValue(`rows.${index}.emissionFactor`, matched.emissionFactor, { shouldValidate: true });
      setValue(`rows.${index}.ymPercent`, undefined, { shouldValidate: false });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, { shouldValidate: false });
      setValue(`rows.${index}.parameterSourceType`, "default_library", { shouldValidate: true });
      setValue(`rows.${index}.parameterSourceLabel`, `${standardVersion} ${matched.sourceTable}：${matched.label}`, {
        shouldValidate: true,
      });
      setValue(`rows.${index}.notes`, mergeNote(row.notes, `${matched.sourceTable} ${matched.label} 已自动带入默认值。`), {
        shouldValidate: true,
      });
      setStatusMessage(`第 ${index + 1} 行已自动带入推荐因子。`);
      return;
    }

    setValue(`rows.${index}.method`, value, { shouldValidate: true });

    if (value === "calculatedEF") {
      const ymMatched = getEntericYmDefault(standardVersion, row.species ?? "", row.stage ?? "");
      const livestockDmi = livestockRow ? getLivestockDmiValue(livestockRow) : undefined;
      setValue(`rows.${index}.emissionFactor`, undefined, { shouldValidate: false });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, { shouldValidate: false });
      if (livestockDmi !== undefined) {
        setValue(`rows.${index}.dmiKgPerHeadDay`, livestockDmi, { shouldValidate: true });
        setValue(
          `rows.${index}.notes`,
          mergeNote(row.notes, `干物质采食量（DMI）已从养殖活动页同步：${getLivestockDmiSourceLabel(livestockRow!)}`),
          { shouldValidate: true }
        );
      }
      if (ymMatched) {
        setValue(`rows.${index}.ymPercent`, ymMatched.ymPercent, { shouldValidate: true });
        setValue(`rows.${index}.parameterSourceType`, "default_library", { shouldValidate: true });
        setValue(`rows.${index}.parameterSourceLabel`, `${standardVersion} ${ymMatched.sourceTable}：${ymMatched.label}`, {
          shouldValidate: true,
        });
        setValue(
          `rows.${index}.notes`,
          mergeNote(watchedRows[index]?.notes, `${ymMatched.sourceTable} ${ymMatched.label} 的甲烷能量转化率（Ym）已自动带入默认值。`),
          { shouldValidate: true }
        );
        setStatusMessage(`第 ${index + 1} 行已自动带入甲烷能量转化率（Ym）默认值。`);
      } else {
        setValue(`rows.${index}.ymPercent`, undefined, { shouldValidate: false });
        markRowManual(index, "公式计算法：需手工输入干物质采食量（DMI）和甲烷能量转化率（Ym）");
        setStatusMessage(`第 ${index + 1} 行切换到公式计算法，但未匹配到甲烷能量转化率（Ym）默认值，请手动填写甲烷能量转化率（Ym）。`);
      }
      return;
    }

    if (value === "measuredEF") {
      setValue(`rows.${index}.ymPercent`, undefined, { shouldValidate: false });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, { shouldValidate: false });
      markRowManual(index, "实测或手工输入排放因子");
      setStatusMessage(`第 ${index + 1} 行已切换到实测或手工因子法。`);
    }
  };

  const onSubmit = (values: EntericCH4FormValues) => {
    const rows: EntericRecord[] = values.rows.map((row, index) => {
      const previewRow = calculationPreview.rows[index];
      return {
        sourceLivestockIndex: safeNumber(row.sourceLivestockIndex),
        species: row.species.trim(),
        stage: row.stage.trim(),
        activityDataMethod: row.activityDataMethod,
        annualAveragePopulation: row.annualAveragePopulation,
        janHead: row.janHead,
        febHead: row.febHead,
        marHead: row.marHead,
        aprHead: row.aprHead,
        mayHead: row.mayHead,
        junHead: row.junHead,
        julHead: row.julHead,
        augHead: row.augHead,
        sepHead: row.sepHead,
        octHead: row.octHead,
        novHead: row.novHead,
        decHead: row.decHead,
        annualThroughput: row.annualThroughput,
        daysAlive: row.daysAlive,
        method: row.method,
        emissionFactor: row.method === "calculatedEF" ? previewRow?.emissionFactor ?? 0 : safeNumber(row.emissionFactor),
        dmiKgPerHeadDay: row.dmiKgPerHeadDay,
        ymPercent: row.ymPercent,
        geMJPerHeadDay: row.method === "calculatedEF" ? previewRow?.geMJPerHeadDay ?? 0 : row.geMJPerHeadDay,
        unit: "kg CH4/head/year",
        parameterSourceType: row.parameterSourceType,
        parameterSourceLabel: row.parameterSourceLabel,
        notes: row.notes.trim() ? row.notes.trim() : undefined,
      };
    });
    saveEntericDraft(rows);
    setStatusMessage("已保存细化后的肠道发酵 CH₄ 草稿。");
  };

  const autoSaveStatus = useAutoSave(
    watchedRows,
    async () => {
      await saveEntericDraft(watchedRows as EntericRecord[]);
    },
    2000
  );

  if (livestockRows.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
              </svg>
            </div>
            养殖场碳核算平台
          </div>
        </nav>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-amber-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">还没有养殖活动数据</h1>
            <p className="mt-3 text-sm text-gray-500 leading-7">先完成「基础信息」和「养殖活动数据」这两步，再进入肠道发酵模块。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/project/new" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">
                回到基础信息
              </Link>
              <Link href="/project/livestock" className="px-5 py-2.5 rounded-xl border border-green-100 text-green-800 text-sm font-medium hover:bg-green-50 transition">
                去录入养殖活动
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
            </svg>
          </div>
          养殖场碳核算平台
        </div>
        <div className="flex items-center gap-2">
          <AutoSaveIndicator status={autoSaveStatus} />
          <Link href="/project/livestock" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">
            返回养殖活动
          </Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">
            返回首页
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            肠道发酵 CH₄
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">动物肠道发酵 CH₄</h1>
          <p className="mt-2 text-sm text-gray-400">
            当前项目：{projectName || "未命名项目"} · 标准版本：{standardVersion}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-green-50">
              <div>
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  活动数据与排放因子录入
                </h2>
                <p className="mt-1 text-xs text-gray-400 leading-6 max-w-2xl">
                  畜种、阶段、年平均存栏（AP）和干物质采食量（DMI）始终从「养殖活动数据」同步。每次进入本页都会强制读取最新值。
                </p>
              </div>
              <button
                type="button"
                onClick={applyDefaultFactorForAll}
                className="flex-shrink-0 text-sm px-4 py-2 rounded-xl border border-green-200 text-green-700 bg-white hover:bg-green-50 transition font-medium"
              >
                为全部记录带入推荐因子
              </button>
            </div>

            <div className="divide-y divide-green-50">
              {watchedRows.map((row, index) => {
                const rowPreview = calculationPreview.rows[index];
                const rowSourceType = row.parameterSourceType ?? "manual_input";
                const rowSourceLabel = row.parameterSourceLabel ?? "手工输入";
                const livestockRow = livestockRows[index];
                const livestockDmi = livestockRow ? getLivestockDmiValue(livestockRow) : undefined;

                return (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-7 h-7 rounded-full border-2 border-green-200 text-green-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-800">
                            {row.species} / {row.stage}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 pl-9">
                          计算后年平均存栏（AP）：{fmt(rowPreview?.activityPopulation)} 头（只）· 排放因子（EF）：{fmt(rowPreview?.emissionFactor)} kg CH₄/头·年
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => applyDefaultFactorForRow(index)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition"
                        >
                          带入推荐因子
                        </button>
                        <span className={sourceBadgeClass(rowSourceType)}>{getParameterSourceDisplay(rowSourceType)}</span>
                        <span className="text-[11px] text-gray-400 max-w-[200px] text-right leading-5">{rowSourceLabel}</span>
                      </div>
                    </div>

                    <input type="hidden" {...register(`rows.${index}.sourceLivestockIndex`, { valueAsNumber: true })} />
                    <input type="hidden" {...register(`rows.${index}.parameterSourceType`)} />
                    <input type="hidden" {...register(`rows.${index}.parameterSourceLabel`)} />

                    <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">畜种</span>
                        <input {...register(`rows.${index}.species`)} readOnly className={readonlyClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">阶段</span>
                        <input {...register(`rows.${index}.stage`)} readOnly className={readonlyClass} />
                      </label>
                      <label className="block xl:col-span-2">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">活动数据收集方式</span>
                        <select
                          {...register(`rows.${index}.activityDataMethod`, {
                            onChange: () => markRowManual(index, "手工修改活动数据收集方式"),
                          })}
                          className={inputClass}
                        >
                          <option value="annualAveragePopulation">直接录入年平均存栏（AP）</option>
                          <option value="monthlyAveragePopulation">录入 12 个月存栏并自动平均</option>
                          <option value="turnoverCalculation">短生长期动物：年度饲养量（NA）× 生长天数（DA）/ 365</option>
                        </select>
                      </label>
                    </div>

                    {row.activityDataMethod === "annualAveragePopulation" && (
                      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">年平均存栏（AP）（头/只）</span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.annualAveragePopulation`, {
                              valueAsNumber: true,
                              onChange: () => markRowManual(index, "手工录入年平均存栏（AP）"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.annualAveragePopulation?.message && (
                            <p className={errorClass}>{String(errors.rows[index]?.annualAveragePopulation?.message)}</p>
                          )}
                        </label>
                      </div>
                    )}

                    {row.activityDataMethod === "monthlyAveragePopulation" && (
                      <div className="mb-5">
                        <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">12 个月存栏数据</p>
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                          {monthFields.map((month) => (
                            <label key={month.key} className="block">
                              <span className="mb-1.5 block text-xs font-medium text-gray-500">{month.label}</span>
                              <input
                                type="number"
                                step="any"
                                {...register(`rows.${index}.${month.key}` as const, {
                                  valueAsNumber: true,
                                  onChange: () => markRowManual(index, "手工录入 12 个月存栏"),
                                })}
                                className={inputClass}
                              />
                              {errors.rows?.[index]?.[month.key]?.message && (
                                <p className={errorClass}>{String(errors.rows[index]?.[month.key]?.message)}</p>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {row.activityDataMethod === "turnoverCalculation" && (
                      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">年度饲养量（NA）（头/只）</span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.annualThroughput`, {
                              valueAsNumber: true,
                              onChange: () => markRowManual(index, "手工录入年度饲养量（NA）与生长天数（DA）折算年平均存栏（AP）"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.annualThroughput?.message && (
                            <p className={errorClass}>{String(errors.rows[index]?.annualThroughput?.message)}</p>
                          )}
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">生长天数（DA）（天）</span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.daysAlive`, {
                              valueAsNumber: true,
                              onChange: () => markRowManual(index, "手工录入年度饲养量（NA）与生长天数（DA）折算年平均存栏（AP）"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.daysAlive?.message && (
                            <p className={errorClass}>{String(errors.rows[index]?.daysAlive?.message)}</p>
                          )}
                        </label>
                      </div>
                    )}

                    <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="block xl:col-span-2">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">排放因子获取方式</span>
                        <select
                          value={row.method ?? "defaultEF"}
                          onChange={(e) => handleMethodChange(index, e.target.value as "defaultEF" | "calculatedEF" | "measuredEF")}
                          className={inputClass}
                        >
                          <option value="defaultEF">推荐因子法</option>
                          <option value="calculatedEF">公式计算法〔干物质采食量（DMI）+ 甲烷能量转化率（Ym）〕</option>
                          <option value="measuredEF">实测或手工因子法</option>
                        </select>
                      </label>
                    </div>

                    {(row.method === "defaultEF" || row.method === "measuredEF") && (
                      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">排放因子（EF）（kg CH₄/头·年）</span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.emissionFactor`, {
                              valueAsNumber: true,
                              onChange: () =>
                                markRowManual(index, row.method === "defaultEF" ? "手工覆盖推荐因子" : "手工或实测录入排放因子"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.emissionFactor?.message && (
                            <p className={errorClass}>{String(errors.rows[index]?.emissionFactor?.message)}</p>
                          )}
                        </label>
                      </div>
                    )}

                    {row.method === "calculatedEF" && (
                      <>
                        <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800 leading-6">
                          <p>当前养殖活动页的干物质采食量（DMI）来源：{livestockRow ? getLivestockDmiSourceLabel(livestockRow) : "无"}</p>
                          <p className="mt-0.5">
                            当前可同步的干物质采食量（DMI）：{livestockDmi !== undefined ? `${fmt(livestockDmi, 4)} kg 干物质/头·日` : "未提供"}
                          </p>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => syncDmiFromLivestock(index)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 bg-white text-green-700 hover:bg-green-100 transition font-medium"
                            >
                              从养殖活动页同步干物质采食量（DMI）
                            </button>
                          </div>
                        </div>

                        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">干物质采食量（DMI）（kg/头·天）</span>
                            <input
                              type="number"
                              step="any"
                              {...register(`rows.${index}.dmiKgPerHeadDay`, {
                                valueAsNumber: true,
                                onChange: () => markRowManual(index, "按公式计算排放因子（EF）时，手工修改干物质采食量（DMI）"),
                              })}
                              className={inputClass}
                            />
                            {errors.rows?.[index]?.dmiKgPerHeadDay?.message && (
                              <p className={errorClass}>{String(errors.rows[index]?.dmiKgPerHeadDay?.message)}</p>
                            )}
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">甲烷能量转化率（Ym）（%）</span>
                            <input
                              type="number"
                              step="any"
                              {...register(`rows.${index}.ymPercent`, {
                                valueAsNumber: true,
                                onChange: () => markRowManual(index, "按公式计算排放因子（EF）时，手工修改甲烷能量转化率（Ym）"),
                              })}
                              className={inputClass}
                            />
                            {errors.rows?.[index]?.ymPercent?.message && (
                              <p className={errorClass}>{String(errors.rows[index]?.ymPercent?.message)}</p>
                            )}
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">自动计算总能摄入量（GE）（MJ/头·天）</span>
                            <div className={readonlyClass}>{fmt(rowPreview?.geMJPerHeadDay)}</div>
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">自动计算排放因子（EF）（kg CH₄/头·年）</span>
                            <div className={readonlyClass}>{fmt(rowPreview?.emissionFactor)}</div>
                          </label>
                        </div>
                      </>
                    )}

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                      <textarea
                        {...register(`rows.${index}.notes`, {
                          onChange: () => markRowManual(index, "手工补充说明"),
                        })}
                        rows={2}
                        className={inputClass}
                        placeholder="可填写活动数据来源、因子来源、测定说明等"
                      />
                      {errors.rows?.[index]?.notes?.message && (
                        <p className={errorClass}>{String(errors.rows[index]?.notes?.message)}</p>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            {errors.rows?.message && <p className="px-6 pb-4 text-xs text-red-500">{String(errors.rows.message)}</p>}
          </section>

          <section className="rounded-2xl border border-dashed border-green-200 bg-green-50/50 p-6">
            <h2 className="text-sm font-semibold text-green-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              汇总预览
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
              <div className="rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-900">
                总 CH₄：{fmt(calculationPreview.totalCH4TPerYear)} t/年
              </div>
            </div>
            <div className="space-y-1 text-xs text-green-700 leading-6">
              <p>这里的动物类别、阶段和年平均存栏（AP）始终跟随养殖活动页同步；当养殖活动页已形成干物质采食量（DMI）时，这里会优先读取该值。</p>
              {statusMessage && <p className="font-semibold text-green-900 mt-2 pt-2 border-t border-green-200">{statusMessage}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              计算明细预览
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-green-50 text-left">
                    {["畜种", "阶段", "活动数据口径", "排放因子口径", "年平均存栏（AP）", "干物质采食量（DMI）", "甲烷能量转化率（Ym）", "总能摄入量（GE）", "排放因子（EF）", "CH₄ 排放量（t/年）"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50">
                  {calculationPreview.rows.map((previewRow, index) => (
                    <tr key={`${previewRow.species}-${previewRow.stage}-${index}`} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2.5 text-gray-700">{previewRow.species}</td>
                      <td className="px-3 py-2.5 text-gray-500">{previewRow.stage}</td>
                      <td className="px-3 py-2.5 text-gray-500">{getActivityDataMethodLabel(previewRow.activityDataMethod)}</td>
                      <td className="px-3 py-2.5 text-gray-500">{getEntericMethodLabel(previewRow.method)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(previewRow.activityPopulation)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(previewRow.dmiKgPerHeadDay, 4)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(previewRow.ymPercent)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(previewRow.geMJPerHeadDay)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{fmt(previewRow.emissionFactor)}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-green-800">{fmt(previewRow.ch4TPerYear)}</td>
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
              className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "保存中..." : "保存细化后的肠道发酵 CH₄ 草稿"}
            </button>
            <Link href="/project/livestock" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">
              返回上一页
            </Link>
            <Link href="/project/manure-ch4" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 transition">
              下一步：粪污管理 CH₄ →
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}