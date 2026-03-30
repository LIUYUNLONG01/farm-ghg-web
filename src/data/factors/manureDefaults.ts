import type { StandardVersion } from "@/types/ghg";

export interface ManagementSystemPreset {
  id: string;
  label: string;
  aliases: string[];
}

export interface ManureCH4DefaultFactor {
  speciesAliases: string[];
  managementSystemAliases: string[];
  vsKgPerHeadPerDay: number;
  boM3PerKgVS: number;
  mcfPercent: number;
  sourceLabel: string;
  note?: string;
}

export interface ManureN2ODefaultFactor {
  speciesAliases: string[];
  managementSystemAliases: string[];
  nexKgNPerHeadYear: number;
  ef3KgN2ONPerKgN: number;
  sourceLabel: string;
  note?: string;
}

/**
 * 当前这一版是“可运行的参数库框架 + 起始默认值”。
 * 目的是让系统先支持“按标准版本自动带入默认值”。
 * 后续你核对标准附录后，只需要替换这里的数值，不需要重写页面逻辑。
 */
export const commonManagementSystemPresets: ManagementSystemPreset[] = [
  {
    id: "solid_storage",
    label: "固体贮存",
    aliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
  },
  {
    id: "liquid_slurry",
    label: "液态/浆态贮存",
    aliases: [
      "液态/浆态贮存",
      "液态贮存",
      "浆态贮存",
      "liquid/slurry",
      "slurry",
    ],
  },
  {
    id: "drylot",
    label: "干清粪/干栏",
    aliases: ["干清粪", "干栏", "dry lot", "干清粪场"],
  },
  {
    id: "deep_bedding",
    label: "深垫料",
    aliases: ["深垫料", "deep bedding", "垫料"],
  },
  {
    id: "anaerobic_lagoon",
    label: "厌氧塘",
    aliases: ["厌氧塘", "anaerobic lagoon", "lagoon"],
  },
  {
    id: "poultry_litter",
    label: "禽粪带垫料",
    aliases: [
      "禽粪带垫料",
      "带垫料禽粪",
      "poultry manure with litter",
      "poultry litter",
    ],
  },
  {
    id: "poultry_no_litter",
    label: "禽粪无垫料",
    aliases: [
      "禽粪无垫料",
      "无垫料禽粪",
      "poultry manure without litter",
    ],
  },
];

const sharedManureCH4Defaults: ManureCH4DefaultFactor[] = [
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    vsKgPerHeadPerDay: 2.5,
    boM3PerKgVS: 0.24,
    mcfPercent: 4,
    sourceLabel: "默认起始值",
    note: "牛类 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: [
      "液态/浆态贮存",
      "液态贮存",
      "浆态贮存",
      "liquid/slurry",
      "slurry",
    ],
    vsKgPerHeadPerDay: 2.5,
    boM3PerKgVS: 0.24,
    mcfPercent: 35,
    sourceLabel: "默认起始值",
    note: "牛类 + 液态/浆态贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: ["干清粪", "干栏", "dry lot", "干清粪场"],
    vsKgPerHeadPerDay: 2.5,
    boM3PerKgVS: 0.24,
    mcfPercent: 1.5,
    sourceLabel: "默认起始值",
    note: "牛类 + 干清粪/干栏起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    vsKgPerHeadPerDay: 0.3,
    boM3PerKgVS: 0.45,
    mcfPercent: 4,
    sourceLabel: "默认起始值",
    note: "猪 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: [
      "液态/浆态贮存",
      "液态贮存",
      "浆态贮存",
      "liquid/slurry",
      "slurry",
    ],
    vsKgPerHeadPerDay: 0.3,
    boM3PerKgVS: 0.45,
    mcfPercent: 35,
    sourceLabel: "默认起始值",
    note: "猪 + 液态/浆态贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: ["深垫料", "deep bedding", "垫料"],
    vsKgPerHeadPerDay: 0.3,
    boM3PerKgVS: 0.45,
    mcfPercent: 17,
    sourceLabel: "默认起始值",
    note: "猪 + 深垫料起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["羊", "绵羊", "山羊", "sheep", "goat"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    vsKgPerHeadPerDay: 0.1,
    boM3PerKgVS: 0.19,
    mcfPercent: 4,
    sourceLabel: "默认起始值",
    note: "羊类 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"],
    managementSystemAliases: [
      "禽粪带垫料",
      "带垫料禽粪",
      "poultry manure with litter",
      "poultry litter",
    ],
    vsKgPerHeadPerDay: 0.02,
    boM3PerKgVS: 0.36,
    mcfPercent: 1.5,
    sourceLabel: "默认起始值",
    note: "禽类 + 带垫料禽粪起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"],
    managementSystemAliases: [
      "禽粪无垫料",
      "无垫料禽粪",
      "poultry manure without litter",
    ],
    vsKgPerHeadPerDay: 0.02,
    boM3PerKgVS: 0.36,
    mcfPercent: 1.5,
    sourceLabel: "默认起始值",
    note: "禽类 + 无垫料禽粪起始值，后续请按标准附录核对。",
  },
];

