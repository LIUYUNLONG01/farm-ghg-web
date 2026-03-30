import Link from "next/link";
import { standardOptions } from "@/data/standardOptions";

export default function NewProjectPage() {
  const currentYear = new Date().getFullYear();

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
              这一页先搭出项目录入骨架，下一步再接表单状态和数据校验。
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            返回首页
          </Link>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">1. 基本信息</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  企业名称
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                  placeholder="例如：某某奶牛场"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  核算年度
                </span>
                <input
                  type="number"
                  defaultValue={currentYear}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  所在地区
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                  placeholder="例如：北京市顺义区"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  养殖场类型
                </span>
                <select className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500">
                  <option>奶牛场</option>
                  <option>肉牛场</option>
                  <option>羊场</option>
                  <option>猪场</option>
                  <option>蛋鸡场</option>
                  <option>肉鸡场</option>
                  <option>其他</option>
                </select>
              </label>
            </div>
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
                    name="standardVersion"
                    defaultChecked={standard.value === "NYT4243_2022"}
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
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-lg font-semibold">3. 当前状态</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>已建立项目基础信息区域</li>
              <li>已建立标准版本选择区域</li>
              <li>下一步将接入表单状态管理和数据校验</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}