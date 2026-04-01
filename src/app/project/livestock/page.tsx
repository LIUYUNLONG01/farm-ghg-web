'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  DMI_METHOD_OPTIONS,
  FEEDING_SITUATION_OPTIONS,
  getDefaultStageForSpecies,
  inferProductionPurpose,
  LIVESTOCK_SPECIES_OPTIONS,
  LIVESTOCK_STAGE_OPTIONS,
  normalizeLivestockSpecies,
  normalizeLivestockStage,
  POPULATION_MODE_OPTIONS,
  PRODUCTION_PURPOSE_OPTIONS,
  type LivestockSpeciesOption,
} from "@/data/livestockStandardOptions";
import {
  loadProjectDraft,
  saveLivestockDraft,
} from "@/lib/utils/projectDraftStorage";
import type {
  DMIAcquisitionMethod,
  FeedLedgerDirection,
  FeedLedgerRecord,
  FeedSourceType,
  FeedingSituation,
  LivestockMonthlyChangeRecord,
  LivestockPopulationMode,
  LivestockProductionPurpose,
  LivestockRecord,
} from "@/types/ghg";

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown, digits = 2) {
  return safeNumber(value).toFixed(digits);
}

function createDefaultMonthlyRecords(initialHead = 0): LivestockMonthlyChangeRecord[] {
  const records: LivestockMonthlyChangeRecord[] = [];

  for (let month = 1; month <= 12; month += 1) {
    records.push({
      month,
      openingHead: month === 1 ? initialHead : 0,
      births: 0,
      transferredIn: 0,
      purchasedIn: 0,
      culled: 0,
      sold: 0,
      transferredOut: 0,
      deaths: 0,
      closingHead: month === 1 ? initialHead : 0,
    });
  }

  return recomputeMonthlyRecords(records);
}

function recomputeMonthlyRecords(
  monthlyRecords: LivestockMonthlyChangeRecord[]
): LivestockMonthlyChangeRecord[] {
  const cloned = monthlyRecords.map((item) => ({ ...item }));

  for (let i = 0; i < cloned.length; i += 1) {
    const current = cloned[i];

    const opening =
      i === 0 ? safeNumber(current.openingHead) : safeNumber(cloned[i - 1].closingHead);

    const additions =
      safeNumber(current.births) +
      safeNumber(current.transferredIn) +
      safeNumber(current.purchasedIn);

    const reductions =
      safeNumber(current.culled) +
      safeNumber(current.sold) +
      safeNumber(current.transferredOut) +
      safeNumber(current.deaths);

    const closing = Math.max(0, opening + additions - reductions);

    current.openingHead = opening;
    current.closingHead = closing;

    if (i < cloned.length - 1) {
      cloned[i + 1].openingHead = closing;
    }
  }

  return cloned;
}

function calcAnnualAverageHead(monthlyRecords: LivestockMonthlyChangeRecord[]) {
  if (!monthlyRecords.length) return 0;

  const total = monthlyRecords.reduce((sum, row) => {
    return sum + (safeNumber(row.openingHead) + safeNumber(row.closingHead)) / 2;
  }, 0);

  return total / 12;
}

function calcAnnualOutputHead(monthlyRecords: LivestockMonthlyChangeRecord[]) {
  return monthlyRecords.reduce((sum, row) => {
    return (
      sum +
      safeNumber(row.culled) +
      safeNumber(row.sold) +
      safeNumber(row.transferredOut)
    );
  }, 0);
}

function calcHeadDays(row: LivestockRecord) {
  const monthlyRecords = row.monthlyRecords ?? [];
  if (monthlyRecords.length === 12) {
    return monthlyRecords.reduce((sum, monthRow, index) => {
      const avgHead =
        (safeNumber(monthRow.openingHead) + safeNumber(monthRow.closingHead)) / 2;
      return sum + avgHead * MONTH_DAYS[index];
    }, 0);
  }

  if (
    row.populationMode === "turnover" &&
    safeNumber(row.annualOutputHead) > 0 &&
    safeNumber(row.feedingDays) > 0
  ) {
    return safeNumber(row.annualOutputHead) * safeNumber(row.feedingDays);
  }

  return safeNumber(row.annualAverageHead) * 365;
}

