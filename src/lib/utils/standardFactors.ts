/**
 * 标准因子查询层
 * 对接 appendixCDefaults.ts（附录 C 数据库），提供按物种/地区/管理方式的模糊匹配查询
 */

import {
  appendixCDefaultLibrary,
  appendixCManagementSystemAliases,
  appendixCTableLabels,
} from "@/data/factors/appendixCDefaults";
import type { AppendixCRegionalAnimalFactor } from "@/data/factors/appendixCDefaults";
import type {
  EntericRecord,
  FuelCombustionRecord,
  LivestockRecord,
  ParameterSourceType,
  StandardVersion,
} from "@/types/ghg";

type RegionalAnimalField =
  | "dairyCow"
  | "beefCow"
  | "buffalo"
  | "sheep"
  | "goat"
  | "pig"
  | "poultry";

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[\s\-_()/（）·]+/g, "").trim();
}

function includesAlias(input: string, aliases: readonly string[]) {
  const normalizedInput = input.trim().replace(/\s+/g, "");
  return aliases.some((alias) => {
    const normalizedAlias = alias.trim().replace(/\s+/g, "");
    return (
      normalizedInput === normalizedAlias ||
      normalizedInput.includes(normalizedAlias) ||
      normalizedAlias.includes(normalizedInput)
    );
  });
}

function getLibrary(standardVersion: StandardVersion) {
  return appendixCDefaultLibrary[standardVersion];
}

export function getParameterSourceDisplay(type: ParameterSourceType): string {
  switch (type) {
    case "default_library":  return "默认库";
    case "preset_template":  return "模板带入";
    case "manual_input":
    default:                 return "手工输入";
  }
}

// ─────────────────────────────────────────────
// C2 / C3：肠道发酵
// ─────────────────────────────────────────────

export function getEntericDefaultFactor(
  standardVersion: StandardVersion,
  species: string,
  stage: string
) {
  const library = getLibrary(standardVersion).c3EntericEF;

  const exactStageMatch = library.find((item) => {
    const speciesOk = includesAlias(species, item.speciesAliases);
    const stageOk = !item.stageAliases || includesAlias(stage, item.stageAliases);
    return speciesOk && stageOk;
  });

  if (exactStageMatch) return { ...exactStageMatch, sourceTable: appendixCTableLabels.C3 };

  const speciesOnlyMatch = library.find((item) => includesAlias(species, item.speciesAliases));
  return speciesOnlyMatch ? { ...speciesOnlyMatch, sourceTable: appendixCTableLabels.C3 } : null;
}

export function getEntericYmDefault(
  standardVersion: StandardVersion,
  species: string,
  stage: string
) {
  const library = getLibrary(standardVersion).c2Ym;

  const exactStageMatch = library.find((item) => {
    const speciesOk = includesAlias(species, item.speciesAliases);
    const stageOk = !item.stageAliases || includesAlias(stage, item.stageAliases);
    return speciesOk && stageOk;
  });

  if (exactStageMatch) return { ...exactStageMatch, sourceTable: appendixCTableLabels.C2 };

  const speciesOnlyMatch = library.find((item) => includesAlias(species, item.speciesAliases));
  return speciesOnlyMatch ? { ...speciesOnlyMatch, sourceTable: appendixCTableLabels.C2 } : null;
}

export function buildEntericDefaultsForLivestock(
  standardVersion: StandardVersion,
  livestockRows: LivestockRecord[]
): EntericRecord[] {
  return livestockRows.map((row, index) => {
    const matched = getEntericDefaultFactor(standardVersion, row.species, row.stage);
    return {
      sourceLivestockIndex: index,
      species: row.species,
      stage: row.stage,
      activityDataMethod: "annualAveragePopulation",
      method: "defaultEF",
      emissionFactor: matched?.emissionFactor ?? 0,
      unit: "kg CH4/head/year",
      parameterSourceType: matched ? "default_library" : "manual_input",
      parameterSourceLabel: matched
        ? `${standardVersion} ${matched.sourceTable}：${matched.label}`
        : "未匹配默认因子，需手动填写",
      notes: matched
        ? `${matched.sourceTable} ${matched.label} 已自动带入默认值。`
        : "未匹配到默认因子，请手动填写。",
    };
  });
}

