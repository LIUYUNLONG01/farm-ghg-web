/**
 * 粪污管理模块缺省值库
 * 数值来源：GB/T 32151.22-2024 附录 C
 *   CH₄ 参数：表 C.4（VS）、表 C.5（B₀）、表 C.6（MCF，以年均 20°C 为参考）
 *   N₂O 参数：表 C.8（Nex）、表 C.9（EF₃_直接）
 *
 * MCF 说明：标准表 C.6 按气温和管理方式给出 MCF。本文件以年均气温 20°C 作为参考值。
 * 如养殖场所在地年均气温显著不同，应从 appendixCDefaults.ts 的 c6MCF 表中按实际气温查取。
 *
 * 20°C 时各管理方式 MCF（%）：
 *   氧化塘 78 | 液体贮存(自然结壳) 26 | 液体贮存(无自然结壳) 42 | 固体贮存 4
 *   自然风干 1.5 | 舍内粪坑贮存 3 | 每日施肥 0.5 | 沼气泄漏 10 | 堆肥泼肥 1 | 其他 1
 */

import type { StandardVersion } from "@/types/ghg";

// ─────────────────────────────────────────────
// 接口定义
// ─────────────────────────────────────────────

export interface ManagementSystemPreset {
  id: string;
  label: string;
  aliases: string[];
}

export interface ManureCH4DefaultFactor {
  speciesAliases: string[];
  managementSystemAliases: string[];
  /** VS，kg VS/（头或只·天）；来源：表 C.4 */
  vsKgPerHeadPerDay: number;
  /** B₀，m³ CH₄/kg VS；来源：表 C.5 */
  boM3PerKgVS: number;
  /** MCF，%；来源：表 C.6（参考气温 20°C） */
  mcfPercent: number;
  /** 参数来源标注 */
  sourceLabel: string;
  note?: string;
}

export interface ManureN2ODefaultFactor {
  speciesAliases: string[];
  managementSystemAliases: string[];
  /** Nex，kg N/（头或只·年）；来源：表 C.8 */
  nexKgNPerHeadYear: number;
  /** EF₃_直接，kg N₂O-N/kg N；来源：表 C.9 */
  ef3KgN2ONPerKgN: number;
  sourceLabel: string;
  note?: string;
}

