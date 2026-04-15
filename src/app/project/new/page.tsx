'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { standardOptions } from "@/data/standardOptions";
import {
  REGION_OPTIONS,
  getRegionGroupByProvince,
  normalizeProvinceName,
} from "@/data/regionStandardOptions";
import {
  farmTypeOptions,
  projectBaseSchema,
  type ProjectBaseFormInput,
  type ProjectBaseFormValues,
} from "@/lib/schemas/projectBase";
import {
  loadProjectDraft,
  saveProjectDraft,
} from "@/lib/utils/projectDraftStorage";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";

export default function NewProjectPage() {
  const currentYear = new Date().getFullYear();
  const [statusMessage, setStatusMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ProjectBaseFormInput, unknown, ProjectBaseFormValues>({
    resolver: zodResolver(projectBaseSchema),
    defaultValues: {
      enterpriseName: "",
      year: currentYear,
      region: "北京",
      farmType: "奶牛场",
      standardVersion: "NYT4243_2022",
      notes: "",
    },
  });

  useEffect(() => {
    (async () => {
    const draft = await loadProjectDraft();
    if (!draft) return;

    const normalizedRegion = normalizeProvinceName(draft.base.region) ?? "北京";

    reset({
      enterpriseName: draft.base.enterpriseName,
      year: draft.base.year,
      region: normalizedRegion,
      farmType: draft.base.farmType,
      standardVersion: draft.base.standardVersion,
      notes: draft.base.notes ?? "",
    });

    if (draft.base.region !== normalizedRegion) {
      setStatusMessage(`已加载本地草稿，并将地区从"${draft.base.region}"规范为"${normalizedRegion}"。`);
    } else {
      setStatusMessage("已加载浏览器中的本地草稿。");
    }
    })();
  }, [reset]);

  const selectedStandard = watch("standardVersion");
  const selectedRegion = watch("region");
  const watchedValues = watch();

  const autoSaveStatus = useAutoSave(
    watchedValues,
    async (values) => {
      const result = projectBaseSchema.safeParse(values);
      if (result.success) {
        await saveProjectDraft(result.data);
      }
    },
    2000
  );
  const selectedStandardLabel = standardOptions.find((item) => item.value === selectedStandard)?.label ?? "未选择";
  const selectedRegionGroup = getRegionGroupByProvince(selectedRegion) ?? "未识别区域组";

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
  const errorClass = "mt-1.5 text-xs text-red-500";

  const onSubmit = (values: ProjectBaseFormValues) => {
    saveProjectDraft(values);
    setStatusMessage("已保存基础信息到浏览器本地草稿。");
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
        <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">返回首页</Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">

        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-green-500 tracking-[0.1em] uppercase mb-2">
            <span className="inline-block w-4 h-0.5 bg-green-400 rounded" />
            Project Setup
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">新建核算项目</h1>
          <p className="mt-2 text-sm text-gray-400 leading-7 max-w-xl">
            地区字段已改为附录 C 区域化缺省值匹配所需的「标准化省级地区」口径。后续表 C.7 / C.10 会按这里的地区自动归并到华北、东北、华东、中南、西南、西北。
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* SECTION 1 */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              基本信息
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">企业名称</span>
                <input {...register("enterpriseName")} className={inputClass} placeholder="例如：北京平谷奶牛场" />
                {errors.enterpriseName?.message && <p className={errorClass}>{String(errors.enterpriseName.message)}</p>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">核算年度</span>
                <input type="number" {...register("year")} className={inputClass} />
                {errors.year?.message && <p className={errorClass}>{String(errors.year.message)}</p>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">标准化省级地区</span>
                <select {...register("region")} className={inputClass}>
                  {REGION_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                {errors.region?.message && <p className={errorClass}>{String(errors.region.message)}</p>}
                <p className="mt-1.5 text-xs text-green-600 font-medium">所属区域组：{selectedRegionGroup}</p>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">养殖场类型</span>
                <select {...register("farmType")} className={inputClass}>
                  {farmTypeOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                {errors.farmType?.message && <p className={errorClass}>{String(errors.farmType.message)}</p>}
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wide">备注</span>
              <textarea {...register("notes")} rows={3} className={inputClass} placeholder="可填写项目说明、数据来源说明等" />
              {errors.notes?.message && <p className={errorClass}>{String(errors.notes.message)}</p>}
            </label>
          </section>

          {/* SECTION 2 */}
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              核算标准版本
            </h2>

            <div className="grid gap-3">
              {standardOptions.map((standard) => (
                <label
                  key={standard.value}
                  className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 hover:border-green-200 hover:bg-green-50 transition"
                >
                  <input
                    type="radio"
                    value={standard.value}
                    {...register("standardVersion")}
                    className="mt-0.5 accent-green-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{standard.label}</p>
                    <p className="mt-0.5 text-xs text-gray-400 leading-6">{standard.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.standardVersion?.message && <p className={errorClass}>{String(errors.standardVersion.message)}</p>}
          </section>

          {/* SECTION 3 - STATUS */}
          <section className="rounded-2xl border border-dashed border-green-200 bg-green-50/50 p-5">
            <h2 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-green-600">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              当前表单状态
            </h2>
            <div className="space-y-1.5 text-xs text-green-700 leading-6">
              <p>当前选择标准：{selectedStandardLabel}</p>
              <p>当前地区：{selectedRegion} · 区域组：{selectedRegionGroup}</p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage && <p className="font-semibold text-green-900 mt-2 pt-2 border-t border-green-200">{statusMessage}</p>}
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium shadow-sm hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "保存中..." : "保存基础信息草稿"}
            </button>
            <Link href="/project/livestock" className="px-5 py-2.5 rounded-xl border border-green-200 bg-white text-sm font-medium text-green-800 hover:bg-green-50 transition">
              下一步：养殖活动数据 →
            </Link>
            <Link href="/" className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              返回首页
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}