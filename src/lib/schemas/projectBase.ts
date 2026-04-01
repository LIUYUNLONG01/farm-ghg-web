import { z } from "zod";
import { REGION_OPTIONS } from "@/data/regionStandardOptions";

export const farmTypeOptions = [
  "奶牛场",
  "肉牛场",
  "羊场",
  "猪场",
  "蛋鸡场",
  "肉鸡场",
  "其他",
] as const;

export const projectBaseSchema = z.object({
  enterpriseName: z
    .string()
    .trim()
    .min(2, "企业名称至少 2 个字")
    .max(100, "企业名称最多 100 个字"),
  year: z.coerce
    .number()
    .int()
    .min(2020, "核算年度不能早于 2020")
    .max(2100, "核算年度不能晚于 2100"),
  region: z
    .string()
    .trim()
    .refine(
      (value) => (REGION_OPTIONS as readonly string[]).includes(value),
      "请选择标准化地区"
    ),
  farmType: z.enum(farmTypeOptions),
  standardVersion: z.enum(["NYT4243_2022", "GBT32151_22_2024"]),
  notes: z.string().max(500, "备注最多 500 字").default(""),
});

export type ProjectBaseFormValues = z.infer<typeof projectBaseSchema>;