import type { StandardVersion } from "@/types/ghg";

export interface EntericDefaultFactor {
  speciesAliases: string[];
  stageAliases?: string[];
  emissionFactor: number;
  unit: "kg CH4/head/year";
  sourceLabel: string;
  note?: string;
}

/**
 * 这一版先做“参数库框架 + 可运行的起始默认值”。
 * 数值用于系统联调和自动带入，不代表你最终报送时的定稿值。
 * 后续你核对标准附录后，只需要替换这里即可，不用重写页面。
 */
const sharedEntericDefaults: EntericDefaultFactor[] = [
  {
    speciesAliases: ["奶牛", "dairy cow", "dairy"],
    stageAliases: ["泌乳牛", "成母牛", "奶牛"],
    emissionFactor: 68,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "奶牛/泌乳牛默认起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"],
    stageAliases: ["育肥牛", "后备牛", "肉牛"],
    emissionFactor: 47,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "肉牛/其他牛默认起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["水牛", "buffalo"],
    stageAliases: ["水牛"],
    emissionFactor: 55,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "水牛默认起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["羊", "绵羊", "山羊", "sheep", "goat"],
    emissionFactor: 5,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "羊类默认起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    emissionFactor: 1,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "猪默认起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["马", "horse"],
    emissionFactor: 18,
    unit: "kg CH4/head/year",
    sourceLabel: "默认起始值",
    note: "马默认起始值，后续请按标准附录核对。",
  },
];

export const entericDefaultFactorLibrary: Record<
  StandardVersion,
  EntericDefaultFactor[]
> = {
  NYT4243_2022: sharedEntericDefaults,
  GBT32151_22_2024: sharedEntericDefaults,
};