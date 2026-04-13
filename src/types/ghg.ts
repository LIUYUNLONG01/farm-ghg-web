/**
 * GHG 核算平台 — 核心类型定义
 * 对齐标准：GB/T 32151.22-2024《温室气体排放核算与报告要求 第22部分：畜禽养殖企业》
 * 参考依据：IPCC 2006/2019 国家温室气体清单指南
 */

// ─────────────────────────────────────────────
// 1. 枚举 / 联合类型
// ─────────────────────────────────────────────

/** 核算标准版本 */
export type StandardVersion = "NYT4243_2022" | "GBT32151_22_2024";

/** 养殖场类型 */
export type FarmType =
  | "奶牛场"
  | "肉牛场"
  | "羊场"
  | "猪场"
  | "蛋鸡场"
  | "肉鸡场"
  | "其他";

/**
 * 核算模块 Key
 * 对应标准 5.2.1 温室气体排放总量公式 (1) 中的各分项
 * biogasRecovery 对应 R_CH4_回收（减项），5.2.6 节
 */
export type ModuleKey =
  | "fossilFuel"        // E_燃烧：化石燃料燃烧 CO₂，5.2.2
  | "entericCH4"        // E_CH4_肠道：肠道发酵 CH₄，5.2.3
  | "manureCH4"         // E_CH4_粪便：粪污管理 CH₄，5.2.4
  | "manureN2O"         // E_N2O_粪便：粪污管理 N₂O，5.2.5
  | "biogasRecovery"    // R_CH4_回收：沼气甲烷回收利用（减项），5.2.6
  | "purchasedEnergy"   // E_购入电/热：购入电力热力 CO₂，5.2.7
  | "exportedEnergy";   // E_输出电/热：输出电力热力 CO₂，5.2.7

/** 肠道发酵活动数据获取方法，5.2.3.2 */
export type EntericActivityDataMethod =
  | "annualAveragePopulation"    // 直接录入年平均存栏 AP
  | "monthlyAveragePopulation"   // 12 个月存栏自动平均
  | "turnoverCalculation";       // 短生长期动物：AP = NA × DA / 365，公式 (6)

/** 肠道发酵排放因子获取方法，5.2.3.3 */
export type EntericMethod =
  | "defaultEF"     // 推荐因子法，5.2.3.3.4，表 C.3
  | "calculatedEF"  // 计算法（DMI + Ym），5.2.3.3.3，公式 (7)(8)
  | "measuredEF"    // 实测法，5.2.3.3.2
  | "customEF";     // 兼容旧数据，已迁移为 measuredEF

/** 粪污管理 CH₄ 排放因子获取方法，5.2.4.3 */
export type ManureCH4Method = "regionalDefaultEF" | "parameterCalculation";

/** 粪污管理 N₂O 排放因子获取方法，5.2.5.3 */
export type ManureN2OMethod = "regionalDefaultEF" | "parameterCalculation";

/** 参数来源类型 */
export type ParameterSourceType =
  | "default_library"   // 标准缺省值库（附录 C）
  | "manual_input"      // 手工输入
  | "preset_template";  // 预置模板

/** 兼容旧代码中的命名 */
export type ParameterSource = ParameterSourceType;

/** 畜禽生产功能 */
export type LivestockProductionPurpose =
  | "泌乳"
  | "后备"
  | "育肥"
  | "繁殖"
  | "公牛"
  | "其它";

/** 群体类型：常年存栏 vs 周转（短饲养周期） */
export type LivestockPopulationMode = "static" | "turnover";

/** DMI 获取方式 */
export type DMIAcquisitionMethod =
  | "direct_input"              // 直接录入 DMI
  | "feed_ledger"               // 饲料台账反推
  | "temporary_estimate"        // 经验值/台账估计
  | "model_nema_placeholder"    // 预留：NEma 模型估算
  | "model_de_placeholder";     // 预留：DE% 模型估算

/** 饲养方式 */
export type FeedingSituation =
  | "舍饲"
  | "放牧"
  | "大面积放牧"
  | "混合饲养";

/** 饲料台账方向 */
export type FeedLedgerDirection = "inbound" | "outbound";

/** 饲料来源类型 */
export type FeedSourceType = "外购" | "自产" | "未知";

/**
 * 化石燃料消耗量计量单位
 * 固体/液体燃料：t；气体燃料：万 Nm³（10⁴ Nm³）
 * 标准表 C.1 注：气体标准状态为 101.325 kPa，0 ℃
 */
