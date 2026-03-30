import type { EnergyBalanceRecord } from "@/types/ghg";

export interface EnergyBalanceResult {
  purchasedElectricityTCO2: number;
  purchasedHeatTCO2: number;
  totalPurchasedTCO2: number;
  exportedElectricityTCO2: number;
  exportedHeatTCO2: number;
  totalExportedTCO2: number;
  netPurchasedTCO2: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcEnergyBalance(
  input: EnergyBalanceRecord
): EnergyBalanceResult {
  const purchasedElectricityTCO2 =
    safeNumber(input.purchasedElectricityMWh) *
    safeNumber(input.purchasedElectricityEFtCO2PerMWh);

  const purchasedHeatTCO2 =
    safeNumber(input.purchasedHeatGJ) *
    safeNumber(input.purchasedHeatEFtCO2PerGJ);

  const exportedElectricityTCO2 =
    safeNumber(input.exportedElectricityMWh) *
    safeNumber(input.exportedElectricityEFtCO2PerMWh);

  const exportedHeatTCO2 =
    safeNumber(input.exportedHeatGJ) *
    safeNumber(input.exportedHeatEFtCO2PerGJ);

  const totalPurchasedTCO2 = purchasedElectricityTCO2 + purchasedHeatTCO2;
  const totalExportedTCO2 = exportedElectricityTCO2 + exportedHeatTCO2;
  const netPurchasedTCO2 = totalPurchasedTCO2 - totalExportedTCO2;

  return {
    purchasedElectricityTCO2,
    purchasedHeatTCO2,
    totalPurchasedTCO2,
    exportedElectricityTCO2,
    exportedHeatTCO2,
    totalExportedTCO2,
    netPurchasedTCO2,
  };
}