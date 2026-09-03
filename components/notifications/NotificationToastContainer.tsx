"use client";

import { NotificationToast } from "./NotificationToast";
import { useForegroundNotifications } from "@/hooks/notifications/useForegroundNotifications";

/**
 * NotificationToastContainer
 *
 * Mount this ONCE inside your authenticated layout (e.g. app/(admin)/layout.tsx).
 * It owns the useForegroundNotifications hook and renders all active toasts in a
 * fixed stack at the top-right of the screen.
 *
 * No props required — it is self-contained.
 *
 * Example:
 *   // app/(admin)/layout.tsx
 *   import { NotificationToastContainer } from "@/components/notifications/NotificationToastContainer";
 *
 *   export default function AdminLayout({ children }) {
 *     return (
 *       <>
 *         <AppBar />
 *         <NotificationToastContainer />
 *         <main>{children}</main>
 *       </>
 *     );
 *   }
 */
export function NotificationToastContainer() {
  const { toasts, dismissToast } = useForegroundNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={[
        "fixed right-4 top-4 z-[9999]",
        "flex flex-col gap-2",
        // Prevent the stack from consuming clicks on the page
        "pointer-events-none",
      ].join(" ")}
    >
      {toasts.map((toast) => (
        // Individual toasts need pointer-events restored
        <div key={toast.id} className="pointer-events-auto">
          <NotificationToast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}