import type { EntericRecord, LivestockRecord } from "@/types/ghg";

export interface EntericCH4RowResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  annualAverageHead: number;
  emissionFactor: number;
  ch4KgPerYear: number;
  ch4TPerYear: number;
}

export interface EntericCH4Result {
  rows: EntericCH4RowResult[];
  totalCH4KgPerYear: number;
  totalCH4TPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcEntericCH4(
  livestockRows: LivestockRecord[],
  entericRows: EntericRecord[]
): EntericCH4Result {
  const rows: EntericCH4RowResult[] = entericRows.map((row) => {
    const livestock = livestockRows[row.sourceLivestockIndex];
    const annualAverageHead = safeNumber(livestock?.annualAverageHead);
    const emissionFactor = safeNumber(row.emissionFactor);

    const ch4KgPerYear = annualAverageHead > 0 && emissionFactor > 0
      ? annualAverageHead * emissionFactor
      : 0;

    const ch4TPerYear = ch4KgPerYear / 1000;

    return {
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      annualAverageHead,
      emissionFactor,
      ch4KgPerYear,
      ch4TPerYear,
    };
  });

  const totalCH4KgPerYear = rows.reduce((sum, row) => sum + row.ch4KgPerYear, 0);
  const totalCH4TPerYear = totalCH4KgPerYear / 1000;

  return {
    rows,
    totalCH4KgPerYear,
    totalCH4TPerYear,
  };
}