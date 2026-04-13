/**
 * 附录 C 参数缺省值数据库
 * 来源：GB/T 32151.22-2024 附录 C（资料性）相关参数缺省值
 * 所有数值均直接对应标准表 C.1～C.10，请勿随意修改
 */

import type { FuelConsumptionUnit, StandardVersion } from "@/types/ghg";

// ─────────────────────────────────────────────
// 接口定义
// ─────────────────────────────────────────────

/** 表 C.1 化石燃料参数 */
export interface AppendixCFuelDefault {
  fuelCategory: "固体燃料" | "液体燃料" | "气体燃料";
  fuelName: string;
  /** 计量单位：固体/液体燃料为 t；气体燃料为 10^4 Nm³（万 Nm³） */
  unit: string;
  /** 对应 FuelConsumptionUnit，用于计算器单位判断 */
  consumptionUnit: FuelConsumptionUnit;
  /** 低位发热量，GJ/单位（GJ/t 或 GJ/万Nm³） */
  lowHeatValueGJPerUnit: number;
  /**
   * 单位热值含碳量，10⁻² tC/GJ（即 tC/GJ × 10²）
   * 计算时需除以 100：carbonContentTonCPerTJ = carbonContent / 100
   * 注：标准表 C.1 列头为"10⁻² tC/GJ"
   */
  carbonContent: number;
  /** 燃料碳氧化率，% */
  oxidationPercent: number;
}

/** 表 C.2 甲烷转化因子 Ym */
export interface AppendixCYmDefault {
  label: string;
  speciesAliases: string[];
  stageAliases?: string[];
  /** Ym 中心值，% */
  ymPercent: number;
  /** Ym 不确定范围，如 "±1.0" */
  ymRange?: string;
}

/** 表 C.3 肠道发酵甲烷排放因子 EF */
export interface AppendixCEntericEFDefault {
  label: string;
  speciesAliases: string[];
  stageAliases?: string[];
  /** 排放因子，kg CH₄/（头或只·年） */
  emissionFactor: number;
  unit: "kg CH4/head/year";
}

/** 表 C.4 挥发性固体排泄量 VS */
export interface AppendixCVSDefault {
  animal: string;
  speciesAliases: string[];
  /** VS，kg VS/（头或只·天） */
  vsKgPerHeadDay: number;
}

/** 表 C.5 粪便最大甲烷生产能力 B₀ */
export interface AppendixCB0Default {
  animal: string;
  speciesAliases: string[];
  /** B₀，m³ CH₄/kg VS */
  b0M3PerKgVS: number;
}

/** 表 C.6 甲烷转化系数 MCF（按气温和管理方式） */
export interface AppendixCMCFDefaultRow {
  /** 气温范围，如 "≤10"、"20"、"≥28" */
  temperatureBand: string;
  /** 氧化塘，% */
  oxidationPond: number;
  /** 液体贮存（自然结壳），% */
  liquidStorageNaturalCrust: number;
  /** 液体贮存（无自然结壳），% */
  liquidStorageNoCrust: number;
  /** 固体贮存，% */
  solidStorage: number;
  /** 自然风干，% */
  naturalDrying: number;
  /** 舍内粪坑贮存，% */
  pitStorageInsideHouse: number;
  /** 每日施肥，% */
  dailySpread: number;
  /** 沼气泄漏，% */
  biogasLeakage: number;
  /** 堆肥和泼肥，% */
  compostAndPaddock: number;
  /** 其他，% */
  other: number;
}

/** 表 C.7 / C.10 区域化动物排放因子通用格式 */
export interface AppendixCRegionalAnimalFactor {
  regionGroup: string;
  provinces: string;
  dairyCow: number | null;
  beefCow: number | null;
  buffalo: number | null;
  sheep: number | null;
  goat: number | null;
  pig: number | null;
  poultry: number | null;
}

/** 表 C.8 氮排泄量 Nex */
export interface AppendixCNexDefault {
  animal: string;
  speciesAliases: string[];
  /** Nex，kg N/（头或只·年） */
  nexKgNPerHeadYear: number;
}