function calcFeedLedgerDMI(
  row: LivestockRecord,
  sourceIndex: number,
  feedLedger: FeedLedgerRecord[]
) {
  const outboundRows = feedLedger.filter(
    (item) =>
      item.direction === "outbound" &&
      item.targetGroupSourceLivestockIndex === sourceIndex
  );

  const totalDryMatterKg = outboundRows.reduce((sum, item) => {
    const quantityTon = safeNumber(item.quantityTon);
    const moisturePercent = safeNumber(item.moisturePercent);
    const dryMatterRate = Math.max(0, 1 - moisturePercent / 100);
    return sum + quantityTon * 1000 * dryMatterRate;
  }, 0);

  const headDays = calcHeadDays(row);
  const dmiKgPerHeadDay = headDays > 0 ? totalDryMatterKg / headDays : 0;

  return {
    totalDryMatterKg,
    headDays,
    dmiKgPerHeadDay,
    outboundCount: outboundRows.length,
  };
}

function createEmptyRow(): LivestockRecord {
  const species: LivestockSpeciesOption = "奶牛";
  const stage = getDefaultStageForSpecies(species);

  return {
    species,
    stage,
    productionPurpose: inferProductionPurpose(species, stage),
    populationMode: "static",
    annualAverageHead: 0,
    annualOutputHead: 0,
    feedingDays: undefined,
    monthlyRecords: createDefaultMonthlyRecords(0),

    openingWeightKg: undefined,
    closingWeightKg: undefined,
    averageDailyGainKg: undefined,
    matureWeightKg: undefined,

    milkYieldKgPerYear: undefined,
    milkFatPercent: undefined,
    pregnancyRatePercent: undefined,
    feedingSituation: "舍饲",

    dmiMethod: "direct_input",
    dmiKgPerHeadDay: undefined,
    dePercent: undefined,
    nemaMJPerKgDM: undefined,

    notes: "",
  };
}