// ─────────────────────────────────────────────
// 粪便管理方式快捷预设（供 UI 一键填入）
// 与附录 C 表 C.6、C.9 的管理方式名称一一对应
// ─────────────────────────────────────────────
export const commonManagementSystemPresets: ManagementSystemPreset[] = [
  { id: "oxidation_pond",               label: "氧化塘",              aliases: ["氧化塘"] },
  { id: "liquid_storage_natural_crust", label: "液体贮存（自然结壳）", aliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"] },
  { id: "liquid_storage_no_crust",      label: "液体贮存（无自然结壳）", aliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液态/浆态贮存", "液态贮存", "浆态贮存"] },
  { id: "solid_storage",                label: "固体贮存",             aliases: ["固体贮存", "堆粪", "堆存"] },
  { id: "natural_drying",               label: "自然风干",             aliases: ["自然风干"] },
  { id: "pit_storage_inside_house",     label: "舍内粪坑贮存",         aliases: ["舍内粪坑贮存", "舍内类坑贮存", "舍内坑贮存"] },
  { id: "daily_spread",                 label: "每日施肥",             aliases: ["每日施肥"] },
  { id: "biogas_tank",                  label: "沼气池",               aliases: ["沼气池", "沼气池泄漏"] },
  { id: "compost_and_paddock",          label: "堆肥和泼肥",           aliases: ["堆肥和泼肥", "堆肥", "泼肥"] },
  { id: "other",                        label: "其他",                 aliases: ["其他"] },
];

// ─────────────────────────────────────────────
// 粪污管理 CH₄ 参数法缺省值
// VS 来源：表 C.4；B₀ 来源：表 C.5；MCF 来源：表 C.6（20°C）
// ─────────────────────────────────────────────

/**
 * 辅助：按物种获取 VS（表 C.4）
 * 奶牛 3.5 | 肉牛 3.0 | 水牛 3.9 | 山羊 0.35 | 绵羊 0.32 | 猪 0.3 | 家禽 0.02
 */

/**
 * 辅助：按物种获取 B₀（表 C.5）
 * 奶牛 0.24 | 肉牛 0.19 | 水牛 0.10 | 猪 0.29 | 山羊 0.13 | 绵羊 0.13 | 家禽 0.24
 */

const sharedManureCH4Defaults: ManureCH4DefaultFactor[] = [
  // ── 奶牛 × 各管理方式 ──
  // VS=3.5（表C.4），B₀=0.24（表C.5），MCF 按表C.6（20°C）
  { speciesAliases: ["奶牛"], managementSystemAliases: ["氧化塘"],                                                              vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 78,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"],                              vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 26,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液态/浆态贮存"],         vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],                                             vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["自然风干"],                                                             vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["舍内粪坑贮存", "舍内类坑贮存", "舍内坑贮存"],                            vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 3,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["每日施肥"],                                                             vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 0.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],                                           vsKgPerHeadPerDay: 3.5, boM3PerKgVS: 0.24, mcfPercent: 1,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 肉牛 × 各管理方式 ──
  // VS=3.0（表C.4），B₀=0.19（表C.5）
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["氧化塘"],                               vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 78,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"], vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 26,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],              vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["自然风干"],                             vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["舍内粪坑贮存", "舍内类坑贮存"],           vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 3,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["每日施肥"],                             vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 0.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],            vsKgPerHeadPerDay: 3.0, boM3PerKgVS: 0.19, mcfPercent: 1,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 水牛 × 各管理方式 ──
  // VS=3.9（表C.4），B₀=0.10（表C.5）
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            vsKgPerHeadPerDay: 3.9, boM3PerKgVS: 0.10, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], vsKgPerHeadPerDay: 3.9, boM3PerKgVS: 0.10, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["氧化塘"],                              vsKgPerHeadPerDay: 3.9, boM3PerKgVS: 0.10, mcfPercent: 78,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 猪 × 各管理方式 ──
  // VS=0.3（表C.4），B₀=0.29（表C.5）
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["氧化塘"],                              vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 78,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"], vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 26,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["自然风干"],                           vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["舍内粪坑贮存", "舍内类坑贮存"],         vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 3,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["每日施肥"],                           vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 0.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],          vsKgPerHeadPerDay: 0.3, boM3PerKgVS: 0.29, mcfPercent: 1,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 绵羊 × 各管理方式 ──
  // VS=0.32（表C.4），B₀=0.13（表C.5）
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            vsKgPerHeadPerDay: 0.32, boM3PerKgVS: 0.13, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], vsKgPerHeadPerDay: 0.32, boM3PerKgVS: 0.13, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["自然风干"],                            vsKgPerHeadPerDay: 0.32, boM3PerKgVS: 0.13, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 山羊 × 各管理方式 ──
  // VS=0.35（表C.4），B₀=0.13（表C.5）
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            vsKgPerHeadPerDay: 0.35, boM3PerKgVS: 0.13, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], vsKgPerHeadPerDay: 0.35, boM3PerKgVS: 0.13, mcfPercent: 42,  sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["自然风干"],                            vsKgPerHeadPerDay: 0.35, boM3PerKgVS: 0.13, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },

  // ── 家禽 × 各管理方式 ──
  // VS=0.02（表C.4），B₀=0.24（表C.5）
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],  vsKgPerHeadPerDay: 0.02, boM3PerKgVS: 0.24, mcfPercent: 4,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["自然风干"],                  vsKgPerHeadPerDay: 0.02, boM3PerKgVS: 0.24, mcfPercent: 1.5, sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],  vsKgPerHeadPerDay: 0.02, boM3PerKgVS: 0.24, mcfPercent: 1,   sourceLabel: "GB/T 32151.22-2024 表C.4+C.5+C.6（20°C）" },
];

