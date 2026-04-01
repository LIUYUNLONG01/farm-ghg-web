import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  return Number(value);
}

function optionalNonNegativeNumber() {
  return z.preprocess(
    preprocessNumber,
    z.number().min(0, "数值不能小于 0").optional()
  );
}

function optionalPositiveNumber() {
  return z.preprocess(
    preprocessNumber,
    z.number().positive("数值必须大于 0").optional()
  );
}

const monthlyHeadsSchema = z
  .array(
    z.preprocess(
      preprocessNumber,
      z.number().min(0, "月度存栏不能小于 0")
    )
  )
  .length(12, "必须填写12个月数据");

const parameterSourceTypeSchema = z.enum([
  "default_library",
  "manual_input",
  "preset_template",
]);

export const entericMethodOptions = [
  "defaultEF",
  "calculatedEF",
  "measuredEF",
] as const;

export const entericActivityMethodOptions = [
  "directAnnualAverage",
  "monthlyAverage",
  "shortCycleFormula",
] as const;

export const entericCH4RowSchema = z
  .object({
    sourceLivestockIndex: z.number().int().min(0),
    species: z.string().trim().min(1, "畜种不能为空"),
    stage: z.string().trim().min(1, "阶段不能为空"),

    activityDataMethod: z.enum(entericActivityMethodOptions),

    apDirectHead: optionalPositiveNumber(),
    monthlyHeads: monthlyHeadsSchema,
    annualThroughputHead: optionalPositiveNumber(),
    daysAlive: z.preprocess(
      preprocessNumber,
      z.number().int().min(1, "天数至少为 1").max(365, "天数不能超过365").optional()
    ),

    method: z.enum(entericMethodOptions),
    emissionFactor: z.preprocess(
      preprocessNumber,
      z.number().min(0, "排放因子不能小于 0")
    ),

    dmiKgPerHeadDay: optionalPositiveNumber(),
    ymPercent: z.preprocess(
      preprocessNumber,
      z.number().min(0, "Ym不能小于 0").max(100, "Ym不能超过100").optional()
    ),

    parameterSourceType: parameterSourceTypeSchema.default("manual_input"),
    parameterSourceLabel: z
      .string()
      .trim()
      .max(200, "参数来源说明最多 200 字")
      .default("手工输入"),

    notes: z.string().max(300, "备注最多 300 字"),
  })
  .superRefine((row, ctx) => {
    if (row.activityDataMethod === "directAnnualAverage") {
      if (!row.apDirectHead || row.apDirectHead <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["apDirectHead"],
          message: "请填写年平均存栏",
        });
      }
    }

    if (row.activityDataMethod === "monthlyAverage") {
      const average =
        row.monthlyHeads.reduce((sum, value) => sum + value, 0) / 12;
      if (average <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthlyHeads"],
          message: "12个月平均存栏必须大于 0",
        });
      }
    }

    if (row.activityDataMethod === "shortCycleFormula") {
      if (!row.annualThroughputHead || row.annualThroughputHead <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["annualThroughputHead"],
          message: "请填写年度饲养量（NA）",
        });
      }
      if (!row.daysAlive || row.daysAlive <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daysAlive"],
          message: "请填写生长天数（DA）",
        });
      }
    }

    if (row.method === "defaultEF" || row.method === "measuredEF") {
      if (!row.emissionFactor || row.emissionFactor <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emissionFactor"],
          message: "请填写大于 0 的排放因子",
        });
      }
    }

    if (row.method === "calculatedEF") {
      if (!row.dmiKgPerHeadDay || row.dmiKgPerHeadDay <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dmiKgPerHeadDay"],
          message: "请填写 DMI",
        });
      }
      if (!row.ymPercent || row.ymPercent <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ymPercent"],
          message: "请填写 Ym",
        });
      }
    }
  });

export const entericCH4Schema = z.object({
  rows: z.array(entericCH4RowSchema).min(1, "请先录入至少一条肠道发酵数据"),
});

export type EntericCH4FormValues = z.infer<typeof entericCH4Schema>;