/**
 * 粪污管理氧化亚氮排放计算器
 * 对应标准：GB/T 32151.22-2024，5.2.5，公式 (11)(12)(13)
 *
 * 公式 (11)：E_N2O_粪便 = Σ_j [(EF_N2O_D,j + EF_N2O_ID,j) × AP_j] × 10⁻³ × GWP_N2O
 *   此处输出质量（t N₂O/yr），GWP_N2O 换算在 projectSummary 层完成
 *
 * 公式 (12) 直接排放因子：
 *   EF_D,j = Nex_j × [Σ_k(EF_直接,k × MS_j,k)] × 44/28
 *
 * 公式 (13) 间接排放因子：
 *   EF_ID,j = Nex_j × Σ_k [(EF_挥发,k × Frac_GasMS/100 + EF_淋溶,k × Frac_leachMS/100) × MS_j,k] × 44/28
 *
 * 缺省值（标准 5.2.5.3 及附录 C）：
 *   EF_挥发 = 0.01 kg N₂O-N/kg N
 *   Frac_GasMS = 20%（如采用防氨挥发措施可扣减）
 *   EF_淋溶 = 0.0075 kg N₂O-N/kg N
 *   Frac_leachMS 取值范围 1%～20%（不填时按 0 处理，即忽略淋溶间接排放）
 *
 * 单位换算：44/28 为 N₂O 与 N₂O-N 的分子量比（将 N₂O-N 换算为 N₂O）
 */

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

  // ── 参数法：直接排放 ──
  nexKgNPerHeadYear: number;
  /** EF₃_直接，kg N₂O-N/kg N（表 C.9） */
  ef3DirectKgN2ONPerKgN: number;
  /** 受管理氮量，kg N/yr（= AP × Nex × MS%/100） */
  managedNitrogenKgPerYear: number;
  /** 直接 N₂O-N 排放，kg N₂O-N/yr */
  directN2ONKgPerYear: number;
  /** 直接 N₂O 排放，kg N₂O/yr */
  directN2OKgPerYear: number;

  // ── 参数法：间接排放（公式 13） ──
  /** EF_挥发，kg N₂O-N/kg N（缺省 0.01） */
  ef3VolatilizationKgN2ONPerKgN: number;
  /** Frac_GasMS，%（缺省 20%） */
  fracGasMS: number;
  /** EF_淋溶，kg N₂O-N/kg N（缺省 0.0075） */
  ef3LeachingKgN2ONPerKgN: number;
  /** Frac_leachMS，%（0 表示忽略淋溶项） */
  fracLeachMS: number;
  /** 间接 N₂O 排放，kg N₂O/yr */
  indirectN2OKgPerYear: number;

  /** 综合排放因子（直接+间接），kg N₂O/（头或只·年） */
  emissionFactorKgN2OPerHeadYear: number;
  /** 该路径年度 N₂O 排放量（直接+间接），kg N₂O/yr */
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

// N₂O 与 N₂O-N 的分子量换算系数：44/28
const N2O_TO_N2ON = 44 / 28;

