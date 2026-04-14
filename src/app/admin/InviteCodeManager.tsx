'use client';

import { useState } from "react";

interface InviteCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy: string | null;
  usedAt: Date | null;
  createdAt: Date;
}

export default function InviteCodeManager({ inviteCodes }: { inviteCodes: InviteCode[] }) {
  const [codes, setCodes] = useState(inviteCodes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const generateCode = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCodes([data.inviteCode, ...codes]);
        setMessage(`新邀请码已生成：${data.inviteCode.code}`);
      } else {
        setMessage(data.error || "生成失败");
      }
    } catch {
      setMessage("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invite?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCodes(codes.filter((c) => c.id !== id));
      }
    } catch {
      setMessage("删除失败");
    }
  };

  return (
    <section className="rounded-2xl border border-green-100 bg-white shadow-sm">
      <div className="px-6 pt-5 pb-4 border-b border-green-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">邀请码管理</h2>
          <p className="text-xs text-gray-400 mt-1">共 {codes.length} 个邀请码</p>
        </div>
        <button
          onClick={generateCode}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-900 transition disabled:opacity-50"
        >
          {loading ? "生成中..." : "生成邀请码"}
        </button>
      </div>

      {message && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="px-6 py-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">邀请码</th>
              <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">状态</th>
              <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">创建时间</th>
              <th className="pb-3 font-semibold text-green-700 uppercase tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-50">
            {codes.map((code) => (
              <tr key={code.id}>
                <td className="py-2.5 font-mono font-semibold text-gray-900">{code.code}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${code.isUsed ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                    {code.isUsed ? "已使用" : "未使用"}
                  </span>
                </td>
                <td className="py-2.5 text-gray-400">
                  {new Date(code.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="py-2.5">
                  {!code.isUsed && (
                    <button
                      onClick={() => deleteCode(code.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      删除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