export type FuelConsumptionUnit = "t" | "万Nm3";

// ─────────────────────────────────────────────
// 2. 通用元信息接口
// ─────────────────────────────────────────────

/** 参数来源元信息（被多个模块复用） */
export interface ParameterSourceMeta {
  parameterSourceType: ParameterSourceType;
  parameterSourceLabel: string;
}

// ─────────────────────────────────────────────
// 3. 项目基础信息
// ─────────────────────────────────────────────

/** 项目基础信息，对应标准第 7.2 节报告主体基本信息 */
export interface ProjectBase {
  enterpriseName: string;
  /** 核算年度，如 2024 */
  year: number;
  /** 标准化省级地区，用于匹配附录 C 区域化缺省值（华北/东北/华东/中南/西南/西北） */
  region: string;
  farmType: FarmType;
  standardVersion: StandardVersion;
  notes?: string;
}

// ─────────────────────────────────────────────
// 4. 养殖活动数据底座
// ─────────────────────────────────────────────

/** 月度动态记录，用于推算年平均存栏（AP）和年出栏量 */
export interface LivestockMonthlyChangeRecord {
  month: number;           // 1～12
  openingHead: number;     // 月初存栏
  births: number;          // 出生
  transferredIn: number;   // 转入
  purchasedIn: number;     // 购入
  culled: number;          // 淘汰
  sold: number;            // 出售
  transferredOut: number;  // 转出
  deaths: number;          // 死亡
  closingHead: number;     // 月末存栏（自动计算）
}

/**
 * 群体记录（养殖活动数据底座）
 * 贯通到肠道发酵、粪污管理各模块
 */
export interface LivestockRecord {
  species: string;   // 标准动物类别，如"奶牛""肉牛""猪"
  stage: string;     // 饲养阶段，如"当年生""繁殖母畜"

  productionPurpose?: LivestockProductionPurpose;
  /** static：常年存栏群体；turnover：短饲养周期周转群体（适用公式 6） */
  populationMode?: LivestockPopulationMode;

  /** 年平均存栏（AP），由月度动态自动计算或手工录入 */
  annualAverageHead: number;
  /** 年出栏量（NA），周转群体必填 */
  annualOutputHead?: number;
  /** 饲养天数（DA），周转群体必填，用于公式 (6)：AP = NA × DA / 365 */
  feedingDays?: number;

  /** 12 个月动态记录，优先用于计算 AP */
  monthlyRecords?: LivestockMonthlyChangeRecord[];

  // ── 生产性能参数（用于 DMI 模型估算，后续扩展） ──
  openingWeightKg?: number;       // 期初平均体重，kg
  closingWeightKg?: number;       // 期末平均体重，kg
  averageDailyGainKg?: number;    // 平均日增重，kg/d
  matureWeightKg?: number;        // 成熟体重，kg
  milkYieldKgPerYear?: number;    // 泌乳量，kg/年
  milkFatPercent?: number;        // 乳脂率，%
  pregnancyRatePercent?: number;  // 妊娠比例，%
  feedingSituation?: FeedingSituation;

  // ── DMI 获取 ──
  dmiMethod?: DMIAcquisitionMethod;
  /** 干物质摄入量，kg DM/（头或只·天） */
  dmiKgPerHeadDay?: number;
  /** 消化能百分比 DE%，用于 NEma 模型预留字段 */
  dePercent?: number;
  /** 净能量 NEma，MJ/kg DM，用于模型估算 DMI 预留字段 */
  nemaMJPerKgDM?: number;

  notes?: string;
}

/** 饲料台账记录，用于按出库量反推 DMI */
export interface FeedLedgerRecord {
  /** 唯一 ID，格式：{direction}-{timestamp}-{random} */
  id: string;
  direction: FeedLedgerDirection;
  feedName: string;
  /** 含水率，% */
  moisturePercent: number;
  recordDate: string;  // ISO 8601 日期，如 "2024-03-15"
  /** 关联的群体索引（对应 livestock 数组下标） */
  targetGroupSourceLivestockIndex?: number;
  /** 数量，吨 */
  quantityTon: number;
  responsiblePerson?: string;
  feedSourceType?: FeedSourceType;
  notes?: string;
}

// ─────────────────────────────────────────────
// 5. 肠道发酵 CH₄ 模块
// ─────────────────────────────────────────────

/**
 * 肠道发酵记录
 * 对应标准 5.2.3，公式 (5)：E_CH4_肠道 = Σ(EF × AP × 10⁻³) × GWP_CH4
 * GWP_CH4 缺省值 = 27.9（标准 5.2.3.1）
 */
