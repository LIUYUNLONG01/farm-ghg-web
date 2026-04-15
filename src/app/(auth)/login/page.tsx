'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

/* ── 功能标签 ── */
const features = ["肠道发酵 CH₄", "粪污管理 N₂O", "能源消耗", "电力热力"];

function FeaturePill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-white/95 bg-white/[0.15] border border-white/20 backdrop-blur-md hover:bg-white/[0.25] hover:scale-105 transition-all">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 opacity-90">
        <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
      </svg>
      {text}
    </span>
  );
}

/* ── 输入框图标 ── */
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <polyline points="22,4 12,13 2,4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="11" width="18" height="11" rx="3" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ══════════════════════════════════════════
   登录页主组件
   ══════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ══ 左侧品牌面板 ══ */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden">
        {/* 多层渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-800 to-emerald-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-950/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(74,222,128,0.2)_0%,transparent_60%)]" />

        {/* 装饰光斑 */}
        <div className="absolute -top-40 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-400/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full bg-green-300/10 blur-3xl animate-pulse [animation-delay:2s]" />

        {/* 浮动粒子 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white/30 animate-[float_20s_ease-in-out_infinite]"
              style={{
                top: `${10 + i * 11}%`,
                left: `${8 + i * 12}%`,
                animationDelay: `${i * -2.5}s`,
                animationDuration: `${16 + i * 2}s`,
              }}
            />
          ))}
        </div>

        {/* 装饰角标 */}
        <div className="absolute top-8 left-8 flex items-center gap-2 text-white/60 text-xs font-mono tracking-widest">
          <div className="w-8 h-px bg-white/40" />
          <span>FARM · GHG · 2026</span>
        </div>
        <div className="absolute bottom-8 right-8 flex items-center gap-2 text-white/60 text-xs font-mono tracking-widest">
          <span>GB/T 32151.22-2024</span>
          <div className="w-8 h-px bg-white/40" />
        </div>

        {/* 主内容 */}
        <div className="relative z-10 text-center px-12 max-w-2xl">
          {/* 装饰小标 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-xs font-medium text-white/90 tracking-wide">CARBON ACCOUNTING PLATFORM</span>
          </div>

          {/* 主标题 */}
          <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.15] tracking-tight mb-6 drop-shadow-2xl">
            养殖场温室气体<br />
            <span className="bg-gradient-to-r from-emerald-200 via-green-100 to-white bg-clip-text text-transparent">
              碳核算平台
            </span>
          </h1>

          {/* 描述 */}
          <p className="text-base xl:text-lg text-white/85 leading-relaxed max-w-md mx-auto font-light">
            为畜禽养殖企业提供专业、精准的<br />碳排放核算与管理服务
          </p>

          {/* 分割线 */}
          <div className="flex items-center justify-center gap-3 my-8">
            <div className="w-12 h-px bg-white/30" />
            <div className="w-1 h-1 rounded-full bg-white/50" />
            <div className="w-12 h-px bg-white/30" />
          </div>

          {/* 功能标签 */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {features.map((f) => (
              <FeaturePill key={f} text={f} />
            ))}
          </div>
        </div>
      </div>

      {/* ══ 右侧登录表单 ══ */}
      <div className="w-full lg:w-[520px] flex flex-col items-center justify-center px-6 sm:px-12 bg-white relative">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,197,94,0.04)_0%,transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(16,185,129,0.03)_0%,transparent_50%)] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* 品牌 Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-green-500/25">
              <Image
                src="/logo.png"
                alt="logo"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <span className="text-base font-bold text-green-700 tracking-tight">养殖场碳核算平台</span>
          </div>

          {/* 移动端简短说明 */}
          <div className="lg:hidden mb-6 text-xs text-gray-400">
            为畜禽养殖企业提供专业、精准的碳排放核算与管理服务
          </div>

          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">欢迎回来</h2>
          <p className="text-sm text-gray-400 mb-8">请输入您的账号信息登录平台</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 邮箱 */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-1.5 tracking-wide">
                邮箱地址
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors">
                  <MailIcon />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-green-400 focus:ring-[3px] focus:ring-green-500/10 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-1.5 tracking-wide">
                密码
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors">
                  <LockIcon />
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-green-400 focus:ring-[3px] focus:ring-green-500/10 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label={showPw ? "隐藏密码" : "显示密码"}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-green-600/25 hover:shadow-green-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-green-600/25 relative overflow-hidden group/btn"
            >
              <span className="relative z-10">{loading ? "登录中..." : "登 录"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          {/* 分割线 */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-300">或</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 注册链接 */}
          <p className="text-center text-sm text-gray-400">
            还没有账号？{" "}
            <Link href="/register" className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors">
              使用邀请码注册
            </Link>
          </p>
        </div>

        <p className="absolute bottom-5 text-[11px] text-gray-300">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-200 transition-colors"
          >
            京ICP备2026017960号-1
          </a>
        </p>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-100px) translateX(30px); opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}