'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapChart = dynamic(() => import("./MapChart"), { ssr: false });

interface StatData {
  stats: {
    province: string;
    projectCount: number;
    totalCO2e: number;
    avgCO2e: number;
    farmTypes: Record<string, number>;
    projects: { name: string; co2e: number; farmType: string }[];
  }[];
  totalProjects: number;
  totalCO2e: number;
  provinceCount: number;
}

export default function AdminMapSection() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
        加载统计数据中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
        数据加载失败
      </div>
    );
  }

  return (
    <MapChart
      stats={data.stats}
      totalProjects={data.totalProjects}
      totalCO2e={data.totalCO2e}
      provinceCount={data.provinceCount}
    />
  );
}