export interface EntericRecord extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;

  /**
   * 活动数据收集方式（必填）
   * - annualAveragePopulation：直接录入年平均存栏
   * - monthlyAveragePopulation：12 个月存栏自动平均
   * - turnoverCalculation：AP = NA × DA / 365（公式 6）
   */
  activityDataMethod: EntericActivityDataMethod;

  /** 年平均存栏，annualAveragePopulation 方法使用 */
  annualAveragePopulation?: number;

  /** 12 个月存栏，monthlyAveragePopulation 方法使用 */
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

  /** 年度饲养量 NA，turnoverCalculation 方法使用 */
  annualThroughput?: number;
  /** 饲养天数 DA，turnoverCalculation 方法使用 */
  daysAlive?: number;

  /** 排放因子获取方法 */
  method: EntericMethod;

  /**
   * 排放因子 EF，kg CH₄/（头或只·年）
   * - defaultEF：从表 C.3 带入
   * - calculatedEF：由公式 (7)(8) 自动计算，保存快照
   * - measuredEF：实测值
   */
  emissionFactor: number;

  /** DMI，kg DM/（头或只·天），calculatedEF 方法必填 */
  dmiKgPerHeadDay?: number;
  /**
   * 甲烷转化因子 Ym，%
   * calculatedEF 方法使用，缺省值见表 C.2
   * 奶牛/肉牛/水牛：6.5±1.0；育肥牛（精料≥90%）：3.0±1.0；羔羊：4.5±1.0；成年羊：6.5±1.0
   */
  ymPercent?: number;
  /** 总能量摄入 GE，MJ/（头或只·天），由 GE = DMI × 18.45 自动计算（公式 8） */
  geMJPerHeadDay?: number;

  unit: "kg CH4/head/year";
  notes?: string;
}

// ─────────────────────────────────────────────
// 6. 粪污管理 CH₄ 模块
// ─────────────────────────────────────────────

/**
 * 粪污管理 CH₄ 记录
 * 对应标准 5.2.4，公式 (9)(10)
 * GWP_CH4 缺省值 = 27.9
 *
 * 参数法公式 (10)：
 * EF = (VS × 365) × [B₀ × 0.67 × Σ(MCF_k × MS_k)]
 * 其中 0.67 为甲烷在 20℃、101.325 kPa 下的密度（kg CH₄/m³）
 */
export interface ManureCH4Record extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureCH4Method;

  /**
   * 区域化推荐因子，kg CH₄/（头或只·年）
   * regionalDefaultEF 方法使用，从表 C.7 带入
   */
  regionalEmissionFactor?: number;

  /** 粪便管理方式，如"固体贮存""液体贮存""氧化塘"等 */
  managementSystem?: string;
  /** 该管理方式占比，%，各路径之和应等于 100% */
  sharePercent?: number;
  /**
   * 挥发性固体排放量 VS，kg VS/（头或只·天）
   * 缺省值见表 C.4：奶牛 3.5、肉牛 3.0、水牛 3.9、山羊 0.35、绵羊 0.32、猪 0.3、家禽 0.02
   */
  vsKgPerHeadPerDay?: number;
  /**
   * 最大甲烷生产能力 B₀，m³ CH₄/kg VS
   * 缺省值见表 C.5：奶牛 0.24、肉牛 0.19、水牛 0.10、猪 0.29、山羊 0.13、绵羊 0.13、家禽 0.24
   */
  boM3PerKgVS?: number;
  /**
   * 甲烷转化系数 MCF，%
   * 缺省值见表 C.6，按年平均气温和粪便管理方式查表
   */
  mcfPercent?: number;

  notes?: string;
}

// ─────────────────────────────────────────────
// 7. 粪污管理 N₂O 模块
// ─────────────────────────────────────────────

/**
 * 粪污管理 N₂O 记录
 * 对应标准 5.2.5，公式 (11)(12)(13)
 * GWP_N2O 缺省值 = 273（标准 5.2.5.1）
 *
 * 直接排放因子公式 (12)：EF_D = Nex × Σ(EF_直接_k × MS_k) × 44/28
 * 间接排放因子公式 (13)：EF_ID = Nex × Σ[(EF_挥发 × Frac_GasMS/100 + EF_淋溶 × Frac_leachMS/100) × MS_k] × 44/28
 */
export interface ManureN2ORecord extends ParameterSourceMeta {
  sourceLivestockIndex: number;
  species: string;
  stage: string;
  method: ManureN2OMethod;