function createEmptyFeedEntry(direction: FeedLedgerDirection): FeedLedgerRecord {
  return {
    id: `${direction}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction,
    feedName: "",
    moisturePercent: 0,
    recordDate: "",
    targetGroupSourceLivestockIndex: undefined,
    quantityTon: 0,
    responsiblePerson: "",
    feedSourceType: "未知",
    notes: "",
  };
}

function normalizeRowFromDraft(row: LivestockRecord): LivestockRecord {
  const normalizedSpecies = normalizeLivestockSpecies(row.species);
  const normalizedStage = normalizeLivestockStage(normalizedSpecies, row.stage);

  let monthlyRecords: LivestockMonthlyChangeRecord[];

  if (row.monthlyRecords && row.monthlyRecords.length === 12) {
    monthlyRecords = recomputeMonthlyRecords(
      row.monthlyRecords.map((item, index) => ({
        month: index + 1,
        openingHead: safeNumber(item.openingHead),
        births: safeNumber(item.births),
        transferredIn: safeNumber(item.transferredIn),
        purchasedIn: safeNumber(item.purchasedIn),
        culled: safeNumber(item.culled),
        sold: safeNumber(item.sold),
        transferredOut: safeNumber(item.transferredOut),
        deaths: safeNumber(item.deaths),
        closingHead: safeNumber(item.closingHead),
      }))
    );
  } else {
    monthlyRecords = createDefaultMonthlyRecords(safeNumber(row.annualAverageHead));
  }

  const annualAverageHead = calcAnnualAverageHead(monthlyRecords);
  const computedAnnualOutputHead = calcAnnualOutputHead(monthlyRecords);

  return {
    species: normalizedSpecies,
    stage: normalizedStage,
    productionPurpose:
      row.productionPurpose ?? inferProductionPurpose(normalizedSpecies, normalizedStage),
    populationMode:
      row.populationMode ??
      (safeNumber(row.annualOutputHead) > 0 &&
      safeNumber(row.feedingDays) > 0 &&
      safeNumber(row.feedingDays) < 365
        ? "turnover"
        : "static"),
    annualAverageHead,
    annualOutputHead:
      safeNumber(row.annualOutputHead) > 0
        ? safeNumber(row.annualOutputHead)
        : computedAnnualOutputHead,
    feedingDays: row.feedingDays,
    monthlyRecords,

    openingWeightKg: row.openingWeightKg,
    closingWeightKg: row.closingWeightKg,
    averageDailyGainKg: row.averageDailyGainKg,
    matureWeightKg: row.matureWeightKg,

    milkYieldKgPerYear: row.milkYieldKgPerYear,
    milkFatPercent: row.milkFatPercent,
    pregnancyRatePercent: row.pregnancyRatePercent,
    feedingSituation: (row.feedingSituation ?? "舍饲") as FeedingSituation,

    dmiMethod: (row.dmiMethod ?? "direct_input") as DMIAcquisitionMethod,
    dmiKgPerHeadDay: row.dmiKgPerHeadDay,
    dePercent: row.dePercent,
    nemaMJPerKgDM: row.nemaMJPerKgDM,

    notes: row.notes ?? "",
  };
}

export default function LivestockPage() {
  const [projectName, setProjectName] = useState("");
  const [rows, setRows] = useState<LivestockRecord[]>([createEmptyRow()]);
  const [feedLedger, setFeedLedger] = useState<FeedLedgerRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");

    if (draft.livestock && draft.livestock.length > 0) {
      setRows(draft.livestock.map(normalizeRowFromDraft));
    }

    if (draft.feedLedger && draft.feedLedger.length > 0) {
      setFeedLedger(draft.feedLedger);
    }

    if (
      (draft.livestock && draft.livestock.length > 0) ||
      (draft.feedLedger && draft.feedLedger.length > 0)
    ) {
      setStatusMessage("已加载养殖活动与饲料台账草稿，并按新结构完成标准化。");
    }
  }, []);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));

    setFeedLedger((prev) =>
      prev
        .filter((item) => item.targetGroupSourceLivestockIndex !== index)
        .map((item) => ({
          ...item,
          targetGroupSourceLivestockIndex:
            item.targetGroupSourceLivestockIndex !== undefined &&
            item.targetGroupSourceLivestockIndex > index
              ? item.targetGroupSourceLivestockIndex - 1
              : item.targetGroupSourceLivestockIndex,
        }))
    );
  };

  const updateRow = <K extends keyof LivestockRecord>(
    index: number,
    key: K,
    value: LivestockRecord[K]
  ) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const nextRow = { ...row, [key]: value };

        if (key === "species") {
          const species = value as string;
          const normalizedSpecies = normalizeLivestockSpecies(species);
          const nextStage = getDefaultStageForSpecies(normalizedSpecies);
          nextRow.species = normalizedSpecies;
          nextRow.stage = nextStage;
          nextRow.productionPurpose = inferProductionPurpose(
            normalizedSpecies,
            nextStage
          );
        }

        if (key === "stage") {
          nextRow.productionPurpose = inferProductionPurpose(
            nextRow.species,
            String(value)
          );
        }

        return nextRow;
      })
    );
  };

  const updateMonthlyField = (
    rowIndex: number,
    monthIndex: number,
    field: keyof Omit<LivestockMonthlyChangeRecord, "month">
  ) => {
    return (value: string) => {
      setRows((prev) =>
        prev.map((row, i) => {
          if (i !== rowIndex) return row;

          const monthlyRecords = recomputeMonthlyRecords(
            (row.monthlyRecords ?? createDefaultMonthlyRecords()).map((item, idx) => {
              if (idx !== monthIndex) return { ...item };
              return {
                ...item,
                [field]: Number(value),
              };
            })
          );

          return {
            ...row,
            monthlyRecords,
            annualAverageHead: calcAnnualAverageHead(monthlyRecords),
            annualOutputHead:
              row.populationMode === "turnover"
                ? safeNumber(row.annualOutputHead) > 0
                  ? row.annualOutputHead
                  : calcAnnualOutputHead(monthlyRecords)
                : calcAnnualOutputHead(monthlyRecords),
          };
        })
      );
    };
  };

  const addFeedEntry = (direction: FeedLedgerDirection) => {
    setFeedLedger((prev) => [...prev, createEmptyFeedEntry(direction)]);
  };

  const updateFeedEntry = <K extends keyof FeedLedgerRecord>(
    index: number,
    key: K,
    value: FeedLedgerRecord[K]
  ) => {
    setFeedLedger((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [key]: value,
        };
      })
    );
  };

  const removeFeedEntry = (index: number) => {
    setFeedLedger((prev) => prev.filter((_, i) => i !== index));
  };

  const dmiLedgerPreview = useMemo(() => {
    return rows.map((row, index) => calcFeedLedgerDMI(row, index, feedLedger));
  }, [rows, feedLedger]);

  const overallSummary = useMemo(() => {
    const totalAnnualAverageHead = rows.reduce(
      (sum, row) => sum + safeNumber(row.annualAverageHead),
      0
    );

    const rowsWithDMI = rows.filter((row, index) => {
      if (row.dmiMethod === "feed_ledger") {
        return safeNumber(dmiLedgerPreview[index]?.dmiKgPerHeadDay) > 0;
      }
      return safeNumber(row.dmiKgPerHeadDay) > 0;
    }).length;

    return {
      totalAnnualAverageHead,
      rowsWithDMI,
      totalRows: rows.length,
      totalFeedEntries: feedLedger.length,
    };
  }, [rows, feedLedger, dmiLedgerPreview]);

  const handleSave = () => {
    const normalized = rows.map((row, index) => {
      const monthlyRecords = recomputeMonthlyRecords(
        row.monthlyRecords ?? createDefaultMonthlyRecords()
      );

      const annualAverageHead = calcAnnualAverageHead(monthlyRecords);
      const computedAnnualOutputHead = calcAnnualOutputHead(monthlyRecords);
      const ledgerDMI = calcFeedLedgerDMI(row, index, feedLedger).dmiKgPerHeadDay;

      return {
        ...row,
        monthlyRecords,
        annualAverageHead,
        annualOutputHead:
          row.populationMode === "turnover"
            ? safeNumber(row.annualOutputHead) > 0
              ? safeNumber(row.annualOutputHead)
              : computedAnnualOutputHead
            : computedAnnualOutputHead,
        dmiKgPerHeadDay:
          row.dmiMethod === "feed_ledger"
            ? ledgerDMI
            : row.dmiKgPerHeadDay,
      };
    });

    setRows(normalized);
    saveLivestockDraft(normalized, feedLedger);
    setStatusMessage("已保存养殖活动数据和饲料台账草稿。");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Livestock Activity</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              养殖活动数据
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/new"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回基础信息
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
              <h2 className="text-lg font-semibold">1. 群体定义 + 月度动态 + DMI</h2>
              <p className="mt-2 text-sm text-slate-600">
                这一轮把“养殖活动数据”升级成统一底座：同一条群体记录内，同时采集标准动物/阶段、月度动态、生产性能与 DMI 获取方式；后续仍继续自动生成 annualAverageHead / annualOutputHead / feedingDays 供 enteric 和 manure 模块调用。
              </p>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              新增一条记录
            </button>
          </div>

          <div className="space-y-8">
            {rows.map((row, rowIndex) => {
              const stageOptions =
                LIVESTOCK_STAGE_OPTIONS[
                  normalizeLivestockSpecies(row.species) as LivestockSpeciesOption
                ];
              const monthlyRecords =
                row.monthlyRecords ?? createDefaultMonthlyRecords();
              const ledgerPreview = dmiLedgerPreview[rowIndex];

              return (
                <div
                  key={`${row.species}-${row.stage}-${rowIndex}`}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      记录 {rowIndex + 1}
                    </h3>
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        标准动物类别
                      </span>
                      <select
                        value={row.species}
                        onChange={(e) =>
                          updateRow(rowIndex, "species", e.target.value)
                        }
                        className={inputClass}
                      >
                        {LIVESTOCK_SPECIES_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        标准阶段
                      </span>
                      <select
                        value={row.stage}
                        onChange={(e) =>
                          updateRow(rowIndex, "stage", e.target.value)
                        }
                        className={inputClass}
                      >
                        {stageOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        生产功能
                      </span>
                      <select
                        value={row.productionPurpose ?? "其它"}
                        onChange={(e) =>
                          updateRow(
                            rowIndex,
                            "productionPurpose",
                            e.target.value as LivestockProductionPurpose
                          )
                        }
                        className={inputClass}
                      >
                        {PRODUCTION_PURPOSE_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        群体类型
                      </span>
                      <select
                        value={row.populationMode ?? "static"}
                        onChange={(e) =>
                          updateRow(
                            rowIndex,
                            "populationMode",
                            e.target.value as LivestockPopulationMode
                          )
                        }
                        className={inputClass}
                      >
                        {POPULATION_MODE_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        饲养周期天数（周转群体）
                      </span>
                      <input
                        type="number"
                        step="1"
                        value={row.feedingDays ?? ""}
                        onChange={(e) =>
                          updateRow(
                            rowIndex,
                            "feedingDays",
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium text-slate-900">月度动态管理</p>
                      <p className="text-sm text-slate-500">
                        月初 + 新增 - 减少 = 月末；下月月初自动承接上月月末
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[1400px] border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr className="text-left text-slate-600">
                            <th className="border-b border-slate-200 px-3 py-2">月份</th>
                            <th className="border-b border-slate-200 px-3 py-2">月初存栏</th>
                            <th className="border-b border-slate-200 px-3 py-2">出生</th>
                            <th className="border-b border-slate-200 px-3 py-2">转入</th>
                            <th className="border-b border-slate-200 px-3 py-2">购入</th>
                            <th className="border-b border-slate-200 px-3 py-2">新增小计</th>
                            <th className="border-b border-slate-200 px-3 py-2">淘汰</th>
                            <th className="border-b border-slate-200 px-3 py-2">出售</th>
                            <th className="border-b border-slate-200 px-3 py-2">转出</th>
                            <th className="border-b border-slate-200 px-3 py-2">死亡</th>
                            <th className="border-b border-slate-200 px-3 py-2">减少小计</th>
                            <th className="border-b border-slate-200 px-3 py-2">月末存栏</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyRecords.map((monthRow, monthIndex) => {
                            const additions =
                              safeNumber(monthRow.births) +
                              safeNumber(monthRow.transferredIn) +
                              safeNumber(monthRow.purchasedIn);

                            const reductions =
                              safeNumber(monthRow.culled) +
                              safeNumber(monthRow.sold) +
                              safeNumber(monthRow.transferredOut) +
                              safeNumber(monthRow.deaths);

                            return (
                              <tr key={`${rowIndex}-${monthRow.month}`}>
                                <td className="border-b border-slate-100 px-3 py-2">
                                  {monthRow.month}月
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  {monthIndex === 0 ? (
                                    <input
                                      type="number"
                                      step="1"
                                      value={monthRow.openingHead}
                                      onChange={(e) =>
                                        updateMonthlyField(
                                          rowIndex,
                                          monthIndex,
                                          "openingHead"
                                        )(e.target.value)
                                      }
                                      className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                                    />
                                  ) : (
                                    <div className="w-28 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
                                      {fmt(monthRow.openingHead, 0)}
                                    </div>
                                  )}
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.births}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "births"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.transferredIn}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "transferredIn"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.purchasedIn}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "purchasedIn"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <div className="w-24 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
                                    {fmt(additions, 0)}
                                  </div>
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.culled}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "culled"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.sold}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "sold"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.transferredOut}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "transferredOut"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={monthRow.deaths}
                                    onChange={(e) =>
                                      updateMonthlyField(
                                        rowIndex,
                                        monthIndex,
                                        "deaths"
                                      )(e.target.value)
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <div className="w-24 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
                                    {fmt(reductions, 0)}
                                  </div>
                                </td>

                                <td className="border-b border-slate-100 px-3 py-2">
                                  <div className="w-28 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
                                    {fmt(monthRow.closingHead, 0)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className={readonlyClass}>
                        自动计算年平均存栏 AP：{fmt(calcAnnualAverageHead(monthlyRecords), 3)}
                      </div>
                      <div className={readonlyClass}>
                        自动汇总年出栏量：{fmt(calcAnnualOutputHead(monthlyRecords), 0)}
                      </div>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          年出栏量（可人工校正）
                        </span>
                        <input
                          type="number"
                          step="1"
                          value={row.annualOutputHead ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "annualOutputHead",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-4 font-medium text-slate-900">
                      生产性能与 DMI 获取
                    </p>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          期初平均体重（kg）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.openingWeightKg ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "openingWeightKg",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          期末平均体重（kg）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.closingWeightKg ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "closingWeightKg",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          平均日增重（kg/d）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.averageDailyGainKg ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "averageDailyGainKg",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          成熟体重（kg）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.matureWeightKg ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "matureWeightKg",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          泌乳量（kg/年）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.milkYieldKgPerYear ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "milkYieldKgPerYear",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          乳脂率（%）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.milkFatPercent ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "milkFatPercent",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          妊娠比例（%）
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.pregnancyRatePercent ?? ""}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "pregnancyRatePercent",
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          饲养方式
                        </span>
                        <select
                          value={row.feedingSituation ?? "舍饲"}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "feedingSituation",
                              e.target.value as FeedingSituation
                            )
                          }
                          className={inputClass}
                        >
                          {FEEDING_SITUATION_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block xl:col-span-2">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          DMI 获取方式
                        </span>
                        <select
                          value={row.dmiMethod ?? "direct_input"}
                          onChange={(e) =>
                            updateRow(
                              rowIndex,
                              "dmiMethod",
                              e.target.value as DMIAcquisitionMethod
                            )
                          }
                          className={inputClass}
                        >
                          {DMI_METHOD_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {(row.dmiMethod === "direct_input" ||
                        row.dmiMethod === "temporary_estimate") && (
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">
                            DMI（kg DM/头·日）
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={row.dmiKgPerHeadDay ?? ""}
                            onChange={(e) =>
                              updateRow(
                                rowIndex,
                                "dmiKgPerHeadDay",
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            className={inputClass}
                          />
                        </label>
                      )}

                      {row.dmiMethod === "feed_ledger" && (
                        <>
                          <div className={readonlyClass}>
                            出库记录条数：{ledgerPreview?.outboundCount ?? 0}
                          </div>
                          <div className={readonlyClass}>
                            年度干物质出库量：{fmt(ledgerPreview?.totalDryMatterKg, 2)} kg DM
                          </div>
                          <div className={readonlyClass}>
                            头日数：{fmt(ledgerPreview?.headDays, 2)}
                          </div>
                          <div className={readonlyClass}>
                            自动反推 DMI：{fmt(ledgerPreview?.dmiKgPerHeadDay, 4)} kg DM/头·日
                          </div>
                        </>
                      )}

                      {(row.dmiMethod === "model_de_placeholder" ||
                        row.dmiMethod === "model_nema_placeholder") && (
                        <>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              DE（%）
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={row.dePercent ?? ""}
                              onChange={(e) =>
                                updateRow(
                                  rowIndex,
                                  "dePercent",
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                              className={inputClass}
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                              NEma（MJ/kg DM）
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={row.nemaMJPerKgDM ?? ""}
                              onChange={(e) =>
                                updateRow(
                                  rowIndex,
                                  "nemaMJPerKgDM",
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                              className={inputClass}
                            />
                          </label>
                        </>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      如果你选“后续由饲料台账反推”，系统现在已经会按该群体的饲料出库量、含水率和年度 head-days 自动反推 DMI。  
                      如果你选“后续按 NEma / DE% 模型估算”，下一轮再把自动估算公式接上。
                    </div>
                  </div>

                  <label className="mt-6 block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      备注
                    </span>
                    <textarea
                      rows={3}
                      value={row.notes ?? ""}
                      onChange={(e) =>
                        updateRow(rowIndex, "notes", e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">2. 饲料台账</h2>
              <p className="mt-2 text-sm text-slate-600">
                参考你上传的核查表，这里同时保留入库和出库记录。  
                真正用于反推 DMI 的是“出库记录 × 干物质率 ÷ 头日数”。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => addFeedEntry("inbound")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                新增入库记录
              </button>
              <button
                type="button"
                onClick={() => addFeedEntry("outbound")}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                新增出库记录
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {feedLedger.map((entry, entryIndex) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">
                    台账记录 {entryIndex + 1} · {entry.direction === "inbound" ? "入库" : "出库"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeFeedEntry(entryIndex)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      台账方向
                    </span>
                    <select
                      value={entry.direction}
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "direction",
                          e.target.value as FeedLedgerDirection
                        )
                      }
                      className={inputClass}
                    >
                      <option value="inbound">入库</option>
                      <option value="outbound">出库</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      饲料名称
                    </span>
                    <input
                      value={entry.feedName}
                      onChange={(e) =>
                        updateFeedEntry(entryIndex, "feedName", e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      含水率（%）
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={entry.moisturePercent}
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "moisturePercent",
                          Number(e.target.value)
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      数量（吨）
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={entry.quantityTon}
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "quantityTon",
                          Number(e.target.value)
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      日期
                    </span>
                    <input
                      type="date"
                      value={entry.recordDate}
                      onChange={(e) =>
                        updateFeedEntry(entryIndex, "recordDate", e.target.value)
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      饲喂群体
                    </span>
                    <select
                      value={
                        entry.targetGroupSourceLivestockIndex === undefined
                          ? ""
                          : entry.targetGroupSourceLivestockIndex
                      }
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "targetGroupSourceLivestockIndex",
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">请选择群体</option>
                      {rows.map((row, rowIndex) => (
                        <option key={`${row.species}-${row.stage}-${rowIndex}`} value={rowIndex}>
                          {rowIndex + 1}. {row.species} / {row.stage}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      来源
                    </span>
                    <select
                      value={entry.feedSourceType ?? "未知"}
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "feedSourceType",
                          e.target.value as FeedSourceType
                        )
                      }
                      className={inputClass}
                    >
                      <option value="未知">未知</option>
                      <option value="外购">外购</option>
                      <option value="自产">自产</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      经手人
                    </span>
                    <input
                      value={entry.responsiblePerson ?? ""}
                      onChange={(e) =>
                        updateFeedEntry(
                          entryIndex,
                          "responsiblePerson",
                          e.target.value
                        )
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
                    value={entry.notes ?? ""}
                    onChange={(e) =>
                      updateFeedEntry(entryIndex, "notes", e.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className={readonlyClass}>
                    干物质量：{fmt(entry.quantityTon * 1000 * Math.max(0, 1 - entry.moisturePercent / 100), 2)} kg DM
                  </div>
                  <div className={readonlyClass}>
                    方向：{entry.direction === "inbound" ? "入库" : "出库"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold">3. 当前汇总</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={readonlyClass}>
              群体记录数：{overallSummary.totalRows}
            </div>
            <div className={readonlyClass}>
              年平均存栏合计：{fmt(overallSummary.totalAnnualAverageHead, 3)}
            </div>
            <div className={readonlyClass}>
              已形成 DMI 的群体：{overallSummary.rowsWithDMI}
            </div>
            <div className={readonlyClass}>
              饲料台账记录数：{overallSummary.totalFeedEntries}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>这一步已经支持：按群体的饲料出库量、含水率和 head-days 自动反推 DMI。</p>
            <p>后续 enteric 页只要优先读取 livestock.dmiKgPerHeadDay，就能直接用到这里反推出来的 DMI。</p>
            {statusMessage ? (
              <p className="font-medium text-slate-800">{statusMessage}</p>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
          >
            保存养殖活动草稿
          </button>

          <button
            type="button"
            onClick={addRow}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            再新增一条
          </button>

          <Link
            href="/project/enteric"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            下一步：肠道发酵 CH4
          </Link>
        </div>
      </div>
    </main>
  );
}