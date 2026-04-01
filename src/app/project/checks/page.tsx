'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadProjectDraft } from "@/lib/utils/projectDraftStorage";
import {
  runProjectChecks,
  type ProjectCheckItem,
} from "@/lib/utils/projectChecks";
import type { ProjectDraft } from "@/types/ghg";

function sectionTitle(severity: ProjectCheckItem["severity"]) {
  if (severity === "error") return "错误";
  if (severity === "warning") return "提醒";
  return "正常";
}

function sectionBadgeClass(severity: ProjectCheckItem["severity"]) {
  if (severity === "error") {
    return "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700";
  }
  if (severity === "warning") {
    return "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700";
  }
  return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700";
}

export default function ChecksPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  useEffect(() => {
    const loaded = loadProjectDraft();
    if (!loaded) return;
    setDraft(loaded);
  }, []);

  const checkResult = useMemo(() => {
    if (!draft) return null;
    return runProjectChecks(draft);
  }, [draft]);

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const readonlyClass =
    "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700";

  if (!draft || !checkResult) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">还没有可检查的项目草稿</h1>
            <p className="mt-3 text-slate-600">
              请先完成前面的模块录入，再进入质量检查页。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/project/new"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                去新建项目
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const grouped = {
    error: checkResult.items.filter((item) => item.severity === "error"),
    warning: checkResult.items.filter((item) => item.severity === "warning"),
    ok: checkResult.items.filter((item) => item.severity === "ok"),
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Quality Checks</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              数据完整性 / 质量检查
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{draft.base.enterpriseName || "未命名项目"} ·
              核算年度：{draft.base.year}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/results"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回总结果页
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回首页
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <section className={`${cardClass} xl:col-span-1`}>
            <h2 className="text-lg font-semibold">1. 检查结论</h2>

            <div className="mt-4 grid gap-4">
              <div className={readonlyClass}>
                错误：{checkResult.errorCount} 项
              </div>
              <div className={readonlyClass}>
                提醒：{checkResult.warningCount} 项
              </div>
              <div className={readonlyClass}>
                正常：{checkResult.okCount} 项
              </div>
              <div className={readonlyClass}>
                导出状态：
                {checkResult.isReadyForExport ? "可导出" : "建议先修正错误"}
              </div>
            </div>
          </section>

          <section className={`${cardClass} xl:col-span-3`}>
            <h2 className="text-lg font-semibold">2. 当前检查重点</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>1. 养殖活动页是否已形成完整的群体记录与 12 个月动态。</p>
              <p>2. 如果某群体选择“饲料台账反推 DMI”，是否已绑定对应的出库饲料记录。</p>
              <p>3. enteric 计算法是否已拿到有效 DMI 与 Ym。</p>
              <p>4. manure CH4 / N2O 的参数法路径，占比是否已闭合到 100%。</p>
            </div>
          </section>
        </div>

        {(["error", "warning", "ok"] as const).map((severity) => (
          <section key={severity} className={`${cardClass} mt-6`}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-semibold">{sectionTitle(severity)}</h2>
              <span className={sectionBadgeClass(severity)}>
                {grouped[severity].length} 项
              </span>
            </div>

            {grouped[severity].length === 0 ? (
              <p className="text-sm text-slate-500">暂无该类型项目。</p>
            ) : (
              <div className="space-y-4">
                {grouped[severity].map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={sectionBadgeClass(item.severity)}>
                        {sectionTitle(item.severity)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {item.section}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>

                    {item.link ? (
                      <div className="mt-4">
                        <Link
                          href={item.link}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                        >
                          前往处理
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/project/results"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            返回上一页
          </Link>

          <Link
            href="/project/report"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            去报告页
          </Link>
        </div>
      </div>
    </main>
  );
}