// ─────────────────────────────────────────────
// 粪污管理 N₂O 参数法缺省值
// Nex 来源：表 C.8；EF₃_直接 来源：表 C.9
// ─────────────────────────────────────────────
const sharedManureN2ODefaults: ManureN2ODefaultFactor[] = [
  // ── 奶牛（Nex=72，表C.8）× 各管理方式 ──
  { speciesAliases: ["奶牛"], managementSystemAliases: ["氧化塘"],                                                   nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9", note: "表C.9：氧化塘 EF₃=0" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"],                    nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液态/浆态贮存"], nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9", note: "表C.9：无自然结壳液体贮存 EF₃=0" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],                                   nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["自然风干"],                                                   nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["舍内粪坑贮存", "舍内类坑贮存", "舍内坑贮存"],                   nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.002, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["每日施肥"],                                                   nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9", note: "表C.9：每日施肥 EF₃=0" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["沼气池", "沼气池泄漏"],                                        nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9", note: "表C.9：沼气池 EF₃=0" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],                                 nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["奶牛"], managementSystemAliases: ["其他"],                                                       nexKgNPerHeadYear: 72, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 肉牛（Nex=40，表C.8）× 各管理方式 ──
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],                                   nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"],                    nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["液体贮存（无自然结壳）", "液体贮存无自然结壳", "液态/浆态贮存"], nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["自然风干"],                                                   nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["每日施肥"],                                                   nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["肉牛", "牛", "beef cattle", "cattle"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],                                 nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 水牛（Nex=40，表C.8）× 各管理方式 ──
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["水牛", "buffalo"], managementSystemAliases: ["自然风干"],                            nexKgNPerHeadYear: 40, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 猪（Nex=11，表C.8）× 各管理方式 ──
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["氧化塘"],                              nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["液体贮存（自然结壳）", "液体贮存自然结壳"], nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["液体贮存（无自然结壳）", "液态/浆态贮存"], nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.0,   sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],            nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["自然风干"],                           nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["舍内粪坑贮存", "舍内类坑贮存"],         nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.002, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["猪", "pig", "swine"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],          nexKgNPerHeadYear: 11, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 绵羊（Nex=12，表C.8）× 各管理方式 ──
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],  nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["自然风干"],                 nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["绵羊", "sheep"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"], nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 山羊（Nex=12，表C.8）× 各管理方式 ──
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],  nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["自然风干"],                 nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["山羊", "goat"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"], nexKgNPerHeadYear: 12, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },

  // ── 家禽（Nex=0.6，表C.8）× 各管理方式 ──
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["固体贮存", "堆粪", "堆存"],  nexKgNPerHeadYear: 0.6, ef3KgN2ONPerKgN: 0.005, sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["堆肥和泼肥", "堆肥", "泼肥"],  nexKgNPerHeadYear: 0.6, ef3KgN2ONPerKgN: 0.01,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
  { speciesAliases: ["家禽", "蛋鸡", "肉鸡", "鸡", "poultry", "broiler", "layer"], managementSystemAliases: ["自然风干"],                  nexKgNPerHeadYear: 0.6, ef3KgN2ONPerKgN: 0.02,  sourceLabel: "GB/T 32151.22-2024 表C.8+C.9" },
];

// ─────────────────────────────────────────────
// 按标准版本导出
// ─────────────────────────────────────────────
export const manureCH4DefaultFactorLibrary: Record<StandardVersion, ManureCH4DefaultFactor[]> = {
  NYT4243_2022:     sharedManureCH4Defaults,
  GBT32151_22_2024: sharedManureCH4Defaults,
};

export const manureN2ODefaultFactorLibrary: Record<StandardVersion, ManureN2ODefaultFactor[]> = {
  NYT4243_2022:     sharedManureN2ODefaults,
  GBT32151_22_2024: sharedManureN2ODefaults,
};