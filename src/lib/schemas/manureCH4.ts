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
      .number({
        error: `${label}必须为数字`,
      })
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

const manureCH4MethodSchema = z.enum([
  "regionalDefaultEF",
  "parameterCalculation",
]);

export const manureCH4RowSchema = z
  .object({
    sourceLivestockIndex: requiredInteger("来源索引"),
    species: z.string().trim().min(1, "畜种不能为空"),
    stage: z.string().trim().min(1, "阶段不能为空"),

    method: manureCH4MethodSchema,

    regionalEmissionFactor: optionalNonNegativeNumber(),

    managementSystem: z.string().default(""),
    sharePercent: optionalNonNegativeNumber(),
    vsKgPerHeadPerDay: optionalNonNegativeNumber(),
    boM3PerKgVS: optionalNonNegativeNumber(),
    mcfPercent: optionalNonNegativeNumber(),

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

      if (!row.vsKgPerHeadPerDay || row.vsKgPerHeadPerDay <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vsKgPerHeadPerDay"],
          message: "参数法下，VS 必须大于 0",
        });
      }

      if (!row.boM3PerKgVS || row.boM3PerKgVS <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["boM3PerKgVS"],
          message: "参数法下，B₀ 必须大于 0",
        });
      }

      if (row.mcfPercent === undefined || row.mcfPercent < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mcfPercent"],
          message: "参数法下，MCF 不能为空且不能小于 0",
        });
      }
    }
  });

export const manureCH4Schema = z.object({
  rows: z.array(manureCH4RowSchema).min(1, "请至少录入一条粪污管理 CH4 数据"),
});

export type ManureCH4FormInput = z.input<typeof manureCH4Schema>;
export type ManureCH4FormValues = z.output<typeof manureCH4Schema>;