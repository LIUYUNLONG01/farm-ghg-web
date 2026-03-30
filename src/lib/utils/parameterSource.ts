import type { ParameterSource } from "@/types/ghg";

export interface SourceCountSummary {
  total: number;
  defaultLibrary: number;
  fuelPreset: number;
  manual: number;
  overridden: number;
}

export function getParameterSourceDisplayLabel(source: ParameterSource): string {
  if (source === "defaultLibrary") return "默认库";
  if (source === "fuelPreset") return "燃料模板";
  return "手工录入";
}

export function countParameterSources<
  T extends {
    parameterSource?: ParameterSource;
    isOverridden?: boolean;
  }
>(rows: T[] | undefined): SourceCountSummary {
  const safeRows = rows ?? [];

  return safeRows.reduce<SourceCountSummary>(
    (acc, row) => {
      acc.total += 1;

      if (row.parameterSource === "defaultLibrary") acc.defaultLibrary += 1;
      if (row.parameterSource === "fuelPreset") acc.fuelPreset += 1;
      if (row.parameterSource === "manual") acc.manual += 1;
      if (row.isOverridden) acc.overridden += 1;

      return acc;
    },
    {
      total: 0,
      defaultLibrary: 0,
      fuelPreset: 0,
      manual: 0,
      overridden: 0,
    }
  );
}