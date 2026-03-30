import type { FuelCombustionRecord } from "@/types/ghg";

export interface FossilFuelRowResult {
  fuelType: string;
  consumptionAmount: number;
  ncvTJPerUnit: number;
  carbonContentTonCPerTJ: number;
  oxidationFactor: number;
  emissionFactorTCO2PerUnit: number;
  rowCO2TPerYear: number;
}

export interface FossilFuelResult {
  rows: FossilFuelRowResult[];
  totalCO2TPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcFossilFuel(
  rows: FuelCombustionRecord[]
): FossilFuelResult {
  const calculatedRows: FossilFuelRowResult[] = rows.map((row) => {
    const consumptionAmount = safeNumber(row.consumptionAmount);
    const ncvTJPerUnit = safeNumber(row.ncvTJPerUnit);
    const carbonContentTonCPerTJ = safeNumber(row.carbonContentTonCPerTJ);
    const oxidationFactor = safeNumber(row.oxidationFactor);

    const emissionFactorTCO2PerUnit =
      ncvTJPerUnit *
      carbonContentTonCPerTJ *
      oxidationFactor *
      (44 / 12);

    const rowCO2TPerYear = consumptionAmount * emissionFactorTCO2PerUnit;

    return {
      fuelType: row.fuelType,
      consumptionAmount,
      ncvTJPerUnit,
      carbonContentTonCPerTJ,
      oxidationFactor,
      emissionFactorTCO2PerUnit,
      rowCO2TPerYear,
    };
  });

  const totalCO2TPerYear = calculatedRows.reduce(
    (sum, row) => sum + row.rowCO2TPerYear,
    0
  );

  return {
    rows: calculatedRows,
    totalCO2TPerYear,
  };
}