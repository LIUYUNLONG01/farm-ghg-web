'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const features = [
  "多项目核算管理",
  "邀请码注册机制",
  "管理员后台支持",
  "结果与报告输出",
];

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{4,24}$/;

function FeaturePill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
      {text}
    </span>
  );
}

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 5.35-8 5.35V8z" />
      </svg>
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4.5 w-4.5">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
      <path d="M9.36 5.37A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.06 3.67" />
      <path d="M6.23 6.23A17.47 17.47 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.2-1.27" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedUsernamePreview = useMemo(
    () => username.trim().toLowerCase(),
    [username]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedInviteCode = inviteCode.trim();

    if (!normalizedInviteCode || !normalizedUsername || !password) {
      setError("邀请码、用户名和密码不能为空");
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setError("用户名需为 4–24 位，只能包含字母、数字、下划线或短横线");
      return;
    }

    if (password.length < 8) {
      setError("密码至少需要 8 位");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: normalizedInviteCode,
          name: name.trim(),
          username: normalizedUsername,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-teal-700 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />
          <div className="absolute -left-20 top-16 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full border border-white/10" />

          <div className="relative flex h-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
            <div className="flex items-center justify-between">
              <BrandMark />
              <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-white/80 backdrop-blur-sm">
                邀请码注册
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                养殖场温室气体排放核算平台
              </div>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                创建平台账号
                <br />
                开始项目核算
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-white/78 xl:text-[15px]">
                新账号注册需使用邀请码。注册成功后，将使用用户名登录平台，系统会自动校验用户名唯一性。
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {features.map((item) => (
                  <FeaturePill key={item} text={item} />
                ))}
              </div>
            </div>

            <div className="grid max-w-xl grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-medium tracking-wider text-white/70">注册规则</div>
                <div className="mt-2 text-sm leading-6 text-white">
                  用户名唯一
                  <br />
                  密码至少 8 位
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-xs font-medium tracking-wider text-white/70">账号用途</div>
                <div className="mt-2 text-sm leading-6 text-white">
                  项目管理
                  <br />
                  核算与报告输出
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <div>
                <div className="text-sm font-semibold text-green-700">养殖场碳核算平台</div>
                <div className="text-xs text-slate-400">邀请码注册</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-6">
                <div className="text-sm font-medium text-green-700">新账号注册</div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  创建账号
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  请输入邀请码、用户名和密码完成注册。注册后请使用用户名登录。
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    邀请码
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <CardIcon />
                    </div>
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="请输入邀请码"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    姓名（选填）
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserIcon />
                    </div>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="请输入姓名"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    用户名
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserIcon />
                    </div>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="4–24 位，字母/数字/_/-"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                      required
                    />
                  </div>
                  <span className="mt-1.5 block text-xs leading-5 text-slate-400">
                    将按小写保存。当前预览：{normalizedUsernamePreview || "未输入"}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    密码
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <LockIcon />
                    </div>
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少 8 位"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPw ? "隐藏密码" : "显示密码"}
                    >
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    确认密码
                  </span>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <LockIcon />
                    </div>
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-green-400 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showConfirmPw ? "隐藏密码" : "显示密码"}
                    >
                      {showConfirmPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "注册中..." : "注 册"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">或</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="text-center text-sm text-slate-500">
                已有账号？{" "}
                <Link
                  href="/login"
                  className="font-medium text-green-700 transition hover:text-green-800"
                >
                  直接登录
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}