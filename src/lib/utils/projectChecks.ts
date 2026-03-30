import type { ProjectDraft } from "@/types/ghg";

export type ProjectCheckSeverity = "error" | "warning" | "ok";

export interface ProjectCheckItem {
  id: string;
  severity: ProjectCheckSeverity;
  section: string;
  title: string;
  detail: string;
  link?: string;
}

export interface ProjectCheckResult {
  items: ProjectCheckItem[];
  errorCount: number;
  warningCount: number;
  okCount: number;
  isReadyForExport: boolean;
}

function pushItem(
  list: ProjectCheckItem[],
  item: ProjectCheckItem
) {
  list.push(item);
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function approx100(value: number) {
  return Math.abs(value - 100) < 0.5;
}

function isEnergyBalanceAllZero(draft: ProjectDraft) {
  const eb = draft.energyBalance;
  if (!eb) return true;

  return [
    eb.purchasedElectricityMWh,
    eb.purchasedElectricityEFtCO2PerMWh,
    eb.purchasedHeatGJ,
    eb.purchasedHeatEFtCO2PerGJ,
    eb.exportedElectricityMWh,
    eb.exportedElectricityEFtCO2PerMWh,
    eb.exportedHeatGJ,
    eb.exportedHeatEFtCO2PerGJ,
  ].every((value) => safeNumber(value) === 0);
}

export function runProjectChecks(draft: ProjectDraft): ProjectCheckResult {
  const items: ProjectCheckItem[] = [];

  const livestock = draft.livestock ?? [];
  const enteric = draft.enteric ?? [];
  const manureCH4 = draft.manureCH4 ?? [];
  const manureN2O = draft.manureN2O ?? [];
  const energyFuel = draft.energyFuel ?? [];

  // 基础信息
  if (!draft.base.enterpriseName?.trim()) {
    pushItem(items, {
      id: "base-enterprise-missing",
      severity: "error",
      section: "基础信息",
      title: "缺少企业名称",
      detail: "请先在基础信息页面填写企业名称。",
      link: "/project/new",
    });
  } else {
    pushItem(items, {
      id: "base-enterprise-ok",
      severity: "ok",
      section: "基础信息",
      title: "企业名称已填写",
      detail: draft.base.enterpriseName,
      link: "/project/new",
    });
  }

  if (!draft.base.region?.trim()) {
    pushItem(items, {
      id: "base-region-missing",
      severity: "warning",
      section: "基础信息",
      title: "地区信息未填写",
      detail: "建议补充所在地区，便于后续报告完整性。",
      link: "/project/new",
    });
  }

  // 养殖活动
  if (livestock.length === 0) {
    pushItem(items, {
      id: "livestock-missing",
      severity: "error",
      section: "养殖活动",
      title: "未录入养殖活动数据",
      detail: "至少需要一条养殖活动记录才能继续完整核算。",
      link: "/project/livestock",
    });
  } else {
    pushItem(items, {
      id: "livestock-ok",
      severity: "ok",
      section: "养殖活动",
      title: "养殖活动已录入",
      detail: `共 ${livestock.length} 条记录。`,
      link: "/project/livestock",
    });
  }

  // 肠道发酵 CH4
  if (enteric.length === 0) {
    pushItem(items, {
      id: "enteric-missing",
      severity: "warning",
      section: "肠道发酵 CH4",
      title: "未录入肠道发酵参数",
      detail: "如果项目涉及反刍动物，建议完成该模块。",
      link: "/project/enteric",
    });
  } else {
    const livestockIndices = livestock.map((_, index) => index);
    const entericIndices = new Set(enteric.map((row) => row.sourceLivestockIndex));

    livestockIndices.forEach((index) => {
      if (!entericIndices.has(index)) {
        pushItem(items, {
          id: `enteric-missing-index-${index}`,
          severity: "error",
          section: "肠道发酵 CH4",
          title: `缺少第 ${index + 1} 条养殖记录的肠道发酵参数`,
          detail: "请为对应畜种补充肠道发酵排放因子。",
          link: "/project/enteric",
        });
      }
    });

    enteric.forEach((row, index) => {
      if (safeNumber(row.emissionFactor) <= 0) {
        pushItem(items, {
          id: `enteric-ef-invalid-${index}`,
          severity: "error",
          section: "肠道发酵 CH4",
          title: `第 ${index + 1} 条肠道发酵因子无效`,
          detail: "排放因子必须大于 0。",
          link: "/project/enteric",
        });
      }
    });

    if (
      livestock.length > 0 &&
      livestockIndices.every((index) => entericIndices.has(index)) &&
      enteric.every((row) => safeNumber(row.emissionFactor) > 0)
    ) {
      pushItem(items, {
        id: "enteric-ok",
        severity: "ok",
        section: "肠道发酵 CH4",
        title: "肠道发酵模块完整",
        detail: `共 ${enteric.length} 条记录。`,
        link: "/project/enteric",
      });
    }
  }

  // 粪污管理 CH4
  if (manureCH4.length === 0) {
    pushItem(items, {
      id: "manure-ch4-missing",
      severity: "warning",
      section: "粪污管理 CH4",
      title: "未录入粪污管理 CH4 参数",
      detail: "建议完成该模块，以便完整核算粪污管理甲烷。",
      link: "/project/manure-ch4",
    });
  } else {
    const shareMap = new Map<number, number>();
    manureCH4.forEach((row, index) => {
      const share = safeNumber(row.sharePercent);
      shareMap.set(
        row.sourceLivestockIndex,
        safeNumber(shareMap.get(row.sourceLivestockIndex)) + share
      );

      if (
        safeNumber(row.vsKgPerHeadPerDay) <= 0 ||
        safeNumber(row.boM3PerKgVS) <= 0 ||
        safeNumber(row.mcfPercent) < 0
      ) {
        pushItem(items, {
          id: `manure-ch4-param-invalid-${index}`,
          severity: "error",
          section: "粪污管理 CH4",
          title: `第 ${index + 1} 条粪污管理 CH4 参数无效`,
          detail: "VS、B₀ 必须大于 0，MCF 不能小于 0。",
          link: "/project/manure-ch4",
        });
      }
    });

    livestock.forEach((_, index) => {
      const totalShare = safeNumber(shareMap.get(index));
      if (totalShare === 0) {
        pushItem(items, {
          id: `manure-ch4-missing-index-${index}`,
          severity: "warning",
          section: "粪污管理 CH4",
          title: `第 ${index + 1} 条养殖记录未配置粪污管理 CH4 路径`,
          detail: "建议补充该畜种的管理方式路径。",
          link: "/project/manure-ch4",
        });
      } else if (!approx100(totalShare)) {
        pushItem(items, {
          id: `manure-ch4-share-${index}`,
          severity: "error",
          section: "粪污管理 CH4",
          title: `第 ${index + 1} 条养殖记录的 CH4 管理方式占比未闭合`,
          detail: `当前占比合计为 ${totalShare.toFixed(2)}%，应接近 100%。`,
          link: "/project/manure-ch4",
        });
      }
    });
  }

  // 粪污管理 N2O
  if (manureN2O.length === 0) {
    pushItem(items, {
      id: "manure-n2o-missing",
      severity: "warning",
      section: "粪污管理 N2O",
      title: "未录入粪污管理 N2O 参数",
      detail: "建议完成该模块，以便完整核算粪污管理氧化亚氮。",
      link: "/project/manure-n2o",
    });
  } else {
    const shareMap = new Map<number, number>();
    manureN2O.forEach((row, index) => {
      const share = safeNumber(row.sharePercent);
      shareMap.set(
        row.sourceLivestockIndex,
        safeNumber(shareMap.get(row.sourceLivestockIndex)) + share
      );

      if (
        safeNumber(row.nexKgNPerHeadYear) <= 0 ||
        safeNumber(row.ef3KgN2ONPerKgN) < 0
      ) {
        pushItem(items, {
          id: `manure-n2o-param-invalid-${index}`,
          severity: "error",
          section: "粪污管理 N2O",
          title: `第 ${index + 1} 条粪污管理 N2O 参数无效`,
          detail: "Nex 必须大于 0，EF3 不能小于 0。",
          link: "/project/manure-n2o",
        });
      }
    });

    livestock.forEach((_, index) => {
      const totalShare = safeNumber(shareMap.get(index));
      if (totalShare === 0) {
        pushItem(items, {
          id: `manure-n2o-missing-index-${index}`,
          severity: "warning",
          section: "粪污管理 N2O",
          title: `第 ${index + 1} 条养殖记录未配置粪污管理 N2O 路径`,
          detail: "建议补充该畜种的管理方式路径。",
          link: "/project/manure-n2o",
        });
      } else if (!approx100(totalShare)) {
        pushItem(items, {
          id: `manure-n2o-share-${index}`,
          severity: "error",
          section: "粪污管理 N2O",
          title: `第 ${index + 1} 条养殖记录的 N2O 管理方式占比未闭合`,
          detail: `当前占比合计为 ${totalShare.toFixed(2)}%，应接近 100%。`,
          link: "/project/manure-n2o",
        });
      }
    });
  }

  // 能源模块
  if (energyFuel.length === 0) {
    pushItem(items, {
      id: "energy-fuel-missing",
      severity: "warning",
      section: "能源模块",
      title: "未录入化石燃料燃烧数据",
      detail: "如果场区存在柴油、汽油、天然气、煤等消耗，建议完成该模块。",
      link: "/project/energy",
    });
  } else {
    energyFuel.forEach((row, index) => {
      if (
        !row.fuelType?.trim() ||
        safeNumber(row.ncvTJPerUnit) <= 0 ||
        safeNumber(row.carbonContentTonCPerTJ) <= 0 ||
        safeNumber(row.oxidationFactor) <= 0
      ) {
        pushItem(items, {
          id: `energy-fuel-invalid-${index}`,
          severity: "error",
          section: "能源模块",
          title: `第 ${index + 1} 条燃料记录参数不完整`,
          detail: "请检查燃料名称、低位发热量、单位热值含碳量和氧化率。",
          link: "/project/energy",
        });
      }
    });
  }

  if (isEnergyBalanceAllZero(draft)) {
    pushItem(items, {
      id: "energy-balance-empty",
      severity: "warning",
      section: "购入/输出电力热力",
      title: "购入/输出电力热力全部为 0",
      detail: "如果场区存在购入或输出电力/热力，请补充录入。",
      link: "/project/energy",
    });
  } else {
    const eb = draft.energyBalance!;
    const purchasedElectricityMismatch =
      safeNumber(eb.purchasedElectricityMWh) > 0 &&
      safeNumber(eb.purchasedElectricityEFtCO2PerMWh) <= 0;

    const purchasedHeatMismatch =
      safeNumber(eb.purchasedHeatGJ) > 0 &&
      safeNumber(eb.purchasedHeatEFtCO2PerGJ) <= 0;

    const exportedElectricityMismatch =
      safeNumber(eb.exportedElectricityMWh) > 0 &&
      safeNumber(eb.exportedElectricityEFtCO2PerMWh) <= 0;

    const exportedHeatMismatch =
      safeNumber(eb.exportedHeatGJ) > 0 &&
      safeNumber(eb.exportedHeatEFtCO2PerGJ) <= 0;

    if (
      purchasedElectricityMismatch ||
      purchasedHeatMismatch ||
      exportedElectricityMismatch ||
      exportedHeatMismatch
    ) {
      pushItem(items, {
        id: "energy-balance-factor-missing",
        severity: "error",
        section: "购入/输出电力热力",
        title: "购入/输出电力热力存在活动数据但缺少因子",
        detail: "请检查电力和热力的排放因子是否已填写。",
        link: "/project/energy",
      });
    } else {
      pushItem(items, {
        id: "energy-balance-ok",
        severity: "ok",
        section: "购入/输出电力热力",
        title: "购入/输出电力热力参数已填写",
        detail: "已具备计算条件。",
        link: "/project/energy",
      });
    }
  }

  const errorCount = items.filter((item) => item.severity === "error").length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const okCount = items.filter((item) => item.severity === "ok").length;

  return {
    items,
    errorCount,
    warningCount,
    okCount,
    isReadyForExport: errorCount === 0,
  };
}