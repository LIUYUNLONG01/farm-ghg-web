export interface FuelPreset {
  id: string;
  label: string;
  fuelType: string;
  unitHint: string;
  ncvTJPerUnit: number;
  carbonContentTonCPerTJ: number;
  oxidationFactor: number;
  note: string;
}

/**
 * 这是一组“可运行的起始模板”。
 * 目的是让页面支持一键带入常见燃料参数。
 * 你后续只需要核对并替换这里的数值，不需要改页面逻辑。
 */
export const fuelPresetLibrary: FuelPreset[] = [
  {
    id: "diesel_liter",
    label: "柴油（按升）",
    fuelType: "柴油",
    unitHint: "L",
    ncvTJPerUnit: 0.00003595,
    carbonContentTonCPerTJ: 20.2,
    oxidationFactor: 0.98,
    note: "起始模板：柴油按升计。",
  },
  {
    id: "gasoline_liter",
    label: "汽油（按升）",
    fuelType: "汽油",
    unitHint: "L",
    ncvTJPerUnit: 0.00003420,
    carbonContentTonCPerTJ: 18.9,
    oxidationFactor: 0.98,
    note: "起始模板：汽油按升计。",
  },
  {
    id: "natural_gas_nm3",
    label: "天然气（按 Nm³）",
    fuelType: "天然气",
    unitHint: "Nm³",
    ncvTJPerUnit: 0.00003800,
    carbonContentTonCPerTJ: 15.3,
    oxidationFactor: 0.99,
    note: "起始模板：天然气按标方计。",
  },
  {
    id: "raw_coal_tonne",
    label: "原煤（按吨）",
    fuelType: "原煤",
    unitHint: "t",
    ncvTJPerUnit: 0.02090,
    carbonContentTonCPerTJ: 25.8,
    oxidationFactor: 0.94,
    note: "起始模板：原煤按吨计。",
  },
];