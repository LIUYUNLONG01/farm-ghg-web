export type StandardVersion = "NYT4243_2022" | "GBT32151_22_2024";

export type FarmType =
  | "奶牛场"
  | "肉牛场"
  | "羊场"
  | "猪场"
  | "蛋鸡场"
  | "肉鸡场"
  | "其他";

export type ModuleKey =
  | "fossilFuel"
  | "entericCH4"
  | "manureCH4"
  | "manureN2O"
  | "biogasRecovery"
  | "purchasedEnergy"
  | "exportedEnergy";

export interface ProjectBase {
  enterpriseName: string;
  year: number;
  region: string;
  farmType: FarmType;
  standardVersion: StandardVersion;
  notes?: string;
}

export interface LivestockRecord {
  species: string;
  stage: string;
  annualAverageHead: number;
  annualOutputHead?: number;
  feedingDays?: number;
}

export interface FactorReference {
  standardVersion: StandardVersion;
  sourceTable: string;
  factorCode: string;
  factorName: string;
  value: number;
  unit: string;
  note?: string;
}

export interface ModuleResult {
  moduleKey: ModuleKey;
  moduleName: string;
  emission: number;
  unit: "tCO2e";
  activityData: Record<string, string | number>;
  factorRefs: FactorReference[];
  notes?: string[];
}

export interface ProjectDraft {
  base: ProjectBase;
  livestock: LivestockRecord[];
  createdAt: string;
  updatedAt: string;
}