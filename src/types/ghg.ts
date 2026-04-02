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

export type EntericActivityDataMethod =
  | "annualAveragePopulation"
  | "monthlyAveragePopulation"
  | "turnoverCalculation";

export type EntericMethod =
  | "defaultEF"
  | "calculatedEF"
  | "measuredEF"
  | "customEF";

export type ManureCH4Method = "regionalDefaultEF" | "parameterCalculation";
export type ManureN2OMethod = "regionalDefaultEF" | "parameterCalculation";

export type ParameterSourceType =
  | "default_library"
  | "manual_input"
  | "preset_template";

/**
 * 兼容旧代码中的命名
 */
export type ParameterSource = ParameterSourceType;

export type LivestockProductionPurpose =
  | "泌乳"
  | "后备"
  | "育肥"
  | "繁殖"
  | "公牛"
  | "其它";

export type LivestockPopulationMode = "static" | "turnover";

export type DMIAcquisitionMethod =
  | "direct_input"
  | "feed_ledger"
  | "temporary_estimate"
  | "model_nema_placeholder"
  | "model_de_placeholder";

export type FeedingSituation =
  | "舍饲"
  | "放牧"
  | "大面积放牧"
  | "混合饲养";

export type FeedLedgerDirection = "inbound" | "outbound";
export type FeedSourceType = "外购" | "自产" | "未知";

export interface ParameterSourceMeta {
  parameterSourceType: ParameterSourceType;
  parameterSourceLabel: string;
}

export interface ProjectBase {
  enterpriseName: string;
  year: number;
  region: string;
  farmType: FarmType;
  standardVersion: StandardVersion;
  notes?: string;
}

export interface LivestockMonthlyChangeRecord {
  month: number;
  openingHead: number;
  births: number;
  transferredIn: number;
  purchasedIn: number;
  culled: number;
  sold: number;
  transferredOut: number;
  deaths: number;
  closingHead: number;
}

export interface LivestockRecord {
  species: string;
  stage: string;

  productionPurpose?: LivestockProductionPurpose;
  populationMode?: LivestockPopulationMode;

  annualAverageHead: number;
  annualOutputHead?: number;
  feedingDays?: number;

  monthlyRecords?: LivestockMonthlyChangeRecord[];

  openingWeightKg?: number;
  closingWeightKg?: number;
  averageDailyGainKg?: number;
  matureWeightKg?: number;

  milkYieldKgPerYear?: number;
  milkFatPercent?: number;
  pregnancyRatePercent?: number;
  feedingSituation?: FeedingSituation;

  dmiMethod?: DMIAcquisitionMethod;
  dmiKgPerHeadDay?: number;
  dePercent?: number;
  nemaMJPerKgDM?: number;

  notes?: string;
}

export interface FeedLedgerRecord {
  id: string;
  direction: FeedLedgerDirection;
  feedName: string;
  moisturePercent: number;
  recordDate: string;
  targetGroupSourceLivestockIndex?: number;
  quantityTon: number;
  responsiblePerson?: string;
  feedSourceType?: FeedSourceType;
  notes?: string;
}

export interface EntericRecord extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;

  activityDataMethod?: EntericActivityDataMethod;

  annualAveragePopulation?: number;

  janHead?: number;
  febHead?: number;
  marHead?: number;
  aprHead?: number;
  mayHead?: number;
  junHead?: number;
  julHead?: number;
  augHead?: number;
  sepHead?: number;
  octHead?: number;
  novHead?: number;
  decHead?: number;

  annualThroughput?: number;
  daysAlive?: number;

  method: EntericMethod;

  emissionFactor: number;

  dmiKgPerHeadDay?: number;
  ymPercent?: number;
  geMJPerHeadDay?: number;

  unit: "kg CH4/head/year";
  notes?: string;
}

export interface ManureCH4Record extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureCH4Method;

  regionalEmissionFactor?: number;

  managementSystem?: string;
  sharePercent?: number;
  vsKgPerHeadPerDay?: number;
  boM3PerKgVS?: number;
  mcfPercent?: number;

  notes?: string;
}

export interface ManureN2ORecord extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureN2OMethod;

  regionalEmissionFactor?: number;

  managementSystem?: string;
  sharePercent?: number;
  nexKgNPerHeadYear?: number;
  ef3KgN2ONPerKgN?: number;

  notes?: string;
}

export interface FuelCombustionRecord extends ParameterSourceMeta {
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
  feedLedger?: FeedLedgerRecord[];
  enteric?: EntericRecord[];
  manureCH4?: ManureCH4Record[];
  manureN2O?: ManureN2ORecord[];
  energyFuel?: FuelCombustionRecord[];
  energyBalance?: EnergyBalanceRecord;
  createdAt: string;
  updatedAt: string;
}