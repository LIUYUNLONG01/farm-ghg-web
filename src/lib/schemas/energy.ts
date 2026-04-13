/**
 * 能源模块表单验证 Schema
 * 对应标准：GB/T 32151.22-2024，5.2.2（化石燃料）、5.2.7（电力热力）
 */

import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function requiredNonNegativeNumber(label: string) {
  return z.preprocess(
    preprocessNumber,
    z.number({ error: `${label}必须为数字` }).min(0, `${label}不能小于 0`)
  );
}

/**
 * 碳氧化率验证
 * fuelPresets.ts 存储为小数（0.98），但用户也可能手工输入 %（98）
 * 计算器的 normalizeOxidationFactor() 已自动处理两种格式
 * Schema 层仅做宽松验证：允许 0~100（含两种格式），由计算器负责换算
 */
function oxidationFactorField(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({ error: `${label}必须为数字` })
      .min(0, `${label}不能小于 0`)
      .max(100, `${label}不能大于 100（最大 100%）`)
  );
}

/**
 * 燃料消耗量计量单位
 * 固体/液体燃料：t；气体燃料：万Nm³
 * 与 ghg.ts FuelConsumptionUnit 保持一致
 */
const fuelConsumptionUnitSchema = z.enum(["t", "万Nm3"]).default("t");

export const fuelRowSchema = z.object({
  fuelType: z.string().trim().min(1, "请输入燃料种类"),
  consumptionAmount: requiredNonNegativeNumber("消耗量"),
  /**
   * 消耗量计量单位，新增字段
   * "t"：固体/液体燃料（吨）
   * "万Nm3"：气体燃料（10⁴ Nm³，0°C、101.325 kPa）
   */
  consumptionUnit: fuelConsumptionUnitSchema,
  /**
   * 低位发热量 NCV
   * 用户按习惯输入 GJ/单位（如柴油 42.652 GJ/t）
   * 计算器内部的 normalizeNCVToTJPerUnit() 负责换算为 TJ/单位
   */
  ncvTJPerUnit: requiredNonNegativeNumber("低位发热量"),
  /**
   * 单位热值含碳量
   * 表 C.1 单位为"10⁻² tC/GJ"（如 20.2 代表 0.202 tC/GJ）
   * 计算器的 normalizeCarbonContent() 负责 /100 换算
   */
  carbonContentTonCPerTJ: requiredNonNegativeNumber("单位热值含碳量"),
  /**
   * 碳氧化率
   * fuelPresets 存小数（0.98），用户也可输入 %（98）
   * 计算器会自动识别并换算
   */
  oxidationFactor: oxidationFactorField("碳氧化率"),
  parameterSourceType: z
    .enum(["default_library", "manual_input", "preset_template"])
    .default("manual_input"),
  parameterSourceLabel: z
    .string()
    .trim()
    .max(200, "参数来源说明最多 200 字")
    .default("手工输入"),
  notes: z.string().max(300, "备注最多 300 字").default(""),
});

export const energyBalanceSchema = z.object({
  purchasedElectricityMWh: requiredNonNegativeNumber("购入电力"),
  purchasedElectricityEFtCO2PerMWh: requiredNonNegativeNumber("购入电力排放因子"),
  purchasedHeatGJ: requiredNonNegativeNumber("购入热力"),
  /**
   * 购入热力排放因子
   * 标准 5.2.7.3 缺省值 0.11 tCO₂/GJ
   */
  purchasedHeatEFtCO2PerGJ: requiredNonNegativeNumber("购入热力排放因子"),
  exportedElectricityMWh: requiredNonNegativeNumber("输出电力"),
  exportedElectricityEFtCO2PerMWh: requiredNonNegativeNumber("输出电力排放因子"),
  exportedHeatGJ: requiredNonNegativeNumber("输出热力"),
  exportedHeatEFtCO2PerGJ: requiredNonNegativeNumber("输出热力排放因子"),
});

export const energyModuleSchema = z.object({
  fuelRows: z.array(fuelRowSchema),
  energyBalance: energyBalanceSchema,
});

export type EnergyModuleFormInput = z.input<typeof energyModuleSchema>;
export type EnergyModuleFormValues = z.output<typeof energyModuleSchema>;