/**
 * 肠道发酵模块缺省值库
 * 数值来源：GB/T 32151.22-2024 附录 C 表 C.3（排放因子）、表 C.2（Ym）
 * 本文件是 appendixCDefaults.ts 的便捷查询层，提供按物种/阶段模糊匹配功能
 */

import type { StandardVersion } from "@/types/ghg";

export interface EntericDefaultFactor {
  /** 展示标签，如"奶牛-繁殖母畜" */
  label: string;
  /** 表格来源，如"表C.3" */
  sourceTable: string;
  speciesAliases: string[];
  stageAliases?: string[];
  /** 排放因子 EF，kg CH₄/（头或只·年）；来源：表 C.3 */
  emissionFactor: number;
  unit: "kg CH4/head/year";
  note?: string;
}

export interface EntericYmDefaultFactor {
  label: string;
  sourceTable: string;
  speciesAliases: string[];
  stageAliases?: string[];
  /** Ym 中心值，%；来源：表 C.2 */
  ymPercent: number;
  /** Ym 不确定范围 */
  ymRange?: string;
  note?: string;
}

// ─────────────────────────────────────────────
// 表 C.3 肠道发酵甲烷排放因子缺省值
// 单位：kg CH₄/（年·头或只）
// ─────────────────────────────────────────────
const c3EntericEFDefaults: EntericDefaultFactor[] = [
  // ── 奶牛 ──
  {
    label: "奶牛-当年生", sourceTable: "表C.3",
    speciesAliases: ["奶牛"],
    stageAliases: ["当年生", "犊牛", "育成牛", "青年牛"],
    emissionFactor: 21.9, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "奶牛-其他成年畜", sourceTable: "表C.3",
    speciesAliases: ["奶牛"],
    stageAliases: ["其他成年畜", "成年牛", "成母牛", "干奶牛"],
    emissionFactor: 58.6, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "奶牛-繁殖母畜", sourceTable: "表C.3",
    speciesAliases: ["奶牛"],
    stageAliases: ["繁殖母畜", "泌乳牛", "繁殖母牛", "母牛", "经产牛"],
    emissionFactor: 109.9, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },

  // ── 肉牛 ──
  {
    label: "肉牛-当年生", sourceTable: "表C.3",
    speciesAliases: ["肉牛", "牛"],
    stageAliases: ["当年生", "犊牛", "育成牛", "青年牛"],
    emissionFactor: 32.3, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "肉牛-其他成年畜", sourceTable: "表C.3",
    speciesAliases: ["肉牛", "牛"],
    stageAliases: ["其他成年畜", "成年牛", "其他成年牛"],
    emissionFactor: 69.2, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "肉牛-繁殖母畜", sourceTable: "表C.3",
    speciesAliases: ["肉牛", "牛"],
    stageAliases: ["繁殖母畜", "繁殖母牛", "母牛"],
    emissionFactor: 80.8, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },

  // ── 水牛 ──
  {
    label: "水牛-当年生", sourceTable: "表C.3",
    speciesAliases: ["水牛"],
    stageAliases: ["当年生", "犊牛"],
    emissionFactor: 22.5, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "水牛-其他成年畜", sourceTable: "表C.3",
    speciesAliases: ["水牛"],
    stageAliases: ["其他成年畜", "成年牛"],
    emissionFactor: 72.3, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "水牛-繁殖母畜", sourceTable: "表C.3",
    speciesAliases: ["水牛"],
    stageAliases: ["繁殖母畜", "繁殖母牛", "母牛"],
    emissionFactor: 110.6, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },

  // ── 绵羊 ──
  {
    label: "绵羊-当年生", sourceTable: "表C.3",
    speciesAliases: ["绵羊", "羊"],
    stageAliases: ["当年生", "羔羊", "羔羊（小于1岁）", "羔羊(<1岁)"],
    emissionFactor: 6.5, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "绵羊-繁殖母畜", sourceTable: "表C.3",
    speciesAliases: ["绵羊", "羊"],
    stageAliases: ["繁殖母畜", "繁殖母羊", "母羊", "成年羊"],
    emissionFactor: 12.0, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },

  // ── 山羊 ──
  {
    label: "山羊-当年生", sourceTable: "表C.3",
    speciesAliases: ["山羊", "羊"],
    stageAliases: ["当年生", "羔羊", "羔羊（小于1岁）", "羔羊(<1岁)"],
    emissionFactor: 7.1, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },
  {
    label: "山羊-繁殖母畜", sourceTable: "表C.3",
    speciesAliases: ["山羊", "羊"],
    stageAliases: ["繁殖母畜", "繁殖母羊", "母羊", "成年羊"],
    emissionFactor: 13.1, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3",
  },

  // ── 猪（无阶段区分）──
  {
    label: "猪", sourceTable: "表C.3",
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    stageAliases: ["猪", "全部", "默认"],
    emissionFactor: 1.5, unit: "kg CH4/head/year",
    note: "GB/T 32151.22-2024 表C.3；家禽肠道发酵排放量极小，标准未给出推荐因子",
  },
];

// ─────────────────────────────────────────────
// 表 C.2 不同动物甲烷转化因子（Ym）缺省值
// 单位：%
// ─────────────────────────────────────────────
const c2YmDefaults: EntericYmDefaultFactor[] = [
  {
    label: "奶牛", sourceTable: "表C.2",
    speciesAliases: ["奶牛", "dairy cow", "dairy"],
    ymPercent: 6.5, ymRange: "±1.0",
    note: "GB/T 32151.22-2024 表C.2",
  },
  {
    label: "肉牛和水牛", sourceTable: "表C.2",
    speciesAliases: ["肉牛", "水牛", "牛", "beef cattle", "buffalo", "cattle"],
    ymPercent: 6.5, ymRange: "±1.0",
    note: "GB/T 32151.22-2024 表C.2",
  },
  {
    label: "饲料日粮中精饲料占90%以上的育肥牛", sourceTable: "表C.2",
    speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"],
    stageAliases: ["育肥牛", "高精料育肥牛", "精饲料占90%以上育肥牛"],
    ymPercent: 3.0, ymRange: "±1.0",
    note: "GB/T 32151.22-2024 表C.2；仅适用于精料比例≥90%的育肥牛",
  },
  {
    label: "羔羊（小于1岁）", sourceTable: "表C.2",
    speciesAliases: ["绵羊", "山羊", "羊", "sheep", "goat"],
    stageAliases: ["羔羊", "当年生", "羔羊（小于1岁）", "羔羊(<1岁)"],
    ymPercent: 4.5, ymRange: "±1.0",
    note: "GB/T 32151.22-2024 表C.2",
  },
  {
    label: "成年羊", sourceTable: "表C.2",
    speciesAliases: ["绵羊", "山羊", "羊", "sheep", "goat"],
    stageAliases: ["成年羊", "繁殖母畜", "母羊", "繁殖母羊"],
    ymPercent: 6.5, ymRange: "±1.0",
    note: "GB/T 32151.22-2024 表C.2",
  },
];

// ─────────────────────────────────────────────
// 按标准版本导出（两个版本共用同一套附录 C 数据）
// ─────────────────────────────────────────────
export const entericDefaultFactorLibrary: Record<StandardVersion, EntericDefaultFactor[]> = {
  NYT4243_2022:      c3EntericEFDefaults,
  GBT32151_22_2024:  c3EntericEFDefaults,
};

export const entericYmDefaultLibrary: Record<StandardVersion, EntericYmDefaultFactor[]> = {
  NYT4243_2022:      c2YmDefaults,
  GBT32151_22_2024:  c2YmDefaults,
};