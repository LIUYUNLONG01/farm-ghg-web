export const REGION_OPTIONS = [
  "北京",
  "天津",
  "河北",
  "内蒙古",
  "山西",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆",
] as const;

export type ProvinceOption = (typeof REGION_OPTIONS)[number];

export const REGION_GROUPS: Record<
  "华北" | "东北" | "华东" | "中南" | "西南" | "西北",
  readonly ProvinceOption[]
> = {
  华北: ["北京", "天津", "河北", "内蒙古", "山西"],
  东北: ["辽宁", "吉林", "黑龙江"],
  华东: ["上海", "江苏", "浙江", "安徽", "福建", "江西", "山东"],
  中南: ["河南", "湖北", "湖南", "广东", "广西", "海南"],
  西南: ["重庆", "四川", "贵州", "云南", "西藏"],
  西北: ["陕西", "甘肃", "青海", "宁夏", "新疆"],
};

const PROVINCE_ALIASES: Record<ProvinceOption, string[]> = {
  北京: ["北京", "北京市"],
  天津: ["天津", "天津市"],
  河北: ["河北", "河北省"],
  内蒙古: ["内蒙古", "内蒙古自治区"],
  山西: ["山西", "山西省"],
  辽宁: ["辽宁", "辽宁省"],
  吉林: ["吉林", "吉林省"],
  黑龙江: ["黑龙江", "黑龙江省"],
  上海: ["上海", "上海市"],
  江苏: ["江苏", "江苏省"],
  浙江: ["浙江", "浙江省"],
  安徽: ["安徽", "安徽省"],
  福建: ["福建", "福建省"],
  江西: ["江西", "江西省"],
  山东: ["山东", "山东省"],
  河南: ["河南", "河南省"],
  湖北: ["湖北", "湖北省"],
  湖南: ["湖南", "湖南省"],
  广东: ["广东", "广东省"],
  广西: ["广西", "广西壮族自治区"],
  海南: ["海南", "海南省"],
  重庆: ["重庆", "重庆市"],
  四川: ["四川", "四川省"],
  贵州: ["贵州", "贵州省"],
  云南: ["云南", "云南省"],
  西藏: ["西藏", "西藏自治区"],
  陕西: ["陕西", "陕西省"],
  甘肃: ["甘肃", "甘肃省"],
  青海: ["青海", "青海省"],
  宁夏: ["宁夏", "宁夏回族自治区"],
  新疆: ["新疆", "新疆维吾尔自治区"],
};

export function normalizeProvinceName(
  input: string | undefined | null
): ProvinceOption | undefined {
  if (!input) return undefined;
  const text = input.trim();

  for (const province of REGION_OPTIONS) {
    const aliases = PROVINCE_ALIASES[province];
    if (aliases.some((alias) => text.includes(alias))) {
      return province;
    }
  }

  return undefined;
}

export function getRegionGroupByProvince(
  province: ProvinceOption | string | undefined | null
): keyof typeof REGION_GROUPS | undefined {
  if (!province) return undefined;

  const normalized =
    typeof province === "string" ? normalizeProvinceName(province) : province;

  if (!normalized) return undefined;

  for (const [group, provinces] of Object.entries(REGION_GROUPS)) {
    if ((provinces as readonly string[]).includes(normalized)) {
      return group as keyof typeof REGION_GROUPS;
    }
  }

  return undefined;
}