'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  livestockActivitySchema,
  type LivestockActivityFormValues,
} from "@/lib/schemas/livestockActivity";
import {
  loadProjectDraft,
  saveLivestockDraft,
} from "@/lib/utils/projectDraftStorage";
import type { LivestockRecord } from "@/types/ghg";

function createEmptyRow() {
  return {
    species: "",
    stage: "",
    annualAverageHead: 0,
    annualOutputHead: undefined,
    feedingDays: undefined,
  };
}

export default function LivestockPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [projectName, setProjectName] = useState("");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LivestockActivityFormValues>({
    resolver: zodResolver(livestockActivitySchema),
    defaultValues: {
      rows: [createEmptyRow()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rows",
  });

  useEffect(() => {
    const draft = loadProjectDraft();
    if (!draft) return;

    setProjectName(draft.base.enterpriseName || "未命名项目");

    if (draft.livestock && draft.livestock.length > 0) {
      reset({
        rows: draft.livestock.map((row) => ({
          species: row.species,
          stage: row.stage,
          annualAverageHead: row.annualAverageHead,
          annualOutputHead: row.annualOutputHead,
          feedingDays: row.feedingDays,
        })),
      });
      setStatusMessage("已加载浏览器中的养殖活动草稿。");
    }
  }, [reset]);

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500";
  const errorClass = "mt-2 text-sm text-red-600";

  const onSubmit = (values: LivestockActivityFormValues) => {
    const normalizedRows: LivestockRecord[] = values.rows.map((row) => ({
      species: row.species.trim(),
      stage: row.stage.trim(),
      annualAverageHead: row.annualAverageHead,
      annualOutputHead:
        row.annualOutputHead === undefined ? undefined : row.annualOutputHead,
      feedingDays: row.feedingDays === undefined ? undefined : row.feedingDays,
    }));

    saveLivestockDraft(normalizedRows);
    setStatusMessage("已保存养殖活动数据到浏览器本地草稿。");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Livestock Activity</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              养殖活动数据
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前项目：{projectName || "未命名项目"}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/project/new"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回基础信息
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              返回首页
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">1. 养殖活动记录</h2>
              <button
                type="button"
                onClick={() => append(createEmptyRow())}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                新增一条记录
              </button>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      记录 {index + 1}
                    </h3>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        畜种
                      </span>
                      <input
                        {...register(`rows.${index}.species`)}
                        className={inputClass}
                        placeholder="例如：奶牛"
                      />
                      {errors.rows?.[index]?.species?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.species?.message)}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        阶段
                      </span>
                      <input
                        {...register(`rows.${index}.stage`)}
                        className={inputClass}
                        placeholder="例如：泌乳牛"
                      />
                      {errors.rows?.[index]?.stage?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.stage?.message)}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        年平均存栏
                      </span>
                      <input
                        type="number"
                        step="any"
                        {...register(`rows.${index}.annualAverageHead`)}
                        className={inputClass}
                        placeholder="例如：1200"
                      />
                      {errors.rows?.[index]?.annualAverageHead?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.annualAverageHead?.message)}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        年出栏量
                      </span>
                      <input
                        type="number"
                        step="any"
                        {...register(`rows.${index}.annualOutputHead`)}
                        className={inputClass}
                        placeholder="可选"
                      />
                      {errors.rows?.[index]?.annualOutputHead?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.annualOutputHead?.message)}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        饲养周期天数
                      </span>
                      <input
                        type="number"
                        {...register(`rows.${index}.feedingDays`)}
                        className={inputClass}
                        placeholder="可选"
                      />
                      {errors.rows?.[index]?.feedingDays?.message ? (
                        <p className={errorClass}>
                          {String(errors.rows[index]?.feedingDays?.message)}
                        </p>
                      ) : null}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {errors.rows?.message ? (
              <p className="mt-4 text-sm text-red-600">
                {String(errors.rows.message)}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">2. 当前状态</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>支持多条记录动态新增与删除</p>
              <p>保存方式：浏览器本地草稿</p>
              {statusMessage ? (
                <p className="font-medium text-slate-800">{statusMessage}</p>
              ) : null}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "保存中..." : "保存养殖活动草稿"}
            </button>

            <button
              type="button"
              onClick={() => append(createEmptyRow())}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              再新增一条
            </button>
            <Link
                href="/project/enteric"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            > 
                下一步：肠道发酵 CH4
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}