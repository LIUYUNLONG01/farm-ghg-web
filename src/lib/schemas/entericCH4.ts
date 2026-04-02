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

const activityDataMethodSchema = z.enum([
  "annualAveragePopulation",
  "monthlyAveragePopulation",
  "turnoverCalculation",
]);

const entericMethodSchema = z.enum([
  "defaultEF",
  "calculatedEF",
  "measuredEF",
]);

export const entericCH4RowSchema = z
  .object({
    sourceLivestockIndex: requiredInteger("来源索引"),
    species: z.string().trim().min(1, "畜种不能为空"),
    stage: z.string().trim().min(1, "阶段不能为空"),

    activityDataMethod: activityDataMethodSchema,

    annualAveragePopulation: optionalNonNegativeNumber(),

    janHead: optionalNonNegativeNumber(),
    febHead: optionalNonNegativeNumber(),
    marHead: optionalNonNegativeNumber(),
    aprHead: optionalNonNegativeNumber(),
    mayHead: optionalNonNegativeNumber(),
    junHead: optionalNonNegativeNumber(),
    julHead: optionalNonNegativeNumber(),
    augHead: optionalNonNegativeNumber(),
    sepHead: optionalNonNegativeNumber(),
    octHead: optionalNonNegativeNumber(),
    novHead: optionalNonNegativeNumber(),
    decHead: optionalNonNegativeNumber(),

    annualThroughput: optionalNonNegativeNumber(),
    daysAlive: optionalNonNegativeNumber(),

    method: entericMethodSchema,

    emissionFactor: optionalNonNegativeNumber(),
    dmiKgPerHeadDay: optionalNonNegativeNumber(),
    ymPercent: optionalNonNegativeNumber(),
    geMJPerHeadDay: optionalNonNegativeNumber(),

    parameterSourceType: parameterSourceTypeSchema.default("manual_input"),
    parameterSourceLabel: z
      .string()
      .trim()
      .max(200, "参数来源说明最多 200 字")
      .default("手工输入"),
    notes: z.string().max(300, "备注最多 300 字").default(""),
  })
  .superRefine((row, ctx) => {
    if (row.activityDataMethod === "annualAveragePopulation") {
      if (!row.annualAveragePopulation || row.annualAveragePopulation <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["annualAveragePopulation"],
          message: "直接录入 AP 时，年平均存栏必须大于 0",
        });
      }
    }

    if (row.activityDataMethod === "monthlyAveragePopulation") {
      const monthValues = [
        row.janHead,
        row.febHead,
        row.marHead,
        row.aprHead,
        row.mayHead,
        row.junHead,
        row.julHead,
        row.augHead,
        row.sepHead,
        row.octHead,
        row.novHead,
        row.decHead,
      ];
      const total = monthValues.reduce<number>(
        (sum, item) => sum + Number(item ?? 0),
        0
      );

      if (total <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["janHead"],
          message: "月度存栏总和必须大于 0",
        });
      }
    }

    if (row.activityDataMethod === "turnoverCalculation") {
      if (!row.annualThroughput || row.annualThroughput <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["annualThroughput"],
          message: "短生长期动物需要填写年度饲养量",
        });
      }
      if (!row.daysAlive || row.daysAlive <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daysAlive"],
          message: "短生长期动物需要填写生长天数",
        });
      }
    }

    if (row.method === "defaultEF" || row.method === "measuredEF") {
      if (!row.emissionFactor || row.emissionFactor <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emissionFactor"],
          message: "推荐因子法或实测法下，EF 必须大于 0",
        });
      }
    }

    if (row.method === "calculatedEF") {
      if (!row.dmiKgPerHeadDay || row.dmiKgPerHeadDay <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dmiKgPerHeadDay"],
          message: "计算法下，DMI 必须大于 0",
        });
      }
      if (!row.ymPercent || row.ymPercent <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ymPercent"],
          message: "计算法下，Ym 必须大于 0",
        });
      }
    }
  });

export const entericCH4Schema = z.object({
  rows: z.array(entericCH4RowSchema).min(1, "请至少录入一条肠道发酵数据"),
});

export type EntericCH4FormInput = z.input<typeof entericCH4Schema>;
export type EntericCH4FormValues = z.output<typeof entericCH4Schema>;