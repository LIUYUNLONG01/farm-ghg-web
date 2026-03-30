import type { ProjectSummaryResult } from "@/lib/calculators/projectSummary";
import type { ProjectDraft } from "@/types/ghg";

function escapeCSV(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function triggerDownload(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8"
) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function buildProjectReportObject(
  draft: ProjectDraft,
  summary: ProjectSummaryResult
) {
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      gwpCH4: summary.gwpCH4,
      gwpN2O: summary.gwpN2O,
    },
    project: {
      enterpriseName: draft.base.enterpriseName,
      year: draft.base.year,
      region: draft.base.region,
      farmType: draft.base.farmType,
      standardVersion: draft.base.standardVersion,
      notes: draft.base.notes ?? "",
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    },
    summary: {
      totalCH4TPerYear: summary.totalCH4TPerYear,
      totalN2OTPerYear: summary.totalN2OTPerYear,
      totalCO2TPerYear: summary.totalCO2TPerYear,
      totalCO2eTPerYear: summary.totalCO2eTPerYear,
      fossilFuelCO2TPerYear: summary.fossilFuelCO2TPerYear,
      purchasedEnergyCO2TPerYear: summary.purchasedEnergyCO2TPerYear,
      exportedEnergyCO2TPerYear: summary.exportedEnergyCO2TPerYear,
      netPurchasedEnergyCO2TPerYear: summary.netPurchasedEnergyCO2TPerYear,
      modules: summary.modules,
    },
    dataInventory: {
      livestockCount: draft.livestock?.length ?? 0,
      entericCount: draft.enteric?.length ?? 0,
      manureCH4Count: draft.manureCH4?.length ?? 0,
      manureN2OCount: draft.manureN2O?.length ?? 0,
      energyFuelCount: draft.energyFuel?.length ?? 0,
      hasEnergyBalance: Boolean(draft.energyBalance),
    },
    rawDraft: draft,
  };
}

export function buildProjectReportJSON(
  draft: ProjectDraft,
  summary: ProjectSummaryResult
): string {
  return JSON.stringify(buildProjectReportObject(draft, summary), null, 2);
}

export function buildModuleSummaryCSV(
  draft: ProjectDraft,
  summary: ProjectSummaryResult
): string {
  const header = [
    "企业名称",
    "核算年度",
    "模块",
    "气体",
    "质量(t/yr)",
    "CO2e(tCO2e/yr)",
  ];

  const rows = summary.modules.map((module) => [
    draft.base.enterpriseName,
    draft.base.year,
    module.name,
    module.gas,
    module.massTPerYear.toFixed(6),
    module.co2eTPerYear.toFixed(6),
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");
}

export function buildProjectReportText(
  draft: ProjectDraft,
  summary: ProjectSummaryResult
): string {
  const lines: string[] = [];

  lines.push("养殖场温室气体排放核算报告（文本导出）");
  lines.push("========================================");
  lines.push(`企业名称：${draft.base.enterpriseName}`);
  lines.push(`核算年度：${draft.base.year}`);
  lines.push(`所在地区：${draft.base.region}`);
  lines.push(`养殖场类型：${draft.base.farmType}`);
  lines.push(`标准版本：${draft.base.standardVersion}`);
  lines.push(`备注：${draft.base.notes ?? "-"}`);
  lines.push(`生成时间：${new Date().toLocaleString()}`);
  lines.push("");

  lines.push("一、总量结果");
  lines.push("----------------------------------------");
  lines.push(`总 CO2e：${summary.totalCO2eTPerYear.toFixed(3)} tCO2e/yr`);
  lines.push(`总 CH4：${summary.totalCH4TPerYear.toFixed(3)} t/yr`);
  lines.push(`总 N2O：${summary.totalN2OTPerYear.toFixed(3)} t/yr`);
  lines.push(`总 CO2：${summary.totalCO2TPerYear.toFixed(3)} t/yr`);
  lines.push("");

  lines.push("二、分模块结果");
  lines.push("----------------------------------------");
  summary.modules.forEach((module, index) => {
    lines.push(
      `${index + 1}. ${module.name} | ${module.gas} | ${module.massTPerYear.toFixed(
        3
      )} t/yr | ${module.co2eTPerYear.toFixed(3)} tCO2e/yr`
    );
  });
  lines.push("");

  lines.push("三、能源模块补充");
  lines.push("----------------------------------------");
  lines.push(
    `化石燃料燃烧：${summary.fossilFuelCO2TPerYear.toFixed(3)} tCO2/yr`
  );
  lines.push(
    `购入电力热力：${summary.purchasedEnergyCO2TPerYear.toFixed(3)} tCO2/yr`
  );
  lines.push(
    `输出电力热力：${summary.exportedEnergyCO2TPerYear.toFixed(3)} tCO2/yr`
  );
  lines.push(
    `净购入电力热力：${summary.netPurchasedEnergyCO2TPerYear.toFixed(3)} tCO2/yr`
  );
  lines.push("");

  lines.push("四、数据量概览");
  lines.push("----------------------------------------");
  lines.push(`养殖活动记录：${draft.livestock?.length ?? 0} 条`);
  lines.push(`肠道发酵记录：${draft.enteric?.length ?? 0} 条`);
  lines.push(`粪污管理 CH4 记录：${draft.manureCH4?.length ?? 0} 条`);
  lines.push(`粪污管理 N2O 记录：${draft.manureN2O?.length ?? 0} 条`);
  lines.push(`燃料燃烧记录：${draft.energyFuel?.length ?? 0} 条`);
  lines.push(
    `购入/输出电力热力：${draft.energyBalance ? "已录入" : "未录入"}`
  );

  return lines.join("\n");
}