'use client';

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { ProjectSummaryResult } from "@/lib/calculators/projectSummary";

interface Props {
  summary: ProjectSummaryResult;
}

const GREEN_PALETTE = [
  "#15803d", "#16a34a", "#22c55e", "#4ade80",
  "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4",
];

export default function EmissionCharts({ summary }: Props) {
  const pieRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const gasRef = useRef<HTMLDivElement>(null);

  const pieChart = useRef<echarts.ECharts | null>(null);
  const barChart = useRef<echarts.ECharts | null>(null);
  const gasChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!pieRef.current || !barRef.current || !gasRef.current) return;

    // 初始化
    pieChart.current = echarts.init(pieRef.current);
    barChart.current = echarts.init(barRef.current);
    gasChart.current = echarts.init(gasRef.current);

    // 过滤掉负值模块（沼气回收减项单独处理）
    const positiveModules = summary.modules.filter((m) => m.co2eTPerYear > 0);
    const totalPositive = positiveModules.reduce((sum, m) => sum + m.co2eTPerYear, 0);

    // ── 饼图：各模块占比 ──
    pieChart.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>${p.value.toFixed(2)} tCO₂e<br/>${p.percent.toFixed(1)}%`;
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        textStyle: { fontSize: 11, color: "#6b7280" },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "42%"],
          data: positiveModules.map((m, i) => ({
            name: m.name,
            value: parseFloat(m.co2eTPerYear.toFixed(3)),
            itemStyle: { color: GREEN_PALETTE[i % GREEN_PALETTE.length] },
          })),
          label: { show: false },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.1)" },
          },
        },
      ],
    });

    // ── 柱状图：各模块排放量对比 ──
    barChart.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }[];
          return `${p[0].name}<br/>${p[0].value.toFixed(3)} tCO₂e/yr`;
        },
      },
      grid: { left: 20, right: 20, bottom: 60, top: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: positiveModules.map((m) => m.name),
        axisLabel: {
          fontSize: 10,
          color: "#6b7280",
          rotate: 20,
          interval: 0,
        },
        axisLine: { lineStyle: { color: "#e5e7eb" } },
      },
      yAxis: {
        type: "value",
        name: "tCO₂e/yr",
        nameTextStyle: { fontSize: 10, color: "#9ca3af" },
        axisLabel: { fontSize: 10, color: "#9ca3af" },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: [
        {
          type: "bar",
          data: positiveModules.map((m, i) => ({
            value: parseFloat(m.co2eTPerYear.toFixed(3)),
            itemStyle: {
              color: GREEN_PALETTE[i % GREEN_PALETTE.length],
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 48,
        },
      ],
    });

    // ── 气体构成图：CH₄/N₂O/CO₂ 比例 ──
    const ch4CO2e = summary.totalCH4TPerYear * summary.gwpCH4;
    const n2oCO2e = summary.totalN2OTPerYear * summary.gwpN2O;
    const co2CO2e = summary.totalCO2TPerYear;
    const gasTotal = ch4CO2e + n2oCO2e + co2CO2e;

    gasChart.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>${p.value.toFixed(2)} tCO₂e<br/>${p.percent.toFixed(1)}%`;
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        textStyle: { fontSize: 11, color: "#6b7280" },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "42%"],
          data: [
            { name: "CH₄", value: parseFloat(ch4CO2e.toFixed(3)), itemStyle: { color: "#15803d" } },
            { name: "N₂O", value: parseFloat(n2oCO2e.toFixed(3)), itemStyle: { color: "#0891b2" } },
            { name: "CO₂", value: parseFloat(co2CO2e.toFixed(3)), itemStyle: { color: "#d97706" } },
          ].filter((d) => d.value > 0),
          label: { show: false },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.1)" },
          },
        },
      ],
    });

    const handleResize = () => {
      pieChart.current?.resize();
      barChart.current?.resize();
      gasChart.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      pieChart.current?.dispose();
      barChart.current?.dispose();
      gasChart.current?.dispose();
    };
  }, [summary]);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 饼图 */}
      <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-green-600 tracking-widest uppercase mb-3">
          各模块排放占比
        </div>
        <div ref={pieRef} style={{ height: 280 }} />
      </div>

      {/* 柱状图 */}
      <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-green-600 tracking-widest uppercase mb-3">
          各模块排放量对比
        </div>
        <div ref={barRef} style={{ height: 280 }} />
      </div>

      {/* 气体构成图 */}
      <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-green-600 tracking-widest uppercase mb-3">
          气体构成（CO₂e）
        </div>
        <div ref={gasRef} style={{ height: 280 }} />
      </div>
    </div>
  );
}
