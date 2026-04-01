import type { EntericRecord, LivestockRecord } from "@/types/ghg";

export interface EntericCH4RowResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  activityDataMethod: string;
  method: string;
  activityPopulation: number;
  annualAverageHead: number;
  emissionFactor: number;
  dmiKgPerHeadDay: number;
  ymPercent: number;
  geMJPerHeadDay: number;
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

function calcActivityPopulation(
  livestockRows: LivestockRecord[],
  row: EntericRecord
): number {
  const fallbackAP = safeNumber(
    livestockRows[row.sourceLivestockIndex]?.annualAverageHead
  );

  if (row.activityDataMethod === "annualAveragePopulation") {
    const ap = safeNumber(row.annualAveragePopulation);
    return ap > 0 ? ap : fallbackAP;
  }

  if (row.activityDataMethod === "monthlyAveragePopulation") {
    const months = [
      row.janHead,
      row.febHead,
      row.marHead,
      row.aprHead,
      row.mayHead,
      row.junHead,
      row.julHead,
      row.augHead,
      row.sepHead,
      row.octHead,
      row.novHead,
      row.decHead,
    ].map(safeNumber);

    const sum = months.reduce((acc, item) => acc + item, 0);
    return sum / 12;
  }

  if (row.activityDataMethod === "turnoverCalculation") {
    const na = safeNumber(row.annualThroughput);
    const da = safeNumber(row.daysAlive);

    if (na > 0 && da > 0) {
      return (na * da) / 365;
    }

    return fallbackAP;
  }

  return fallbackAP;
}

function calcGE(row: EntericRecord): number {
  const geDirect = safeNumber(row.geMJPerHeadDay);
  if (geDirect > 0) return geDirect;

  const dmi = safeNumber(row.dmiKgPerHeadDay);
  if (dmi > 0) return dmi * 18.45;

  return 0;
}

function calcEmissionFactor(
  row: EntericRecord
): {
  emissionFactor: number;
  geMJPerHeadDay: number;
} {
  if (row.method === "calculatedEF") {
    const ge = calcGE(row);
    const ym = safeNumber(row.ymPercent);

    const ef =
      ge > 0 && ym > 0 ? (ge * (ym / 100) * 365) / 55.65 : 0;

    return {
      emissionFactor: ef,
      geMJPerHeadDay: ge,
    };
  }

  return {
    emissionFactor: safeNumber(row.emissionFactor),
    geMJPerHeadDay: safeNumber(row.geMJPerHeadDay),
  };
}

export function calcEntericCH4(
  livestockRows: LivestockRecord[],
  entericRows: EntericRecord[]
): EntericCH4Result {
  const rows: EntericCH4RowResult[] = entericRows.map((row) => {
    const activityPopulation = calcActivityPopulation(livestockRows, row);
    const efResult = calcEmissionFactor(row);

    const ch4KgPerYear =
      activityPopulation > 0 && efResult.emissionFactor > 0
        ? activityPopulation * efResult.emissionFactor
        : 0;

    const ch4TPerYear = ch4KgPerYear / 1000;

    return {
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      activityDataMethod: row.activityDataMethod ?? "annualAveragePopulation",
      method: row.method,
      activityPopulation,
      annualAverageHead: activityPopulation,
      emissionFactor: efResult.emissionFactor,
      dmiKgPerHeadDay: safeNumber(row.dmiKgPerHeadDay),
      ymPercent: safeNumber(row.ymPercent),
      geMJPerHeadDay: efResult.geMJPerHeadDay,
      ch4KgPerYear,
      ch4TPerYear,
    };
  });

  const totalCH4KgPerYear = rows.reduce(
    (sum, row) => sum + row.ch4KgPerYear,
    0
  );
  const totalCH4TPerYear = totalCH4KgPerYear / 1000;

  return {
    rows,
    totalCH4KgPerYear,
    totalCH4TPerYear,
  };
}