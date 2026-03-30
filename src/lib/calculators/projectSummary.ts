import { calcEnergyBalance } from "@/lib/calculators/energyBalance";
import { calcEntericCH4 } from "@/lib/calculators/entericCH4";
import { calcFossilFuel } from "@/lib/calculators/fossilFuel";
import { calcManureCH4 } from "@/lib/calculators/manureCH4";
import { calcManureN2O } from "@/lib/calculators/manureN2O";
import type { ProjectDraft } from "@/types/ghg";

export interface ProjectSummaryModule {
  key: string;
  name: string;
  gas: "CH4" | "N2O" | "CO2";
  massTPerYear: number;
  co2eTPerYear: number;
}

export interface ProjectSummaryResult {
  gwpCH4: number;
  gwpN2O: number;
  modules: ProjectSummaryModule[];
  totalCH4TPerYear: number;
  totalN2OTPerYear: number;
  totalCO2TPerYear: number;
  totalCO2eTPerYear: number;
  fossilFuelCO2TPerYear: number;
  purchasedEnergyCO2TPerYear: number;
  exportedEnergyCO2TPerYear: number;
  netPurchasedEnergyCO2TPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcProjectSummary(
  draft: ProjectDraft,
  gwpCH4: number,
  gwpN2O: number
): ProjectSummaryResult {
  const livestock = draft.livestock ?? [];
  const entericRows = draft.enteric ?? [];
  const manureCH4Rows = draft.manureCH4 ?? [];
  const manureN2ORows = draft.manureN2O ?? [];
  const energyFuelRows = draft.energyFuel ?? [];
  const energyBalanceInput = draft.energyBalance ?? {
    purchasedElectricityMWh: 0,
    purchasedElectricityEFtCO2PerMWh: 0,
    purchasedHeatGJ: 0,
    purchasedHeatEFtCO2PerGJ: 0,
    exportedElectricityMWh: 0,
    exportedElectricityEFtCO2PerMWh: 0,
    exportedHeatGJ: 0,
    exportedHeatEFtCO2PerGJ: 0,
  };

  const enteric = calcEntericCH4(livestock, entericRows);
  const manureCH4 = calcManureCH4(livestock, manureCH4Rows);
  const manureN2O = calcManureN2O(livestock, manureN2ORows);
  const fossilFuel = calcFossilFuel(energyFuelRows);
  const energyBalance = calcEnergyBalance(energyBalanceInput);

  const entericCH4TPerYear = safeNumber(enteric.totalCH4TPerYear);
  const manureCH4TPerYear = safeNumber(manureCH4.totalCH4TPerYear);
  const manureN2OTPerYear = safeNumber(manureN2O.totalN2OTPerYear);
  const fossilFuelCO2TPerYear = safeNumber(fossilFuel.totalCO2TPerYear);
  const purchasedEnergyCO2TPerYear = safeNumber(
    energyBalance.totalPurchasedTCO2
  );
  const exportedEnergyCO2TPerYear = safeNumber(energyBalance.totalExportedTCO2);
  const netPurchasedEnergyCO2TPerYear = safeNumber(
    energyBalance.netPurchasedTCO2
  );

  const modules: ProjectSummaryModule[] = [
    {
      key: "entericCH4",
      name: "肠道发酵 CH4",
      gas: "CH4",
      massTPerYear: entericCH4TPerYear,
      co2eTPerYear: entericCH4TPerYear * gwpCH4,
    },
    {
      key: "manureCH4",
      name: "粪污管理 CH4",
      gas: "CH4",
      massTPerYear: manureCH4TPerYear,
      co2eTPerYear: manureCH4TPerYear * gwpCH4,
    },
    {
      key: "manureN2O",
      name: "粪污管理 N2O",
      gas: "N2O",
      massTPerYear: manureN2OTPerYear,
      co2eTPerYear: manureN2OTPerYear * gwpN2O,
    },
    {
      key: "fossilFuel",
      name: "化石燃料燃烧",
      gas: "CO2",
      massTPerYear: fossilFuelCO2TPerYear,
      co2eTPerYear: fossilFuelCO2TPerYear,
    },
    {
      key: "netPurchasedEnergy",
      name: "净购入电力/热力",
      gas: "CO2",
      massTPerYear: netPurchasedEnergyCO2TPerYear,
      co2eTPerYear: netPurchasedEnergyCO2TPerYear,
    },
  ];

  const totalCH4TPerYear = entericCH4TPerYear + manureCH4TPerYear;
  const totalN2OTPerYear = manureN2OTPerYear;
  const totalCO2TPerYear =
    fossilFuelCO2TPerYear + netPurchasedEnergyCO2TPerYear;

  const totalCO2eTPerYear = modules.reduce(
    (sum, item) => sum + item.co2eTPerYear,
    0
  );

  return {
    gwpCH4,
    gwpN2O,
    modules,
    totalCH4TPerYear,
    totalN2OTPerYear,
    totalCO2TPerYear,
    totalCO2eTPerYear,
    fossilFuelCO2TPerYear,
    purchasedEnergyCO2TPerYear,
    exportedEnergyCO2TPerYear,
    netPurchasedEnergyCO2TPerYear,
  };
}