export function calcManureN2O(
  livestockRows: LivestockRecord[],
  manureRows: ManureN2ORecord[]
): ManureN2OResult {
  const rows: ManureN2ORowResult[] = manureRows.map((row) => {
    const livestock = livestockRows[row.sourceLivestockIndex];
    const annualAverageHead = safeNumber(livestock?.annualAverageHead);

    // ── 推荐因子法：直接使用区域化推荐 EF（表 C.10） ──
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
        ef3DirectKgN2ONPerKgN: 0,
        managedNitrogenKgPerYear: 0,
        directN2ONKgPerYear: 0,
        directN2OKgPerYear: 0,
        ef3VolatilizationKgN2ONPerKgN: 0,
        fracGasMS: 0,
        ef3LeachingKgN2ONPerKgN: 0,
        fracLeachMS: 0,
        indirectN2OKgPerYear: 0,
        emissionFactorKgN2OPerHeadYear: regionalEmissionFactor,
        rowN2OKgPerYear,
        rowN2OTPerYear,
      };
    }

    // ── 参数法：公式 (12) 直接排放 + 公式 (13) 间接排放 ──
    const sharePercent = safeNumber(row.sharePercent);               // MS_k，%
    const nexKgNPerHeadYear = safeNumber(row.nexKgNPerHeadYear);    // Nex_j，kg N/（头·年）
    const ef3Direct = safeNumber(row.ef3KgN2ONPerKgN);              // EF_直接,k，kg N₂O-N/kg N（表C.9）

    // 受管理氮量：AP × Nex × MS%/100，kg N/yr，公式 (12) 分子
    const managedNitrogenKgPerYear =
      annualAverageHead * nexKgNPerHeadYear * (sharePercent / 100);

    // 直接 N₂O-N 排放：Nex × EF_直接 × MS% / 100，公式 (12) 核心
    const directN2ONKgPerYear = managedNitrogenKgPerYear * ef3Direct;

    // 直接 N₂O 排放 = N₂O-N × 44/28
    const directN2OKgPerYear = directN2ONKgPerYear * N2O_TO_N2ON;

    // ── 间接排放：公式 (13) ──
    // EF_挥发：标准缺省 0.01，若字段有值优先使用
    const ef3Volatilization =
      safeNumber(row.ef3VolatilizationKgN2ONPerKgN) > 0
        ? safeNumber(row.ef3VolatilizationKgN2ONPerKgN)
        : 0.01;

    // Frac_GasMS：标准缺省 20%，若字段有值优先使用
    const fracGasMS =
      safeNumber(row.fracGasMS) > 0
        ? safeNumber(row.fracGasMS)
        : 20;

    // EF_淋溶：标准缺省 0.0075，若字段有值优先使用
    const ef3Leaching =
      safeNumber(row.ef3LeachingKgN2ONPerKgN) > 0
        ? safeNumber(row.ef3LeachingKgN2ONPerKgN)
        : 0.0075;

    // Frac_leachMS：不填时按 0 处理（忽略淋溶项），范围 1%～20%
    const fracLeachMS = safeNumber(row.fracLeachMS);

    /**
     * 公式 (13) 间接排放 N₂O-N（单路径展开）：
     * = Nex × [(EF_挥发 × Frac_Gas/100) + (EF_淋溶 × Frac_leach/100)] × MS/100 × 44/28
     */
    const indirectN2ONKgPerYear =
      managedNitrogenKgPerYear *
      (ef3Volatilization * (fracGasMS / 100) + ef3Leaching * (fracLeachMS / 100));

    const indirectN2OKgPerYear = indirectN2ONKgPerYear * N2O_TO_N2ON;

    // 综合 N₂O 排放（直接 + 间接）
    const rowN2OKgPerYear = directN2OKgPerYear + indirectN2OKgPerYear;
    const rowN2OTPerYear = rowN2OKgPerYear / 1000;

    // 综合排放因子（用于群体汇总，含路径占比权重）
    const emissionFactorKgN2OPerHeadYear =
      annualAverageHead > 0 ? rowN2OKgPerYear / annualAverageHead : 0;

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
      ef3DirectKgN2ONPerKgN: ef3Direct,
      managedNitrogenKgPerYear,
      directN2ONKgPerYear,
      directN2OKgPerYear,
      ef3VolatilizationKgN2ONPerKgN: ef3Volatilization,
      fracGasMS,
      ef3LeachingKgN2ONPerKgN: ef3Leaching,
      fracLeachMS,
      indirectN2OKgPerYear,
      emissionFactorKgN2OPerHeadYear,
      rowN2OKgPerYear,
      rowN2OTPerYear,
    };
  });

  // ── 按群体汇总 ──
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

    if (row.method !== "regionalDefaultEF") {
      existing.shareTotalPercent += row.sharePercent;
    }
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

  const totalN2OKgPerYear = rows.reduce((sum, row) => sum + row.rowN2OKgPerYear, 0);
  const totalN2OTPerYear = totalN2OKgPerYear / 1000;

  return { rows, groups, totalN2OKgPerYear, totalN2OTPerYear };
}