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

function requiredPositiveNumber(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({
        required_error: `请输入${label}`,
        invalid_type_error: `${label}必须为数字`,
      })
      .positive(`${label}必须大于 0`)
  );
}

function requiredNonNegativeNumber(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({
        required_error: `请输入${label}`,
        invalid_type_error: `${label}必须为数字`,
      })
      .min(0, `${label}不能小于 0`)
  );
}

function requiredPercent(label: string, allowZero = false) {
  let schema = z.preprocess(
    preprocessNumber,
    z.number({
      required_error: `请输入${label}`,
      invalid_type_error: `${label}必须为数字`,
    })
  );

  schema = allowZero
    ? schema.refine((value) => value >= 0, `${label}不能小于 0`)
    : schema.refine((value) => value > 0, `${label}必须大于 0`);

  return schema.refine((value) => value <= 100, `${label}不能超过 100`);
}

export const manureN2ORowSchema = z.object({
  sourceLivestockIndex: requiredInteger("来源索引"),
  species: z.string().trim().min(1, "畜种不能为空"),
  stage: z.string().trim().min(1, "阶段不能为空"),
  method: z.literal("manualInput"),
  managementSystem: z.string().trim().min(1, "请输入管理方式"),
  sharePercent: requiredPercent("管理方式占比"),
  nexKgNPerHeadYear: requiredPositiveNumber("Nex"),
  ef3KgN2ONPerKgN: requiredNonNegativeNumber("EF3"),
  notes: z.string().max(300, "备注最多 300 字"),
});

export const manureN2OSchema = z.object({
  rows: z.array(manureN2ORowSchema).min(1, "请至少录入一条粪污管理 N2O 数据"),
});

export type ManureN2OFormValues = z.infer<typeof manureN2OSchema>;