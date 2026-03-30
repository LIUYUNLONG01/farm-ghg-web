'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadProjectDraft } from "@/lib/utils/projectDraftStorage";
import type { LivestockRecord } from "@/types/ghg";

export default function ManureCH4Page() {
  const [projectName, setProjectName] = useState("");
  const [livestockRows, setLivestockRows] = useState<LivestockRecord[]>([]);

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");
    setLivestockRows(draft.livestock ?? []);
  }, []);

  if (livestockRows.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有养殖活动数据</h1>
            <p className="mt-3 text-slate-600">
              先完成“基础信息”和“养殖活动数据”这两步，再进入粪污管理 CH4 模块。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/project/new"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                回到基础信息
              </Link>
              <Link
                href="/project/livestock"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                去录入养殖活动
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Manure CH4</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              粪污管理 CH4
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/enteric"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回肠道发酵 CH4
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回首页
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">1. 当前已连接的养殖活动数据</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="border-b border-slate-200 px-3 py-2">序号</th>
                    <th className="border-b border-slate-200 px-3 py-2">畜种</th>
                    <th className="border-b border-slate-200 px-3 py-2">阶段</th>
                    <th className="border-b border-slate-200 px-3 py-2">年平均存栏</th>
                    <th className="border-b border-slate-200 px-3 py-2">年出栏量</th>
                    <th className="border-b border-slate-200 px-3 py-2">饲养周期天数</th>
                  </tr>
                </thead>
                <tbody>
                  {livestockRows.map((row, index) => (
                    <tr key={`${row.species}-${row.stage}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {index + 1}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.species}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.stage}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.annualAverageHead}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.annualOutputHead ?? "-"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        {row.feedingDays ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">2. 本页下一步要做什么</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. 为每条畜种记录录入粪污管理方式</li>
              <li>2. 录入各管理方式占比</li>
              <li>3. 录入或调用 MCF、B₀、VS 等参数</li>
              <li>4. 计算粪污管理 CH4 预览值</li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/project/enteric"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回上一页
            </Link>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-400"
            >
              下一步：录入粪污管理方式（下一轮开发）
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}