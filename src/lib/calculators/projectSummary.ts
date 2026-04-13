/**
 * 项目总排放汇总计算器
 * 对应标准：GB/T 32151.22-2024，5.2.1，公式 (1)
 *
 * 公式 (1)：
 * E = E_燃烧 + E_CH4_肠道 + E_CH4_粪便 + E_N2O_粪便
 *   - R_CH4_回收（沼气甲烷回收利用减项，5.2.6）
 *   + E_购入电 + E_购入热 - E_输出电 - E_输出热
 *
 * GWP 缺省值（标准 5.2.3.1 / 5.2.5.1）：
 *   GWP_CH4 = 27.9 tCO₂e/tCH₄
 *   GWP_N2O = 273 tCO₂e/tN₂O
 */

import { calcEnergyBalance } from "@/lib/calculators/energyBalance";
import { calcEntericCH4 } from "@/lib/calculators/entericCH4";
import { calcFossilFuel } from "@/lib/calculators/fossilFuel";
import { calcManureCH4 } from "@/lib/calculators/manureCH4";
import { calcManureN2O } from "@/lib/calculators/manureN2O";
import type { BiogasRecoveryRecord, ProjectDraft } from "@/types/ghg";

export interface ProjectSummaryModule {
  key: string;
  name: string;
  gas: "CH4" | "N2O" | "CO2";
  /** 温室气体质量，t/yr（CO₂ 模块此字段即 tCO₂/yr） */
  massTPerYear: number;
  /** CO₂e，tCO₂e/yr */
  co2eTPerYear: number;
}

export interface ProjectSummaryResult {
  gwpCH4: number;
  gwpN2O: number;

  modules: ProjectSummaryModule[];

  // ── 各气体质量汇总 ──
  totalCH4TPerYear: number;
  totalN2OTPerYear: number;
  totalCO2TPerYear: number;

  // ── 能源模块分项 ──
  fossilFuelCO2TPerYear: number;
  purchasedEnergyCO2TPerYear: number;
  exportedEnergyCO2TPerYear: number;
  netPurchasedEnergyCO2TPerYear: number;
  energyModuleTotalCO2TPerYear: number;
  energyModuleTotalCO2eTPerYear: number;

  // ── 沼气回收减项 ──
  /** R_CH4_回收，tCO₂e/yr（正值，从总量中减去） */
  biogasRecoveryCO2eTPerYear: number;