  /**
   * 区域化推荐因子，kg N₂O/（头或只·年）
   * regionalDefaultEF 方法使用，从表 C.10 带入
   */
  regionalEmissionFactor?: number;

  /** 粪便管理方式 */
  managementSystem?: string;
  /** 该管理方式占比，%，各路径之和应等于 100% */
  sharePercent?: number;

  /**
   * 氮排泄量 Nex，kg N/（头或只·年）
   * 缺省值见表 C.8：奶牛 72、肉牛 40、水牛 40、山羊/绵羊 12、猪 11、家禽 0.60
   */
  nexKgNPerHeadYear?: number;

  /**
   * 直接排放因子 EF₃_直接，kg N₂O-N/kg N
   * 缺省值见表 C.9（按粪便管理方式）
   * 如：氧化塘 0.0，液体贮存（自然结壳）0.005，固体贮存 0.005，自然风干 0.02，舍内粪坑 0.002 等
   */
  ef3KgN2ONPerKgN?: number;

  // ── 间接排放参数（公式 13）──
  /**
   * 氨挥发导致的间接排放因子 EF_挥发，kg N₂O-N/kg N
   * 标准推荐值 = 0.01
   */
  ef3VolatilizationKgN2ONPerKgN?: number;
  /**
   * 气体挥发造成氮损失比例 Frac_GasMS，%
   * 标准推荐值 = 20%（如采用防氨挥发措施可在此基础上扣减）
   */
  fracGasMS?: number;
  /**
   * 淋溶径流导致的间接排放因子 EF_淋溶径流，kg N₂O-N/kg N
   * 标准推荐值 = 0.0075
   */
  ef3LeachingKgN2ONPerKgN?: number;
  /**
   * 淋溶径流造成氮损失比例 Frac_leachMS，%
   * 不同粪便管理方式取值范围 1%～20%
   */
  fracLeachMS?: number;

  notes?: string;
}

// ─────────────────────────────────────────────
// 8. 沼气甲烷回收利用模块（减项）
// ─────────────────────────────────────────────

/**
 * 沼气甲烷回收利用记录
 * 对应标准 5.2.6，公式 (14)～(17)
 *
 * R_CH4_回收 = R_CH4_自用 + R_CH4_外供 - E_CH4_火炬
 * 公式 (15)：R_自用 = Q_自用 × φ_自用,CH4 × 0.67 × GWP_CH4
 * 公式 (16)：R_外供 = Q_外供 × φ_外供,CH4 × 0.67 × GWP_CH4
 * 公式 (17)：E_火炬 = Q_火炬 × φ_火炬,CH4 × (1 - OF_火炬) × 0.67 × GWP_CH4
 *             - Q_火炬 × φ_火炬,CH4 × OF_火炬 × FY_CH4-CO2 × 1.84
 * 其中 0.67 为甲烷在 20℃ 下的密度（t CH₄/10³ Nm³）
 *      1.84 为 CO₂ 在 20℃ 下的密度（tCO₂/10³ Nm³CO₂）
 *      FY_CH4-CO2 甲烷燃烧生成 CO₂ 转换系数，取值为 1
 */
export interface BiogasRecoveryRecord extends ParameterSourceMeta {
  /** 回收自用的沼气体积，10³ Nm³ */
  selfUsedVolumeM3: number;
  /** 自用沼气中甲烷体积浓度，10³ Nm³ CH₄/10³ Nm³ 沼气（即体积分数，如 0.6 表示 60%） */
  selfUsedCH4Fraction: number;

  /** 外供第三方的沼气体积，10³ Nm³ */
  exportedVolumeM3: number;
  /** 外供沼气中甲烷体积浓度 */
  exportedCH4Fraction: number;

  /** 火炬燃烧的沼气体积，10³ Nm³ */
  flaringVolumeM3: number;
  /** 火炬燃烧沼气中甲烷体积浓度 */
  flaringCH4Fraction: number;
  /**
   * 甲烷火炬燃烧的碳氧化率 OF_火炬，%
   * 无实测数据时取缺省值 98%
   */
  flaringOxidationFactorPercent: number;

  notes?: string;
}

// ─────────────────────────────────────────────
// 9. 能源模块
// ─────────────────────────────────────────────

/**
 * 化石燃料燃烧记录
 * 对应标准 5.2.2，公式 (2)(3)(4)
 * EF_i = CC_i × OF_i × 44/12
 * AD_i = NCV_i × FC_i（消耗量 × 低位发热量）
 */
