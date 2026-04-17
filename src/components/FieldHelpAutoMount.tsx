"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getFieldHelpEntries,
  type FieldHelpEntry,
} from "@/data/fieldHelp";

const CANDIDATE_SELECTOR = "label > span, th, div, p";
const OWNED_ATTR = "data-field-help-owned";
const BOUND_ATTR = "data-field-help-bound";
const IGNORE_ATTR = "data-field-help-ignore";

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").replace(/：/g, ":").trim();
}

function matchesEntry(text: string, entry: FieldHelpEntry) {
  const source = normalizeText(text);
  const target = normalizeText(entry.match);

  switch (entry.matchMode ?? "includes") {
    case "exact":
      return source === target;
    case "startsWith":
      return source.startsWith(target);
    default:
      return source.includes(target);
  }
}

function isCandidateElement(element: HTMLElement) {
  if (element.closest(`[${IGNORE_ATTR}="true"]`)) return false;
  if (element.dataset.fieldHelpBound === "true") return false;
  if (element.querySelector("input, select, textarea, button")) return false;

  const text = normalizeText(element.textContent ?? "");
  if (!text) return false;
  if (text.length > 72) return false;

  return true;
}

function createMetaLine(label: string, value: string) {
  const row = document.createElement("div");
  Object.assign(row.style, {
    fontSize: "12px",
    lineHeight: "18px",
    color: "#334155",
  });

  const strong = document.createElement("strong");
  strong.textContent = `${label}：`;
  strong.style.color = "#0f172a";
  strong.style.fontWeight = "600";

  const text = document.createElement("span");
  text.textContent = value;

  row.appendChild(strong);
  row.appendChild(text);

  return row;
}

function createPopover(entry: FieldHelpEntry) {
  const popover = document.createElement("div");
  popover.setAttribute(IGNORE_ATTR, "true");
  popover.setAttribute(OWNED_ATTR, "true");

  Object.assign(popover.style, {
    position: "fixed",
    zIndex: "9999",
    display: "none",
    width: "320px",
    maxWidth: "calc(100vw - 24px)",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(16, 185, 129, 0.18)",
    background: "rgba(255, 255, 255, 0.98)",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.16)",
    backdropFilter: "blur(10px)",
  });

  const title = document.createElement("div");
  title.textContent = entry.title;
  Object.assign(title.style, {
    fontSize: "13px",
    fontWeight: "700",
    color: "#166534",
    marginBottom: "6px",
    lineHeight: "18px",
  });
  popover.appendChild(title);

  const description = document.createElement("div");
  description.textContent = entry.description;
  Object.assign(description.style, {
    fontSize: "12px",
    lineHeight: "19px",
    color: "#334155",
  });
  popover.appendChild(description);

  if (entry.unit || entry.howToFill || entry.caution) {
    const divider = document.createElement("div");
    Object.assign(divider.style, {
      height: "1px",
      background: "rgba(148, 163, 184, 0.2)",
      margin: "10px 0 8px",
    });
    popover.appendChild(divider);
  }

  if (entry.unit) {
    popover.appendChild(createMetaLine("单位", entry.unit));
  }

  if (entry.howToFill) {
    popover.appendChild(createMetaLine("填写口径", entry.howToFill));
  }

  if (entry.caution) {
    const caution = document.createElement("div");
    caution.textContent = `注意：${entry.caution}`;
    Object.assign(caution.style, {
      marginTop: "8px",
      padding: "8px 10px",
      borderRadius: "10px",
      background: "rgba(239, 68, 68, 0.06)",
      color: "#991b1b",
      fontSize: "12px",
      lineHeight: "18px",
    });
    popover.appendChild(caution);
  }

  return popover;
}

function positionPopover(button: HTMLButtonElement, popover: HTMLDivElement) {
  popover.style.display = "block";
  popover.style.visibility = "hidden";

  const viewportPadding = 12;
  const maxWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
  popover.style.width = `${maxWidth}px`;

  const rect = button.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth;
  const popoverHeight = popover.offsetHeight;

  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  left = Math.max(viewportPadding, left);
  left = Math.min(left, window.innerWidth - popoverWidth - viewportPadding);

  let top = rect.bottom + 10;
  if (top + popoverHeight > window.innerHeight - viewportPadding) {
    top = rect.top - popoverHeight - 10;
  }
  top = Math.max(viewportPadding, top);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.style.visibility = "visible";
}

