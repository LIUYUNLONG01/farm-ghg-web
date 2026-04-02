import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export const farmTypeOptions = [
  "奶牛场",
  "肉牛场",
  "羊场",
  "猪场",
  "蛋鸡场",
  "肉鸡场",
  "其他",
] as const;

export const standardVersionOptions = [
  "NYT4243_2022",
  "GBT32151_22_2024",
] as const;

export const farmTypeSchema = z.enum(farmTypeOptions);
export const standardVersionSchema = z.enum(standardVersionOptions);

export const projectBaseSchema = z.object({
  enterpriseName: z.string().trim().min(1, "请输入企业名称"),
  year: z.preprocess(
    preprocessNumber,
    z
      .number({
        error: "核算年度必须为数字",
      })
      .int("核算年度必须为整数")
      .min(2000, "核算年度不能早于 2000")
      .max(2100, "核算年度不能晚于 2100")
  ),
  region: z.string().trim().min(1, "请选择地区"),
  farmType: farmTypeSchema,
  standardVersion: standardVersionSchema,
  notes: z.string().default(""),
});

export type ProjectBaseFormInput = z.input<typeof projectBaseSchema>;
export type ProjectBaseFormValues = z.output<typeof projectBaseSchema>;