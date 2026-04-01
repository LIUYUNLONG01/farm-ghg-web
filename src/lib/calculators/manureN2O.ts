import type { LivestockRecord, ManureN2ORecord } from "@/types/ghg";

export interface ManureN2ORowResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: string;
  managementSystem: string;
  annualAverageHead: number;
  sharePercent: number;
  regionalEmissionFactor: number;
  nexKgNPerHeadYear: number;
  ef3KgN2ONPerKgN: number;
  managedNitrogenKgPerYear: number;
  rowN2ONKgPerYear: number;
  emissionFactorKgN2OPerHeadYear: number;
  rowN2OKgPerYear: number;
  rowN2OTPerYear: number;
}

export interface ManureN2OGroupResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  annualAverageHead: number;
  shareTotalPercent: number;
  emissionFactorKgN2OPerHeadYear: number;
  totalN2OKgPerYear: number;
  totalN2OTPerYear: number;
  isShareBalanced: boolean;
}

export interface ManureN2OResult {
  rows: ManureN2ORowResult[];
  groups: ManureN2OGroupResult[];
  totalN2OKgPerYear: number;
  totalN2OTPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcManureN2O(
  livestockRows: LivestockRecord[],
  manureRows: ManureN2ORecord[]
): ManureN2OResult {
  const rows: ManureN2ORowResult[] = manureRows.map((row) => {
    const livestock = livestockRows[row.sourceLivestockIndex];
    const annualAverageHead = safeNumber(livestock?.annualAverageHead);

    if (row.method === "regionalDefaultEF") {
      const regionalEmissionFactor = safeNumber(row.regionalEmissionFactor);
      const rowN2OKgPerYear = annualAverageHead * regionalEmissionFactor;
      const rowN2OTPerYear = rowN2OKgPerYear / 1000;

      return {
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        method: row.method,
        managementSystem: "区域化推荐因子法",
        annualAverageHead,
        sharePercent: 100,
        regionalEmissionFactor,
        nexKgNPerHeadYear: 0,
        ef3KgN2ONPerKgN: 0,
        managedNitrogenKgPerYear: 0,
        rowN2ONKgPerYear: 0,
        emissionFactorKgN2OPerHeadYear: regionalEmissionFactor,
        rowN2OKgPerYear,
        rowN2OTPerYear,
      };
    }

    const sharePercent = safeNumber(row.sharePercent);
    const nexKgNPerHeadYear = safeNumber(row.nexKgNPerHeadYear);
    const ef3KgN2ONPerKgN = safeNumber(row.ef3KgN2ONPerKgN);

    const managedNitrogenKgPerYear =
      annualAverageHead * nexKgNPerHeadYear * (sharePercent / 100);

    const rowN2ONKgPerYear = managedNitrogenKgPerYear * ef3KgN2ONPerKgN;
    const rowN2OKgPerYear = rowN2ONKgPerYear * (44 / 28);

    const emissionFactorKgN2OPerHeadYear =
      annualAverageHead > 0 ? rowN2OKgPerYear / annualAverageHead : 0;

    const rowN2OTPerYear = rowN2OKgPerYear / 1000;

    return {
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: row.method,
      managementSystem: row.managementSystem ?? "",
      annualAverageHead,
      sharePercent,
      regionalEmissionFactor: 0,
      nexKgNPerHeadYear,
      ef3KgN2ONPerKgN,
      managedNitrogenKgPerYear,
      rowN2ONKgPerYear,
      emissionFactorKgN2OPerHeadYear,
      rowN2OKgPerYear,
      rowN2OTPerYear,
    };
  });

  const groupMap = new Map<number, ManureN2OGroupResult>();

  for (const row of rows) {
    const existing = groupMap.get(row.sourceLivestockIndex);

    if (!existing) {
      groupMap.set(row.sourceLivestockIndex, {
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        annualAverageHead: row.annualAverageHead,
        shareTotalPercent: row.method === "regionalDefaultEF" ? 100 : row.sharePercent,
        emissionFactorKgN2OPerHeadYear: row.emissionFactorKgN2OPerHeadYear,
        totalN2OKgPerYear: row.rowN2OKgPerYear,
        totalN2OTPerYear: row.rowN2OTPerYear,
        isShareBalanced: row.method === "regionalDefaultEF",
      });
      continue;
    }

    existing.shareTotalPercent +=
      row.method === "regionalDefaultEF" ? 100 : row.sharePercent;
    existing.emissionFactorKgN2OPerHeadYear += row.emissionFactorKgN2OPerHeadYear;
    existing.totalN2OKgPerYear += row.rowN2OKgPerYear;
    existing.totalN2OTPerYear += row.rowN2OTPerYear;

    if (row.method === "regionalDefaultEF") {
      existing.isShareBalanced = true;
    }
  }

  const groups = Array.from(groupMap.values())
    .sort((a, b) => a.sourceLivestockIndex - b.sourceLivestockIndex)
    .map((group) => ({
      ...group,
      isShareBalanced:
        group.isShareBalanced || Math.abs(group.shareTotalPercent - 100) < 0.5,
    }));

  const totalN2OKgPerYear = rows.reduce(
    (sum, row) => sum + row.rowN2OKgPerYear,
    0
  );
  const totalN2OTPerYear = totalN2OKgPerYear / 1000;

  return {
    rows,
    groups,
    totalN2OKgPerYear,
    totalN2OTPerYear,
  };
}