/**
 * 粪污管理 N₂O 模块表单验证 Schema
 * 对应标准：GB/T 32151.22-2024，5.2.5，公式 (11)(12)(13)
 *
 * 参数法新增字段（公式 13 间接排放）：
 *   ef3VolatilizationKgN2ONPerKgN：EF_挥发，缺省 0.01
 *   fracGasMS：Frac_GasMS，%，缺省 20
 *   ef3LeachingKgN2ONPerKgN：EF_淋溶，缺省 0.0075
 *   fracLeachMS：Frac_leachMS，%，范围 0~20
 */

import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function requiredInteger(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({ error: `${label}必须为数字` })
      .int(`${label}必须为整数`)
      .min(0, `${label}不能小于 0`)
  );
}

function optionalNonNegativeNumber() {
  return z.preprocess(
    preprocessNumber,
    z.number().min(0, "数值不能小于 0").optional()
  );
}

const parameterSourceTypeSchema = z.enum([
  "default_library",
  "manual_input",
  "preset_template",
]);

const manureN2OMethodSchema = z.enum([
  "regionalDefaultEF",
  "parameterCalculation",
]);

export const manureN2ORowSchema = z
  .object({
    sourceLivestockIndex: requiredInteger("来源索引"),
    species: z.string().trim().min(1, "畜种不能为空"),
    stage: z.string().trim().min(1, "阶段不能为空"),

    method: manureN2OMethodSchema,

    /** 区域化推荐因子，kg N₂O/（头或只·年）；来自表 C.10 */
    regionalEmissionFactor: optionalNonNegativeNumber(),

    managementSystem: z.string().default(""),
    /** 该管理方式占比，%，各路径总和应为 100% */
    sharePercent: optionalNonNegativeNumber(),
    /** Nex，kg N/（头或只·年）；表 C.8 缺省值 */
    nexKgNPerHeadYear: optionalNonNegativeNumber(),
    /**
     * EF₃_直接，kg N₂O-N/kg N；表 C.9 缺省值
     * 注意：氧化塘、液体无结壳、每日施肥、沼气池的缺省值为 0，允许填 0
     */
    ef3KgN2ONPerKgN: optionalNonNegativeNumber(),

    // ── 间接排放参数（公式 13，可选，不填则使用计算器内置缺省值） ──

    /**
     * EF_挥发，kg N₂O-N/kg N
     * 标准推荐值 = 0.01；不填时计算器自动使用 0.01
     */
    ef3VolatilizationKgN2ONPerKgN: optionalNonNegativeNumber(),

    /**
     * Frac_GasMS，%，因气体挥发造成氮损失的比例
     * 标准推荐值 = 20%；不填时计算器自动使用 20
     */
    fracGasMS: z.preprocess(
      preprocessNumber,
      z.number().min(0, "Frac_GasMS 不能小于 0").max(100, "Frac_GasMS 不能大于 100").optional()
    ),

    /**
     * EF_淋溶径流，kg N₂O-N/kg N
     * 标准推荐值 = 0.0075；不填时计算器自动使用 0.0075
     */
    ef3LeachingKgN2ONPerKgN: optionalNonNegativeNumber(),

    /**
     * Frac_leachMS，%，因淋溶径流造成氮损失的比例
     * 取值范围 0~20%（不填或填 0 时，计算器忽略淋溶间接排放项）
     */
    fracLeachMS: z.preprocess(
      preprocessNumber,
      z.number().min(0, "Frac_leachMS 不能小于 0").max(20, "Frac_leachMS 不能超过 20%").optional()
    ),

    parameterSourceType: parameterSourceTypeSchema.default("manual_input"),
    parameterSourceLabel: z
      .string()
      .trim()
      .max(200, "参数来源说明最多 200 字")
      .default("手工输入"),
    notes: z.string().max(300, "备注最多 300 字").default(""),
  })
  .superRefine((row, ctx) => {
    if (row.method === "regionalDefaultEF") {
      if (!row.regionalEmissionFactor || row.regionalEmissionFactor <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["regionalEmissionFactor"],
          message: "推荐因子法下，区域化推荐因子必须大于 0",
        });
      }
    }

    if (row.method === "parameterCalculation") {
      if (!row.managementSystem || !row.managementSystem.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["managementSystem"],
          message: "参数法下必须填写管理方式",
        });
      }

      if (!row.sharePercent || row.sharePercent <= 0 || row.sharePercent > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharePercent"],
          message: "参数法下，占比必须大于 0 且不超过 100",
        });
      }

      if (!row.nexKgNPerHeadYear || row.nexKgNPerHeadYear <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nexKgNPerHeadYear"],
          message: "参数法下，Nex 必须大于 0",
        });
      }

      // EF₃_直接 允许为 0（氧化塘等管理方式），但不允许未填
      if (row.ef3KgN2ONPerKgN === undefined || row.ef3KgN2ONPerKgN === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ef3KgN2ONPerKgN"],
          message: "参数法下，EF₃_直接不能为空（氧化塘等可填 0）",
        });
      }
    }
  });

export const manureN2OSchema = z.object({
  rows: z.array(manureN2ORowSchema).min(1, "请至少录入一条粪污管理 N₂O 数据"),
});

export type ManureN2OFormInput = z.input<typeof manureN2OSchema>;
export type ManureN2OFormValues = z.output<typeof manureN2OSchema>;