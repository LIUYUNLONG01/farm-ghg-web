/**
 * 化石燃料快捷模板库
 * 数值来源：GB/T 32151.22-2024 附录 C 表 C.1 常用化石燃料相关参数的缺省值
 *
 * 单位说明：
 *   固体/液体燃料：消耗量单位为 t（吨）
 *   气体燃料：    消耗量单位为 万Nm³（10⁴ Nm³）
 *                 气体标准状态：大气压 101.325 kPa，温度 0 ℃（273.15 K）
 *
 * ncvTJPerUnit 换算：lowHeatValueGJPerUnit（来自表C.1）/ 1000
 * carbonContentTonCPerTJ 换算：表C.1 中"10⁻² tC/GJ" / 100 = tC/GJ（即 tC/TJ 无需换算，1 GJ = 10⁻³ TJ）
 *   注：表C.1 列"单位热值含碳量 10⁻² tC/GJ"，代码字段 carbonContentTonCPerTJ 的单位实际为 tC/GJ × 10²，
 *       计算器内部使用时需 / 100 得到真实 tC/GJ。
 * oxidationFactor：表C.1"燃料碳氧化率 %" / 100 得到小数，本文件保存小数形式。
 */

import type { FuelConsumptionUnit } from "@/types/ghg";

export interface FuelPreset {
  id: string;
  /** UI 显示标签 */
  label: string;
  /** 填入 FuelCombustionRecord.fuelType */
  fuelType: string;
  /** 消耗量计量单位（t 或 万Nm3） */
  consumptionUnit: FuelConsumptionUnit;
  /** 低位发热量，TJ/单位（= 表C.1 GJ/单位 / 1000） */
  ncvTJPerUnit: number;
  /**
   * 单位热值含碳量，tC/GJ（= 表C.1 中"10⁻² tC/GJ" / 100）
   * 注意：计算器公式 EF = CC × OF × 44/12，CC 单位为 tC/GJ
   */
  carbonContentTonCPerTJ: number;
  /**
   * 碳氧化率，小数形式（= 表C.1 % / 100）
   * 如 0.98 表示 98%
   */
  oxidationFactor: number;
  /** 来源标注 */
  note: string;
}

/**
 * 畜禽养殖场常用燃料模板
 * 覆盖养殖场最常见的燃料类型，可按需扩展
 */
export const fuelPresetLibrary: FuelPreset[] = [
  // ── 液体燃料（t） ──
  {
    id: "diesel_tonne",
    label: "柴油（吨）",
    fuelType: "柴油",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.042652,       // 42.652 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 20.2, // 表C.1：20.2 × 10⁻² tC/GJ
    oxidationFactor: 0.98,        // 表C.1：98%
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
  {
    id: "gasoline_tonne",
    label: "汽油（吨）",
    fuelType: "汽油",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.04307,        // 43.07 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 18.9,
    oxidationFactor: 0.98,
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
  {
    id: "lpg_tonne",
    label: "液化石油气（吨）",
    fuelType: "液化石油气",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.050179,       // 50.179 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 17.2,
    oxidationFactor: 0.98,
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
  {
    id: "lng_tonne",
    label: "液化天然气（吨）",
    fuelType: "液化天然气",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.051498,       // 51.498 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 15.3,
    oxidationFactor: 0.98,
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },

  // ── 气体燃料（万Nm³） ──
  {
    id: "natural_gas_wanm3",
    label: "天然气（万Nm³）",
    fuelType: "天然气",
    consumptionUnit: "万Nm3",
    ncvTJPerUnit: 0.38931,        // 389.31 GJ/万Nm³ ÷ 1000
    carbonContentTonCPerTJ: 15.3,
    oxidationFactor: 0.99,        // 表C.1：99%
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：万Nm³（10⁴ Nm³，标准状态 0℃、101.325 kPa）",
  },

  // ── 固体燃料（t） ──
  {
    id: "anthracite_tonne",
    label: "无烟煤（吨）",
    fuelType: "无烟煤",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.0267,         // 26.7 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 27.4,
    oxidationFactor: 0.94,        // 表C.1：94%
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
  {
    id: "bituminous_coal_tonne",
    label: "烟煤（吨）",
    fuelType: "烟煤",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.01957,        // 19.57 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 26.1,
    oxidationFactor: 0.93,        // 表C.1：93%
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
  {
    id: "coke_tonne",
    label: "焦炭（吨）",
    fuelType: "焦炭",
    consumptionUnit: "t",
    ncvTJPerUnit: 0.028435,       // 28.435 GJ/t ÷ 1000
    carbonContentTonCPerTJ: 29.5,
    oxidationFactor: 0.93,
    note: "GB/T 32151.22-2024 表C.1；消耗量单位：t（吨）",
  },
];