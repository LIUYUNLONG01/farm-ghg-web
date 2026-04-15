'use client';

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

interface ProvinceStat {
  province: string;
  projectCount: number;
  totalCO2e: number;
  avgCO2e: number;
  farmTypes: Record<string, number>;
  projects: { name: string; co2e: number; farmType: string }[];
}

interface Props {
  stats: ProvinceStat[];
  totalProjects: number;
  totalCO2e: number;
  provinceCount: number;
}

type MetricKey = "projectCount" | "totalCO2e" | "avgCO2e";

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "projectCount", label: "项目数量", unit: "个" },
  { key: "totalCO2e", label: "总 CO₂e 排放量", unit: "tCO₂e" },
  { key: "avgCO2e", label: "平均排放量", unit: "tCO₂e" },
];

export default function MapChart({ stats, totalProjects, totalCO2e, provinceCount }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [metric, setMetric] = useState<MetricKey>("projectCount");
  const [selected, setSelected] = useState<ProvinceStat | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);

  // 加载中国地图 GeoJSON
  useEffect(() => {
    fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json")
      .then((res) => res.json())
      .then((geoJson) => {
        echarts.registerMap("china", geoJson);
        setGeoLoaded(true);
      })
      .catch(() => {
        // 降级：使用简化版
        setGeoLoaded(true);
      });
  }, []);

  // 渲染地图
  useEffect(() => {
    if (!geoLoaded || !chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;
    const currentMetric = METRICS.find((m) => m.key === metric)!;

    const mapData = stats.map((s) => ({
      name: s.province,
      value: s[metric],
      stat: s,
    }));

    const maxVal = Math.max(...mapData.map((d) => d.value), 1);

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; data?: { stat: ProvinceStat } };
          if (!p.data?.stat) return p.name + "：暂无数据";
          const s = p.data.stat;
          const topFarmType = Object.entries(s.farmTypes)
            .sort((a, b) => b[1] - a[1])[0];
          return `
            <div style="font-size:13px;line-height:1.8">
              <strong>${s.province}</strong><br/>
              项目数：${s.projectCount} 个<br/>
              总排放：${s.totalCO2e.toFixed(2)} tCO₂e<br/>
              平均排放：${s.avgCO2e.toFixed(2)} tCO₂e<br/>
              主要类型：${topFarmType ? topFarmType[0] : "-"}
            </div>
          `;
        },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        left: "left",
        bottom: 20,
        text: [String(maxVal.toFixed(0)), "0"],
        inRange: { color: ["#dcfce7", "#15803d"] },
        calculable: true,
        textStyle: { color: "#6b7280", fontSize: 11 },
      },
      series: [
        {
          name: currentMetric.label,
          type: "map",
          map: "china",
          roam: true,
          emphasis: {
            label: { show: true, fontSize: 11 },
            itemStyle: { areaColor: "#bbf7d0" },
          },
          select: {
            itemStyle: { areaColor: "#86efac" },
          },
          itemStyle: {
            borderColor: "#e5e7eb",
            borderWidth: 0.5,
            areaColor: "#f9fafb",
          },
          data: mapData,
        },
      ],
    };

    chart.setOption(option);

    chart.off("click");
    chart.on("click", (params: unknown) => {
      const p = params as { data?: { stat: ProvinceStat } };
      if (p.data?.stat) {
        setSelected(p.data.stat);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoLoaded, stats, metric]);

  return (
    <div className="space-y-4">
      {/* 汇总指标卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总项目数", value: totalProjects, unit: "个" },
          { label: "覆盖省份", value: provinceCount, unit: "个" },
          { label: "总 CO₂e", value: totalCO2e.toFixed(1), unit: "tCO₂e" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-green-700">{card.value}</div>
            <div className="text-xs text-green-600 mt-0.5">{card.label}（{card.unit}）</div>
          </div>
        ))}
      </div>

      {/* 指标切换 */}
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              metric === m.key
                ? "bg-green-700 text-white"
                : "border border-green-100 text-green-700 hover:bg-green-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* 地图 */}
        <div className="flex-1 rounded-xl border border-green-100 bg-white overflow-hidden">
          {!geoLoaded ? (
            <div className="h-[500px] flex items-center justify-center text-gray-400 text-sm">
              地图加载中...
            </div>
          ) : (
            <div ref={chartRef} style={{ height: "500px", width: "100%" }} />
          )}
        </div>

        {/* 省份详情 */}
        {selected && (
          <div className="w-56 rounded-xl border border-green-100 bg-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">{selected.province}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>项目数</span>
                <span className="font-medium text-gray-900">{selected.projectCount} 个</span>
              </div>
              <div className="flex justify-between">
                <span>总排放</span>
                <span className="font-medium text-gray-900">{selected.totalCO2e.toFixed(2)} t</span>
              </div>
              <div className="flex justify-between">
                <span>平均排放</span>
                <span className="font-medium text-gray-900">{selected.avgCO2e.toFixed(2)} t</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-green-50">
              <div className="text-xs font-medium text-gray-500 mb-2">养殖场类型</div>
              {Object.entries(selected.farmTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{type}</span>
                  <span className="font-medium">{count} 个</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-green-50">
              <div className="text-xs font-medium text-gray-500 mb-2">项目列表</div>
              {selected.projects.map((p, i) => (
                <div key={i} className="text-xs text-gray-600 mb-1 truncate" title={p.name}>
                  · {p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
