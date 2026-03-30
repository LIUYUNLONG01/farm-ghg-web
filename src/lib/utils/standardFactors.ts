import { entericDefaultFactorLibrary } from "@/data/factors/entericDefaults";
import { fuelPresetLibrary } from "@/data/factors/fuelPresets";
import type {
  EntericRecord,
  FuelCombustionRecord,
  LivestockRecord,
  StandardVersion,
} from "@/types/ghg";

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s\-_()/（）]/g, "")
    .trim();
}

function includesAlias(target: string, aliases: string[]) {
  const normalizedTarget = normalizeText(target);
  return aliases.some((alias) => normalizedTarget.includes(normalizeText(alias)));
}

export function getEntericDefaultFactor(
  standardVersion: StandardVersion,
  species: string,
  stage: string
) {
  const library = entericDefaultFactorLibrary[standardVersion] ?? [];

  const exactStageMatch = library.find((item) => {
    const speciesOk = includesAlias(species, item.speciesAliases);
    const stageOk =
      !item.stageAliases || includesAlias(stage, item.stageAliases);
    return speciesOk && stageOk;
  });

  if (exactStageMatch) return exactStageMatch;

  const speciesOnlyMatch = library.find((item) =>
    includesAlias(species, item.speciesAliases)
  );

  return speciesOnlyMatch ?? null;
}

export function buildEntericDefaultsForLivestock(
  standardVersion: StandardVersion,
  livestockRows: LivestockRecord[]
): EntericRecord[] {
  return livestockRows.map((row, index) => {
    const matched = getEntericDefaultFactor(
      standardVersion,
      row.species,
      row.stage
    );

    return {
      sourceLivestockIndex: index,
      species: row.species,
      stage: row.stage,
      method: "defaultEF",
      emissionFactor: matched?.emissionFactor ?? 0,
      unit: "kg CH4/head/year",
      notes: matched
        ? `${matched.sourceLabel}：${matched.note ?? "已自动带入默认值。"}`
        : "未匹配到默认因子，请手动填写。",
    };
  });
}

export function buildFuelRowFromPreset(
  presetId: string
): FuelCombustionRecord | null {
  const preset = fuelPresetLibrary.find((item) => item.id === presetId);
  if (!preset) return null;

  return {
    fuelType: preset.fuelType,
    consumptionAmount: 0,
    ncvTJPerUnit: preset.ncvTJPerUnit,
    carbonContentTonCPerTJ: preset.carbonContentTonCPerTJ,
    oxidationFactor: preset.oxidationFactor,
    notes: `${preset.label}；建议单位：${preset.unitHint}；${preset.note}`,
  };
}

export { fuelPresetLibrary };