/**
 * 粪污管理甲烷排放计算器
 * 对应标准：GB/T 32151.22-2024，5.2.4，公式 (9)(10)
 *
 * 公式 (9)：E_CH4_粪便 = Σ_j (EF_CH4_粪便,j × AP_j × 10⁻³) × GWP_CH4
 *   其中 GWP_CH4 缺省值 = 27.9（projectSummary 层传入，此处不乘）
 *   此处输出质量（t CH₄/yr），CO₂e 换算在 projectSummary 完成
 *
 * 公式 (10) 参数法：
 *   EF_CH4_粪便,j = (VS_j × 365) × [B₀_j × 0.67 × Σ_k(MCF_k × MS_j,k)]
 *
 * 关键说明：
 *   - MCF_k 和 MS_j,k 均以 % 存储，计算时各自 /100
 *   - 0.67 为甲烷在 20°C、101.325 kPa 下的密度（kg CH₄/m³）
 *   - 公式 (10) 的 EF 是"完整路径的 EF"（不含 MS 占比时为全路径因子）
 *   - 多路径参数法时，各路径分别按 MS_k 占比计算后叠加，得到综合 EF
 *
 * 单路径下等价展开：
 *   EF(单路径) = VS × 365 × B₀ × 0.67 × MCF% / 100
 *   rowCH4 = AP × EF(单路径) × MS%/100
 *   群体综合 EF = Σ(EF_单路径 × MS%/100) — 各路径叠加
 */

import type { LivestockRecord, ManureCH4Record } from "@/types/ghg";

export interface ManureCH4RowResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: string;
  managementSystem: string;
  annualAverageHead: number;
  sharePercent: number;
  vsKgPerHeadPerDay: number;
  boM3PerKgVS: number;
  mcfPercent: number;
  regionalEmissionFactor: number;
  /**
   * 该路径贡献的"等效排放因子分量"，kg CH₄/（头或只·年）
   * 含义：路径 EF × 路径占比，可叠加得到群体综合 EF
   * 计算：VS × 365 × B₀ × 0.67 × (MCF%/100) × (MS%/100)
   */
  emissionFactorKgPerHeadYear: number;
  rowCH4KgPerYear: number;
  rowCH4TPerYear: number;
}

export interface ManureCH4GroupResult {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  annualAverageHead: number;
  /** 所有路径占比之和，应趋近 100% */
  shareTotalPercent: number;
  /** 群体综合排放因子（各路径分量叠加），kg CH₄/（头或只·年） */
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

    // ── 推荐因子法：直接使用区域化推荐 EF（表 C.7） ──
    if (row.method === "regionalDefaultEF") {
      const regionalEmissionFactor = safeNumber(row.regionalEmissionFactor);
      const rowCH4KgPerYear = annualAverageHead * regionalEmissionFactor;
      const rowCH4TPerYear = rowCH4KgPerYear / 1000;

      return {
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        method: row.method,
        managementSystem: "区域化推荐因子法",
        annualAverageHead,
        sharePercent: 100,
        vsKgPerHeadPerDay: 0,
        boM3PerKgVS: 0,
        mcfPercent: 0,
        regionalEmissionFactor,
        emissionFactorKgPerHeadYear: regionalEmissionFactor,
        rowCH4KgPerYear,
        rowCH4TPerYear,
      };
    }

    // ── 参数法：公式 (10) ──
    const sharePercent = safeNumber(row.sharePercent);       // MS_k，%
    const vsKgPerHeadPerDay = safeNumber(row.vsKgPerHeadPerDay); // VS_j，kg VS/（头·天）
    const boM3PerKgVS = safeNumber(row.boM3PerKgVS);         // B₀，m³ CH₄/kg VS
    const mcfPercent = safeNumber(row.mcfPercent);           // MCF_k，%

    /**
     * 公式 (10) 展开（单路径）：
     *   EF_单路径 = VS × 365 × B₀ × 0.67 × (MCF_k/100)
     *   路径贡献分量 = EF_单路径 × (MS_k/100)
     *   rowCH4 = AP × EF_单路径 × (MS_k/100)
     *
     * 注：MCF 和 MS 均以 % 存储，需各自除以 100
     */
    const efSinglePath =
      vsKgPerHeadPerDay * 365 * boM3PerKgVS * 0.67 * (mcfPercent / 100);

    // 该路径贡献的 EF 分量（含占比权重），用于群体汇总
    const emissionFactorKgPerHeadYear = efSinglePath * (sharePercent / 100);

    // 该路径年排放量
    const rowCH4KgPerYear = annualAverageHead * emissionFactorKgPerHeadYear;
    const rowCH4TPerYear = rowCH4KgPerYear / 1000;

    return {
      sourceLivestockIndex: row.sourceLivestockIndex,
      species: row.species,
      stage: row.stage,
      method: row.method,
      managementSystem: row.managementSystem ?? "",
      annualAverageHead,
      sharePercent,
      vsKgPerHeadPerDay,
      boM3PerKgVS,
      mcfPercent,
      regionalEmissionFactor: 0,
      emissionFactorKgPerHeadYear,
      rowCH4KgPerYear,
      rowCH4TPerYear,
    };
  });

  // ── 按群体（sourceLivestockIndex）汇总 ──
  const groupMap = new Map<number, ManureCH4GroupResult>();

  for (const row of rows) {
    const existing = groupMap.get(row.sourceLivestockIndex);

    if (!existing) {
      groupMap.set(row.sourceLivestockIndex, {
        sourceLivestockIndex: row.sourceLivestockIndex,
        species: row.species,
        stage: row.stage,
        annualAverageHead: row.annualAverageHead,
        shareTotalPercent: row.method === "regionalDefaultEF" ? 100 : row.sharePercent,
        emissionFactorKgPerHeadYear: row.emissionFactorKgPerHeadYear,
        totalCH4KgPerYear: row.rowCH4KgPerYear,
        totalCH4TPerYear: row.rowCH4TPerYear,
        isShareBalanced: row.method === "regionalDefaultEF",
      });
      continue;
    }

    if (row.method !== "regionalDefaultEF") {
      existing.shareTotalPercent += row.sharePercent;
    }
    // 各路径 EF 分量叠加 → 群体综合 EF
    existing.emissionFactorKgPerHeadYear += row.emissionFactorKgPerHeadYear;
    existing.totalCH4KgPerYear += row.rowCH4KgPerYear;
    existing.totalCH4TPerYear += row.rowCH4TPerYear;

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

  const totalCH4KgPerYear = rows.reduce((sum, row) => sum + row.rowCH4KgPerYear, 0);
  const totalCH4TPerYear = totalCH4KgPerYear / 1000;

  return { rows, groups, totalCH4KgPerYear, totalCH4TPerYear };
}