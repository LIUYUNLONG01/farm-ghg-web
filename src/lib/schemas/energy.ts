import { z } from "zod";

function preprocessNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function booleanField() {
  return z.preprocess(
    (value) => value === true || value === "true",
    z.boolean()
  );
}

function requiredNonNegativeNumber(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({
        error: `${label}必须为数字`,
      })
      .min(0, `${label}不能小于 0`)
  );
}

function requiredZeroToOne(label: string) {
  return z.preprocess(
    preprocessNumber,
    z
      .number({
        error: `${label}必须为数字`,
      })
      .min(0, `${label}不能小于 0`)
      .max(1, `${label}不能大于 1`)
  );
}

export const fuelRowSchema = z.object({
  fuelType: z.string().trim().min(1, "请输入燃料种类"),
  consumptionAmount: requiredNonNegativeNumber("消耗量"),
  ncvTJPerUnit: requiredNonNegativeNumber("低位发热量"),
  carbonContentTonCPerTJ: requiredNonNegativeNumber("单位热值含碳量"),
  oxidationFactor: requiredZeroToOne("碳氧化率"),
  parameterSource: z.enum(["fuelPreset", "manual"]),
  parameterSourceLabel: z.string().trim().min(1, "参数来源标签不能为空"),
  isOverridden: booleanField(),
  notes: z.string().max(300, "备注最多 300 字").default(""),
});

export const energyBalanceSchema = z.object({
  purchasedElectricityMWh: requiredNonNegativeNumber("购入电力"),
  purchasedElectricityEFtCO2PerMWh: requiredNonNegativeNumber("购入电力排放因子"),
  purchasedHeatGJ: requiredNonNegativeNumber("购入热力"),
  purchasedHeatEFtCO2PerGJ: requiredNonNegativeNumber("购入热力排放因子"),
  exportedElectricityMWh: requiredNonNegativeNumber("输出电力"),
  exportedElectricityEFtCO2PerMWh: requiredNonNegativeNumber("输出电力排放因子"),
  exportedHeatGJ: requiredNonNegativeNumber("输出热力"),
  exportedHeatEFtCO2PerGJ: requiredNonNegativeNumber("输出热力排放因子"),
});

export const energyModuleSchema = z.object({
  fuelRows: z.array(fuelRowSchema),
  energyBalance: energyBalanceSchema,
});

export type EnergyModuleFormInput = z.input<typeof energyModuleSchema>;
export type EnergyModuleFormValues = z.output<typeof energyModuleSchema>;