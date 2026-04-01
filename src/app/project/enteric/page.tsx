'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
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

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown, digits = 3): string {
  return safeNumber(value).toFixed(digits);
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

function mergeNote(existing: string | undefined, incoming: string) {
  const left = (existing ?? "").trim();
  const right = incoming.trim();

  if (!left) return right;
  if (left.includes(right)) return left;
  return `${left}；${right}`;
}

function getLivestockDmiSourceLabel(row: LivestockRecord): string {
  switch (row.dmiMethod) {
    case "direct_input":
      return "养殖活动页直接录入 DMI";
    case "feed_ledger":
      return "养殖活动页按饲料台账反推 DMI";
    case "temporary_estimate":
      return "养殖活动页暂用经验值/台账估计";
    case "model_nema_placeholder":
      return "养殖活动页后续按 NEma 模型估算";
    case "model_de_placeholder":
      return "养殖活动页后续按 DE% 模型估算";
    default:
      return "养殖活动页未提供 DMI 来源";
  }
}

function getLivestockDmiValue(row: LivestockRecord): number | undefined {
  const dmi = safeNumber(row.dmiKgPerHeadDay);
  return dmi > 0 ? dmi : undefined;
}

function createRowFromLivestock(
  row: LivestockRecord,
  index: number,
  standardVersion: StandardVersion
) {
  const defaultFactor =
    buildEntericDefaultsForLivestock(standardVersion, [row])[0];

  const useTurnover =
    row.populationMode === "turnover" &&
    safeNumber(row.annualOutputHead) > 0 &&
    safeNumber(row.feedingDays) > 0 &&
    safeNumber(row.feedingDays) < 365;

  return {
    sourceLivestockIndex: index,
    species: row.species,
    stage: row.stage,

    activityDataMethod: useTurnover
      ? "turnoverCalculation"
      : "annualAveragePopulation",

    annualAveragePopulation: useTurnover ? undefined : row.annualAverageHead,

    janHead: undefined,
    febHead: undefined,
    marHead: undefined,
    aprHead: undefined,
    mayHead: undefined,
    junHead: undefined,
    julHead: undefined,
    augHead: undefined,
    sepHead: undefined,
    octHead: undefined,
    novHead: undefined,
    decHead: undefined,

    annualThroughput: useTurnover ? row.annualOutputHead : undefined,
    daysAlive: useTurnover ? row.feedingDays : undefined,

    method: "defaultEF" as const,
    emissionFactor: defaultFactor?.emissionFactor ?? 0,
    dmiKgPerHeadDay: getLivestockDmiValue(row),
    ymPercent: undefined,
    geMJPerHeadDay: undefined,

    parameterSourceType:
      defaultFactor?.parameterSourceType ?? "manual_input",
    parameterSourceLabel:
      defaultFactor?.parameterSourceLabel ?? "未匹配默认因子，需手动填写",
    notes:
      getLivestockDmiValue(row) !== undefined
        ? mergeNote(
            defaultFactor?.notes,
            `DMI 已从养殖活动页同步：${getLivestockDmiSourceLabel(row)}`
          )
        : defaultFactor?.notes ?? "",
  };
}

function syncEntericRowWithLivestock(
  livestockRow: LivestockRecord,
  index: number,
  standardVersion: StandardVersion,
  existingRow?: Partial<EntericRecord>
) {
  const baseRow = createRowFromLivestock(livestockRow, index, standardVersion);
  const livestockDmi = getLivestockDmiValue(livestockRow);

  if (!existingRow) {
    return baseRow;
  }

  const useTurnover =
    livestockRow.populationMode === "turnover" &&
    safeNumber(livestockRow.annualOutputHead) > 0 &&
    safeNumber(livestockRow.feedingDays) > 0 &&
    safeNumber(livestockRow.feedingDays) < 365;

  const synced = {
    ...baseRow,

    sourceLivestockIndex: index,
    species: livestockRow.species,
    stage: livestockRow.stage,

    activityDataMethod:
      existingRow.activityDataMethod ??
      (useTurnover ? "turnoverCalculation" : "annualAveragePopulation"),

    annualAveragePopulation:
      existingRow.activityDataMethod === "annualAveragePopulation"
        ? existingRow.annualAveragePopulation
        : useTurnover
        ? undefined
        : livestockRow.annualAverageHead,

    janHead: existingRow.janHead,
    febHead: existingRow.febHead,
    marHead: existingRow.marHead,
    aprHead: existingRow.aprHead,
    mayHead: existingRow.mayHead,
    junHead: existingRow.junHead,
    julHead: existingRow.julHead,
    augHead: existingRow.augHead,
    sepHead: existingRow.sepHead,
    octHead: existingRow.octHead,
    novHead: existingRow.novHead,
    decHead: existingRow.decHead,

    annualThroughput: useTurnover ? livestockRow.annualOutputHead : undefined,
    daysAlive: useTurnover ? livestockRow.feedingDays : undefined,

    method:
      existingRow.method === "customEF"
        ? "measuredEF"
        : existingRow.method ?? baseRow.method,

    dmiKgPerHeadDay:
      livestockDmi !== undefined
        ? livestockDmi
        : existingRow.dmiKgPerHeadDay,

    ymPercent: existingRow.ymPercent,
    geMJPerHeadDay: existingRow.geMJPerHeadDay,

    parameterSourceType:
      existingRow.parameterSourceType ?? baseRow.parameterSourceType,
    parameterSourceLabel:
      existingRow.parameterSourceLabel ?? baseRow.parameterSourceLabel,
    notes:
      livestockDmi !== undefined
        ? mergeNote(
            existingRow.notes,
            `DMI 已按当前养殖活动口径同步：${getLivestockDmiSourceLabel(livestockRow)}`
          )
        : existingRow.notes ?? baseRow.notes,
  };

  if (synced.method === "defaultEF") {
    const matched = getEntericDefaultFactor(
      standardVersion,
      livestockRow.species,
      livestockRow.stage
    );

    return {
      ...synced,
      emissionFactor: matched?.emissionFactor ?? 0,
      parameterSourceType: matched ? "default_library" : "manual_input",
      parameterSourceLabel: matched
        ? `${standardVersion} ${matched.sourceTable}：${matched.label}`
        : "未匹配默认因子，需手动填写",
      notes: matched
        ? mergeNote(
            synced.notes,
            `${matched.sourceTable} ${matched.label} 已按当前养殖活动口径重新同步。`
          )
        : synced.notes,
    };
  }

  if (
    synced.method === "calculatedEF" &&
    synced.parameterSourceType === "default_library"
  ) {
    const ymMatched = getEntericYmDefault(
      standardVersion,
      livestockRow.species,
      livestockRow.stage
    );

    if (ymMatched) {
      return {
        ...synced,
        ymPercent: ymMatched.ymPercent,
        parameterSourceLabel: `${standardVersion} ${ymMatched.sourceTable}：${ymMatched.label}`,
        notes: mergeNote(
          synced.notes,
          `${ymMatched.sourceTable} ${ymMatched.label} 的 Ym 已按当前养殖活动口径重新同步。`
        ),
      };
    }
  }

  return {
    ...synced,
    emissionFactor: existingRow.emissionFactor ?? baseRow.emissionFactor,
  };
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

  const watchedRows = watch("rows") ?? [];

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    const livestock = draft.livestock ?? [];
    const entericDraft = draft.enteric ?? [];

    setProjectName(draft.base.enterpriseName || "未命名项目");
    setStandardVersion(draft.base.standardVersion);
    setLivestockRows(livestock);

    const syncedRows = livestock.map((livestockRow, index) => {
      const existingRow = entericDraft.find(
        (item) => item.sourceLivestockIndex === index
      );
      return syncEntericRowWithLivestock(
        livestockRow,
        index,
        draft.base.standardVersion,
        existingRow
      );
    });

    reset({
      rows: syncedRows.map((row) => ({
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,

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
        emissionFactor: row.emissionFactor,
        dmiKgPerHeadDay: row.dmiKgPerHeadDay,
        ymPercent: row.ymPercent,
        geMJPerHeadDay: row.geMJPerHeadDay,

        parameterSourceType: row.parameterSourceType,
        parameterSourceLabel: row.parameterSourceLabel,
        notes: row.notes ?? "",
      })),
    });

    if (entericDraft.length > 0) {
      setStatusMessage(
        "已加载肠道发酵草稿，并按当前养殖活动数据重新同步了畜种、阶段和 DMI。"
      );
    } else {
      setStatusMessage("已按标准版本初始化肠道发酵模块。");
    }
  }, [reset]);

  const calculationPreview = calcEntericCH4(
    livestockRows,
    watchedRows.map((row) => ({
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,

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
      emissionFactor: Number(row.emissionFactor ?? 0),
      dmiKgPerHeadDay: row.dmiKgPerHeadDay,
      ymPercent: row.ymPercent,
      geMJPerHeadDay: row.geMJPerHeadDay,

      unit: "kg CH4/head/year",
      parameterSourceType: row.parameterSourceType,
      parameterSourceLabel: row.parameterSourceLabel,
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    }))
  );

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";
  const errorClass = "mt-2 text-sm text-red-600";

  const syncDmiFromLivestock = (index: number) => {
    const livestockRow = livestockRows[index];
    if (!livestockRow) return;

    const livestockDmi = getLivestockDmiValue(livestockRow);
    if (livestockDmi === undefined) {
      setStatusMessage(`第 ${index + 1} 行对应群体当前没有可同步的 DMI。`);
      return;
    }

    setValue(`rows.${index}.dmiKgPerHeadDay`, livestockDmi, {
      shouldValidate: true,
    });
    setValue(
      `rows.${index}.notes`,
      mergeNote(
        watchedRows[index]?.notes,
        `DMI 已从养殖活动页重新同步：${getLivestockDmiSourceLabel(livestockRow)}`
      ),
      { shouldValidate: true }
    );

    setStatusMessage(`第 ${index + 1} 行已从养殖活动页同步 DMI。`);
  };

  const applyDefaultFactorForRow = (index: number) => {
    const row = watchedRows[index];
    if (!row) return;

    const matched = getEntericDefaultFactor(
      standardVersion,
      row.species,
      row.stage
    );

    if (!matched) {
      setStatusMessage(
        `第 ${index + 1} 行未匹配到推荐因子，请手动填写或改用计算法/实测法。`
      );
      return;
    }

    setValue(`rows.${index}.method`, "defaultEF", { shouldValidate: true });
    setValue(`rows.${index}.emissionFactor`, matched.emissionFactor, {
      shouldValidate: true,
    });
    setValue(`rows.${index}.ymPercent`, undefined, {
      shouldValidate: false,
    });
    setValue(`rows.${index}.geMJPerHeadDay`, undefined, {
      shouldValidate: false,
    });
    setValue(`rows.${index}.parameterSourceType`, "default_library", {
      shouldValidate: true,
    });
    setValue(
      `rows.${index}.parameterSourceLabel`,
      `${standardVersion} ${matched.sourceTable}：${matched.label}`,
      {
        shouldValidate: true,
      }
    );
    setValue(
      `rows.${index}.notes`,
      mergeNote(
        watchedRows[index]?.notes,
        `${matched.sourceTable} ${matched.label} 已自动带入默认值。`
      ),
      { shouldValidate: true }
    );

    setStatusMessage(`第 ${index + 1} 行已带入推荐因子。`);
  };

  const applyDefaultFactorForAll = () => {
    const nextRows = watchedRows.map((row, index) => {
      const matched = getEntericDefaultFactor(
        standardVersion,
        row.species,
        row.stage
      );
      const livestockRow = livestockRows[index];
      const livestockDmi = livestockRow ? getLivestockDmiValue(livestockRow) : undefined;

      if (!matched) {
        return {
          ...row,
          dmiKgPerHeadDay: livestockDmi ?? row.dmiKgPerHeadDay,
        };
      }

      return {
        ...row,
        method: "defaultEF" as const,
        emissionFactor: matched.emissionFactor,
        dmiKgPerHeadDay: livestockDmi ?? row.dmiKgPerHeadDay,
        ymPercent: undefined,
        geMJPerHeadDay: undefined,
        parameterSourceType: "default_library" as const,
        parameterSourceLabel: `${standardVersion} ${matched.sourceTable}：${matched.label}`,
        notes: mergeNote(
          row.notes,
          `${matched.sourceTable} ${matched.label} 已自动带入默认值。`
        ),
      };
    });

    reset({ rows: nextRows });
    setStatusMessage("已按当前标准版本为全部可匹配记录带入推荐因子，并同步 DMI。");
  };

  const markRowManual = (index: number, label: string) => {
    setValue(`rows.${index}.parameterSourceType`, "manual_input", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`rows.${index}.parameterSourceLabel`, label, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleMethodChange = (
    index: number,
    value: "defaultEF" | "calculatedEF" | "measuredEF"
  ) => {
    const row = watchedRows[index];
    const livestockRow = livestockRows[index];

    if (!row) return;

    if (value === "defaultEF") {
      const matched = getEntericDefaultFactor(
        standardVersion,
        row.species,
        row.stage
      );

      setValue(`rows.${index}.method`, "defaultEF", { shouldValidate: true });

      if (!matched) {
        setValue(`rows.${index}.parameterSourceType`, "manual_input", {
          shouldValidate: true,
        });
        setValue(
          `rows.${index}.parameterSourceLabel`,
          "未匹配默认因子，需手动填写",
          {
            shouldValidate: true,
          }
        );
        setStatusMessage(
          `第 ${index + 1} 行切换到推荐因子法，但未匹配到默认值，请手动填写。`
        );
        return;
      }

      setValue(`rows.${index}.emissionFactor`, matched.emissionFactor, {
        shouldValidate: true,
      });
      setValue(`rows.${index}.ymPercent`, undefined, {
        shouldValidate: false,
      });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, {
        shouldValidate: false,
      });
      setValue(`rows.${index}.parameterSourceType`, "default_library", {
        shouldValidate: true,
      });
      setValue(
        `rows.${index}.parameterSourceLabel`,
        `${standardVersion} ${matched.sourceTable}：${matched.label}`,
        {
          shouldValidate: true,
        }
      );
      setValue(
        `rows.${index}.notes`,
        mergeNote(
          row.notes,
          `${matched.sourceTable} ${matched.label} 已自动带入默认值。`
        ),
        { shouldValidate: true }
      );

      setStatusMessage(`第 ${index + 1} 行已自动带入推荐因子。`);
      return;
    }

    setValue(`rows.${index}.method`, value, { shouldValidate: true });

    if (value === "calculatedEF") {
      const ymMatched = getEntericYmDefault(
        standardVersion,
        row.species,
        row.stage
      );
      const livestockDmi = livestockRow ? getLivestockDmiValue(livestockRow) : undefined;

      setValue(`rows.${index}.emissionFactor`, undefined, {
        shouldValidate: false,
      });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, {
        shouldValidate: false,
      });

      if (livestockDmi !== undefined) {
        setValue(`rows.${index}.dmiKgPerHeadDay`, livestockDmi, {
          shouldValidate: true,
        });
        setValue(
          `rows.${index}.notes`,
          mergeNote(
            row.notes,
            `DMI 已从养殖活动页同步：${getLivestockDmiSourceLabel(livestockRow!)}`
          ),
          { shouldValidate: true }
        );
      }

      if (ymMatched) {
        setValue(`rows.${index}.ymPercent`, ymMatched.ymPercent, {
          shouldValidate: true,
        });
        setValue(`rows.${index}.parameterSourceType`, "default_library", {
          shouldValidate: true,
        });
        setValue(
          `rows.${index}.parameterSourceLabel`,
          `${standardVersion} ${ymMatched.sourceTable}：${ymMatched.label}`,
          {
            shouldValidate: true,
          }
        );
        setValue(
          `rows.${index}.notes`,
          mergeNote(
            watchedRows[index]?.notes,
            `${ymMatched.sourceTable} ${ymMatched.label} 的 Ym 已自动带入默认值。`
          ),
          { shouldValidate: true }
        );
        setStatusMessage(`第 ${index + 1} 行已自动带入 Ym 缺省值。`);
      } else {
        setValue(`rows.${index}.ymPercent`, undefined, {
          shouldValidate: false,
        });
        markRowManual(index, "计算法：需手工输入 DMI / Ym");
        setStatusMessage(
          `第 ${index + 1} 行切换到计算法，但未匹配到 Ym 缺省值，请手动填写 Ym。`
        );
      }
      return;
    }

    if (value === "measuredEF") {
      setValue(`rows.${index}.ymPercent`, undefined, {
        shouldValidate: false,
      });
      setValue(`rows.${index}.geMJPerHeadDay`, undefined, {
        shouldValidate: false,
      });
      markRowManual(index, "实测/手工输入排放因子");
      setStatusMessage(`第 ${index + 1} 行已切换到实测/手工因子法。`);
    }
  };

  const onSubmit = (values: EntericCH4FormValues) => {
    const rows: EntericRecord[] = values.rows.map((row, index) => {
      const previewRow = calculationPreview.rows[index];

      return {
        sourceLivestockIndex: row.sourceLivestockIndex,
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
        emissionFactor:
          row.method === "calculatedEF"
            ? previewRow?.emissionFactor ?? 0
            : row.emissionFactor ?? 0,

        dmiKgPerHeadDay: row.dmiKgPerHeadDay,
        ymPercent: row.ymPercent,
        geMJPerHeadDay:
          row.method === "calculatedEF"
            ? previewRow?.geMJPerHeadDay ?? 0
            : row.geMJPerHeadDay,

        unit: "kg CH4/head/year",
        parameterSourceType: row.parameterSourceType,
        parameterSourceLabel: row.parameterSourceLabel,
        notes: row.notes.trim() ? row.notes.trim() : undefined,
      };
    });

    saveEntericDraft(rows);
    setStatusMessage("已保存细化后的肠道发酵 CH4 草稿。");
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
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Enteric CH4</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              动物肠道发酵 CH4（细化版）
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
                <h2 className="text-lg font-semibold">1. 活动数据 AP 与因子 EF 录入</h2>
                <p className="mt-2 text-sm text-slate-600">
                  这里的畜种、阶段和 DMI 优先从“养殖活动数据”同步。若养殖活动页已直接录入 DMI 或按饲料台账反推 DMI，这里会优先读取该值。
                </p>
              </div>

              <button
                type="button"
                onClick={applyDefaultFactorForAll}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                为全部记录带入推荐因子
              </button>
            </div>

            <div className="space-y-8">
              {watchedRows.map((row, index) => {
                const rowPreview = calculationPreview.rows[index];
                const rowSourceType =
                  row.parameterSourceType ?? "manual_input";
                const rowSourceLabel =
                  row.parameterSourceLabel ?? "手工输入";
                const livestockRow = livestockRows[index];
                const livestockDmi = livestockRow
                  ? getLivestockDmiValue(livestockRow)
                  : undefined;

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          记录 {index + 1}：{row.species} / {row.stage}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          计算后 AP：
                          {fmt(rowPreview?.activityPopulation)} 头（只）
                          {" "}· EF：
                          {fmt(rowPreview?.emissionFactor)} kg CH4/头·年
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => applyDefaultFactorForRow(index)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          带入推荐因子
                        </button>

                        <span className={sourceBadgeClass(rowSourceType)}>
                          {getParameterSourceDisplay(rowSourceType)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {rowSourceLabel}
                        </span>
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
                      {...register(`rows.${index}.parameterSourceType`)}
                    />
                    <input
                      type="hidden"
                      {...register(`rows.${index}.parameterSourceLabel`)}
                    />

                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

                      <label className="block xl:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          活动数据收集方式
                        </span>
                        <select
                          {...register(`rows.${index}.activityDataMethod`, {
                            onChange: () =>
                              markRowManual(index, "手工修改活动数据收集方式"),
                          })}
                          className={inputClass}
                        >
                          <option value="annualAveragePopulation">
                            直接录入年平均存栏 AP
                          </option>
                          <option value="monthlyAveragePopulation">
                            录入 12 个月存栏自动平均
                          </option>
                          <option value="turnoverCalculation">
                            短生长期动物：NA × DA / 365
                          </option>
                        </select>
                      </label>
                    </div>

                    {row.activityDataMethod === "annualAveragePopulation" ? (
                      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            年平均存栏 AP（头/只）
                          </span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.annualAveragePopulation`, {
                              valueAsNumber: true,
                              onChange: () =>
                                markRowManual(index, "手工录入年平均存栏 AP"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.annualAveragePopulation?.message ? (
                            <p className={errorClass}>
                              {String(
                                errors.rows[index]?.annualAveragePopulation?.message
                              )}
                            </p>
                          ) : null}
                        </label>
                      </div>
                    ) : null}

                    {row.activityDataMethod === "monthlyAveragePopulation" ? (
                      <div className="mb-6">
                        <p className="mb-3 text-sm font-medium text-slate-700">
                          12 个月存栏数据
                        </p>
                        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                          {monthFields.map((month) => (
                            <label key={month.key} className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">
                                {month.label}
                              </span>
                              <input
                                type="number"
                                step="any"
                                {...register(`rows.${index}.${month.key}` as const, {
                                  valueAsNumber: true,
                                  onChange: () =>
                                    markRowManual(index, "手工录入 12 个月存栏"),
                                })}
                                className={inputClass}
                              />
                              {errors.rows?.[index]?.[month.key]?.message ? (
                                <p className={errorClass}>
                                  {String(errors.rows[index]?.[month.key]?.message)}
                                </p>
                              ) : null}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {row.activityDataMethod === "turnoverCalculation" ? (
                      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            年度饲养量 NA（头/只）
                          </span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.annualThroughput`, {
                              valueAsNumber: true,
                              onChange: () =>
                                markRowManual(index, "手工录入 NA 与 DA 折算 AP"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.annualThroughput?.message ? (
                            <p className={errorClass}>
                              {String(errors.rows[index]?.annualThroughput?.message)}
                            </p>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            生长天数 DA（天）
                          </span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.daysAlive`, {
                              valueAsNumber: true,
                              onChange: () =>
                                markRowManual(index, "手工录入 NA 与 DA 折算 AP"),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.daysAlive?.message ? (
                            <p className={errorClass}>
                              {String(errors.rows[index]?.daysAlive?.message)}
                            </p>
                          ) : null}
                        </label>
                      </div>
                    ) : null}

                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="block xl:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          排放因子获取方式
                        </span>
                        <select
                          value={
                            row.method === "customEF" ? "measuredEF" : row.method
                          }
                          onChange={(e) =>
                            handleMethodChange(
                              index,
                              e.target.value as
                                | "defaultEF"
                                | "calculatedEF"
                                | "measuredEF"
                            )
                          }
                          className={inputClass}
                        >
                          <option value="defaultEF">推荐因子法</option>
                          <option value="calculatedEF">计算法（DMI + Ym）</option>
                          <option value="measuredEF">实测/手工因子法</option>
                        </select>
                      </label>
                    </div>

                    {row.method === "defaultEF" || row.method === "measuredEF" ? (
                      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            排放因子 EF（kg CH4/头·年）
                          </span>
                          <input
                            type="number"
                            step="any"
                            {...register(`rows.${index}.emissionFactor`, {
                              valueAsNumber: true,
                              onChange: () =>
                                markRowManual(
                                  index,
                                  row.method === "defaultEF"
                                    ? "手工覆盖推荐因子"
                                    : "手工/实测录入排放因子"
                                ),
                            })}
                            className={inputClass}
                          />
                          {errors.rows?.[index]?.emissionFactor?.message ? (
                            <p className={errorClass}>
                              {String(errors.rows[index]?.emissionFactor?.message)}
                            </p>
                          ) : null}
                        </label>
                      </div>
                    ) : null}

                    {row.method === "calculatedEF" ? (
                      <>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          <p>
                            当前养殖活动页 DMI 来源：
                            {livestockRow ? getLivestockDmiSourceLabel(livestockRow) : "无"}
                          </p>
                          <p className="mt-1">
                            当前可同步 DMI：
                            {livestockDmi !== undefined ? `${fmt(livestockDmi, 4)} kg DM/头·日` : "未提供"}
                          </p>
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => syncDmiFromLivestock(index)}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              从养殖活动页同步 DMI
                            </button>
                          </div>
                        </div>

                        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              DMI（kg/头·天）
                            </span>
                            <input
                              type="number"
                              step="any"
                              {...register(`rows.${index}.dmiKgPerHeadDay`, {
                                valueAsNumber: true,
                                onChange: () =>
                                  markRowManual(index, "按公式计算 EF，手工修改 DMI"),
                              })}
                              className={inputClass}
                            />
                            {errors.rows?.[index]?.dmiKgPerHeadDay?.message ? (
                              <p className={errorClass}>
                                {String(errors.rows[index]?.dmiKgPerHeadDay?.message)}
                              </p>
                            ) : null}
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              Ym（%）
                            </span>
                            <input
                              type="number"
                              step="any"
                              {...register(`rows.${index}.ymPercent`, {
                                valueAsNumber: true,
                                onChange: () =>
                                  markRowManual(index, "按公式计算 EF，手工修改 Ym"),
                              })}
                              className={inputClass}
                            />
                            {errors.rows?.[index]?.ymPercent?.message ? (
                              <p className={errorClass}>
                                {String(errors.rows[index]?.ymPercent?.message)}
                              </p>
                            ) : null}
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              自动计算 GE（MJ/头·天）
                            </span>
                            <div className={readonlyClass}>
                              {fmt(rowPreview?.geMJPerHeadDay)}
                            </div>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              自动计算 EF（kg CH4/头·年）
                            </span>
                            <div className={readonlyClass}>
                              {fmt(rowPreview?.emissionFactor)}
                            </div>
                          </label>
                        </div>
                      </>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        备注
                      </span>
                      <textarea
                        {...register(`rows.${index}.notes`, {
                          onChange: () =>
                            markRowManual(index, "手工补充说明"),
                        })}
                        rows={3}
                        className={inputClass}
                        placeholder="可填写活动数据来源、因子来源、测定说明等"
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
            <h2 className="text-lg font-semibold">2. 汇总预览</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={readonlyClass}>
                总 CH4：
                {fmt(calculationPreview.totalCH4TPerYear)} t/yr
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>这里的动物/阶段始终跟随养殖活动页同步；当养殖活动页已形成 DMI 时，这里会优先读取该值。</p>
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
                    <th className="border-b border-slate-200 px-3 py-2">AP方法</th>
                    <th className="border-b border-slate-200 px-3 py-2">EF方法</th>
                    <th className="border-b border-slate-200 px-3 py-2">AP</th>
                    <th className="border-b border-slate-200 px-3 py-2">DMI</th>
                    <th className="border-b border-slate-200 px-3 py-2">Ym</th>
                    <th className="border-b border-slate-200 px-3 py-2">GE</th>
                    <th className="border-b border-slate-200 px-3 py-2">EF</th>
                    <th className="border-b border-slate-200 px-3 py-2">t CH4/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationPreview.rows.map((previewRow, index) => (
                    <tr key={`${previewRow.species}-${previewRow.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {previewRow.species}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {previewRow.stage}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {previewRow.activityDataMethod}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {previewRow.method}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.activityPopulation)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.dmiKgPerHeadDay, 4)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.ymPercent)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.geMJPerHeadDay)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.emissionFactor)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {fmt(previewRow.ch4TPerYear)}
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
              {isSubmitting ? "保存中..." : "保存细化后的肠道发酵草稿"}
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