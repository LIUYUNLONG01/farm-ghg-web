import type { StandardVersion } from "@/types/ghg";

export interface EntericDefaultFactor {
  speciesAliases: string[];
  stageAliases?: string[];
  emissionFactor: number;
  unit: "kg CH4/head/year";
  sourceLabel: string;
  note?: string;
}

export interface EntericYmDefaultFactor {
  speciesAliases: string[];
  stageAliases?: string[];
  ymPercent: number;
  sourceLabel: string;
  note?: string;
}

/**
 * 这一版仍然是“可运行的起始参数库”。
 * 目的：先把网页逻辑和标准结构打通。
 * 后续你核对表 C.2、表 C.3 后，只需要替换这里的数值。
 */
const sharedEntericDefaults: EntericDefaultFactor[] = [
  {
    speciesAliases: ["奶牛", "dairy cow", "dairy"],
    stageAliases: ["泌乳牛", "成母牛", "奶牛"],
    emissionFactor: 68,
    unit: "kg CH4/head/year",
    sourceLabel: "推荐因子起始值",
    note: "奶牛/泌乳牛起始值，后续请按表 C.3 核对。",
  },
  {
    speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"],
    stageAliases: ["育肥牛", "后备牛", "肉牛"],
    emissionFactor: 47,
    unit: "kg CH4/head/year",
    sourceLabel: "推荐因子起始值",
    note: "肉牛/其他牛起始值，后续请按表 C.3 核对。",
  },
  {
    speciesAliases: ["水牛", "buffalo"],
    stageAliases: ["水牛"],
    emissionFactor: 55,
    unit: "kg CH4/head/year",
    sourceLabel: "推荐因子起始值",
    note: "水牛起始值，后续请按表 C.3 核对。",
  },
  {
    speciesAliases: ["羊", "绵羊", "山羊", "sheep", "goat"],
    emissionFactor: 5,
    unit: "kg CH4/head/year",
    sourceLabel: "推荐因子起始值",
    note: "羊类起始值，后续请按表 C.3 核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    emissionFactor: 1,
    unit: "kg CH4/head/year",
    sourceLabel: "推荐因子起始值",
    note: "猪起始值，后续请按表 C.3 核对。",
  },
];

const sharedEntericYmDefaults: EntericYmDefaultFactor[] = [
  {
    speciesAliases: ["奶牛", "dairy cow", "dairy"],
    stageAliases: ["泌乳牛", "成母牛", "奶牛"],
    ymPercent: 6.5,
    sourceLabel: "Ym 起始值",
    note: "奶牛起始值，后续请按表 C.2 核对。",
  },
  {
    speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"],
    stageAliases: ["育肥牛", "后备牛", "肉牛"],
    ymPercent: 6.5,
    sourceLabel: "Ym 起始值",
    note: "肉牛起始值，后续请按表 C.2 核对。",
  },
  {
    speciesAliases: ["水牛", "buffalo"],
    stageAliases: ["水牛"],
    ymPercent: 6.5,
    sourceLabel: "Ym 起始值",
    note: "水牛起始值，后续请按表 C.2 核对。",
  },
  {
    speciesAliases: ["羊", "绵羊", "山羊", "sheep", "goat"],
    ymPercent: 4.5,
    sourceLabel: "Ym 起始值",
    note: "羊类起始值，后续请按表 C.2 核对。",
  },
];

export const entericDefaultFactorLibrary: Record<
  StandardVersion,
  EntericDefaultFactor[]
> = {
  NYT4243_2022: sharedEntericDefaults,
  GBT32151_22_2024: sharedEntericDefaults,
};

export const entericYmDefaultLibrary: Record<
  StandardVersion,
  EntericYmDefaultFactor[]
> = {
  NYT4243_2022: sharedEntericYmDefaults,
  GBT32151_22_2024: sharedEntericYmDefaults,
};