import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// 省份名称标准化（把简称映射到全称）
const provinceMap: Record<string, string> = {
  "北京": "北京市", "天津": "天津市", "上海": "上海市", "重庆": "重庆市",
  "河北": "河北省", "山西": "山西省", "辽宁": "辽宁省", "吉林": "吉林省",
  "黑龙江": "黑龙江省", "江苏": "江苏省", "浙江": "浙江省", "安徽": "安徽省",
  "福建": "福建省", "江西": "江西省", "山东": "山东省", "河南": "河南省",
  "湖北": "湖北省", "湖南": "湖南省", "广东": "广东省", "海南": "海南省",
  "四川": "四川省", "贵州": "贵州省", "云南": "云南省", "陕西": "陕西省",
  "甘肃": "甘肃省", "青海": "青海省", "内蒙古": "内蒙古自治区",
  "广西": "广西壮族自治区", "西藏": "西藏自治区", "宁夏": "宁夏回族自治区",
  "新疆": "新疆维吾尔自治区", "香港": "香港特别行政区", "澳门": "澳门特别行政区",
  "台湾": "台湾省",
};

function normalizeProvince(region: string): string {
  if (!region) return "未知";
  for (const [short, full] of Object.entries(provinceMap)) {
    if (region.startsWith(short)) return full;
  }
  return region;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const projects = await db.project.findMany({
    select: { id: true, name: true, data: true },
  });

  // 按省份聚合
  const provinceStats: Record<string, {
    province: string;
    projectCount: number;
    totalCO2e: number;
    farmTypes: Record<string, number>;
    projects: { name: string; co2e: number; farmType: string }[];
  }> = {};

  for (const project of projects) {
    const data = project.data as Record<string, unknown>;
    if (!data) continue;

    const base = data.base as Record<string, unknown> | undefined;
    const region = (base?.region as string) || "未知";
    const farmType = (base?.farmType as string) || "其他";
    const province = normalizeProvince(region);

    // 读取总排放量（从 projectSummary 计算结果）
    // 这里简化处理：从 data 里读取已保存的汇总值
    // 实际项目中可以重新计算
    let co2e = 0;
    const summary = data.summary as Record<string, unknown> | undefined;
    if (summary?.totalCO2eTPerYear) {
      co2e = Number(summary.totalCO2eTPerYear) || 0;
    }

    if (!provinceStats[province]) {
      provinceStats[province] = {
        province,
        projectCount: 0,
        totalCO2e: 0,
        farmTypes: {},
        projects: [],
      };
    }

    provinceStats[province].projectCount += 1;
    provinceStats[province].totalCO2e += co2e;
    provinceStats[province].farmTypes[farmType] =
      (provinceStats[province].farmTypes[farmType] || 0) + 1;
    provinceStats[province].projects.push({
      name: project.name,
      co2e,
      farmType,
    });
  }

  const stats = Object.values(provinceStats).map((s) => ({
    ...s,
    avgCO2e: s.projectCount > 0 ? s.totalCO2e / s.projectCount : 0,
  }));

  return NextResponse.json({
    stats,
    totalProjects: projects.length,
    totalCO2e: stats.reduce((sum, s) => sum + s.totalCO2e, 0),
    provinceCount: stats.length,
  });
}
