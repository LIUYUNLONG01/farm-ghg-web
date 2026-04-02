import type { ParameterSource, ParameterSourceType } from "@/types/ghg";

export interface SourceCountSummary {
  total: number;

  // 兼容旧命名
  defaultLibrary: number;
  fuelPreset: number;
  manual: number;

  // 新命名
  defaultLibraryCount: number;
  presetTemplateCount: number;
  manualInputCount: number;
}

type AnyParameterSource =
  | ParameterSourceType
  | ParameterSource
  | "defaultLibrary"
  | "fuelPreset"
  | "manual"
  | undefined
  | null;

export function normalizeParameterSource(
  source: AnyParameterSource
): ParameterSourceType {
  if (source === "default_library" || source === "defaultLibrary") {
    return "default_library";
  }

  if (source === "preset_template" || source === "fuelPreset") {
    return "preset_template";
  }

  if (source === "manual_input" || source === "manual") {
    return "manual_input";
  }

  return "manual_input";
}

export function getParameterSourceDisplayLabel(
  source: AnyParameterSource
): string {
  const normalized = normalizeParameterSource(source);

  if (normalized === "default_library") return "默认库";
  if (normalized === "preset_template") return "模板";
  return "手工录入";
}

export function countParameterSources(
  sources: AnyParameterSource[]
): SourceCountSummary {
  const summary: SourceCountSummary = {
    total: sources.length,

    // 旧命名
    defaultLibrary: 0,
    fuelPreset: 0,
    manual: 0,

    // 新命名
    defaultLibraryCount: 0,
    presetTemplateCount: 0,
    manualInputCount: 0,
  };

  for (const source of sources) {
    const normalized = normalizeParameterSource(source);

    if (normalized === "default_library") {
      summary.defaultLibrary += 1;
      summary.defaultLibraryCount += 1;
      continue;
    }

    if (normalized === "preset_template") {
      summary.fuelPreset += 1;
      summary.presetTemplateCount += 1;
      continue;
    }

    summary.manual += 1;
    summary.manualInputCount += 1;
  }

  return summary;
}

export function summarizeParameterSources(
  sources: AnyParameterSource[]
): SourceCountSummary {
  return countParameterSources(sources);
}