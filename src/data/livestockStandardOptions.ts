import type {
  DMIAcquisitionMethod,
  FeedingSituation,
  LivestockPopulationMode,
  LivestockProductionPurpose,
} from "@/types/ghg";

export const LIVESTOCK_SPECIES_OPTIONS = [
  "奶牛",
  "肉牛",
  "水牛",
  "绵羊",
  "山羊",
  "猪",
  "家禽",
] as const;

export type LivestockSpeciesOption =
  (typeof LIVESTOCK_SPECIES_OPTIONS)[number];

export const LIVESTOCK_STAGE_OPTIONS: Record<
  LivestockSpeciesOption,
  readonly string[]
> = {
  奶牛: ["当年生", "其他成年畜", "繁殖母畜"],
  肉牛: ["当年生", "其他成年畜", "繁殖母畜"],
  水牛: ["当年生", "其他成年畜", "繁殖母畜"],
  绵羊: ["当年生", "繁殖母畜"],
  山羊: ["当年生", "繁殖母畜"],
  猪: ["默认"],
  家禽: ["默认"],
};

export const PRODUCTION_PURPOSE_OPTIONS: readonly LivestockProductionPurpose[] =
  ["泌乳", "后备", "育肥", "繁殖", "公牛", "其它"];

export const POPULATION_MODE_OPTIONS: readonly {
  value: LivestockPopulationMode;
  label: string;
}[] = [
  { value: "static", label: "静态群体" },
  { value: "turnover", label: "周转群体" },
];

export const DMI_METHOD_OPTIONS: readonly {
  value: DMIAcquisitionMethod;
  label: string;
}[] = [
  {
    value: "direct_input",
    label: "直接录入干物质采食量（DMI）",
  },
  {
    value: "feed_ledger",
    label: "后续由饲料台账反推干物质采食量（DMI）",
  },
  {
    value: "temporary_estimate",
    label: "暂用经验值或台账估计",
  },
  {
    value: "model_nema_placeholder",
    label: "后续按维持净能（NEma）模型估算",
  },
  {
    value: "model_de_placeholder",
    label: "后续按日粮可消化能占总能比例（DE）模型估算",
  },
];

export const FEEDING_SITUATION_OPTIONS: readonly FeedingSituation[] = [
  "舍饲",
  "放牧",
  "大面积放牧",
  "混合饲养",
];

function includesAny(target: string, keywords: string[]) {
  return keywords.some((keyword) => target.includes(keyword));
}

export function normalizeLivestockSpecies(
  input: string
): LivestockSpeciesOption {
  const text = input.trim();

  if (includesAny(text, ["奶牛", "dairy"])) return "奶牛";
  if (includesAny(text, ["水牛", "buffalo"])) return "水牛";
  if (includesAny(text, ["肉牛", "beef"])) return "肉牛";
  if (includesAny(text, ["绵羊", "sheep"])) return "绵羊";
  if (includesAny(text, ["山羊", "goat"])) return "山羊";
  if (includesAny(text, ["猪", "pig", "swine"])) return "猪";
  if (includesAny(text, ["鸡", "禽", "poultry", "broiler", "layer"])) {
    return "家禽";
  }
  if (includesAny(text, ["牛"])) return "肉牛";
  if (includesAny(text, ["羊"])) return "绵羊";

  return "奶牛";
}

export function normalizeLivestockStage(
  species: LivestockSpeciesOption,
  stage: string
): string {
  const text = stage.trim();

  if (species === "猪" || species === "家禽") {
    return "默认";
  }

  if (species === "绵羊" || species === "山羊") {
    if (includesAny(text, ["繁殖", "母", "成年"])) {
      return "繁殖母畜";
    }
    return "当年生";
  }

  if (includesAny(text, ["繁殖", "泌乳", "母", "经产"])) {
    return "繁殖母畜";
  }
  if (includesAny(text, ["当年", "犊", "育成", "青年", "羔"])) {
    return "当年生";
  }
  if (includesAny(text, ["其他", "成年", "干奶"])) {
    return "其他成年畜";
  }

  return "其他成年畜";
}

export function getDefaultStageForSpecies(
  species: LivestockSpeciesOption
): string {
  return LIVESTOCK_STAGE_OPTIONS[species][0];
}

export function inferProductionPurpose(
  species: string,
  stage: string
): LivestockProductionPurpose {
  const joined = `${species}${stage}`;

  if (includesAny(joined, ["泌乳"])) return "泌乳";
  if (includesAny(joined, ["育肥"])) return "育肥";
  if (includesAny(joined, ["后备", "育成", "青年"])) return "后备";
  if (includesAny(joined, ["繁殖", "母畜"])) return "繁殖";
  if (includesAny(joined, ["公牛", "配种"])) return "公牛";

  if (species === "奶牛" && stage === "其他成年畜") return "泌乳";
  if (species === "奶牛" && stage === "繁殖母畜") return "繁殖";

  return "其它";
}