  // ── 总量 ──
  /** 公式 (1) 计算的总 CO₂e */
  totalCO2eTPerYear: number;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 计算沼气甲烷回收减项 R_CH4_回收（tCO₂e/yr）
 * 公式 (14)：R_CH4_回收 = R_自用 + R_外供 - E_火炬
 * 公式 (15)：R_自用 = Q_自用 × φ_自用,CH4 × 0.67 × GWP_CH4
 * 公式 (16)：R_外供 = Q_外供 × φ_外供,CH4 × 0.67 × GWP_CH4
 * 公式 (17)：E_火炬 = Q_火炬 × φ_火炬,CH4 × (1-OF_火炬/100) × 0.67 × GWP_CH4
 *             - Q_火炬 × φ_火炬,CH4 × (OF_火炬/100) × 1 × 1.84
 *
 * 单位：Q 为 10³ Nm³，φ 为体积分数（0~1），0.67 为 CH₄ 密度（t/10³ Nm³）
 *       1.84 为 CO₂ 密度（tCO₂/10³ Nm³CO₂），FY_CH4-CO2 = 1（燃烧转换系数）
 */
function calcBiogasRecovery(
  record: BiogasRecoveryRecord | undefined,
  gwpCH4: number
): number {
  if (!record) return 0;

  const CH4_DENSITY = 0.67; // t CH₄/10³ Nm³
  const CO2_DENSITY = 1.84; // tCO₂/10³ Nm³ CO₂

  // R_自用（公式 15）
  const rSelfUsed =
    safeNumber(record.selfUsedVolumeM3) *
    safeNumber(record.selfUsedCH4Fraction) *
    CH4_DENSITY *
    gwpCH4;

  // R_外供（公式 16）
  const rExported =
    safeNumber(record.exportedVolumeM3) *
    safeNumber(record.exportedCH4Fraction) *
    CH4_DENSITY *
    gwpCH4;

  // E_火炬（公式 17）
  const qFlaring = safeNumber(record.flaringVolumeM3);
  const phiFlaring = safeNumber(record.flaringCH4Fraction);
  // OF_火炬 以 % 存储，还原为小数
  const ofFlaring = safeNumber(record.flaringOxidationFactorPercent) / 100;

  // 未燃烧逃逸的 CH₄ 排放（tCO₂e）
  const eFlaringCH4 = qFlaring * phiFlaring * (1 - ofFlaring) * CH4_DENSITY * gwpCH4;
  // 燃烧生成的 CO₂ 排放（tCO₂）
  const eFlaringCO2 = qFlaring * phiFlaring * ofFlaring * 1 * CO2_DENSITY;
  const eFlaring = eFlaringCH4 + eFlaringCO2;

  // R_CH4_回收 = R_自用 + R_外供 - E_火炬（公式 14）
  const rTotal = rSelfUsed + rExported - eFlaring;

  // 取 max(0, rTotal)：回收量不能为负（若火炬排放大于回收，视为 0 减项）
  return Math.max(0, rTotal);
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

  // ── 各模块计算 ──
  const enteric = calcEntericCH4(livestock, entericRows);
  const manureCH4 = calcManureCH4(livestock, manureCH4Rows);
  const manureN2O = calcManureN2O(livestock, manureN2ORows);
  const fossilFuel = calcFossilFuel(energyFuelRows);
  const energyBalance = calcEnergyBalance(energyBalanceInput);

  // ── 各模块质量 ──
  const entericCH4TPerYear = safeNumber(enteric.totalCH4TPerYear);
  const manureCH4TPerYear = safeNumber(manureCH4.totalCH4TPerYear);
  const manureN2OTPerYear = safeNumber(manureN2O.totalN2OTPerYear);
  const fossilFuelCO2TPerYear = safeNumber(fossilFuel.totalCO2TPerYear);
  const purchasedEnergyCO2TPerYear = safeNumber(energyBalance.totalPurchasedTCO2);
  const exportedEnergyCO2TPerYear = safeNumber(energyBalance.totalExportedTCO2);
  const netPurchasedEnergyCO2TPerYear = safeNumber(energyBalance.netPurchasedTCO2);

  const energyModuleTotalCO2TPerYear =
    fossilFuelCO2TPerYear + netPurchasedEnergyCO2TPerYear;
  const energyModuleTotalCO2eTPerYear = energyModuleTotalCO2TPerYear;

  // ── 沼气回收减项（公式 14～17） ──
  const biogasRecoveryCO2eTPerYear = calcBiogasRecovery(
    draft.biogasRecovery,
    gwpCH4
  );

  // ── 模块列表（用于报告展示） ──
  const modules: ProjectSummaryModule[] = [
    {
      key: "entericCH4",
      name: "肠道发酵 CH₄",
      gas: "CH4",
      massTPerYear: entericCH4TPerYear,
      co2eTPerYear: entericCH4TPerYear * gwpCH4,
    },
    {
      key: "manureCH4",
      name: "粪污管理 CH₄",
      gas: "CH4",
      massTPerYear: manureCH4TPerYear,
      co2eTPerYear: manureCH4TPerYear * gwpCH4,
    },
    {
      key: "manureN2O",
      name: "粪污管理 N₂O",
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
    // 沼气回收作为负模块展示（co2eTPerYear 为负值，便于报告中直观看到减排量）
    ...(biogasRecoveryCO2eTPerYear > 0
      ? [
          {
            key: "biogasRecovery",
            name: "沼气甲烷回收利用",
            gas: "CH4" as const,
            massTPerYear: -(biogasRecoveryCO2eTPerYear / gwpCH4),
            co2eTPerYear: -biogasRecoveryCO2eTPerYear,
          },
        ]
      : []),
  ];

  // ── 汇总 ──
  const totalCH4TPerYear = entericCH4TPerYear + manureCH4TPerYear;
  const totalN2OTPerYear = manureN2OTPerYear;
  const totalCO2TPerYear = energyModuleTotalCO2TPerYear;

  /**
   * 公式 (1) 总 CO₂e：
   * E = (CH4排放 × GWP_CH4) + (N2O排放 × GWP_N2O) + CO2排放
   *   - R_CH4_回收
   */
  const totalCO2eTPerYear =
    modules.reduce((sum, m) => sum + m.co2eTPerYear, 0);

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
    energyModuleTotalCO2TPerYear,
    energyModuleTotalCO2eTPerYear,
    biogasRecoveryCO2eTPerYear,
  };
}