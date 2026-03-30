import { z } from "zod";

function booleanField() {
  return z.preprocess(
    (value) => value === true || value === "true",
    z.boolean()
  );
}

export const entericMethodOptions = ["defaultEF", "customEF"] as const;
export const parameterSourceOptions = ["defaultLibrary", "manual"] as const;

export const entericCH4RowSchema = z.object({
  sourceLivestockIndex: z.number().int().min(0),
  species: z.string().trim().min(1, "畜种不能为空"),
  stage: z.string().trim().min(1, "阶段不能为空"),
  method: z.enum(entericMethodOptions),
  emissionFactor: z.number().positive("请输入大于 0 的排放因子"),
  parameterSource: z.enum(parameterSourceOptions),
  parameterSourceLabel: z.string().trim().min(1, "参数来源标签不能为空"),
  isOverridden: booleanField(),
  notes: z.string().max(300, "备注最多 300 字"),
});

export const entericCH4Schema = z.object({
  rows: z.array(entericCH4RowSchema).min(1, "请先录入至少一条养殖活动数据"),
});

export type EntericCH4FormValues = z.infer<typeof entericCH4Schema>;