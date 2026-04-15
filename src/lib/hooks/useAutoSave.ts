import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * 通用自动保存 Hook
 * @param data 监听的数据，变化时触发保存
 * @param saveFn 保存函数
 * @param delay 防抖延迟，默认 2000ms
 */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 2000
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    // 第一次渲染不触发保存
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 清除上一个定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setStatus("saving");

    timerRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current(data);
        setStatus("saved");
        // 3 秒后恢复 idle
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay]);

  return status;
}
