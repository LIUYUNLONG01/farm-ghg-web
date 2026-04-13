/**
 * 项目草稿本地存储工具
 * 数据存储于浏览器 localStorage，键名：farm-ghg-project-draft
 */

import type {
  BiogasRecoveryRecord,
  EnergyBalanceRecord,
  EntericRecord,
  FeedLedgerRecord,
  FuelCombustionRecord,
  LivestockRecord,
  ManureCH4Record,
  ManureN2ORecord,
  ProjectBase,
  ProjectDraft,
} from "@/types/ghg";

const STORAGE_KEY = "farm-ghg-project-draft";

function nowIso() {
  return new Date().toISOString();
}

function createEmptyEnergyBalance(): EnergyBalanceRecord {
  return {
    purchasedElectricityMWh: 0,
    purchasedElectricityEFtCO2PerMWh: 0,
    purchasedHeatGJ: 0,
    purchasedHeatEFtCO2PerGJ: 0,
    exportedElectricityMWh: 0,
    exportedElectricityEFtCO2PerMWh: 0,
    exportedHeatGJ: 0,
    exportedHeatEFtCO2PerGJ: 0,
  };
}

function normalizeEnergyBalance(value?: Partial<EnergyBalanceRecord>): EnergyBalanceRecord {
  const fallback = createEmptyEnergyBalance();
  return {
    purchasedElectricityMWh:       value?.purchasedElectricityMWh       ?? fallback.purchasedElectricityMWh,
    purchasedElectricityEFtCO2PerMWh: value?.purchasedElectricityEFtCO2PerMWh ?? fallback.purchasedElectricityEFtCO2PerMWh,
    purchasedHeatGJ:                value?.purchasedHeatGJ                ?? fallback.purchasedHeatGJ,
    purchasedHeatEFtCO2PerGJ:       value?.purchasedHeatEFtCO2PerGJ       ?? fallback.purchasedHeatEFtCO2PerGJ,
    exportedElectricityMWh:        value?.exportedElectricityMWh        ?? fallback.exportedElectricityMWh,
    exportedElectricityEFtCO2PerMWh: value?.exportedElectricityEFtCO2PerMWh ?? fallback.exportedElectricityEFtCO2PerMWh,
    exportedHeatGJ:                 value?.exportedHeatGJ                 ?? fallback.exportedHeatGJ,
    exportedHeatEFtCO2PerGJ:        value?.exportedHeatEFtCO2PerGJ        ?? fallback.exportedHeatEFtCO2PerGJ,
  };
}

/**
 * 兼容性处理 biogasRecovery 字段
 * 旧草稿（无此字段）读取时返回 undefined，新草稿正常透传
 */
function normalizeBiogasRecovery(
  value?: Partial<BiogasRecoveryRecord> | null
): BiogasRecoveryRecord | undefined {
  if (!value) return undefined;

  return {
    selfUsedVolumeM3:          value.selfUsedVolumeM3          ?? 0,
    selfUsedCH4Fraction:       value.selfUsedCH4Fraction       ?? 0,
    exportedVolumeM3:          value.exportedVolumeM3          ?? 0,
    exportedCH4Fraction:       value.exportedCH4Fraction       ?? 0,
    flaringVolumeM3:           value.flaringVolumeM3           ?? 0,
    flaringCH4Fraction:        value.flaringCH4Fraction        ?? 0,
    flaringOxidationFactorPercent: value.flaringOxidationFactorPercent ?? 98,
    parameterSourceType:       value.parameterSourceType       ?? "manual_input",
    parameterSourceLabel:      value.parameterSourceLabel      ?? "手工输入",
    notes:                     value.notes,
  };
}

function createEmptyDraft(): ProjectDraft {
  return {
    base: {
      enterpriseName: "",
      year: new Date().getFullYear(),
      region: "北京",
      farmType: "奶牛场",
      standardVersion: "GBT32151_22_2024",
      notes: "",
    },
    livestock: [],
    feedLedger: [],
    enteric: [],
    manureCH4: [],
    manureN2O: [],
    biogasRecovery: undefined,  // 沼气回收为可选模块，默认不启用
    energyFuel: [],
    energyBalance: createEmptyEnergyBalance(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function readDraft(): ProjectDraft {
  if (typeof window === "undefined") return createEmptyDraft();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyDraft();

  try {
    const parsed = JSON.parse(raw) as Partial<ProjectDraft>;
    const empty = createEmptyDraft();

    return {
      ...empty,
      ...parsed,
      base: {
        ...empty.base,
        ...(parsed.base ?? {}),
      },
      livestock:     parsed.livestock    ?? [],
      feedLedger:    parsed.feedLedger   ?? [],
      enteric:       parsed.enteric      ?? [],
      manureCH4:     parsed.manureCH4    ?? [],
      manureN2O:     parsed.manureN2O    ?? [],
      // biogasRecovery：旧草稿无此字段时返回 undefined，不报错
      biogasRecovery: normalizeBiogasRecovery(parsed.biogasRecovery ?? undefined),
      energyFuel:    parsed.energyFuel   ?? [],
      energyBalance: normalizeEnergyBalance(parsed.energyBalance),
      createdAt:     parsed.createdAt    ?? nowIso(),
      updatedAt:     parsed.updatedAt    ?? nowIso(),
    };
  } catch {
    return createEmptyDraft();
  }
}

function writeDraft(draft: ProjectDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function updateDraft(patch: Partial<ProjectDraft>) {
  const current = readDraft();

  const next: ProjectDraft = {
    ...current,
    ...patch,
    base: patch.base ? { ...current.base, ...patch.base } : current.base,
    energyBalance: patch.energyBalance
      ? normalizeEnergyBalance({ ...current.energyBalance, ...patch.energyBalance })
      : current.energyBalance,
    // biogasRecovery 直接覆盖（undefined 表示关闭该模块）
    biogasRecovery:
      "biogasRecovery" in patch
        ? normalizeBiogasRecovery(patch.biogasRecovery ?? undefined)
        : current.biogasRecovery,
    updatedAt: nowIso(),
  };

  writeDraft(next);
  return next;
}

// ── 公开 API ──────────────────────────────────────────────────────────────

export function loadProjectDraft(): ProjectDraft | null {
  if (typeof window === "undefined") return null;
  return readDraft();
}

export function saveProjectDraft(base: ProjectBase) {
  return updateDraft({ base });
}

export function saveLivestockDraft(rows: LivestockRecord[], feedLedger?: FeedLedgerRecord[]) {
  return updateDraft({ livestock: rows, ...(feedLedger ? { feedLedger } : {}) });
}

export function saveFeedLedgerDraft(feedLedger: FeedLedgerRecord[]) {
  return updateDraft({ feedLedger });
}

export function saveEntericDraft(rows: EntericRecord[]) {
  return updateDraft({ enteric: rows });
}

export function saveManureCH4Draft(rows: ManureCH4Record[]) {
  return updateDraft({ manureCH4: rows });
}

export function saveManureN2ODraft(rows: ManureN2ORecord[]) {
  return updateDraft({ manureN2O: rows });
}

export function saveBiogasRecoveryDraft(record: BiogasRecoveryRecord | undefined) {
  return updateDraft({ biogasRecovery: record });
}

export function saveEnergyFuelDraft(rows: FuelCombustionRecord[]) {
  return updateDraft({ energyFuel: rows });
}

export function saveEnergyBalanceDraft(balance: EnergyBalanceRecord) {
  return updateDraft({ energyBalance: balance });
}

export function clearProjectDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}