// ─────────────────────────────────────────────
// C1：燃料参数（修正字段名 lowHeatValue → lowHeatValueGJPerUnit）
// ─────────────────────────────────────────────

function buildFuelPresetId(fuel: { fuelCategory: string; fuelName: string; unit: string }) {
  return `${fuel.fuelCategory}_${fuel.fuelName}_${fuel.unit}`
    .replace(/[^\w\u4e00-\u9fa5]+/g, "_")
    .replace(/_+/g, "_");
}

/**
 * 燃料模板库（从附录 C 表 C.1 自动生成）
 * ncvTJPerUnit：GJ/单位 ÷ 1000（统一为 TJ/单位，与 FuelCombustionRecord 字段一致）
 * carbonContentTonCPerTJ：表C.1 的 10⁻² tC/GJ 原值（计算器内部 /100 换算）
 * oxidationFactor：% ÷ 100 → 小数
 */
export const fuelPresetLibrary = appendixCDefaultLibrary.GBT32151_22_2024.c1Fuel.map((item) => ({
  id: buildFuelPresetId(item),
  label: `${item.fuelName}（按${item.unit}）`,
  fuelName: item.fuelName,
  fuelCategory: item.fuelCategory,
  unitHint: item.unit,
  consumptionUnit: item.consumptionUnit,             // "t" 或 "万Nm3"
  ncvTJPerUnit: item.lowHeatValueGJPerUnit / 1000,   // GJ/单位 → TJ/单位
  carbonContentTonCPerTJ: item.carbonContent,        // 10⁻² tC/GJ 原值，计算器负责 /100
  oxidationFactor: item.oxidationPercent / 100,      // % → 小数
  sourceLabel: appendixCTableLabels.C1,
  note: `${item.fuelCategory} / ${item.fuelName}`,
}));

export function getFuelDefaultByName(standardVersion: StandardVersion, fuelName: string) {
  const library = getLibrary(standardVersion).c1Fuel;
  const matched = library.find(
    (item) =>
      normalizeText(item.fuelName) === normalizeText(fuelName) ||
      normalizeText(item.fuelName).includes(normalizeText(fuelName)) ||
      normalizeText(fuelName).includes(normalizeText(item.fuelName))
  );
  return matched ? { ...matched, sourceTable: appendixCTableLabels.C1 } : null;
}

/**
 * 按 presetId 构造 FuelCombustionRecord
 * 新增 consumptionUnit 字段，与 ghg.ts FuelCombustionRecord 保持一致
 */
export function buildFuelRowFromPreset(presetId: string): FuelCombustionRecord | null {
  const preset = fuelPresetLibrary.find((item) => item.id === presetId);
  if (!preset) return null;

  return {
    fuelType: preset.fuelName,
    consumptionAmount: 0,
    consumptionUnit: preset.consumptionUnit,       // 新增：t 或 万Nm3
    ncvTJPerUnit: preset.ncvTJPerUnit,             // 已换算为 TJ/单位
    carbonContentTonCPerTJ: preset.carbonContentTonCPerTJ, // 10⁻² tC/GJ 原值
    oxidationFactor: preset.oxidationFactor,       // 小数形式
    parameterSourceType: "preset_template",
    parameterSourceLabel: `${preset.sourceLabel}：${preset.label}`,
    notes: `${preset.note}；建议单位：${preset.unitHint}`,
  };
}

// ─────────────────────────────────────────────
// C4 / C5：VS / B₀
// ─────────────────────────────────────────────

export function getManureVSDefault(standardVersion: StandardVersion, species: string) {
  const library = getLibrary(standardVersion).c4VS;
  const matched = library.find((item) => includesAlias(species, item.speciesAliases));
  return matched ? { ...matched, sourceTable: appendixCTableLabels.C4 } : null;
}

