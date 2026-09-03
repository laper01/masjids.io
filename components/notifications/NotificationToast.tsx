"use client";

import { useEffect, useState } from "react";
import type { AppNotification } from "@/hooks/notifications/useForegroundNotifications";

interface NotificationToastProps {
  toast: AppNotification;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<string, { icon: string; bar: string }> = {
  info:    { icon: "ti-info-circle",    bar: "bg-blue-500"   },
  success: { icon: "ti-circle-check",   bar: "bg-green-500"  },
  warning: { icon: "ti-alert-triangle", bar: "bg-amber-500"  },
  error:   { icon: "ti-circle-x",       bar: "bg-red-500"    },
};

export function NotificationToast({ toast, onDismiss }: NotificationToastProps) {
  const [visible, setVisible] = useState(false);

  // Mount → slide in
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const style = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info;

  function handleDismiss() {
    setVisible(false);
    // Let the slide-out animation finish before removing from DOM
    setTimeout(() => onDismiss(toast.id), 300);
  }

  function handleActionClick() {
    if (toast.actionUrl) window.location.href = toast.actionUrl;
    handleDismiss();
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        "relative flex w-80 overflow-hidden rounded-xl border border-border",
        "bg-background shadow-lg",
        "transition-all duration-300 ease-out",
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
      ].join(" ")}
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${style.bar}`} />

      {/* Content */}
      <div className="flex flex-1 gap-3 p-3">
        {/* Icon */}
        <i
          className={`ti ${style.icon} mt-0.5 shrink-0 text-lg text-foreground/70`}
          aria-hidden="true"
        />

        {/* Text */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-foreground">
            {toast.title}
          </p>
          {toast.message && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {toast.message}
            </p>
          )}
          {toast.actionUrl && (
            <button
              onClick={handleActionClick}
              className="mt-1 self-start text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View →
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 self-start rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <i className="ti ti-x text-base" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}