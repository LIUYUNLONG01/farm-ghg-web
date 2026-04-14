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
    const opening = i === 0 ? safeNumber(current.openingHead) : safeNumber(cloned[i - 1].closingHead);
    const additions = safeNumber(current.births) + safeNumber(current.transferredIn) + safeNumber(current.purchasedIn);
    const reductions = safeNumber(current.culled) + safeNumber(current.sold) + safeNumber(current.transferredOut) + safeNumber(current.deaths);
    const closing = Math.max(0, opening + additions - reductions);
    current.openingHead = opening;
    current.closingHead = closing;
    if (i < cloned.length - 1) cloned[i + 1].openingHead = closing;
  }
  return cloned;
}

function calcAnnualAverageHead(monthlyRecords: LivestockMonthlyChangeRecord[]) {
  if (!monthlyRecords.length) return 0;
  const total = monthlyRecords.reduce((sum, row) => sum + (safeNumber(row.openingHead) + safeNumber(row.closingHead)) / 2, 0);
  return total / 12;
}

function calcAnnualOutputHead(monthlyRecords: LivestockMonthlyChangeRecord[]) {
  return monthlyRecords.reduce((sum, row) => sum + safeNumber(row.culled) + safeNumber(row.sold) + safeNumber(row.transferredOut), 0);
}

function calcHeadDays(row: LivestockRecord) {
  const monthlyRecords = row.monthlyRecords ?? [];
  if (monthlyRecords.length === 12) {
    return monthlyRecords.reduce((sum, monthRow, index) => {
      const avgHead = (safeNumber(monthRow.openingHead) + safeNumber(monthRow.closingHead)) / 2;
      return sum + avgHead * MONTH_DAYS[index];
    }, 0);
  }
  if (row.populationMode === "turnover" && safeNumber(row.annualOutputHead) > 0 && safeNumber(row.feedingDays) > 0) {
    return safeNumber(row.annualOutputHead) * safeNumber(row.feedingDays);
  }
  return safeNumber(row.annualAverageHead) * 365;
}