export function getManureB0Default(standardVersion: StandardVersion, species: string) {
  const library = getLibrary(standardVersion).c5B0;
  const matched = library.find((item) => includesAlias(species, item.speciesAliases));
  return matched ? { ...matched, sourceTable: appendixCTableLabels.C5 } : null;
}

// ─────────────────────────────────────────────
// C6 / C9：管理方式相关参数
// ─────────────────────────────────────────────

function resolveManagementSystemId(managementSystem: string) {
  const matched = appendixCManagementSystemAliases.find((item) =>
    includesAlias(managementSystem, item.aliases)
  );
  return matched?.id ?? null;
}

function mapManagementSystemIdToMCFField(id: string) {
  switch (id) {
    case "oxidation_pond":               return "oxidationPond";
    case "liquid_storage_natural_crust": return "liquidStorageNaturalCrust";
    case "liquid_storage_no_crust":      return "liquidStorageNoCrust";
    case "solid_storage":                return "solidStorage";
    case "natural_drying":               return "naturalDrying";
    case "pit_storage_inside_house":     return "pitStorageInsideHouse";
    case "daily_spread":                 return "dailySpread";
    case "biogas_tank":                  return "biogasLeakage";
    case "compost_and_paddock":          return "compostAndPaddock";
    case "other":                        return "other";
    default:                             return null;
  }
}

export function resolveTemperatureBand(annualAverageTemp: number): string {
  if (annualAverageTemp <= 10) return "≤10";
  if (annualAverageTemp >= 28) return "≥28";
  return String(Math.round(annualAverageTemp));
}

export function getMCFDefault(
  standardVersion: StandardVersion,
  managementSystem: string,
  annualAverageTempOrBand: number | string
) {
  const library = getLibrary(standardVersion).c6MCF;
  const managementSystemId = resolveManagementSystemId(managementSystem);
  if (!managementSystemId) return null;

  const field = mapManagementSystemIdToMCFField(managementSystemId);
  if (!field) return null;

  const band =
    typeof annualAverageTempOrBand === "number"
      ? resolveTemperatureBand(annualAverageTempOrBand)
      : annualAverageTempOrBand;

  const row = library.find((item) => item.temperatureBand === band);
  if (!row) return null;

  return {
    temperatureBand: row.temperatureBand,
    managementSystem,
    mcfPercent: row[field],
    sourceTable: appendixCTableLabels.C6,
  };
}

export function getDirectN2ONDefault(standardVersion: StandardVersion, managementSystem: string) {
  const library = getLibrary(standardVersion).c9DirectN2ON;
  const matched = library.find((item) => includesAlias(managementSystem, item.aliases));
  return matched ? { ...matched, sourceTable: appendixCTableLabels.C9 } : null;
}

// ─────────────────────────────────────────────
// C7 / C10：区域化因子
// ─────────────────────────────────────────────

function normalizeRegionTokens(provinces: string): string[] {
  return provinces.split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
}

export function resolveRegionGroup(location: string) {
  const library = appendixCDefaultLibrary.GBT32151_22_2024.c7RegionalManureCH4;
  for (const row of library) {
    const tokens = normalizeRegionTokens(row.provinces);
    if (tokens.some((token) => location.includes(token))) return row.regionGroup;
  }
  return null;
}

function resolveRegionalAnimalField(species: string): RegionalAnimalField | null {
  const s = normalizeText(species);
  if (s.includes("奶牛")) return "dairyCow";
  if (s.includes("肉牛")) return "beefCow";
  if (s.includes("水牛")) return "buffalo";
  if (s.includes("绵羊") || s.includes("sheep")) return "sheep";
  if (s.includes("山羊") || s.includes("goat")) return "goat";
  if (s.includes("猪") || s.includes("pig") || s.includes("swine")) return "pig";
  if (s.includes("鸡") || s.includes("禽") || s.includes("poultry") || s.includes("broiler") || s.includes("layer")) return "poultry";
  if (s.includes("羊")) return "sheep";
  if (s.includes("牛")) return "beefCow";
  return null;
}

