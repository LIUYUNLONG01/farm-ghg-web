/**
 * 项目草稿存储工具
 * 优先使用数据库（通过 API），降级使用 localStorage
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

// 获取当前项目 ID（从 sessionStorage 或 URL）
function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;

  // 优先从 URL 参数读取
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get("projectId");
  if (urlId) {
    sessionStorage.setItem("currentProjectId", urlId);
    return urlId;
  }

  return sessionStorage.getItem("currentProjectId");
}

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
    biogasRecovery: undefined,
    energyFuel: [],
    energyBalance: createEmptyEnergyBalance(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

// 从 API 加载项目数据
async function loadFromAPI(projectId: string): Promise<ProjectDraft | null> {
  try {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return null;
    const { project } = await res.json();
    if (!project?.data) return createEmptyDraft();

    const data = project.data as Partial<ProjectDraft>;
    const empty = createEmptyDraft();
    return {
      ...empty,
      ...data,
      base: { ...empty.base, ...(data.base ?? {}) },
      livestock: data.livestock ?? [],
      feedLedger: data.feedLedger ?? [],
      enteric: data.enteric ?? [],
      manureCH4: data.manureCH4 ?? [],
      manureN2O: data.manureN2O ?? [],
      energyFuel: data.energyFuel ?? [],
      energyBalance: data.energyBalance
        ? { ...empty.energyBalance, ...data.energyBalance }
        : empty.energyBalance,
      createdAt: data.createdAt ?? nowIso(),
      updatedAt: data.updatedAt ?? nowIso(),
    };
  } catch {
    return null;
  }
}

// 保存到 API
async function saveToAPI(projectId: string, draft: ProjectDraft): Promise<void> {
  try {
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...draft, updatedAt: nowIso() } }),
    });
  } catch (e) {
    console.error("保存失败:", e);
  }
}

// localStorage 降级方案
const LOCAL_KEY = "farm-ghg-project-draft";

function loadFromLocal(): ProjectDraft {
  if (typeof window === "undefined") return createEmptyDraft();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw) as Partial<ProjectDraft>;
    const empty = createEmptyDraft();
    return { ...empty, ...parsed, base: { ...empty.base, ...(parsed.base ?? {}) } };
  } catch {
    return createEmptyDraft();
  }
}

function saveToLocal(draft: ProjectDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(draft));
}

// ── 公开 API ──────────────────────────────────────────────────────────────

export async function loadProjectDraft(): Promise<ProjectDraft | null> {
  const projectId = getCurrentProjectId();
  if (projectId) {
    const draft = await loadFromAPI(projectId);
    return draft ?? createEmptyDraft();
  }
  return loadFromLocal();
}

async function updateDraft(patch: Partial<ProjectDraft>): Promise<ProjectDraft> {
  const projectId = getCurrentProjectId();

  if (projectId) {
    const current = await loadFromAPI(projectId) ?? createEmptyDraft();
    const next: ProjectDraft = {
      ...current,
      ...patch,
      base: patch.base ? { ...current.base, ...patch.base } : current.base,
      updatedAt: nowIso(),
    };
    await saveToAPI(projectId, next);
    return next;
  }

  // 降级：localStorage
  const current = loadFromLocal();
  const next: ProjectDraft = {
    ...current,
    ...patch,
    base: patch.base ? { ...current.base, ...patch.base } : current.base,
    updatedAt: nowIso(),
  };
  saveToLocal(next);
  return next;
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
  window.localStorage.removeItem(LOCAL_KEY);
}

export async function updateSummaryDraft(summary: Record<string, number>) {
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  try {
    const current = await loadFromAPI(projectId) ?? createEmptyDraft();
    const next = { ...current, summary, updatedAt: nowIso() };
    await saveToAPI(projectId, next);
  } catch (e) {
    console.error("保存汇总失败:", e);
  }
}
