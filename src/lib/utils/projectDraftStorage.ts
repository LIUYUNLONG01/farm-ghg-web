import type {
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

function normalizeEnergyBalance(
  value?: Partial<EnergyBalanceRecord>
): EnergyBalanceRecord {
  const fallback = createEmptyEnergyBalance();

  return {
    purchasedElectricityMWh:
      value?.purchasedElectricityMWh ?? fallback.purchasedElectricityMWh,
    purchasedElectricityEFtCO2PerMWh:
      value?.purchasedElectricityEFtCO2PerMWh ??
      fallback.purchasedElectricityEFtCO2PerMWh,
    purchasedHeatGJ: value?.purchasedHeatGJ ?? fallback.purchasedHeatGJ,
    purchasedHeatEFtCO2PerGJ:
      value?.purchasedHeatEFtCO2PerGJ ?? fallback.purchasedHeatEFtCO2PerGJ,
    exportedElectricityMWh:
      value?.exportedElectricityMWh ?? fallback.exportedElectricityMWh,
    exportedElectricityEFtCO2PerMWh:
      value?.exportedElectricityEFtCO2PerMWh ??
      fallback.exportedElectricityEFtCO2PerMWh,
    exportedHeatGJ: value?.exportedHeatGJ ?? fallback.exportedHeatGJ,
    exportedHeatEFtCO2PerGJ:
      value?.exportedHeatEFtCO2PerGJ ?? fallback.exportedHeatEFtCO2PerGJ,
  };
}

function createEmptyDraft(): ProjectDraft {
  return {
    base: {
      enterpriseName: "",
      year: new Date().getFullYear(),
      region: "北京",
      farmType: "奶牛场",
      standardVersion: "NYT4243_2022",
      notes: "",
    },
    livestock: [],
    feedLedger: [],
    enteric: [],
    manureCH4: [],
    manureN2O: [],
    energyFuel: [],
    energyBalance: createEmptyEnergyBalance(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function readDraft(): ProjectDraft {
  if (typeof window === "undefined") {
    return createEmptyDraft();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyDraft();
  }

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
      livestock: parsed.livestock ?? [],
      feedLedger: parsed.feedLedger ?? [],
      enteric: parsed.enteric ?? [],
      manureCH4: parsed.manureCH4 ?? [],
      manureN2O: parsed.manureN2O ?? [],
      energyFuel: parsed.energyFuel ?? [],
      energyBalance: normalizeEnergyBalance(parsed.energyBalance),
      createdAt: parsed.createdAt ?? nowIso(),
      updatedAt: parsed.updatedAt ?? nowIso(),
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
      ? normalizeEnergyBalance({
          ...current.energyBalance,
          ...patch.energyBalance,
        })
      : current.energyBalance,
    updatedAt: nowIso(),
  };

  writeDraft(next);
  return next;
}

export function loadProjectDraft(): ProjectDraft | null {
  if (typeof window === "undefined") return null;
  return readDraft();
}

export function saveProjectDraft(base: ProjectBase) {
  return updateDraft({ base });
}

export function saveLivestockDraft(
  rows: LivestockRecord[],
  feedLedger?: FeedLedgerRecord[]
) {
  return updateDraft({
    livestock: rows,
    ...(feedLedger ? { feedLedger } : {}),
  });
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