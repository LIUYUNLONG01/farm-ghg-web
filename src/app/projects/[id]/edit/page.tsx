'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const modules = [
  { name: "基础信息", path: "new", desc: "企业信息、核算年度、标准版本" },
  { name: "养殖活动数据", path: "livestock", desc: "群体定义、月度动态、饲料台账" },
  { name: "肠道发酵 CH₄", path: "enteric", desc: "推荐因子法、计算法、实测法" },
  { name: "粪污管理 CH₄", path: "manure-ch4", desc: "区域化推荐因子法、参数法" },
  { name: "粪污管理 N₂O", path: "manure-n2o", desc: "区域化推荐因子法、参数法" },
  { name: "能源与电力热力", path: "energy", desc: "化石燃料、购入/输出电力热力" },
  { name: "结果与检查", path: "results", desc: "汇总结果、数据质量检查" },
  { name: "核算报告", path: "report", desc: "报告预览与导出" },
];

export default function ProjectEditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project) {
          setProjectName(data.project.name);
          // 把 projectId 存到 sessionStorage，供各核算页面读取
          sessionStorage.setItem("currentProjectId", projectId);
        } else {
          router.push("/projects");
        }
      });
  }, [projectId, router]);

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <Link href="/projects" className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          我的项目
        </Link>
        <span className="text-sm text-gray-500 truncate max-w-xs">{projectName}</span>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-gray-900">{projectName}</h1>
          <p className="mt-1 text-sm text-gray-400">选择模块开始核算</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module, index) => (
            <Link
              key={module.path}
              href={`/project/${module.path}?projectId=${projectId}`}
              className="group rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-green-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-semibold text-green-600">
                    {index + 1}
                  </div>
                  <h3 className="text-[14px] font-semibold text-gray-900">{module.name}</h3>
                </div>
                <span className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md border border-green-100 text-green-600 font-medium group-hover:bg-green-50 group-hover:border-green-400 transition">
                  进入 →
                </span>
              </div>
              <p className="mt-2 ml-10 text-[12px] leading-6 text-gray-400">{module.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