function calcFeedLedgerDMI(row: LivestockRecord, sourceIndex: number, feedLedger: FeedLedgerRecord[]) {
  const outboundRows = feedLedger.filter(
    (item) => item.direction === "outbound" && item.targetGroupSourceLivestockIndex === sourceIndex
  );
  const totalDryMatterKg = outboundRows.reduce((sum, item) => {
    const quantityTon = safeNumber(item.quantityTon);
    const moisturePercent = safeNumber(item.moisturePercent);
    const dryMatterRate = Math.max(0, 1 - moisturePercent / 100);
    return sum + quantityTon * 1000 * dryMatterRate;
  }, 0);
  const headDays = calcHeadDays(row);
  const dmiKgPerHeadDay = headDays > 0 ? totalDryMatterKg / headDays : 0;
  return { totalDryMatterKg, headDays, dmiKgPerHeadDay, outboundCount: outboundRows.length };
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
    productionPurpose: row.productionPurpose ?? inferProductionPurpose(normalizedSpecies, normalizedStage),
    populationMode: row.populationMode ?? (safeNumber(row.annualOutputHead) > 0 && safeNumber(row.feedingDays) > 0 && safeNumber(row.feedingDays) < 365 ? "turnover" : "static"),
    annualAverageHead,
    annualOutputHead: safeNumber(row.annualOutputHead) > 0 ? safeNumber(row.annualOutputHead) : computedAnnualOutputHead,
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
    (async () => {
    const draft = await loadProjectDraft();
    if (!draft) return;
    setProjectName(draft.base.enterpriseName || "未命名项目");
    if (draft.livestock && draft.livestock.length > 0) setRows(draft.livestock.map(normalizeRowFromDraft));
    if (draft.feedLedger && draft.feedLedger.length > 0) setFeedLedger(draft.feedLedger);
    if ((draft.livestock && draft.livestock.length > 0) || (draft.feedLedger && draft.feedLedger.length > 0)) {
      setStatusMessage("已加载养殖活动与饲料台账草稿，并按新结构完成标准化。");
    }
    })();
  }, []);

  // ── shared style tokens ──────────────────────────────────────────────────
  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const readonlyClass = "w-full rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-900 font-medium";
  const tableInputClass = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-1 focus:ring-green-100";
  const tableReadonlyClass = "rounded-lg border border-green-100 bg-green-50 px-2.5 py-1.5 text-sm text-green-800 font-medium";

  // ── row handlers ─────────────────────────────────────────────────────────
  const addRow = () => setRows((prev) => [...prev, createEmptyRow()]);

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setFeedLedger((prev) =>
      prev
        .filter((item) => item.targetGroupSourceLivestockIndex !== index)
        .map((item) => ({
          ...item,
          targetGroupSourceLivestockIndex:
            item.targetGroupSourceLivestockIndex !== undefined && item.targetGroupSourceLivestockIndex > index
              ? item.targetGroupSourceLivestockIndex - 1
              : item.targetGroupSourceLivestockIndex,
        }))
    );
  };

  const updateRow = <K extends keyof LivestockRecord>(index: number, key: K, value: LivestockRecord[K]) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const nextRow = { ...row, [key]: value };
        if (key === "species") {
          const normalizedSpecies = normalizeLivestockSpecies(String(value));
          const nextStage = getDefaultStageForSpecies(normalizedSpecies);
          nextRow.species = normalizedSpecies;
          nextRow.stage = nextStage;
          nextRow.productionPurpose = inferProductionPurpose(normalizedSpecies, nextStage);
        }
        if (key === "stage") nextRow.productionPurpose = inferProductionPurpose(nextRow.species, String(value));
        return nextRow;
      })
    );
  };

  const updateMonthlyField = (rowIndex: number, monthIndex: number, field: keyof Omit<LivestockMonthlyChangeRecord, "month">) => {
    return (value: string) => {
      setRows((prev) =>
        prev.map((row, i) => {
          if (i !== rowIndex) return row;
          const monthlyRecords = recomputeMonthlyRecords(
            (row.monthlyRecords ?? createDefaultMonthlyRecords()).map((item, idx) => {
              if (idx !== monthIndex) return { ...item };
              return { ...item, [field]: Number(value) };
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

  // ── feed ledger handlers ─────────────────────────────────────────────────
  const addFeedEntry = (direction: FeedLedgerDirection) => setFeedLedger((prev) => [...prev, createEmptyFeedEntry(direction)]);
  const updateFeedEntry = <K extends keyof FeedLedgerRecord>(index: number, key: K, value: FeedLedgerRecord[K]) => {
    setFeedLedger((prev) => prev.map((item, i) => i !== index ? item : { ...item, [key]: value }));
  };
  const removeFeedEntry = (index: number) => setFeedLedger((prev) => prev.filter((_, i) => i !== index));

  const dmiLedgerPreview = useMemo(() => rows.map((row, index) => calcFeedLedgerDMI(row, index, feedLedger)), [rows, feedLedger]);

  const overallSummary = useMemo(() => {
    const totalAnnualAverageHead = rows.reduce((sum, row) => sum + safeNumber(row.annualAverageHead), 0);
    const rowsWithDMI = rows.filter((row, index) => {
      if (row.dmiMethod === "feed_ledger") return safeNumber(dmiLedgerPreview[index]?.dmiKgPerHeadDay) > 0;
      return safeNumber(row.dmiKgPerHeadDay) > 0;
    }).length;
    return { totalAnnualAverageHead, rowsWithDMI, totalRows: rows.length, totalFeedEntries: feedLedger.length };
  }, [rows, feedLedger, dmiLedgerPreview]);

  const handleSave = () => {
    const normalized = rows.map((row, index) => {
      const monthlyRecords = recomputeMonthlyRecords(row.monthlyRecords ?? createDefaultMonthlyRecords());
      const computedAnnualOutputHead = calcAnnualOutputHead(monthlyRecords);
      const ledgerResult = calcFeedLedgerDMI(row, index, feedLedger);
      const ledgerDMI = ledgerResult.dmiKgPerHeadDay > 0 ? ledgerResult.dmiKgPerHeadDay : undefined;
      return {
        ...row,
        monthlyRecords,
        annualAverageHead: calcAnnualAverageHead(monthlyRecords),
        annualOutputHead: safeNumber(row.annualOutputHead) > 0 ? safeNumber(row.annualOutputHead) : computedAnnualOutputHead,
        dmiKgPerHeadDay: row.dmiMethod === "feed_ledger" ? ledgerDMI : row.dmiKgPerHeadDay,
      };
    });
    setRows(normalized);
    saveLivestockDraft(normalized, feedLedger);
    setStatusMessage("已保存养殖活动数据和饲料台账草稿。");
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
          </div>
          养殖场碳核算平台
        </div>
        <div className="flex gap-2">
          <Link href="/project/new" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回基础信息</Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            Livestock Activity
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">养殖活动数据</h1>
          <p className="mt-2 text-sm text-gray-400">当前项目：{projectName || "未命名项目"}</p>
        </div>

        {/* ── SECTION 1: 群体定义 + 月度动态 + DMI ── */}
        <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-green-50">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                群体定义 + 月度动态 + DMI
              </h2>
              <p className="mt-1.5 text-xs text-gray-400 leading-6 max-w-2xl">
                同一条群体记录内同时采集标准动物/阶段、月度动态、生产性能与 DMI 获取方式；自动生成 annualAverageHead / annualOutputHead / feedingDays 供后续模块调用。
              </p>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增记录
            </button>
          </div>

          <div className="divide-y divide-green-50">
            {rows.map((row, rowIndex) => {
              const stageOptions = LIVESTOCK_STAGE_OPTIONS[normalizeLivestockSpecies(row.species) as LivestockSpeciesOption];
              const monthlyRecords = row.monthlyRecords ?? createDefaultMonthlyRecords();
              const ledgerPreview = dmiLedgerPreview[rowIndex];

              return (
                <div key={`${row.species}-${row.stage}-${rowIndex}`} className="p-6">
                  {/* record header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full border-2 border-green-200 text-green-700 text-xs font-bold flex items-center justify-center">{rowIndex + 1}</span>
                      <span className="text-sm font-semibold text-gray-700">{row.species} / {row.stage}</span>
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                      >
                        删除
                      </button>
                    )}
                  </div>

                  {/* basic fields */}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">标准动物类别</span>
                      <select value={row.species} onChange={(e) => updateRow(rowIndex, "species", e.target.value)} className={inputClass}>
                        {LIVESTOCK_SPECIES_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">标准阶段</span>
                      <select value={row.stage} onChange={(e) => updateRow(rowIndex, "stage", e.target.value)} className={inputClass}>
                        {stageOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">生产功能</span>
                      <select value={row.productionPurpose ?? "其它"} onChange={(e) => updateRow(rowIndex, "productionPurpose", e.target.value as LivestockProductionPurpose)} className={inputClass}>
                        {PRODUCTION_PURPOSE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">群体类型</span>
                      <select value={row.populationMode ?? "static"} onChange={(e) => updateRow(rowIndex, "populationMode", e.target.value as LivestockPopulationMode)} className={inputClass}>
                        {POPULATION_MODE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">饲养周期天数（周转群体）</span>
                      <input
                        type="number" step="1"
                        value={row.feedingDays ?? ""}
                        onChange={(e) => updateRow(rowIndex, "feedingDays", e.target.value === "" ? undefined : Number(e.target.value))}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  {/* monthly table */}
                  <div className="rounded-xl border border-green-100 bg-gray-50 p-4 mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">月度动态管理</p>
                      <p className="text-xs text-gray-400">月初 + 新增 − 减少 = 月末；下月月初自动承接上月月末</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[1400px] border-separate border-spacing-0 text-xs">
                        <thead>
                          <tr className="text-left">
                            {["月份","月初存栏","出生","转入","购入","新增小计","淘汰","出售","转出","死亡","减少小计","月末存栏"].map((h) => (
                              <th key={h} className="border-b border-green-100 px-2.5 py-2 text-green-700 font-semibold bg-green-50 first:rounded-tl-lg last:rounded-tr-lg whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyRecords.map((monthRow, monthIndex) => {
                            const additions = safeNumber(monthRow.births) + safeNumber(monthRow.transferredIn) + safeNumber(monthRow.purchasedIn);
                            const reductions = safeNumber(monthRow.culled) + safeNumber(monthRow.sold) + safeNumber(monthRow.transferredOut) + safeNumber(monthRow.deaths);
                            return (
                              <tr key={`${rowIndex}-${monthRow.month}`} className="hover:bg-green-50/40 transition">
                                <td className="border-b border-gray-100 px-2.5 py-2 font-medium text-gray-600">{monthRow.month}月</td>
                                <td className="border-b border-gray-100 px-2.5 py-2">
                                  {monthIndex === 0 ? (
                                    <input type="number" step="1" value={monthRow.openingHead} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "openingHead")(e.target.value)} className={`w-24 ${tableInputClass}`} />
                                  ) : (
                                    <div className={`w-24 ${tableReadonlyClass}`}>{fmt(monthRow.openingHead, 0)}</div>
                                  )}
                                </td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.births} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "births")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.transferredIn} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "transferredIn")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.purchasedIn} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "purchasedIn")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><div className={`w-20 ${tableReadonlyClass}`}>{fmt(additions, 0)}</div></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.culled} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "culled")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.sold} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "sold")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.transferredOut} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "transferredOut")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><input type="number" step="1" value={monthRow.deaths} onChange={(e) => updateMonthlyField(rowIndex, monthIndex, "deaths")(e.target.value)} className={`w-20 ${tableInputClass}`} /></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><div className={`w-20 ${tableReadonlyClass}`}>{fmt(reductions, 0)}</div></td>
                                <td className="border-b border-gray-100 px-2.5 py-2"><div className={`w-24 ${tableReadonlyClass}`}>{fmt(monthRow.closingHead, 0)}</div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className={readonlyClass}>年平均存栏 AP：{fmt(calcAnnualAverageHead(monthlyRecords), 3)}</div>
                      <div className={readonlyClass}>年出栏量（自动汇总）：{fmt(calcAnnualOutputHead(monthlyRecords), 0)}</div>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">年出栏量（可人工校正）</span>
                        <input
                          type="number" step="1"
                          value={row.annualOutputHead ?? ""}
                          onChange={(e) => updateRow(rowIndex, "annualOutputHead", e.target.value === "" ? undefined : Number(e.target.value))}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* production & DMI */}
                  <div className="rounded-xl border border-green-100 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-4">生产性能与 DMI 获取</p>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "期初平均体重（kg）", key: "openingWeightKg" as const },
                        { label: "期末平均体重（kg）", key: "closingWeightKg" as const },
                        { label: "平均日增重（kg/d）", key: "averageDailyGainKg" as const },
                        { label: "成熟体重（kg）", key: "matureWeightKg" as const },
                        { label: "泌乳量（kg/年）", key: "milkYieldKgPerYear" as const },
                        { label: "乳脂率（%）", key: "milkFatPercent" as const },
                        { label: "妊娠比例（%）", key: "pregnancyRatePercent" as const },
                      ].map(({ label, key }) => (
                        <label key={key} className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                          <input
                            type="number" step="any"
                            value={(row[key] as number | undefined) ?? ""}
                            onChange={(e) => updateRow(rowIndex, key, e.target.value === "" ? undefined : Number(e.target.value))}
                            className={inputClass}
                          />
                        </label>
                      ))}

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">饲养方式</span>
                        <select value={row.feedingSituation ?? "舍饲"} onChange={(e) => updateRow(rowIndex, "feedingSituation", e.target.value as FeedingSituation)} className={inputClass}>
                          {FEEDING_SITUATION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="block xl:col-span-2">
                        <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">DMI 获取方式</span>
                        <select value={row.dmiMethod ?? "direct_input"} onChange={(e) => updateRow(rowIndex, "dmiMethod", e.target.value as DMIAcquisitionMethod)} className={inputClass}>
                          {DMI_METHOD_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </label>

                      {(row.dmiMethod === "direct_input" || row.dmiMethod === "temporary_estimate") && (
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">DMI（kg DM/头·日）</span>
                          <input
                            type="number" step="any"
                            value={row.dmiKgPerHeadDay ?? ""}
                            onChange={(e) => updateRow(rowIndex, "dmiKgPerHeadDay", e.target.value === "" ? undefined : Number(e.target.value))}
                            className={inputClass}
                          />
                        </label>
                      )}

                      {row.dmiMethod === "feed_ledger" && (
                        <>
                          <div className={readonlyClass}>出库记录：{ledgerPreview?.outboundCount ?? 0} 条</div>
                          <div className={readonlyClass}>年度干物质：{fmt(ledgerPreview?.totalDryMatterKg, 2)} kg DM</div>
                          <div className={readonlyClass}>头日数：{fmt(ledgerPreview?.headDays, 2)}</div>
                          <div className={readonlyClass}>反推 DMI：{fmt(ledgerPreview?.dmiKgPerHeadDay, 4)} kg DM/头·日</div>
                        </>
                      )}

                      {(row.dmiMethod === "model_de_placeholder" || row.dmiMethod === "model_nema_placeholder") && (
                        <>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">DE（%）</span>
                            <input type="number" step="any" value={row.dePercent ?? ""} onChange={(e) => updateRow(rowIndex, "dePercent", e.target.value === "" ? undefined : Number(e.target.value))} className={inputClass} />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">NEma（MJ/kg DM）</span>
                            <input type="number" step="any" value={row.nemaMJPerKgDM ?? ""} onChange={(e) => updateRow(rowIndex, "nemaMJPerKgDM", e.target.value === "" ? undefined : Number(e.target.value))} className={inputClass} />
                          </label>
                        </>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-6">
                      选「后续由饲料台账反推」时，系统已按该群体的饲料出库量、含水率和年度 head-days 自动反推 DMI。选「后续按 NEma / DE% 模型估算」时，下一轮再把自动估算公式接上。
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                    <textarea rows={2} value={row.notes ?? ""} onChange={(e) => updateRow(rowIndex, "notes", e.target.value)} className={inputClass} />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 2: 饲料台账 ── */}
        <section className="mt-5 rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-green-50">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                饲料台账
              </h2>
              <p className="mt-1 text-xs text-gray-400 leading-6">
                同时保留入库和出库记录。真正用于反推 DMI 的是「出库记录 × 干物质率 ÷ 头日数」。
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => addFeedEntry("inbound")} className="text-sm px-4 py-2 rounded-xl border border-green-200 text-green-700 bg-white hover:bg-green-50 transition font-medium">
                + 入库记录
              </button>
              <button type="button" onClick={() => addFeedEntry("outbound")} className="text-sm px-4 py-2 rounded-xl bg-green-700 text-white font-medium hover:bg-green-900 transition">
                + 出库记录
              </button>
            </div>
          </div>

          <div className="divide-y divide-green-50">
            {feedLedger.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">暂无台账记录，点击右上角按钮新增</div>
            )}
            {feedLedger.map((entry, entryIndex) => (
              <div key={entry.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${entry.direction === "inbound" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                      {entry.direction === "inbound" ? "入库" : "出库"}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">台账记录 {entryIndex + 1}</span>
                  </div>
                  <button type="button" onClick={() => removeFeedEntry(entryIndex)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">删除</button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">台账方向</span>
                    <select value={entry.direction} onChange={(e) => updateFeedEntry(entryIndex, "direction", e.target.value as FeedLedgerDirection)} className={inputClass}>
                      <option value="inbound">入库</option>
                      <option value="outbound">出库</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">饲料名称</span>
                    <input value={entry.feedName} onChange={(e) => updateFeedEntry(entryIndex, "feedName", e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">含水率（%）</span>
                    <input type="number" step="any" value={entry.moisturePercent} onChange={(e) => updateFeedEntry(entryIndex, "moisturePercent", Number(e.target.value))} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">数量（吨）</span>
                    <input type="number" step="any" value={entry.quantityTon} onChange={(e) => updateFeedEntry(entryIndex, "quantityTon", Number(e.target.value))} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">日期</span>
                    <input type="date" value={entry.recordDate} onChange={(e) => updateFeedEntry(entryIndex, "recordDate", e.target.value)} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">饲喂群体</span>
                    <select
                      value={entry.targetGroupSourceLivestockIndex === undefined ? "" : entry.targetGroupSourceLivestockIndex}
                      onChange={(e) => updateFeedEntry(entryIndex, "targetGroupSourceLivestockIndex", e.target.value === "" ? undefined : Number(e.target.value))}
                      className={inputClass}
                    >
                      <option value="">请选择群体</option>
                      {rows.map((row, rowIndex) => (
                        <option key={`${row.species}-${row.stage}-${rowIndex}`} value={rowIndex}>{rowIndex + 1}. {row.species} / {row.stage}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">来源</span>
                    <select value={entry.feedSourceType ?? "未知"} onChange={(e) => updateFeedEntry(entryIndex, "feedSourceType", e.target.value as FeedSourceType)} className={inputClass}>
                      <option value="未知">未知</option>
                      <option value="外购">外购</option>
                      <option value="自产">自产</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">经手人</span>
                    <input value={entry.responsiblePerson ?? ""} onChange={(e) => updateFeedEntry(entryIndex, "responsiblePerson", e.target.value)} className={inputClass} />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
                  <textarea rows={2} value={entry.notes ?? ""} onChange={(e) => updateFeedEntry(entryIndex, "notes", e.target.value)} className={inputClass} />
                </label>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className={readonlyClass}>干物质量：{fmt(entry.quantityTon * 1000 * Math.max(0, 1 - entry.moisturePercent / 100), 2)} kg DM</div>
                  <div className={readonlyClass}>方向：{entry.direction === "inbound" ? "入库" : "出库"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: 汇总 ── */}
        <section className="mt-5 rounded-2xl border border-dashed border-green-200 bg-green-50/50 p-6">
          <h2 className="text-sm font-semibold text-green-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            当前汇总
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
            <div className={readonlyClass}>群体记录数：{overallSummary.totalRows}</div>
            <div className={readonlyClass}>年平均存栏合计：{fmt(overallSummary.totalAnnualAverageHead, 3)}</div>
            <div className={readonlyClass}>已形成 DMI 的群体：{overallSummary.rowsWithDMI}</div>
            <div className={readonlyClass}>饲料台账记录数：{overallSummary.totalFeedEntries}</div>
          </div>
          <div className="space-y-1.5 text-xs text-green-700 leading-6">
            <p>这一步已支持：按群体的饲料出库量、含水率和 head-days 自动反推 DMI。</p>
            <p>后续 enteric 页只要优先读取 livestock.dmiKgPerHeadDay，就能直接用到这里反推出来的 DMI。</p>
            {statusMessage && <p className="font-semibold text-green-900 mt-2 pt-2 border-t border-green-200">{statusMessage}</p>}
          </div>
        </section>

        {/* ── ACTIONS ── */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 transition"
          >
            保存养殖活动草稿
          </button>
          <button
            type="button"
            onClick={addRow}
            className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition"
          >
            再新增一条
          </button>
          <Link
            href="/project/enteric"
            className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition"
          >
            下一步：肠道发酵 CH₄ →
          </Link>
        </div>
      </div>
    </main>
  );
}