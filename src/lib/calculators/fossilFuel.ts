/**
 * 化石燃料燃烧排放计算器
 * 对应标准：GB/T 32151.22-2024，5.2.2，公式 (2)(3)(4)
 *
 * 公式 (2)：E_燃烧 = Σ(AD_i × EF_i)
 * 公式 (3)：AD_i = NCV_i × FC_i
 * 公式 (4)：EF_i = CC_i × OF_i × 44/12
 *
 * 单位说明（来自表 C.1）：
 *   NCV：GJ/单位（固体/液体）或 GJ/万Nm³（气体）
 *       存储在 ncvTJPerUnit 字段时，已按 GJ/1000 换算为 TJ/单位
 *   CC：表 C.1 列头为"10⁻² tC/GJ"，即实际含碳量 = 字段值 / 100（tC/GJ）
 *   OF：表 C.1 列头为"%"，字段 oxidationFactor 已存储小数（如 0.98）
 *       注：若字段值 > 1，则视为 % 输入，自动除以 100
 *
 * 44/12 为 CO₂ 与碳的相对分子质量之比
 */

import type { FuelCombustionRecord } from "@/types/ghg";

export interface FossilFuelRowResult {
  fuelType: string;
  consumptionAmount: number;
  /** 用户原始输入的 NCV 值（GJ/单位 或 TJ/单位） */
  ncvInputValue: number;
  /** 计算中实际使用的 NCV，TJ/单位 */
  ncvTJPerUnit: number;
  /** 单位热值含碳量，tC/GJ（已从表C.1的 10⁻² tC/GJ 除以 100 还原） */
  carbonContentTonCPerGJ: number;
  /** 碳氧化率，小数（已从 % 还原） */
  oxidationFactor: number;
  /** 排放因子 EF，tCO₂/单位 */
  emissionFactorTCO2PerUnit: number;
  /** 年度排放量，tCO₂/yr */
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
 * 将用户输入的 NCV 值统一换算为 TJ/单位
 * - 输入 > 1 时：视为 GJ/单位（如 42.652），换算为 TJ：/1000
 * - 输入 ≤ 1 且 > 0 时：视为已经是 TJ/单位（如 0.042652），直接使用
 */
function normalizeNCVToTJPerUnit(input: number): number {
  if (input > 1) return input / 1000;
  return input;
}

/**
 * 将碳氧化率还原为小数
 * 表C.1 以 % 存储（如 98），代码字段约定存小数（如 0.98）
 * 若用户输入了 % 形式（> 1），自动除以 100
 */
function normalizeOxidationFactor(input: number): number {
  if (input > 1) return input / 100;
  return input;
}

/**
 * 将单位热值含碳量还原为 tC/GJ
 * 表C.1 列头为"10⁻² tC/GJ"（即值 × 10⁻² 才是真实 tC/GJ）
 * 因此：实际含碳量（tC/GJ） = 字段值 / 100
 *
 * 公式 (4) 中 CC_i 单位为 tC/GJ，EF_i = CC_i × OF_i × 44/12
 * 其中 NCV 单位为 TJ/单位，1 TJ = 1000 GJ
 * 故：EF_i（tCO₂/单位） = NCV(TJ) × 1000(GJ/TJ) × CC(tC/GJ) × OF × 44/12
 * 等价于：EF_i = NCV(TJ) × CC(tC/GJ) × OF × 44/12 × 1000
 *
 * 本计算器采用另一种等价写法：
 * EF_i（tCO₂/单位） = NCV(GJ) × CC(tC/GJ) × OF × 44/12
 * 其中 NCV(GJ) = ncvTJPerUnit × 1000
 * 但为保持字段语义一致，这里直接在公式中乘以 1000：
 * EF = ncvTJPerUnit(TJ) × 1000 × carbonContent(tC/GJ) × OF × 44/12
 */
function normalizeCarbonContent(input: number): number {
  // 表C.1 存储的是 10⁻² tC/GJ，还原为真实 tC/GJ：/ 100
  // 但需判断：如果用户已经手动输入了真实 tC/GJ（通常 < 1，如 0.202），则不再除
  // 规则：> 1 时认为是表C.1 格式的"10⁻² tC/GJ"，需 /100
  //       ≤ 1 时认为已是真实 tC/GJ，直接使用
  if (input > 1) return input / 100;
  return input;
}

export function calcFossilFuel(rows: FuelCombustionRecord[]): FossilFuelResult {
  const normalizedRows: FossilFuelRowResult[] = rows.map((row) => {
    const consumptionAmount = safeNumber(row.consumptionAmount);
    const ncvInputValue = safeNumber(row.ncvTJPerUnit);

    // NCV：统一为 TJ/单位
    const ncvTJPerUnit = normalizeNCVToTJPerUnit(ncvInputValue);

    // CC：还原为真实 tC/GJ（表C.1 的 10⁻² tC/GJ ÷ 100）
    const carbonContentTonCPerGJ = normalizeCarbonContent(
      safeNumber(row.carbonContentTonCPerTJ)
    );

    // OF：还原为小数
    const oxidationFactor = normalizeOxidationFactor(
      safeNumber(row.oxidationFactor)
    );

    /**
     * 排放因子公式 (4)：EF_i = CC_i × OF_i × 44/12
     * 其中 CC_i 单位为 tC/GJ，NCV 为 TJ/单位
     * 全展开：EF(tCO₂/单位) = NCV(TJ) × 1000(GJ/TJ) × CC(tC/GJ) × OF × (44/12)
     */
    const emissionFactorTCO2PerUnit =
      ncvTJPerUnit * 1000 * carbonContentTonCPerGJ * oxidationFactor * (44 / 12);

    // 年度排放量 = 消耗量 × 排放因子，公式 (2)
    const rowCO2TPerYear = consumptionAmount * emissionFactorTCO2PerUnit;

    return {
      fuelType: row.fuelType ?? "",
      consumptionAmount,
      ncvInputValue,
      ncvTJPerUnit,
      carbonContentTonCPerGJ,
      oxidationFactor,
      emissionFactorTCO2PerUnit,
      rowCO2TPerYear,
    };
  });

  const totalCO2TPerYear = normalizedRows.reduce(
    (sum, row) => sum + row.rowCO2TPerYear,
    0
  );

  return { rows: normalizedRows, totalCO2TPerYear };
}