import type { ProjectBaseFormValues } from "@/lib/schemas/projectBase";
import type { ProjectDraft } from "@/types/ghg";

const PROJECT_DRAFT_KEY = "farm-ghg-project-draft";

export function loadProjectDraft(): ProjectDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PROJECT_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProjectDraft;
  } catch {
    return null;
  }
}

export function saveProjectDraft(base: ProjectBaseFormValues): ProjectDraft {
  const now = new Date().toISOString();
  const existing = loadProjectDraft();

  const draft: ProjectDraft = {
    base: {
      enterpriseName: base.enterpriseName,
      year: base.year,
      region: base.region,
      farmType: base.farmType,
      standardVersion: base.standardVersion,
      notes: base.notes.trim() ? base.notes.trim() : undefined,
    },
    livestock: existing?.livestock ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  window.localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(draft));
  return draft;
}