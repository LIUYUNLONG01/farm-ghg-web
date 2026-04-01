import type { FuelCombustionRecord } from "@/types/ghg";

export interface FossilFuelRowResult {
  fuelType: string;
  consumptionAmount: number;
  ncvInputValue: number;
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

/**
 * 兼容两种输入：
 * 1. 用户/模板输入的是 GJ/单位（常见，如柴油 42.652 GJ/t）
 * 2. 用户手动输入的是 TJ/单位（通常会是 < 1 的数）
 *
 * 规则：
 * - 如果 > 1，则按 GJ/单位处理并 /1000 转成 TJ/单位
 * - 如果 <= 1，则直接按 TJ/单位处理
 */
function normalizeNCVToTJPerUnit(input: number): number {
  if (input > 1) return input / 1000;
  return input;
}

export function calcFossilFuel(
  rows: FuelCombustionRecord[]
): FossilFuelResult {
  const normalizedRows: FossilFuelRowResult[] = rows.map((row) => {
    const consumptionAmount = safeNumber(row.consumptionAmount);
    const ncvInputValue = safeNumber(row.ncvTJPerUnit);
    const ncvTJPerUnit = normalizeNCVToTJPerUnit(ncvInputValue);
    const carbonContentTonCPerTJ = safeNumber(row.carbonContentTonCPerTJ);
    const oxidationFactor = safeNumber(row.oxidationFactor);

    const emissionFactorTCO2PerUnit =
      ncvTJPerUnit *
      carbonContentTonCPerTJ *
      oxidationFactor *
      (44 / 12);

    const rowCO2TPerYear = consumptionAmount * emissionFactorTCO2PerUnit;

    return {
      fuelType: row.fuelType ?? "",
      consumptionAmount,
      ncvInputValue,
      ncvTJPerUnit,
      carbonContentTonCPerTJ,
      oxidationFactor,
      emissionFactorTCO2PerUnit,
      rowCO2TPerYear,
    };
  });

  const totalCO2TPerYear = normalizedRows.reduce(
    (sum, row) => sum + row.rowCO2TPerYear,
    0
  );

  return {
    rows: normalizedRows,
    totalCO2TPerYear,
  };
}