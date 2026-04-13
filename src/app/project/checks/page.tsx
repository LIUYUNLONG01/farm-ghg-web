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
    return "rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700";
  }
  if (severity === "warning") {
    return "rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700";
  }
  return "rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700";
}

function severityIcon(severity: ProjectCheckItem["severity"]) {
  if (severity === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-500 flex-shrink-0">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (severity === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-amber-500 flex-shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-green-600 flex-shrink-0">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
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

  if (!draft || !checkResult) {
    return (
      <main className="min-h-screen bg-gray-50 font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
            </div>
            养殖场碳核算平台
          </div>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </nav>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-amber-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">还没有可检查的项目草稿</h1>
            <p className="mt-3 text-sm text-gray-500 leading-7">请先完成前面的模块录入，再进入质量检查页。</p>
            <div className="mt-6 flex gap-3">
              <Link href="/project/new" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition">去新建项目</Link>
              <Link href="/" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 hover:bg-green-50 transition">返回首页</Link>
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
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" /></svg>
          </div>
          养殖场碳核算平台
        </div>
        <div className="flex gap-2">
          <Link href="/project/results" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回总结果页</Link>
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            Quality Checks
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">数据完整性 / 质量检查</h1>
          <p className="mt-2 text-sm text-gray-400 leading-7">
            当前项目：{draft.base.enterpriseName || "未命名项目"} · 核算年度：{draft.base.year}
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">错误</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{checkResult.errorCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">项</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">提醒</div>
            <div className="mt-2 text-2xl font-bold text-amber-500">{checkResult.warningCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">项</div>
          </div>
          <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">正常</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{checkResult.okCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">项</div>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${checkResult.isReadyForExport ? "border-green-200 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">导出状态</div>
            <div className={`mt-2 text-sm font-semibold ${checkResult.isReadyForExport ? "text-green-700" : "text-amber-700"}`}>
              {checkResult.isReadyForExport ? "可导出" : "建议先修正错误"}
            </div>
          </div>
        </div>

        {/* CHECK FOCUS */}
        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">当前检查重点</h2>
          <div className="space-y-2 text-[13px] text-gray-600 leading-7">
            <p>1. 养殖活动页是否已形成完整的群体记录与 12 个月动态。</p>
            <p>2. 如果某群体选择「饲料台账反推 DMI」，是否已绑定对应的出库饲料记录。</p>
            <p>3. enteric 计算法是否已拿到有效 DMI 与 Ym。</p>
            <p>4. manure CH₄ / N₂O 的参数法路径，占比是否已闭合到 100%。</p>
          </div>
        </div>

        {/* CHECK GROUPS */}
        {(["error", "warning", "ok"] as const).map((severity) => (
          <section key={severity} className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm mb-5">
            <div className="flex items-center gap-3 mb-5">
              {severityIcon(severity)}
              <h2 className="text-base font-semibold text-gray-900">{sectionTitle(severity)}</h2>
              <span className={sectionBadgeClass(severity)}>{grouped[severity].length} 项</span>
            </div>

            {grouped[severity].length === 0 ? (
              <p className="text-[13px] text-gray-400">暂无该类型项目。</p>
            ) : (
              <div className="space-y-3">
                {grouped[severity].map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 hover:bg-white hover:border-green-100 transition">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={sectionBadgeClass(item.severity)}>{sectionTitle(item.severity)}</span>
                      <span className="text-[11px] text-gray-400 font-medium">{item.section}</span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-1.5 text-[13px] text-gray-500 leading-6">{item.detail}</p>
                    {item.link ? (
                      <div className="mt-3">
                        <Link href={item.link} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-green-200 bg-white text-green-700 font-medium hover:bg-green-50 transition">
                          前往处理 →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* BOTTOM ACTIONS */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/project/results" className="px-5 py-2.5 rounded-xl border border-green-100 bg-white text-sm font-medium text-green-800 shadow-sm hover:bg-green-50 transition">返回上一页</Link>
          <Link href="/project/report" className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 transition">去报告页 →</Link>
        </div>
      </div>
    </main>
  );
}