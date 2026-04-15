import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import InviteCodeManager from "./InviteCodeManager";
import AdminMapSection from "./AdminMapSection";
import Link from "next/link";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const inviteCodes = await db.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
            </svg>
          </div>
          管理员后台
        </div>
        <a href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">
          返回首页
        </a>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">

        {/* 地图可视化 */}
        <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="px-6 pt-5 pb-4 border-b border-green-50">
            <h2 className="text-base font-semibold text-gray-900">地区分布地图</h2>
            <p className="text-xs text-gray-400 mt-1">点击省份查看详情，支持缩放和拖拽</p>
          </div>
          <div className="px-6 py-5">
            <AdminMapSection />
          </div>
        </section>

        {/* 邀请码管理 */}
        <InviteCodeManager inviteCodes={inviteCodes} />

        {/* 所有项目 */}
        <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="px-6 pt-5 pb-4 border-b border-green-50">
            <h2 className="text-base font-semibold text-gray-900">所有用户项目</h2>
            <p className="text-xs text-gray-400 mt-1">共 {projects.length} 个项目</p>
          </div>
          <div className="px-6 py-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">项目名称</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">用户</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">最后更新</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {projects.map((project: { id: string; name: string; updatedAt: Date; user: { email: string; name: string | null } }) => (
                  <tr key={project.id}>
                    <td className="py-2.5 font-medium text-gray-900">{project.name}</td>
                    <td className="py-2.5 text-gray-500">
                      {project.user.name || project.user.email}
                    </td>
                    <td className="py-2.5 text-gray-400">
                      {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/projects/${project.id}/edit`}
                        className="px-3 py-1 rounded-lg bg-green-700 text-white text-[11px] font-medium hover:bg-green-900 transition"
                      >
                        查看/编辑
                      </Link>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">暂无项目</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 用户列表 */}
        <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="px-6 pt-5 pb-4 border-b border-green-50">
            <h2 className="text-base font-semibold text-gray-900">用户列表</h2>
            <p className="text-xs text-gray-400 mt-1">共 {users.length} 个用户</p>
          </div>
          <div className="px-6 py-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">姓名</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">邮箱</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">角色</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">注册时间</th>
                  <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">项目数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-50">
                {users.map((u: { id: string; email: string; name: string | null; role: string; createdAt: Date }) => (
                  <tr key={u.id}>
                    <td className="py-2.5 text-gray-700">{u.name || "-"}</td>
                    <td className="py-2.5 text-gray-700">{u.email}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${u.role === "admin" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {projects.filter((p: { user: { email: string; name: string | null } }) => p.user.email === u.email).length} 个
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
