/**
 * components/Sidebar.tsx
 * Scope-aware sidebar — menu items shown/hidden based on effective_scopes
 * Place at: components/Sidebar.tsx (replace existing)
 *
 * How it works:
 *   1. On mount, fetch current user effective permissions via PERM-08
 *   2. Each NAV_ITEM has optional `requiredScopes` — ANY match = visible
 *   3. Items with no `requiredScopes` are always visible (admin-level items)
 */
"use client";

import {
  LayoutDashboard, Wallet, Banknote, Megaphone, Users, UsersRound,
  ShieldCheck, Globe, BookmarkPlus, HandHeart, Vote, Building2,
  ChevronDown, ChevronRight, LogOut, HelpCircle, NewspaperIcon,
  LayoutTemplate, BadgeCheck, Loader2, CalendarDays, Bell,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMosque } from "@/context/MosqueContext";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import type { PermissionScope } from "@/types/api";

// ─── Nav definition ───────────────────────────────────────────────────────────

type NavChild = {
  label:          string;
  href:           string;
  requiredScopes?: PermissionScope[];
};

type NavItem = {
  label:          string;
  icon:           React.ElementType;
  href?:          string;
  children?:      NavChild[];
  requiredScopes?: PermissionScope[];  // ANY of these = visible
};

/**
 * Scope mapping — which scopes unlock which menu items.
 * If requiredScopes is omitted → always visible (super admin items).
 */
const NAV_ITEMS: NavItem[] = [
  {
    label: "Admin",
    icon:  LayoutDashboard,
    href:  "/dashboard",
    // Always visible — every authenticated staff sees dashboard
  },
  {
    label:          "Monetization Gateway",
    icon:           Banknote,
    href:           "/monetization",
    requiredScopes: ["payouts:manage", "donations:manage"],
  },
  {
    label:          "Donation Management",
    icon:           Wallet,
    href:           "/donation-management",
    requiredScopes: ["donations:view", "donations:manage", "donations:report", "donations:refund"],
  },
  {
    label:          "Announcement",
    icon:           NewspaperIcon,
    href:           "/announcement",
    requiredScopes: ["announcements:create", "announcements:delete"],
  },
  {
    label: "My Announcements",
    icon:  Bell,
    href:  "/my-announcements",
    // Always visible — member-facing feed of masjids the user follows,
    // not an admin/management screen, so no scope gate.
  },
  {
    label:          "Users Management",
    icon:           Users,
    href:           "/users",
    requiredScopes: ["members:view", "members:manage", "members:verify", "members:export"],
  },
  {
    label:          "Roles Management",
    icon:           ShieldCheck,
    href:           "/roles",
    requiredScopes: ["permissions:manage"],
  },
  {
    label: "Masjid Public",
    icon:  Globe,
    href:  "/masjid-public",
    // Always visible — public info
  },
  {
    label:          "Masjid Follow",
    icon:           BookmarkPlus,
    href:           "/masjid-follow",
  },
  {
    label:          "Masjid Followers",
    icon:           UsersRound,
    href:           "/masjid-followers",
    requiredScopes: ["members:view"],
  },
  {
    label:          "Giving Dashboard",
    icon:           HandHeart,
    href:           "/giving-dashboard",
  },
  {
    label: "Election",
    icon:  Vote,
    requiredScopes: ["elections:create", "elections:manage", "elections:view_results", "elections:vote"],
    children: [
      {
        label:          "Slate Management",
        href:           "/election/slates",
        requiredScopes: ["elections:create", "elections:manage"],
      },
      {
        label:          "Election Management",
        href:           "/election/manage",
        requiredScopes: ["elections:manage"],
      },

    ],
  },
  {
    label:          "Masjids Management",
    icon:           Building2,
    href:           "/masjid-management",
  },
  {
    label:          "Member Management",
    icon:           Users,
    href:           "/member-management",
    requiredScopes: ["members:manage", "members:verify"],
  },
  {
    label: "Membership",
    icon:  BadgeCheck,
    href:  "/membership",
    // Always visible — member-facing "my membership" self-service page,
    // not gated behind an admin scope (previously required members:manage).
  },
  {
    label:          "Masjid personal page",
    icon:           LayoutTemplate,
    href:           "/builder",
    requiredScopes: ["website:edit", "website:publish", "website:domains", "website:manage"],
  },
];