/** 表 C.9 直接排放因子 EF₃_直接 */
export interface AppendixCDirectN2ONDefault {
  managementSystem: string;
  aliases: string[];
  /** EF₃_直接，kg N₂O-N/kg N */
  factorKgN2ONPerKgN: number;
}

// ─────────────────────────────────────────────
// 粪便管理方式标准化别名表（供所有模块共用）
// ─────────────────────────────────────────────

export const appendixCManagementSystemAliases = [
  { id: "oxidation_pond",                label: "氧化塘",              aliases: ["氧化塘"] },
  { id: "liquid_storage_natural_crust",  label: "液体贮存（自然结壳）", aliases: ["液体贮存（自然结壳）", "液体贮存自然结壳", "液体贮存(自然结壳)"] },
  { id: "liquid_storage_no_crust",       label: "液体贮存（无自然结壳）", aliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液体贮存(无自然结壳)", "液态/浆态贮存", "液态贮存", "浆态贮存"] },
  { id: "solid_storage",                 label: "固体贮存",             aliases: ["固体贮存", "堆粪", "堆存"] },
  { id: "natural_drying",                label: "自然风干",             aliases: ["自然风干"] },
  { id: "pit_storage_inside_house",      label: "舍内粪坑贮存",         aliases: ["舍内粪坑贮存", "舍内类坑贮存", "舍内坑贮存"] },
  { id: "daily_spread",                  label: "每日施肥",             aliases: ["每日施肥"] },
  { id: "biogas_tank",                   label: "沼气池",               aliases: ["沼气池", "沼气池泄漏"] },
  { id: "compost_and_paddock",           label: "堆肥和泼肥",           aliases: ["堆肥和泼肥", "堆肥", "泼肥"] },
  { id: "other",                         label: "其他",                 aliases: ["其他"] },
] as const;

// ─────────────────────────────────────────────
// 表 C.1 常用化石燃料相关参数缺省值
// 来源：标准表 C.1；lowHeatValueGJPerUnit 单位为 GJ/t 或 GJ/万Nm³
// carbonContent 单位为 10⁻² tC/GJ（使用时需 / 100 得到 tC/GJ）
// ─────────────────────────────────────────────
const appendixC1FuelDefaults: AppendixCFuelDefault[] = [
  // 固体燃料（计量单位：t）
  { fuelCategory: "固体燃料", fuelName: "无烟煤",   unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 26.7,   carbonContent: 27.4,  oxidationPercent: 94 },
  { fuelCategory: "固体燃料", fuelName: "烟煤",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 19.570, carbonContent: 26.1,  oxidationPercent: 93 },
  { fuelCategory: "固体燃料", fuelName: "褐煤",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 11.9,   carbonContent: 28.0,  oxidationPercent: 96 },
  { fuelCategory: "固体燃料", fuelName: "洗精煤",   unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 26.334, carbonContent: 25.41, oxidationPercent: 90 },
  { fuelCategory: "固体燃料", fuelName: "其他洗煤", unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 12.545, carbonContent: 25.41, oxidationPercent: 90 },
  { fuelCategory: "固体燃料", fuelName: "型煤",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 17.460, carbonContent: 33.6,  oxidationPercent: 90 },
  { fuelCategory: "固体燃料", fuelName: "其他煤制品",unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 17.460, carbonContent: 33.6,  oxidationPercent: 98 },
  { fuelCategory: "固体燃料", fuelName: "焦炭",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 28.435, carbonContent: 29.5,  oxidationPercent: 93 },
  { fuelCategory: "固体燃料", fuelName: "石油焦",   unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 32.5,   carbonContent: 27.50, oxidationPercent: 98 },

  // 液体燃料（计量单位：t）
  { fuelCategory: "液体燃料", fuelName: "原油",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 41.816, carbonContent: 20.1,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "燃料油",   unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 41.816, carbonContent: 21.1,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "汽油",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 43.070, carbonContent: 18.9,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "柴油",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 42.652, carbonContent: 20.2,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "一般煤油", unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 43.070, carbonContent: 19.6,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "液化天然气",unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 51.498, carbonContent: 15.3,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "液化石油气",unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 50.179, carbonContent: 17.2,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "石脑油",   unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 44.5,   carbonContent: 20.0,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "焦油",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 33.453, carbonContent: 22.0,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "粗苯",     unit: "t", consumptionUnit: "t", lowHeatValueGJPerUnit: 41.816, carbonContent: 22.7,  oxidationPercent: 98 },
  { fuelCategory: "液体燃料", fuelName: "其他石油制品",unit:"t",consumptionUnit: "t", lowHeatValueGJPerUnit: 41.031, carbonContent: 20.0,  oxidationPercent: 98 },

  // 气体燃料（计量单位：10⁴ Nm³ = 万Nm³）
  // 注：气体标准状态为大气压 101.325 kPa、温度 0 ℃（273.15 K）
  { fuelCategory: "气体燃料", fuelName: "天然气",   unit: "10^4 Nm³", consumptionUnit: "万Nm3", lowHeatValueGJPerUnit: 389.31, carbonContent: 15.3,  oxidationPercent: 99 },
  { fuelCategory: "气体燃料", fuelName: "高炉煤气", unit: "10^4 Nm³", consumptionUnit: "万Nm3", lowHeatValueGJPerUnit: 33.00,  carbonContent: 70.80, oxidationPercent: 99 },
  { fuelCategory: "气体燃料", fuelName: "转炉煤气", unit: "10^4 Nm³", consumptionUnit: "万Nm3", lowHeatValueGJPerUnit: 84.00,  carbonContent: 49.60, oxidationPercent: 99 },
  { fuelCategory: "气体燃料", fuelName: "焦炉煤气", unit: "10^4 Nm³", consumptionUnit: "万Nm3", lowHeatValueGJPerUnit: 179.81, carbonContent: 13.58, oxidationPercent: 99 },
  { fuelCategory: "气体燃料", fuelName: "炼厂干气", unit: "t",        consumptionUnit: "t",     lowHeatValueGJPerUnit: 45.998, carbonContent: 18.2,  oxidationPercent: 99 },
  { fuelCategory: "气体燃料", fuelName: "其他煤气", unit: "10^4 Nm³", consumptionUnit: "万Nm3", lowHeatValueGJPerUnit: 52.270, carbonContent: 12.2,  oxidationPercent: 99 },
];

// ─────────────────────────────────────────────
// 表 C.2 不同动物甲烷转化因子（Ym）缺省值
// ─────────────────────────────────────────────
const appendixC2YmDefaults: AppendixCYmDefault[] = [
  {
    label: "奶牛",
    speciesAliases: ["奶牛", "dairy cow", "dairy"],
    ymPercent: 6.5,
    ymRange: "±1.0",
  },
  {
    label: "肉牛和水牛",
    speciesAliases: ["肉牛", "水牛", "牛", "beef cattle", "buffalo", "cattle"],
    ymPercent: 6.5,
    ymRange: "±1.0",
  },
  {
    label: "饲料日粮中精饲料占90%以上的育肥牛",
    speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"],
    stageAliases: ["育肥牛", "高精料育肥牛", "精饲料占90%以上育肥牛"],
    ymPercent: 3.0,
    ymRange: "±1.0",
  },
  {
    label: "羔羊（小于1岁）",
    speciesAliases: ["绵羊", "山羊", "羊", "sheep", "goat"],
    stageAliases: ["羔羊", "当年生", "羔羊（小于1岁）", "羔羊(<1岁)"],
    ymPercent: 4.5,
    ymRange: "±1.0",
  },
  {
    label: "成年羊",
    speciesAliases: ["绵羊", "山羊", "羊", "sheep", "goat"],
    stageAliases: ["成年羊", "繁殖母畜", "母羊", "繁殖母羊"],
    ymPercent: 6.5,
    ymRange: "±1.0",
  },
];

// ─────────────────────────────────────────────
// 表 C.3 不同动物肠道发酵甲烷排放因子缺省值
// 单位：kg CH₄/（年·头或只）
// ─────────────────────────────────────────────
const appendixC3EntericEFDefaults: AppendixCEntericEFDefault[] = [
  // 奶牛
  { label: "奶牛-当年生",   speciesAliases: ["奶牛"], stageAliases: ["当年生", "犊牛", "育成牛", "青年牛"], emissionFactor: 21.9,  unit: "kg CH4/head/year" },
  { label: "奶牛-其他成年畜", speciesAliases: ["奶牛"], stageAliases: ["其他成年畜", "成年牛", "成母牛", "干奶牛"], emissionFactor: 58.6,  unit: "kg CH4/head/year" },
  { label: "奶牛-繁殖母畜", speciesAliases: ["奶牛"], stageAliases: ["繁殖母畜", "泌乳牛", "繁殖母牛", "母牛", "经产牛"], emissionFactor: 109.9, unit: "kg CH4/head/year" },
  // 肉牛
  { label: "肉牛-当年生",   speciesAliases: ["肉牛", "牛"], stageAliases: ["当年生", "犊牛", "育成牛", "青年牛"], emissionFactor: 32.3,  unit: "kg CH4/head/year" },
  { label: "肉牛-其他成年畜", speciesAliases: ["肉牛", "牛"], stageAliases: ["其他成年畜", "成年牛", "其他成年牛"], emissionFactor: 69.2,  unit: "kg CH4/head/year" },
  { label: "肉牛-繁殖母畜", speciesAliases: ["肉牛", "牛"], stageAliases: ["繁殖母畜", "繁殖母牛", "母牛"], emissionFactor: 80.8,  unit: "kg CH4/head/year" },
  // 水牛
  { label: "水牛-当年生",   speciesAliases: ["水牛"], stageAliases: ["当年生", "犊牛"], emissionFactor: 22.5,  unit: "kg CH4/head/year" },
  { label: "水牛-其他成年畜", speciesAliases: ["水牛"], stageAliases: ["其他成年畜", "成年牛"], emissionFactor: 72.3,  unit: "kg CH4/head/year" },
  { label: "水牛-繁殖母畜", speciesAliases: ["水牛"], stageAliases: ["繁殖母畜", "繁殖母牛", "母牛"], emissionFactor: 110.6, unit: "kg CH4/head/year" },
  // 绵羊
  { label: "绵羊-当年生",   speciesAliases: ["绵羊", "羊"], stageAliases: ["当年生", "羔羊", "羔羊（小于1岁）"], emissionFactor: 6.5,   unit: "kg CH4/head/year" },
  { label: "绵羊-繁殖母畜", speciesAliases: ["绵羊", "羊"], stageAliases: ["繁殖母畜", "繁殖母羊", "母羊", "成年羊"], emissionFactor: 12.0,  unit: "kg CH4/head/year" },
  // 山羊
  { label: "山羊-当年生",   speciesAliases: ["山羊", "羊"], stageAliases: ["当年生", "羔羊", "羔羊（小于1岁）"], emissionFactor: 7.1,   unit: "kg CH4/head/year" },
  { label: "山羊-繁殖母畜", speciesAliases: ["山羊", "羊"], stageAliases: ["繁殖母畜", "繁殖母羊", "母羊", "成年羊"], emissionFactor: 13.1,  unit: "kg CH4/head/year" },
  // 猪（无阶段区分）
  { label: "猪",            speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"], stageAliases: ["猪", "全部", "默认"], emissionFactor: 1.5,   unit: "kg CH4/head/year" },
];

// ─────────────────────────────────────────────
// 表 C.4 不同动物粪便挥发性固体排泄量（VS）缺省值
// 单位：kg VS/（天·头或只）
// ─────────────────────────────────────────────
const appendixC4VSDefaults: AppendixCVSDefault[] = [
  { animal: "奶牛", speciesAliases: ["奶牛"],                                   vsKgPerHeadDay: 3.5  },
  { animal: "肉牛", speciesAliases: ["肉牛", "牛"],                              vsKgPerHeadDay: 3.0  },
  { animal: "水牛", speciesAliases: ["水牛"],                                   vsKgPerHeadDay: 3.9  },
  { animal: "山羊", speciesAliases: ["山羊"],                                   vsKgPerHeadDay: 0.35 },
  { animal: "绵羊", speciesAliases: ["绵羊"],                                   vsKgPerHeadDay: 0.32 },
  { animal: "猪",   speciesAliases: ["猪"],                                     vsKgPerHeadDay: 0.3  },
  { animal: "家禽", speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry"],  vsKgPerHeadDay: 0.02 },
];

// ─────────────────────────────────────────────
// 表 C.5 不同动物粪便最大甲烷生产能力（B₀）缺省值
// 单位：m³ CH₄/kg VS
// ─────────────────────────────────────────────
const appendixC5B0Defaults: AppendixCB0Default[] = [
  { animal: "奶牛", speciesAliases: ["奶牛"],                                   b0M3PerKgVS: 0.24 },
  { animal: "肉牛", speciesAliases: ["肉牛", "牛"],                              b0M3PerKgVS: 0.19 },
  { animal: "水牛", speciesAliases: ["水牛"],                                   b0M3PerKgVS: 0.10 },
  { animal: "猪",   speciesAliases: ["猪"],                                     b0M3PerKgVS: 0.29 },
  { animal: "山羊", speciesAliases: ["山羊"],                                   b0M3PerKgVS: 0.13 },
  { animal: "绵羊", speciesAliases: ["绵羊"],                                   b0M3PerKgVS: 0.13 },
  { animal: "家禽", speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry"],  b0M3PerKgVS: 0.24 },
];

// ─────────────────────────────────────────────
// 表 C.6 不同气温、不同粪便管理方式甲烷转化系数（MCF）缺省值
// 所有值单位：%
// ─────────────────────────────────────────────
const appendixC6MCFDefaults: AppendixCMCFDefaultRow[] = [
  { temperatureBand: "≤10", oxidationPond: 66, liquidStorageNaturalCrust: 10, liquidStorageNoCrust: 17, solidStorage: 2.0, naturalDrying: 1.0, pitStorageInsideHouse: 3.0, dailySpread: 0.1, biogasLeakage: 10.0, compostAndPaddock: 0.5, other: 1.0 },
  { temperatureBand: "11",  oxidationPond: 68, liquidStorageNaturalCrust: 11, liquidStorageNoCrust: 19, solidStorage: 2.0, naturalDrying: 1.0, pitStorageInsideHouse: 3.0, dailySpread: 0.1, biogasLeakage: 10.0, compostAndPaddock: 0.5, other: 1.0 },
  { temperatureBand: "12",  oxidationPond: 70, liquidStorageNaturalCrust: 13, liquidStorageNoCrust: 20, solidStorage: 2.0, naturalDrying: 1.0, pitStorageInsideHouse: 3.0, dailySpread: 0.1, biogasLeakage: 10.0, compostAndPaddock: 0.5, other: 1.0 },
  { temperatureBand: "13",  oxidationPond: 71, liquidStorageNaturalCrust: 14, liquidStorageNoCrust: 22, solidStorage: 2.0, naturalDrying: 1.0, pitStorageInsideHouse: 3.0, dailySpread: 0.1, biogasLeakage: 10.0, compostAndPaddock: 0.5, other: 1.0 },
  { temperatureBand: "14",  oxidationPond: 73, liquidStorageNaturalCrust: 15, liquidStorageNoCrust: 25, solidStorage: 2.0, naturalDrying: 1.0, pitStorageInsideHouse: 3.0, dailySpread: 0.1, biogasLeakage: 10.0, compostAndPaddock: 0.5, other: 1.0 },
  { temperatureBand: "15",  oxidationPond: 74, liquidStorageNaturalCrust: 17, liquidStorageNoCrust: 27, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "16",  oxidationPond: 75, liquidStorageNaturalCrust: 18, liquidStorageNoCrust: 29, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "17",  oxidationPond: 76, liquidStorageNaturalCrust: 20, liquidStorageNoCrust: 32, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "18",  oxidationPond: 77, liquidStorageNaturalCrust: 22, liquidStorageNoCrust: 35, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "19",  oxidationPond: 77, liquidStorageNaturalCrust: 24, liquidStorageNoCrust: 39, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "20",  oxidationPond: 78, liquidStorageNaturalCrust: 26, liquidStorageNoCrust: 42, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "21",  oxidationPond: 78, liquidStorageNaturalCrust: 29, liquidStorageNoCrust: 46, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "22",  oxidationPond: 78, liquidStorageNaturalCrust: 31, liquidStorageNoCrust: 50, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "23",  oxidationPond: 79, liquidStorageNaturalCrust: 34, liquidStorageNoCrust: 55, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "24",  oxidationPond: 79, liquidStorageNaturalCrust: 37, liquidStorageNoCrust: 60, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "25",  oxidationPond: 79, liquidStorageNaturalCrust: 41, liquidStorageNoCrust: 65, solidStorage: 4.0, naturalDrying: 1.5, pitStorageInsideHouse: 3.0, dailySpread: 0.5, biogasLeakage: 10.0, compostAndPaddock: 1.0, other: 1.0 },
  { temperatureBand: "26",  oxidationPond: 79, liquidStorageNaturalCrust: 44, liquidStorageNoCrust: 71, solidStorage: 5.0, naturalDrying: 2.0, pitStorageInsideHouse: 30.0, dailySpread: 1.0, biogasLeakage: 10.0, compostAndPaddock: 1.5, other: 1.0 },
  { temperatureBand: "27",  oxidationPond: 80, liquidStorageNaturalCrust: 48, liquidStorageNoCrust: 78, solidStorage: 5.0, naturalDrying: 2.0, pitStorageInsideHouse: 30.0, dailySpread: 1.0, biogasLeakage: 10.0, compostAndPaddock: 1.5, other: 1.0 },
  { temperatureBand: "≥28", oxidationPond: 80, liquidStorageNaturalCrust: 50, liquidStorageNoCrust: 80, solidStorage: 5.0, naturalDrying: 2.0, pitStorageInsideHouse: 30.0, dailySpread: 1.0, biogasLeakage: 10.0, compostAndPaddock: 1.5, other: 1.0 },
];

// ─────────────────────────────────────────────
// 表 C.7 不同区域、不同动物粪便管理甲烷排放因子缺省值
// 单位：kg CH₄/（年·头或只）
// ─────────────────────────────────────────────
const appendixC7RegionalManureCH4Defaults: AppendixCRegionalAnimalFactor[] = [
  { regionGroup: "华北", provinces: "北京、天津、河北、内蒙古、山西", dairyCow: 7.46, beefCow: 2.82, buffalo: null, sheep: 0.15, goat: 0.17, pig: 3.12, poultry: 0.01 },
  { regionGroup: "东北", provinces: "辽宁、吉林、黑龙江",             dairyCow: 2.23, beefCow: 1.02, buffalo: null, sheep: 0.15, goat: 0.16, pig: 1.12, poultry: 0.01 },
  { regionGroup: "华东", provinces: "上海、江苏、浙江、安徽、福建、江西、山东", dairyCow: 8.33, beefCow: 3.31, buffalo: 5.55, sheep: 0.26, goat: 0.28, pig: 5.08, poultry: 0.02 },
  { regionGroup: "中南", provinces: "河南、湖北、湖南、广东、广西、海南", dairyCow: 8.45, beefCow: 4.72, buffalo: 8.24, sheep: 0.34, goat: 0.31, pig: 5.85, poultry: 0.02 },
  { regionGroup: "西南", provinces: "重庆、四川、贵州、云南、西藏",   dairyCow: 6.51, beefCow: 3.21, buffalo: 1.53, sheep: 0.48, goat: 0.53, pig: 4.18, poultry: 0.02 },
  { regionGroup: "西北", provinces: "陕西、甘肃、青海、宁夏、新疆",  dairyCow: 5.93, beefCow: 1.86, buffalo: null, sheep: 0.28, goat: 0.32, pig: 1.38, poultry: 0.01 },
];

// ─────────────────────────────────────────────
// 表 C.8 不同动物氮排泄量（Nex）缺省值
// 单位：kg N/（年·头或只）
// ─────────────────────────────────────────────
const appendixC8NexDefaults: AppendixCNexDefault[] = [
  { animal: "奶牛",     speciesAliases: ["奶牛"],                                   nexKgNPerHeadYear: 72.0 },
  { animal: "肉牛",     speciesAliases: ["肉牛", "牛"],                              nexKgNPerHeadYear: 40.0 },
  { animal: "水牛",     speciesAliases: ["水牛"],                                   nexKgNPerHeadYear: 40.0 },
  { animal: "山羊、绵羊", speciesAliases: ["山羊", "绵羊", "羊"],                    nexKgNPerHeadYear: 12.0 },
  { animal: "猪",       speciesAliases: ["猪"],                                     nexKgNPerHeadYear: 11.0 },
  { animal: "家禽",     speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry"],  nexKgNPerHeadYear: 0.60 },
];

// ─────────────────────────────────────────────
// 表 C.9 不同粪便管理方式下氧化亚氮-氮直接排放因子缺省值
// 单位：kg N₂O-N/kg N
// ─────────────────────────────────────────────
const appendixC9DirectN2ONDefaults: AppendixCDirectN2ONDefault[] = [
  { managementSystem: "氧化塘",           aliases: ["氧化塘"],                                                           factorKgN2ONPerKgN: 0.0   },
  { managementSystem: "液体贮存（自然结壳）", aliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"],                           factorKgN2ONPerKgN: 0.005 },
  { managementSystem: "液体贮存（无自然结壳）", aliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液态/浆态贮存"],      factorKgN2ONPerKgN: 0.0   },
  { managementSystem: "固体贮存",         aliases: ["固体贮存", "堆粪", "堆存"],                                           factorKgN2ONPerKgN: 0.005 },
  { managementSystem: "自然风干",         aliases: ["自然风干"],                                                           factorKgN2ONPerKgN: 0.02  },
  { managementSystem: "舍内粪坑贮存",     aliases: ["舍内粪坑贮存", "舍内类坑贮存", "舍内坑贮存"],                          factorKgN2ONPerKgN: 0.002 },
  { managementSystem: "每日施肥",         aliases: ["每日施肥"],                                                           factorKgN2ONPerKgN: 0.0   },
  { managementSystem: "沼气池",           aliases: ["沼气池", "沼气池泄漏"],                                               factorKgN2ONPerKgN: 0.0   },
  { managementSystem: "堆肥和泼肥",       aliases: ["堆肥和泼肥", "堆肥", "泼肥"],                                         factorKgN2ONPerKgN: 0.01  },
  { managementSystem: "其他",             aliases: ["其他"],                                                               factorKgN2ONPerKgN: 0.005 },
];

// ─────────────────────────────────────────────
// 表 C.10 不同区域、不同动物粪便管理氧化亚氮直接排放因子缺省值
// 单位：kg N₂O/（年·头或只）
// ─────────────────────────────────────────────
const appendixC10RegionalDirectN2ODefaults: AppendixCRegionalAnimalFactor[] = [
  { regionGroup: "华北", provinces: "北京、天津、河北、内蒙古、山西", dairyCow: 1.846, beefCow: 0.794, buffalo: null,  sheep: 0.093, goat: 0.093, pig: 0.227, poultry: 0.007 },
  { regionGroup: "东北", provinces: "辽宁、吉林、黑龙江",             dairyCow: 1.096, beefCow: 0.913, buffalo: null,  sheep: 0.057, goat: 0.057, pig: 0.266, poultry: 0.007 },
  { regionGroup: "华东", provinces: "上海、江苏、浙江、安徽、福建、江西、山东", dairyCow: 2.065, beefCow: 0.846, buffalo: 0.875, sheep: 0.113, goat: 0.113, pig: 0.175, poultry: 0.007 },
  { regionGroup: "中南", provinces: "河南、湖北、湖南、广东、广西、海南", dairyCow: 1.710, beefCow: 0.805, buffalo: 0.860, sheep: 0.106, goat: 0.106, pig: 0.157, poultry: 0.007 },
  { regionGroup: "西南", provinces: "重庆、四川、贵州、云南、西藏",   dairyCow: 1.884, beefCow: 0.691, buffalo: 1.197, sheep: 0.064, goat: 0.064, pig: 0.159, poultry: 0.007 },
  { regionGroup: "西北", provinces: "陕西、甘肃、青海、宁夏、新疆",  dairyCow: 1.447, beefCow: 0.545, buffalo: null,  sheep: 0.074, goat: 0.074, pig: 0.195, poultry: 0.007 },
];

// ─────────────────────────────────────────────
// 汇总导出（按标准版本索引）
// NYT4243_2022 与 GBT32151_22_2024 共用同一套附录 C 数据
// ─────────────────────────────────────────────
export const appendixCDefaultLibrary: Record<
  StandardVersion,
  {
    c1Fuel: AppendixCFuelDefault[];
    c2Ym: AppendixCYmDefault[];
    c3EntericEF: AppendixCEntericEFDefault[];
    c4VS: AppendixCVSDefault[];
    c5B0: AppendixCB0Default[];
    c6MCF: AppendixCMCFDefaultRow[];
    c7RegionalManureCH4: AppendixCRegionalAnimalFactor[];
    c8Nex: AppendixCNexDefault[];
    c9DirectN2ON: AppendixCDirectN2ONDefault[];
    c10RegionalDirectN2O: AppendixCRegionalAnimalFactor[];
  }
> = {
  NYT4243_2022: {
    c1Fuel: appendixC1FuelDefaults,
    c2Ym: appendixC2YmDefaults,
    c3EntericEF: appendixC3EntericEFDefaults,
    c4VS: appendixC4VSDefaults,
    c5B0: appendixC5B0Defaults,
    c6MCF: appendixC6MCFDefaults,
    c7RegionalManureCH4: appendixC7RegionalManureCH4Defaults,
    c8Nex: appendixC8NexDefaults,
    c9DirectN2ON: appendixC9DirectN2ONDefaults,
    c10RegionalDirectN2O: appendixC10RegionalDirectN2ODefaults,
  },
  GBT32151_22_2024: {
    c1Fuel: appendixC1FuelDefaults,
    c2Ym: appendixC2YmDefaults,
    c3EntericEF: appendixC3EntericEFDefaults,
    c4VS: appendixC4VSDefaults,
    c5B0: appendixC5B0Defaults,
    c6MCF: appendixC6MCFDefaults,
    c7RegionalManureCH4: appendixC7RegionalManureCH4Defaults,
    c8Nex: appendixC8NexDefaults,
    c9DirectN2ON: appendixC9DirectN2ONDefaults,
    c10RegionalDirectN2O: appendixC10RegionalDirectN2ODefaults,
  },
};

/** 附录 C 表格中文标题（用于报告页溯源展示） */
export const appendixCTableLabels = {
  C1:  "表 C.1 常用化石燃料相关参数的缺省值",
  C2:  "表 C.2 不同动物甲烷转化因子（Ym）缺省值",
  C3:  "表 C.3 不同动物肠道发酵甲烷排放因子缺省值",
  C4:  "表 C.4 不同动物粪便挥发性固体排泄量（VS）缺省值",
  C5:  "表 C.5 不同动物粪便最大甲烷生产能力（B₀）缺省值",
  C6:  "表 C.6 不同气温、不同粪便管理方式甲烷转化系数（MCF）缺省值",
  C7:  "表 C.7 不同区域、不同动物粪便管理甲烷排放因子缺省值",
  C8:  "表 C.8 不同动物氮排泄量（Nex）缺省值",
  C9:  "表 C.9 不同粪便管理方式下氧化亚氮-氮直接排放因子缺省值",
  C10: "表 C.10 不同区域、不同动物粪便管理氧化亚氮直接排放因子缺省值",
} as const;