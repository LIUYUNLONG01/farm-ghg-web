import type { LivestockRecord, ManureCH4Record } from "@/types/ghg";

export interface ManureCH4RowResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  managementSystem: string;
  annualAverageHead: number;
  sharePercent: number;
  vsKgPerHeadPerDay: number;
  boM3PerKgVS: number;
  mcfPercent: number;
  emissionFactorKgPerHeadYear: number;
  rowCH4KgPerYear: number;
  rowCH4TPerYear: number;
}

export interface ManureCH4GroupResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  annualAverageHead: number;
  shareTotalPercent: number;
  emissionFactorKgPerHeadYear: number;
  totalCH4KgPerYear: number;
  totalCH4TPerYear: number;
  isShareBalanced: boolean;
}

export interface ManureCH4Result {
  rows: ManureCH4RowResult[];
  groups: ManureCH4GroupResult[];
  totalCH4KgPerYear: number;
  totalCH4TPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcManureCH4(
  livestockRows: LivestockRecord[],
  manureRows: ManureCH4Record[]
): ManureCH4Result {
  const rows: ManureCH4RowResult[] = manureRows.map((row) => {
    const livestock = livestockRows[row.sourceLivestockIndex];
    const annualAverageHead = safeNumber(livestock?.annualAverageHead);
    const sharePercent = safeNumber(row.sharePercent);
    const vsKgPerHeadPerDay = safeNumber(row.vsKgPerHeadPerDay);
    const boM3PerKgVS = safeNumber(row.boM3PerKgVS);
    const mcfPercent = safeNumber(row.mcfPercent);

    const emissionFactorKgPerHeadYear =
      vsKgPerHeadPerDay *
      365 *
      boM3PerKgVS *
      0.67 *
      (sharePercent / 100) *
      (mcfPercent / 100);

    const rowCH4KgPerYear = annualAverageHead * emissionFactorKgPerHeadYear;
    const rowCH4TPerYear = rowCH4KgPerYear / 1000;

    return {
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      managementSystem: row.managementSystem,
      annualAverageHead,
      sharePercent,
      vsKgPerHeadPerDay,
      boM3PerKgVS,
      mcfPercent,
      emissionFactorKgPerHeadYear,
      rowCH4KgPerYear,
      rowCH4TPerYear,
    };
  });

  const groupMap = new Map<number, ManureCH4GroupResult>();

  for (const row of rows) {
    const existing = groupMap.get(row.sourceLivestockIndex);

    if (!existing) {
      groupMap.set(row.sourceLivestockIndex, {
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        annualAverageHead: row.annualAverageHead,
        shareTotalPercent: row.sharePercent,
        emissionFactorKgPerHeadYear: row.emissionFactorKgPerHeadYear,
        totalCH4KgPerYear: row.rowCH4KgPerYear,
        totalCH4TPerYear: row.rowCH4TPerYear,
        isShareBalanced: false,
      });
      continue;
    }

    existing.shareTotalPercent += row.sharePercent;
    existing.emissionFactorKgPerHeadYear += row.emissionFactorKgPerHeadYear;
    existing.totalCH4KgPerYear += row.rowCH4KgPerYear;
    existing.totalCH4TPerYear += row.rowCH4TPerYear;
  }

  const groups = Array.from(groupMap.values())
    .sort((a, b) => a.sourceLivestockIndex - b.sourceLivestockIndex)
    .map((group) => ({
      ...group,
      isShareBalanced: Math.abs(group.shareTotalPercent - 100) < 0.5,
    }));

  const totalCH4KgPerYear = rows.reduce(
    (sum, row) => sum + row.rowCH4KgPerYear,
    0
  );
  const totalCH4TPerYear = totalCH4KgPerYear / 1000;

  return {
    rows,
    groups,
    totalCH4KgPerYear,
    totalCH4TPerYear,
  };
}