const sharedManureN2ODefaults: ManureN2ODefaultFactor[] = [
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    nexKgNPerHeadYear: 70,
    ef3KgN2ONPerKgN: 0.005,
    sourceLabel: "默认起始值",
    note: "牛类 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: [
      "液态/浆态贮存",
      "液态贮存",
      "浆态贮存",
      "liquid/slurry",
      "slurry",
    ],
    nexKgNPerHeadYear: 70,
    ef3KgN2ONPerKgN: 0.005,
    sourceLabel: "默认起始值",
    note: "牛类 + 液态/浆态贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["奶牛", "肉牛", "牛", "cattle", "dairy cow", "beef cattle"],
    managementSystemAliases: ["干清粪", "干栏", "dry lot", "干清粪场"],
    nexKgNPerHeadYear: 70,
    ef3KgN2ONPerKgN: 0.02,
    sourceLabel: "默认起始值",
    note: "牛类 + 干清粪/干栏起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    nexKgNPerHeadYear: 20,
    ef3KgN2ONPerKgN: 0.005,
    sourceLabel: "默认起始值",
    note: "猪 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: [
      "液态/浆态贮存",
      "液态贮存",
      "浆态贮存",
      "liquid/slurry",
      "slurry",
    ],
    nexKgNPerHeadYear: 20,
    ef3KgN2ONPerKgN: 0.005,
    sourceLabel: "默认起始值",
    note: "猪 + 液态/浆态贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["猪", "育肥猪", "母猪", "pig", "swine"],
    managementSystemAliases: ["深垫料", "deep bedding", "垫料"],
    nexKgNPerHeadYear: 20,
    ef3KgN2ONPerKgN: 0.01,
    sourceLabel: "默认起始值",
    note: "猪 + 深垫料起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["羊", "绵羊", "山羊", "sheep", "goat"],
    managementSystemAliases: ["固体贮存", "solid storage", "堆粪", "堆存"],
    nexKgNPerHeadYear: 12,
    ef3KgN2ONPerKgN: 0.005,
    sourceLabel: "默认起始值",
    note: "羊类 + 固体贮存起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"],
    managementSystemAliases: [
      "禽粪带垫料",
      "带垫料禽粪",
      "poultry manure with litter",
      "poultry litter",
    ],
    nexKgNPerHeadYear: 0.6,
    ef3KgN2ONPerKgN: 0.001,
    sourceLabel: "默认起始值",
    note: "禽类 + 带垫料禽粪起始值，后续请按标准附录核对。",
  },
  {
    speciesAliases: ["蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"],
    managementSystemAliases: [
      "禽粪无垫料",
      "无垫料禽粪",
      "poultry manure without litter",
    ],
    nexKgNPerHeadYear: 0.6,
    ef3KgN2ONPerKgN: 0.001,
    sourceLabel: "默认起始值",
    note: "禽类 + 无垫料禽粪起始值，后续请按标准附录核对。",
  },
];

export const manureCH4DefaultFactorLibrary: Record<
  StandardVersion,
  ManureCH4DefaultFactor[]
> = {
  NYT4243_2022: sharedManureCH4Defaults,
  GBT32151_22_2024: sharedManureCH4Defaults,
};

export const manureN2ODefaultFactorLibrary: Record<
  StandardVersion,
  ManureN2ODefaultFactor[]
> = {
  NYT4243_2022: sharedManureN2ODefaults,
  GBT32151_22_2024: sharedManureN2ODefaults,
};