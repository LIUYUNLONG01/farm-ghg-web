import { z } from "zod";

const optionalNonNegativeNumber = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    },
    z.number().min(0, `${label}不能为负`).optional()
  );

const optionalPositiveInteger = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    },
    z
      .number()
      .int(`${label}必须为整数`)
      .min(1, `${label}至少为 1`)
      .max(365, `${label}不能超过 365`)
      .optional()
  );

export const livestockRowSchema = z.object({
  species: z.string().trim().min(1, "请输入畜种"),
  stage: z.string().trim().min(1, "请输入阶段"),
  annualAverageHead: z.preprocess(
    (value) => Number(value),
    z.number().positive("年平均存栏必须大于 0")
  ),
  annualOutputHead: optionalNonNegativeNumber("年出栏量"),
  feedingDays: optionalPositiveInteger("饲养周期天数"),
});

export const livestockActivitySchema = z.object({
  rows: z.array(livestockRowSchema).min(1, "至少录入一条养殖活动数据"),
});

export type LivestockActivityFormValues = z.infer<
  typeof livestockActivitySchema
>;