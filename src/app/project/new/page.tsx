'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { standardOptions } from "@/data/standardOptions";
import {
  farmTypeOptions,
  projectBaseSchema,
  type ProjectBaseFormValues,
} from "@/lib/schemas/projectBase";
import {
  loadProjectDraft,
  saveProjectDraft,
} from "@/lib/utils/projectDraftStorage";

export default function NewProjectPage() {
  const currentYear = new Date().getFullYear();
  const [statusMessage, setStatusMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ProjectBaseFormValues>({
    resolver: zodResolver(projectBaseSchema),
    defaultValues: {
      enterpriseName: "",
      year: currentYear,
      region: "",
      farmType: "奶牛场",
      standardVersion: "NYT4243_2022",
      notes: "",
    },
  });

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    reset({
      enterpriseName: draft.base.enterpriseName,
      year: draft.base.year,
      region: draft.base.region,
      farmType: draft.base.farmType,
      standardVersion: draft.base.standardVersion,
      notes: draft.base.notes ?? "",
    });

    setStatusMessage("已加载浏览器中的本地草稿。");
  }, [reset]);

  const selectedStandard = watch("standardVersion");
  const selectedStandardLabel =
    standardOptions.find((item) => item.value === selectedStandard)?.label ?? "未选择";

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const errorClass = "mt-2 text-sm text-red-600";

  const onSubmit = (values: ProjectBaseFormValues) => {
    saveProjectDraft(values);
    setStatusMessage("已保存基础信息到浏览器本地草稿。");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Project Setup</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              新建核算项目
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              现在这页已经接入了表单状态、Zod 校验和本地草稿保存。
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            返回首页
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">1. 基本信息</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  企业名称
                </span>
                <input
                  {...register("enterpriseName")}
                  className={inputClass}
                  placeholder="例如：某某奶牛场"
                />
                {errors.enterpriseName?.message ? (
                  <p className={errorClass}>{String(errors.enterpriseName.message)}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  核算年度
                </span>
                <input
                  type="number"
                  {...register("year")}
                  className={inputClass}
                />
                {errors.year?.message ? (
                  <p className={errorClass}>{String(errors.year.message)}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  所在地区
                </span>
                <input
                  {...register("region")}
                  className={inputClass}
                  placeholder="例如：北京市顺义区"
                />
                {errors.region?.message ? (
                  <p className={errorClass}>{String(errors.region.message)}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  养殖场类型
                </span>
                <select {...register("farmType")} className={inputClass}>
                  {farmTypeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {errors.farmType?.message ? (
                  <p className={errorClass}>{String(errors.farmType.message)}</p>
                ) : null}
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                备注
              </span>
              <textarea
                {...register("notes")}
                rows={4}
                className={inputClass}
                placeholder="可填写项目说明、数据来源说明等"
              />
              {errors.notes?.message ? (
                <p className={errorClass}>{String(errors.notes.message)}</p>
              ) : null}
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">2. 核算标准版本</h2>

            <div className="mt-4 grid gap-4">
              {standardOptions.map((standard) => (
                <label
                  key={standard.value}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    value={standard.value}
                    {...register("standardVersion")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{standard.label}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {standard.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {errors.standardVersion?.message ? (
              <p className={errorClass}>{String(errors.standardVersion.message)}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">3. 当前表单状态</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>当前选择标准：{selectedStandardLabel}</p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage ? <p className="font-medium text-slate-800">{statusMessage}</p> : null}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
                {isSubmitting ? "保存中..." : "保存基础信息草稿"}
            </button>

            <Link
                href="/project/livestock"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
                下一步：养殖活动数据
            </Link>

            <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
                返回首页
            </Link>
        </div>
        </form>
      </div>
    </main>
  );
}