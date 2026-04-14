'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects ?? []);
        setLoading(false);
      });
  }, []);

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), data: {} }),
    });

    const data = await res.json();
    if (res.ok) {
      // 跳转到新项目的编辑页
      router.push(`/projects/${data.project.id}/new`);
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects(projects.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-50/90 border-b border-green-100 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-green-700">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
            </svg>
          </div>
          养殖场碳核算平台
        </Link>
        <Link href="/" className="text-xs px-3 py-1.5 rounded-lg border border-green-100 text-green-700 hover:bg-green-50 transition">
          返回首页
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-gray-900">我的项目</h1>
            <p className="mt-1 text-sm text-gray-400">管理你的核算项目</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建项目
          </button>
        </div>

        {/* 新建项目表单 */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">新建项目</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入项目名称，如：某某牧场 2024 年度核算"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                autoFocus
              />
              <button
                onClick={createProject}
                disabled={creating || !newName.trim()}
                className="px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition disabled:opacity-50"
              >
                {creating ? "创建中..." : "创建"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-green-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">还没有项目</p>
            <p className="text-gray-400 text-sm mt-1">点击右上角「新建项目」开始</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm flex items-center justify-between group hover:border-green-200 transition">
                <div>
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    最后更新：{new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-medium hover:bg-green-900 transition"
                  >
                    进入核算
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
