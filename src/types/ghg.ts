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

export type EntericMethod = "defaultEF" | "customEF";
export type ManureCH4Method = "manualInput";
export type ManureN2OMethod = "manualInput";

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

export interface EntericRecord {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: EntericMethod;
  emissionFactor: number;
  unit: "kg CH4/head/year";
  notes?: string;
}

export interface ManureCH4Record {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureCH4Method;
  managementSystem: string;
  sharePercent: number;
  vsKgPerHeadPerDay: number;
  boM3PerKgVS: number;
  mcfPercent: number;
  notes?: string;
}

export interface ManureN2ORecord {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureN2OMethod;
  managementSystem: string;
  sharePercent: number;
  nexKgNPerHeadYear: number;
  ef3KgN2ONPerKgN: number;
  notes?: string;
}

export interface FuelCombustionRecord {
  fuelType: string;
  consumptionAmount: number;
  ncvTJPerUnit: number;
  carbonContentTonCPerTJ: number;
  oxidationFactor: number;
  notes?: string;
}

export interface EnergyBalanceRecord {
  purchasedElectricityMWh: number;
  purchasedElectricityEFtCO2PerMWh: number;
  purchasedHeatGJ: number;
  purchasedHeatEFtCO2PerGJ: number;
  exportedElectricityMWh: number;
  exportedElectricityEFtCO2PerMWh: number;
  exportedHeatGJ: number;
  exportedHeatEFtCO2PerGJ: number;
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
  enteric?: EntericRecord[];
  manureCH4?: ManureCH4Record[];
  manureN2O?: ManureN2ORecord[];
  energyFuel?: FuelCombustionRecord[];
  energyBalance?: EnergyBalanceRecord;
  createdAt: string;
  updatedAt: string;
}