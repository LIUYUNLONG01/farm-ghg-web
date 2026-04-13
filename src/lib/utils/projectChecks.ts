/**
 * 项目质量检查
 * 对应标准：GB/T 32151.22-2024 第 6 章数据质量管理要求
 *
 * 检查范围：基础信息、养殖活动、肠道发酵、粪污管理 CH₄/N₂O、沼气回收、能源模块
 */

import type {
  FeedLedgerRecord,
  LivestockMonthlyChangeRecord,
  ProjectDraft,
} from "@/types/ghg";

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

function pushItem(list: ProjectCheckItem[], item: ProjectCheckItem) {
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

function validateMonthlyRecords(monthlyRecords: LivestockMonthlyChangeRecord[]) {
  const issues: string[] = [];
  if (monthlyRecords.length !== 12) {
    issues.push("月度动态记录不是 12 个月。");
    return issues;
  }

  for (let i = 0; i < monthlyRecords.length; i += 1) {
    const row = monthlyRecords[i];
    const opening = safeNumber(row.openingHead);
    const additions =
      safeNumber(row.births) + safeNumber(row.transferredIn) + safeNumber(row.purchasedIn);
    const reductions =
      safeNumber(row.culled) + safeNumber(row.sold) + safeNumber(row.transferredOut) + safeNumber(row.deaths);
    const closing = safeNumber(row.closingHead);

    if (Math.abs(opening + additions - reductions - closing) > 0.5) {
      issues.push(`${row.month}月不平衡：月初 + 新增 - 减少 ≠ 月末。`);
    }
    if (i > 0) {
      const prevClosing = safeNumber(monthlyRecords[i - 1].closingHead);
      if (Math.abs(prevClosing - opening) > 0.5) {
        issues.push(`${row.month}月月初存栏未承接上月月末。`);
      }
    }
  }

  return issues;
}

function getFeedLedgerOutboundForGroup(
  feedLedger: FeedLedgerRecord[],
  sourceLivestockIndex: number
) {
  return feedLedger.filter(
    (item) =>
      item.direction === "outbound" &&
      item.targetGroupSourceLivestockIndex === sourceLivestockIndex
  );
}

function calcFeedLedgerDMIInfo(draft: ProjectDraft, sourceLivestockIndex: number) {
  const livestock = draft.livestock[sourceLivestockIndex];
  if (!livestock) return { outboundCount: 0, totalDryMatterKg: 0, headDays: 0, dmiKgPerHeadDay: 0 };

  const outboundRows = getFeedLedgerOutboundForGroup(draft.feedLedger ?? [], sourceLivestockIndex);
  const totalDryMatterKg = outboundRows.reduce((sum, item) => {
    const quantityTon = safeNumber(item.quantityTon);
    const dryMatterRate = Math.max(0, 1 - safeNumber(item.moisturePercent) / 100);
    return sum + quantityTon * 1000 * dryMatterRate;
  }, 0);

  let headDays = 0;
  if (livestock.monthlyRecords && livestock.monthlyRecords.length === 12) {
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    headDays = livestock.monthlyRecords.reduce((sum, row, index) => {
      return sum + ((safeNumber(row.openingHead) + safeNumber(row.closingHead)) / 2) * monthDays[index];
    }, 0);
  } else if (
    livestock.populationMode === "turnover" &&
    safeNumber(livestock.annualOutputHead) > 0 &&
    safeNumber(livestock.feedingDays) > 0
  ) {
    headDays = safeNumber(livestock.annualOutputHead) * safeNumber(livestock.feedingDays);
  } else {
    headDays = safeNumber(livestock.annualAverageHead) * 365;
  }

  return {
    outboundCount: outboundRows.length,
    totalDryMatterKg,
    headDays,
    dmiKgPerHeadDay: headDays > 0 ? totalDryMatterKg / headDays : 0,
  };
}

export function runProjectChecks(draft: ProjectDraft): ProjectCheckResult {
  const items: ProjectCheckItem[] = [];

  const livestock = draft.livestock ?? [];
  const feedLedger = draft.feedLedger ?? [];
  const enteric = draft.enteric ?? [];
  const manureCH4 = draft.manureCH4 ?? [];
  const manureN2O = draft.manureN2O ?? [];
  const energyFuel = draft.energyFuel ?? [];

  // ── 基础信息 ──────────────────────────────────────────────────────────────
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
      severity: "error",
      section: "基础信息",
      title: "地区信息未填写",
      detail: "区域化推荐因子需要标准化地区，请在基础信息页面选择地区。",
      link: "/project/new",
    });
  }

  // ── 养殖活动 ──────────────────────────────────────────────────────────────
  if (livestock.length === 0) {
    pushItem(items, {
      id: "livestock-missing",
      severity: "error",
      section: "养殖活动",
      title: "未录入养殖活动数据",
      detail: "至少需要一条群体记录才能继续完整核算。",
      link: "/project/livestock",
    });
  } else {
    livestock.forEach((row, index) => {
      if (!row.species?.trim() || !row.stage?.trim()) {
        pushItem(items, {
          id: `livestock-id-${index}`,
          severity: "error",
          section: "养殖活动",
          title: `第 ${index + 1} 条群体缺少标准动物/阶段`,
          detail: "请补充标准动物类别和阶段。",
          link: "/project/livestock",
        });
      }

      const monthlyIssues = validateMonthlyRecords(row.monthlyRecords ?? []);
      if (monthlyIssues.length > 0) {
        pushItem(items, {
          id: `livestock-monthly-${index}`,
          severity: "error",
          section: "养殖活动",
          title: `第 ${index + 1} 条群体月度动态存在问题`,
          detail: monthlyIssues.join("；"),
          link: "/project/livestock",
        });
      }

      if (safeNumber(row.annualAverageHead) <= 0) {
        pushItem(items, {
          id: `livestock-ap-${index}`,
          severity: "warning",
          section: "养殖活动",
          title: `第 ${index + 1} 条群体年平均存栏为 0`,
          detail: "请检查月度动态或年平均存栏计算结果。",
          link: "/project/livestock",
        });
      }

      if (row.populationMode === "turnover") {
        if (safeNumber(row.annualOutputHead) <= 0 || safeNumber(row.feedingDays) <= 0) {
          pushItem(items, {
            id: `livestock-turnover-${index}`,
            severity: "error",
            section: "养殖活动",
            title: `第 ${index + 1} 条周转群体缺少出栏量或饲养周期`,
            detail: "周转群体至少需要年度出栏量和饲养周期天数。",
            link: "/project/livestock",
          });
        }
      }

      if (row.dmiMethod === "direct_input" || row.dmiMethod === "temporary_estimate") {
        if (safeNumber(row.dmiKgPerHeadDay) <= 0) {
          pushItem(items, {
            id: `livestock-dmi-direct-${index}`,
            severity: "warning",
            section: "养殖活动",
            title: `第 ${index + 1} 条群体尚未形成 DMI`,
            detail: "当前 DMI 获取方式要求直接提供 DMI，但该值尚未填写。",
            link: "/project/livestock",
          });
        }
      }

      if (row.dmiMethod === "feed_ledger") {
        const info = calcFeedLedgerDMIInfo(draft, index);
        if (info.outboundCount === 0) {
          pushItem(items, {
            id: `livestock-feed-ledger-empty-${index}`,
            severity: "warning",
            section: "养殖活动",
            title: `第 ${index + 1} 条群体的饲料台账出库记录为空`,
            detail: "当前 DMI 获取方式为饲料台账，但尚无出库记录。",
            link: "/project/livestock",
          });
        } else if (info.dmiKgPerHeadDay <= 0) {
          pushItem(items, {
            id: `livestock-feed-ledger-dmi-zero-${index}`,
            severity: "warning",
            section: "养殖活动",
            title: `第 ${index + 1} 条群体饲料台账推算 DMI 为 0`,
            detail: "请检查出库记录的数量和含水率设置。",
            link: "/project/livestock",
          });
        }
      }
    });

    pushItem(items, {
      id: "livestock-ok",
      severity: "ok",
      section: "养殖活动",
      title: "养殖活动数据已录入",
      detail: `共 ${livestock.length} 条群体记录。`,
      link: "/project/livestock",
    });
  }

  // ── 肠道发酵 CH₄ ──────────────────────────────────────────────────────────
  if (enteric.length === 0) {
    pushItem(items, {
      id: "enteric-missing",
      severity: "warning",
      section: "肠道发酵 CH4",
      title: "未录入肠道发酵参数",
      detail: "建议完成该模块，以便完整核算肠道发酵甲烷。",
      link: "/project/enteric",
    });
  } else {
    enteric.forEach((row, index) => {
      if (row.method === "defaultEF" || row.method === "measuredEF") {
        if (safeNumber(row.emissionFactor) <= 0) {
          pushItem(items, {
            id: `enteric-ef-invalid-${index}`,
            severity: "error",
            section: "肠道发酵 CH4",
            title: `第 ${index + 1} 条肠道发酵因子无效`,
            detail: "推荐因子法或实测/手工法下，EF 必须大于 0。",
            link: "/project/enteric",
          });
        }
      }

      if (row.method === "calculatedEF") {
        if (safeNumber(row.dmiKgPerHeadDay) <= 0 || safeNumber(row.ymPercent) <= 0) {
          pushItem(items, {
            id: `enteric-calculated-invalid-${index}`,
            severity: "error",
            section: "肠道发酵 CH4",
            title: `第 ${index + 1} 条肠道发酵计算法参数无效`,
            detail: "计算法下，DMI 和 Ym 都必须大于 0。",
            link: "/project/enteric",
          });
        }
      }
    });

    pushItem(items, {
      id: "enteric-ok",
      severity: "ok",
      section: "肠道发酵 CH4",
      title: "肠道发酵模块已建立对应关系",
      detail: `共 ${enteric.length} 条记录。`,
      link: "/project/enteric",
    });
  }

  // ── 粪污管理 CH₄ ──────────────────────────────────────────────────────────
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
    const indicesCovered = new Set<number>();

    manureCH4.forEach((row, index) => {
      indicesCovered.add(row.sourceLivestockIndex);

      if (row.method === "regionalDefaultEF") {
        if (safeNumber(row.regionalEmissionFactor) <= 0) {
          pushItem(items, {
            id: `manure-ch4-regional-invalid-${index}`,
            severity: "error",
            section: "粪污管理 CH4",
            title: `第 ${index + 1} 条粪污管理 CH4 区域化推荐因子无效`,
            detail: "推荐因子法下，区域化推荐因子必须大于 0。",
            link: "/project/manure-ch4",
          });
        }
        return;
      }

      if (
        !row.managementSystem?.trim() ||
        safeNumber(row.sharePercent) <= 0 ||
        safeNumber(row.sharePercent) > 100 ||
        safeNumber(row.vsKgPerHeadPerDay) <= 0 ||
        safeNumber(row.boM3PerKgVS) <= 0 ||
        safeNumber(row.mcfPercent) < 0
      ) {
        pushItem(items, {
          id: `manure-ch4-param-invalid-${index}`,
          severity: "error",
          section: "粪污管理 CH4",
          title: `第 ${index + 1} 条粪污管理 CH4 参数法路径无效`,
          detail: "参数法下必须填写管理方式、占比、VS、B₀ 和 MCF。",
          link: "/project/manure-ch4",
        });
      }
    });

    livestock.forEach((_, index) => {
      const rowsForIndex = manureCH4.filter((row) => row.sourceLivestockIndex === index);
      if (rowsForIndex.length === 0) {
        pushItem(items, {
          id: `manure-ch4-missing-index-${index}`,
          severity: "warning",
          section: "粪污管理 CH4",
          title: `第 ${index + 1} 条养殖记录未配置粪污管理 CH4`,
          detail: "建议为该畜种配置推荐因子法或参数法。",
          link: "/project/manure-ch4",
        });
        return;
      }

      const parameterRows = rowsForIndex.filter((row) => row.method === "parameterCalculation");
      if (parameterRows.length > 0) {
        const totalShare = parameterRows.reduce((sum, row) => sum + safeNumber(row.sharePercent), 0);
        if (!approx100(totalShare)) {
          pushItem(items, {
            id: `manure-ch4-share-${index}`,
            severity: "error",
            section: "粪污管理 CH4",
            title: `第 ${index + 1} 条养殖记录的 CH4 参数法占比未闭合`,
            detail: `当前参数法路径占比合计为 ${totalShare.toFixed(2)}%，应接近 100%。`,
            link: "/project/manure-ch4",
          });
        }
      }
    });

    if (indicesCovered.size > 0) {
      pushItem(items, {
        id: "manure-ch4-ok",
        severity: "ok",
        section: "粪污管理 CH4",
        title: "粪污管理 CH4 模块已建立对应关系",
        detail: `共 ${manureCH4.length} 条路径。`,
        link: "/project/manure-ch4",
      });
    }
  }

  // ── 粪污管理 N₂O ──────────────────────────────────────────────────────────
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
    const indicesCovered = new Set<number>();

    manureN2O.forEach((row, index) => {
      indicesCovered.add(row.sourceLivestockIndex);

      if (row.method === "regionalDefaultEF") {
        if (safeNumber(row.regionalEmissionFactor) <= 0) {
          pushItem(items, {
            id: `manure-n2o-regional-invalid-${index}`,
            severity: "error",
            section: "粪污管理 N2O",
            title: `第 ${index + 1} 条粪污管理 N2O 区域化推荐因子无效`,
            detail: "推荐因子法下，区域化推荐因子必须大于 0。",
            link: "/project/manure-n2o",
          });
        }
        return;
      }

      // 参数法校验（ef3KgN2ONPerKgN 允许为 0，如氧化塘）
      const ef3IsInvalid =
        row.ef3KgN2ONPerKgN === undefined || row.ef3KgN2ONPerKgN === null || row.ef3KgN2ONPerKgN < 0;

      if (
        !row.managementSystem?.trim() ||
        safeNumber(row.sharePercent) <= 0 ||
        safeNumber(row.sharePercent) > 100 ||
        safeNumber(row.nexKgNPerHeadYear) <= 0 ||
        ef3IsInvalid
      ) {
        pushItem(items, {
          id: `manure-n2o-param-invalid-${index}`,
          severity: "error",
          section: "粪污管理 N2O",
          title: `第 ${index + 1} 条粪污管理 N2O 参数法路径无效`,
          detail: "参数法下必须填写管理方式、占比、Nex 和 EF₃_直接（氧化塘等可填 0）。",
          link: "/project/manure-n2o",
        });
      }
    });

    livestock.forEach((_, index) => {
      const rowsForIndex = manureN2O.filter((row) => row.sourceLivestockIndex === index);
      if (rowsForIndex.length === 0) {
        pushItem(items, {
          id: `manure-n2o-missing-index-${index}`,
          severity: "warning",
          section: "粪污管理 N2O",
          title: `第 ${index + 1} 条养殖记录未配置粪污管理 N2O`,
          detail: "建议为该畜种配置推荐因子法或参数法。",
          link: "/project/manure-n2o",
        });
        return;
      }

      const parameterRows = rowsForIndex.filter((row) => row.method === "parameterCalculation");
      if (parameterRows.length > 0) {
        const totalShare = parameterRows.reduce((sum, row) => sum + safeNumber(row.sharePercent), 0);
        if (!approx100(totalShare)) {
          pushItem(items, {
            id: `manure-n2o-share-${index}`,
            severity: "error",
            section: "粪污管理 N2O",
            title: `第 ${index + 1} 条养殖记录的 N2O 参数法占比未闭合`,
            detail: `当前参数法路径占比合计为 ${totalShare.toFixed(2)}%，应接近 100%。`,
            link: "/project/manure-n2o",
          });
        }
      }
    });

    if (indicesCovered.size > 0) {
      pushItem(items, {
        id: "manure-n2o-ok",
        severity: "ok",
        section: "粪污管理 N2O",
        title: "粪污管理 N2O 模块已建立对应关系",
        detail: `共 ${manureN2O.length} 条路径。`,
        link: "/project/manure-n2o",
      });
    }
  }

  // ── 沼气甲烷回收利用（5.2.6，减项） ──────────────────────────────────────
  if (draft.biogasRecovery) {
    const br = draft.biogasRecovery;
    const hasSelfUse = safeNumber(br.selfUsedVolumeM3) > 0;
    const hasExport = safeNumber(br.exportedVolumeM3) > 0;
    const hasFlaring = safeNumber(br.flaringVolumeM3) > 0;
    const hasAnyVolume = hasSelfUse || hasExport || hasFlaring;

    if (!hasAnyVolume) {
      pushItem(items, {
        id: "biogas-volume-zero",
        severity: "warning",
        section: "沼气甲烷回收",
        title: "沼气回收模块已启用但体积全为 0",
        detail: "自用量、外供量和火炬量均为 0，请确认是否需要填写该模块。",
        link: "/project/biogas",
      });
    } else {
      // 甲烷浓度检查
      if (hasSelfUse && safeNumber(br.selfUsedCH4Fraction) <= 0) {
        pushItem(items, {
          id: "biogas-self-ch4-missing",
          severity: "error",
          section: "沼气甲烷回收",
          title: "自用沼气甲烷浓度未填写",
          detail: "请填写自用沼气中甲烷的体积分数（0~1）。",
          link: "/project/biogas",
        });
      }
      if (hasExport && safeNumber(br.exportedCH4Fraction) <= 0) {
        pushItem(items, {
          id: "biogas-export-ch4-missing",
          severity: "error",
          section: "沼气甲烷回收",
          title: "外供沼气甲烷浓度未填写",
          detail: "请填写外供沼气中甲烷的体积分数（0~1）。",
          link: "/project/biogas",
        });
      }
      if (hasFlaring) {
        if (safeNumber(br.flaringCH4Fraction) <= 0) {
          pushItem(items, {
            id: "biogas-flaring-ch4-missing",
            severity: "error",
            section: "沼气甲烷回收",
            title: "火炬燃烧沼气甲烷浓度未填写",
            detail: "请填写火炬燃烧沼气中甲烷的体积分数（0~1）。",
            link: "/project/biogas",
          });
        }
        const of = safeNumber(br.flaringOxidationFactorPercent);
        if (of <= 0 || of > 100) {
          pushItem(items, {
            id: "biogas-flaring-of-invalid",
            severity: "warning",
            section: "沼气甲烷回收",
            title: "火炬碳氧化率数值异常",
            detail: `当前值为 ${of}%，标准建议无实测数据时取缺省值 98%。`,
            link: "/project/biogas",
          });
        }
      }

      pushItem(items, {
        id: "biogas-ok",
        severity: "ok",
        section: "沼气甲烷回收",
        title: "沼气甲烷回收模块已填写",
        detail: `自用 ${safeNumber(br.selfUsedVolumeM3)} 千Nm³ / 外供 ${safeNumber(br.exportedVolumeM3)} 千Nm³ / 火炬 ${safeNumber(br.flaringVolumeM3)} 千Nm³。`,
        link: "/project/biogas",
      });
    }
  } else {
    // 未启用沼气回收模块时给出提示（不是 error，仅为 warning）
    pushItem(items, {
      id: "biogas-not-configured",
      severity: "warning",
      section: "沼气甲烷回收",
      title: "未配置沼气甲烷回收模块",
      detail: "如场区建有沼气工程，建议录入沼气回收利用量以减少总排放量（标准 5.2.6）。",
      link: "/project/biogas",
    });
  }

  // ── 能源模块 ──────────────────────────────────────────────────────────────
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

    pushItem(items, {
      id: "energy-fuel-ok",
      severity: "ok",
      section: "能源模块",
      title: "化石燃料记录已录入",
      detail: `共 ${energyFuel.length} 条燃料记录。`,
      link: "/project/energy",
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
  }

  // ── 汇总 ──────────────────────────────────────────────────────────────────
  const errorCount = items.filter((item) => item.severity === "error").length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const okCount = items.filter((item) => item.severity === "ok").length;

  return { items, errorCount, warningCount, okCount, isReadyForExport: errorCount === 0 };
}