function readRegionalAnimalValue(
  row: AppendixCRegionalAnimalFactor,
  field: RegionalAnimalField
): number | null {
  const value = row[field];
  return typeof value === "number" || value === null ? value : null;
}

export function getRegionalManureCH4Factor(
  standardVersion: StandardVersion,
  location: string,
  species: string
) {
  const library = getLibrary(standardVersion).c7RegionalManureCH4;
  const regionGroup = resolveRegionGroup(location);
  const animalField = resolveRegionalAnimalField(species);
  if (!regionGroup || !animalField) return null;

  const row = library.find((item) => item.regionGroup === regionGroup);
  if (!row) return null;

  const value = readRegionalAnimalValue(row, animalField);
  if (value === null || value === undefined) return null;

  return { regionGroup, provinces: row.provinces, species, emissionFactor: value, sourceTable: appendixCTableLabels.C7 };
}

export function getRegionalDirectN2OFactor(
  standardVersion: StandardVersion,
  location: string,
  species: string
) {
  const library = getLibrary(standardVersion).c10RegionalDirectN2O;
  const regionGroup = resolveRegionGroup(location);
  const animalField = resolveRegionalAnimalField(species);
  if (!regionGroup || !animalField) return null;

  const row = library.find((item) => item.regionGroup === regionGroup);
  if (!row) return null;

  const value = readRegionalAnimalValue(row, animalField);
  if (value === null || value === undefined) return null;

  return { regionGroup, provinces: row.provinces, species, emissionFactor: value, sourceTable: appendixCTableLabels.C10 };
}

// ─────────────────────────────────────────────
// C8：Nex
// ─────────────────────────────────────────────

export function getNexDefault(standardVersion: StandardVersion, species: string) {
  const library = getLibrary(standardVersion).c8Nex;
  const matched = library.find((item) => includesAlias(species, item.speciesAliases));
  return matched ? { ...matched, sourceTable: appendixCTableLabels.C8 } : null;
}

// ─────────────────────────────────────────────
// 便捷组合函数（供页面一键带入缺省值）
// ─────────────────────────────────────────────

export function getManureCH4DefaultFactor(
  standardVersion: StandardVersion,
  species: string,
  managementSystem: string,
  annualAverageTempOrBand: number | string = "20"
) {
  const vs = getManureVSDefault(standardVersion, species);
  const b0 = getManureB0Default(standardVersion, species);
  const mcf = getMCFDefault(standardVersion, managementSystem, annualAverageTempOrBand);
  if (!vs || !b0 || !mcf) return null;

  return {
    species, managementSystem,
    vsKgPerHeadPerDay: vs.vsKgPerHeadDay,
    boM3PerKgVS: b0.b0M3PerKgVS,
    mcfPercent: mcf.mcfPercent,
    sourceLabel: `${vs.sourceTable} / ${b0.sourceTable} / ${mcf.sourceTable}`,
    note: `${vs.animal} VS + ${b0.animal} B₀ + ${mcf.temperatureBand}℃对应MCF`,
  };
}

export function getManureN2ODefaultFactor(
  standardVersion: StandardVersion,
  species: string,
  managementSystem: string
) {
  const nex = getNexDefault(standardVersion, species);
  const ef3 = getDirectN2ONDefault(standardVersion, managementSystem);
  if (!nex || !ef3) return null;

  return {
    species, managementSystem,
    nexKgNPerHeadYear: nex.nexKgNPerHeadYear,
    ef3KgN2ONPerKgN: ef3.factorKgN2ONPerKgN,
    sourceLabel: `${nex.sourceTable} / ${ef3.sourceTable}`,
    note: `${nex.animal} Nex + ${ef3.managementSystem} 直接N₂O-N因子`,
  };
}

/** 兼容旧页面命名，直接导出别名 */
export const commonManagementSystemPresets = appendixCManagementSystemAliases;
export { appendixCTableLabels, appendixCManagementSystemAliases };