export interface FuelCombustionRecord extends ParameterSourceMeta {
  fuelType: string;
  /** 消耗量，单位由 consumptionUnit 决定 */
  consumptionAmount: number;
  /**
   * 消耗量计量单位
   * - 固体/液体燃料：t（吨）
   * - 气体燃料：万Nm3（10⁴ Nm³，气体标准状态：101.325 kPa，0 ℃）
   * 不填时默认按 t 处理
   */
  consumptionUnit?: FuelConsumptionUnit;
  /**
   * 低位发热量 NCV，GJ/单位 或 GJ/10⁴ Nm³
   * 计算器内部会统一换算为 TJ/单位 后参与公式 (3)
   * 缺省值见表 C.1
   */
  ncvTJPerUnit: number;
  /**
   * 单位热值含碳量 CC，tC/GJ（10⁻² tC/GJ）
   * 缺省值见表 C.1
   */
  carbonContentTonCPerTJ: number;
  /**
   * 燃料碳氧化率 OF，%
   * 缺省值见表 C.1，多数燃料为 93%～99%
   * 注意：代码中传入 % 值（如 98），计算时需除以 100
   */
  oxidationFactor: number;
  notes?: string;
}

/**
 * 购入/输出电力热力记录
 * 对应标准 5.2.7，公式 (18)～(21)
 * EF_电 应采用生态环境部/国家统计局发布的最新全国电力平均排放因子
 * EF_热 优先采用供热单位实测值，若无实测值按 0.11 tCO₂/GJ 计算（标准 5.2.7.3）
 */
export interface EnergyBalanceRecord {
  /** 购入电力，MWh */
  purchasedElectricityMWh: number;
  /** 购入电力排放因子，tCO₂/MWh */
  purchasedElectricityEFtCO2PerMWh: number;
  /** 购入热力，GJ */
  purchasedHeatGJ: number;
  /** 购入热力排放因子，tCO₂/GJ（缺省值 0.11） */
  purchasedHeatEFtCO2PerGJ: number;
  /** 输出电力，MWh */
  exportedElectricityMWh: number;
  /** 输出电力排放因子，tCO₂/MWh */
  exportedElectricityEFtCO2PerMWh: number;
  /** 输出热力，GJ */
  exportedHeatGJ: number;
  /** 输出热力排放因子，tCO₂/GJ */
  exportedHeatEFtCO2PerGJ: number;
}

// ─────────────────────────────────────────────
// 10. 因子引用与模块结果
// ─────────────────────────────────────────────

/** 排放因子引用记录，用于报告溯源 */
export interface FactorReference {
  standardVersion: StandardVersion;
  /** 来源表，如"表C.3""表C.7" */
  sourceTable: string;
  factorCode: string;
  factorName: string;
  value: number;
  unit: string;
  note?: string;
}

/** 单模块核算结果 */
export interface ModuleResult {
  moduleKey: ModuleKey;
  moduleName: string;
  /** 排放量（或减排量），tCO₂e */
  emission: number;
  unit: "tCO2e";
  activityData: Record<string, string | number>;
  factorRefs: FactorReference[];
  notes?: string[];
}

// ─────────────────────────────────────────────
// 11. 项目草稿（顶层数据结构）
// ─────────────────────────────────────────────

/**
 * 项目草稿
 * 存储于浏览器本地（localStorage），涵盖所有核算模块数据
 *
 * 总排放量公式（标准 5.2.1，公式 1）：
 * E = E_燃烧 + E_CH4_肠道 + E_CH4_粪便 + E_N2O_粪便
 *   - R_CH4_回收（减项）
 *   + E_购入电 + E_购入热 - E_输出电 - E_输出热
 */
export interface ProjectDraft {
  base: ProjectBase;

  // ── 活动数据底座 ──
  livestock: LivestockRecord[];
  feedLedger?: FeedLedgerRecord[];

  // ── 排放模块 ──
  enteric?: EntericRecord[];
  manureCH4?: ManureCH4Record[];
  manureN2O?: ManureN2ORecord[];

  // ── 沼气回收（减项），对应 5.2.6 ──
  biogasRecovery?: BiogasRecoveryRecord;

  // ── 能源模块 ──
  energyFuel?: FuelCombustionRecord[];
  energyBalance?: EnergyBalanceRecord;

  /** ISO 8601 格式，如 "2024-03-15T08:30:00.000Z" */
  createdAt: string;
  /** ISO 8601 格式 */
  updatedAt: string;
}