function attachHelp(target: HTMLElement, entry: FieldHelpEntry) {
  target.dataset.fieldHelpBound = "true";

  const host = document.createElement("span");
  host.setAttribute(OWNED_ATTR, "true");
  host.setAttribute(IGNORE_ATTR, "true");
  Object.assign(host.style, {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "6px",
    verticalAlign: "middle",
  });

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `查看“${entry.title}”说明`);
  button.setAttribute("aria-expanded", "false");
  Object.assign(button.style, {
    width: "16px",
    height: "16px",
    borderRadius: "9999px",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    background: "rgba(34, 197, 94, 0.10)",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "700",
    lineHeight: "1",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    textTransform: "none",
  });
  button.textContent = "?";

  const popover = createPopover(entry);
  document.body.appendChild(popover);

  let pinned = false;

  const show = () => {
    positionPopover(button, popover);
    button.setAttribute("aria-expanded", "true");
  };

  const hide = () => {
    if (pinned) return;
    popover.style.display = "none";
    button.setAttribute("aria-expanded", "false");
  };

  const handleMouseEnter = () => {
    if (!pinned) show();
  };

  const handleMouseLeave = () => {
    hide();
  };

  const handleFocus = () => {
    show();
  };

  const handleBlur = () => {
    if (!pinned) {
      popover.style.display = "none";
      button.setAttribute("aria-expanded", "false");
    }
  };

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    pinned = !pinned;

    if (pinned) {
      show();
    } else {
      popover.style.display = "none";
      button.setAttribute("aria-expanded", "false");
    }
  };

  const handleOutsideClick = (event: MouseEvent) => {
    const eventTarget = event.target as Node | null;
    if (!eventTarget) return;

    if (host.contains(eventTarget) || popover.contains(eventTarget)) return;

    pinned = false;
    popover.style.display = "none";
    button.setAttribute("aria-expanded", "false");
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    pinned = false;
    popover.style.display = "none";
    button.setAttribute("aria-expanded", "false");
  };

  const handleReposition = () => {
    if (popover.style.display === "block") {
      positionPopover(button, popover);
    }
  };

  host.appendChild(button);
  target.appendChild(host);

  host.addEventListener("mouseenter", handleMouseEnter);
  host.addEventListener("mouseleave", handleMouseLeave);
  button.addEventListener("focus", handleFocus);
  button.addEventListener("blur", handleBlur);
  button.addEventListener("click", handleClick);
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", handleReposition);
  window.addEventListener("scroll", handleReposition, true);

  return () => {
    host.removeEventListener("mouseenter", handleMouseEnter);
    host.removeEventListener("mouseleave", handleMouseLeave);
    button.removeEventListener("focus", handleFocus);
    button.removeEventListener("blur", handleBlur);
    button.removeEventListener("click", handleClick);
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEscape);
    window.removeEventListener("resize", handleReposition);
    window.removeEventListener("scroll", handleReposition, true);

    popover.remove();
    host.remove();
    delete target.dataset.fieldHelpBound;
  };
}

export default function FieldHelpAutoMount() {
  const pathname = usePathname();

  useEffect(() => {
    const entries = getFieldHelpEntries(pathname);
    if (entries.length === 0) return;

    const cleanups: Array<() => void> = [];
    let rafId: number | null = null;

    const inject = () => {
      const root = document.querySelector("main") ?? document.body;
      const candidates = Array.from(
        root.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR)
      );

      for (const candidate of candidates) {
        if (!isCandidateElement(candidate)) continue;

        const text = candidate.textContent ?? "";

        for (const entry of entries) {
          if (!matchesEntry(text, entry)) continue;
          const cleanup = attachHelp(candidate, entry);
          cleanups.push(cleanup);
          break;
        }
      }
    };

    const scheduleInject = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        inject();
      });
    };

    scheduleInject();

    const observer = new MutationObserver(() => {
      scheduleInject();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      while (cleanups.length > 0) {
        const cleanup = cleanups.pop();
        cleanup?.();
      }
    };
  }, [pathname]);

  return null;
}