// ─── Scope check helper ───────────────────────────────────────────────────────

function canSee(
  required: PermissionScope[] | undefined,
  effective: PermissionScope[]
): boolean {
  if (!required || required.length === 0) return true;          // no restriction
  return required.some((s) => effective.includes(s));           // ANY match
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const { activeMosque }  = useMosque();
  const masjidId          = activeMosque?.id ?? "";

  const { getUserEffectivePermissions, userEffective, loading: permLoading } =
    usePermissions(masjidId);

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const el = NAV_ITEMS.find((i) => i.label === "Election");
    return el?.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))
      ? "Election"
      : null;
  });

  // ── Fetch current user's effective permissions once ───────────────────────
  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (masjidId && userId) {
      void getUserEffectivePermissions(userId);
    }
  }, [masjidId, session, getUserEffectivePermissions]);

  const effectiveScopes: PermissionScope[] =
    userEffective?.data?.effective_scopes ?? [];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Filter nav items by scope
  const visibleItems = NAV_ITEMS.filter((item) =>
    canSee(item.requiredScopes, effectiveScopes)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-slate-100 flex flex-col z-40 transition-all duration-300 overflow-y-auto",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Admin sidebar navigation"
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-slate-100", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg bg-[#064e3b] flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-[#064e3b] font-extrabold text-sm leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              masjids.io
            </p>
            <p className="text-slate-400 text-[10px]">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && userEffective?.data && (
        <div className="mx-3 mt-3 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
          <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-700 truncate">
              {userEffective.data.role_template.name}
            </p>
            <p className="text-[9px] text-slate-400">
              {effectiveScopes.length} permissions
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {permLoading && !userEffective && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 bg-slate-200 rounded w-24" />
            <div className="h-2 bg-slate-200 rounded w-16" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-4" role="navigation">
        {visibleItems.map((item) => {
          const Icon        = item.icon;
          const hasChildren = !!item.children;
          const isOpen      = openGroup === item.label;

          if (hasChildren) {
            // Filter children by scope too
            const visibleChildren = (item.children ?? []).filter((c) =>
              canSee(c.requiredScopes, effectiveScopes)
            );
            if (visibleChildren.length === 0) return null;

            const isGroupActive = visibleChildren.some((c) => isActive(c.href));

            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isOpen || isGroupActive
                      ? "text-[#064e3b] bg-[#f0faf5]"
                      : "text-slate-500 hover:text-[#064e3b] hover:bg-slate-50"
                  )}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {isOpen
                        ? <ChevronDown  size={14} className="shrink-0" />
                        : <ChevronRight size={14} className="shrink-0" />
                      }
                    </>
                  )}
                </button>

                {isOpen && !collapsed && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l-2 border-[#064e3b]/20 pl-3">
                    {visibleChildren.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all",
                          isActive(child.href)
                            ? "text-[#064e3b] bg-[#f0faf5] font-semibold"
                            : "text-slate-400 hover:text-[#064e3b] hover:bg-[#f0faf5]"
                        )}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.href!);
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[#064e3b] text-white shadow-sm"
                  : "text-slate-500 hover:text-[#064e3b] hover:bg-slate-50",
                collapsed && "justify-center"
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 pt-2 border-t border-slate-100 space-y-1">
        <a
          href="#"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-[#064e3b] hover:bg-slate-50 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <HelpCircle size={17} className="shrink-0" />
          {!collapsed && <span>Support</span>}
        </a>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}