import type { SaveStatus } from "@/lib/hooks/useAutoSave";

export default function AutoSaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === "saving" && (
        <>
          <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">保存中...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-green-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-green-600">已保存</span>
        </>
      )}
      {status === "error" && (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-red-500">保存失败</span>
        </>
      )}
    </div>
  );
}
