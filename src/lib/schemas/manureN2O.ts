import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  return Number(value);
}

function requiredInteger(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({
        required_error: `请输入${label}`,
        invalid_type_error: `${label}必须为数字`,
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

    regionalEmissionFactor: optionalNonNegativeNumber(),

    managementSystem: z.string().trim().optional().default(""),
    sharePercent: optionalNonNegativeNumber(),
    nexKgNPerHeadYear: optionalNonNegativeNumber(),
    ef3KgN2ONPerKgN: optionalNonNegativeNumber(),

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
          message: "区域化推荐因子必须大于 0",
        });
      }
    }

    if (row.method === "parameterCalculation") {
      if (!row.managementSystem || row.managementSystem.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["managementSystem"],
          message: "请输入管理方式",
        });
      }

      if (!row.sharePercent || row.sharePercent <= 0 || row.sharePercent > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharePercent"],
          message: "管理方式占比应大于 0 且不超过 100",
        });
      }

      if (!row.nexKgNPerHeadYear || row.nexKgNPerHeadYear <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nexKgNPerHeadYear"],
          message: "Nex 必须大于 0",
        });
      }

      if (row.ef3KgN2ONPerKgN === undefined || row.ef3KgN2ONPerKgN < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ef3KgN2ONPerKgN"],
          message: "EF3 不能小于 0",
        });
      }
    }
  });

export const manureN2OSchema = z.object({
  rows: z.array(manureN2ORowSchema).min(1, "请至少录入一条粪污管理 N2O 数据"),
});

export type ManureN2OFormValues = z.infer<typeof manureN2OSchema>;