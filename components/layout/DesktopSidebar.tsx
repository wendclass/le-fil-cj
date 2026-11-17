"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  FileCheck2,
  CheckCircle2,
  BarChart3,
  User,
  Users2,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface DesktopSidebarProps {
  profile?: Profile | null;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ profile }) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isPlanner = profile?.role === "planner";

  const navItems = [
    { href: "/", label: copy.nav.home, icon: Home },
    { href: "/reunions", label: copy.nav.meetings, icon: Calendar },
    { href: "/decisions", label: copy.nav.decisions, icon: FileCheck2 },
    { href: "/taches", label: copy.nav.tasks, icon: CheckCircle2 },
    { href: "/indicateurs", label: copy.nav.metrics, icon: BarChart3 },
    { href: "/profil", label: copy.nav.profile, icon: User },
    ...(isPlanner
      ? [{ href: "/equipe", label: copy.nav.team, icon: Users2 }]
      : []),
  ];

  const getIdentity = (href: string) => {
    if (href === "/") return { activeBg: "bg-primary text-white", iconColor: "text-white" };
    if (href.startsWith("/reunions")) return { activeBg: "bg-primary text-white", iconColor: "text-white" };
    if (href.startsWith("/decisions")) return { activeBg: "bg-[#187A4C] text-white", iconColor: "text-white" };
    if (href.startsWith("/taches")) return { activeBg: "bg-[#F2B705] text-[#232D6B] font-bold", iconColor: "text-[#232D6B]" };
    if (href.startsWith("/indicateurs")) return { activeBg: "bg-[#187A4C] text-white", iconColor: "text-white" };
    if (href.startsWith("/profil")) return { activeBg: "bg-[#F2B705] text-[#232D6B] font-bold", iconColor: "text-[#232D6B]" };
    return { activeBg: "bg-primary text-white", iconColor: "text-white" };
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col justify-between shrink-0 bg-white border-r border-border min-h-[calc(100vh-65px)] transition-all duration-base p-3 sticky top-[65px] z-10",
        isCollapsed ? "w-20" : "w-64"
      )}
      aria-label="Navigation latérale"
    >
      <div className="space-y-4">
        {/* Bouton de repliement */}
        <div className="flex justify-end px-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-pill text-text-muted hover:text-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-target-min flex items-center justify-center"
            title={isCollapsed ? "Déplier le menu" : "Replier le menu"}
            aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Liens de navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const iden = getIdentity(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-pill text-sm font-medium transition-all duration-fast select-none touch-target-min",
                  isActive
                    ? cn(iden.activeBg, "shadow-1")
                    : "text-text-muted hover:text-primary hover:bg-surface-muted",
                  isCollapsed && "justify-center px-0"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? iden.iconColor : "text-current")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pied du menu avec À propos */}
      <div className="pt-4 border-t border-border">
        <Link
          href="/a-propos"
          className={cn(
            "flex items-center gap-3.5 px-3.5 py-2.5 rounded-pill text-xs font-medium text-text-muted hover:text-primary hover:bg-surface-muted transition-colors select-none touch-target-min",
            isCollapsed && "justify-center px-0"
          )}
          title={isCollapsed ? copy.nav.about : undefined}
        >
          <Info className="w-4 h-4 shrink-0 text-current" />
          {!isCollapsed && <span className="truncate">{copy.nav.about}</span>}
        </Link>
      </div>
    </aside>
  );
};
