"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  FileCheck2,
  CheckCircle2,
  MoreHorizontal,
  BarChart3,
  User,
  Users2,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface MobileTabBarProps {
  profile?: Profile | null;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ profile }) => {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isPlanner = profile?.role === "planner";

  const primaryTabs = [
    { href: "/", label: copy.nav.home, icon: Home },
    { href: "/reunions", label: copy.nav.meetings, icon: Calendar },
    { href: "/decisions", label: copy.nav.decisions, icon: FileCheck2 },
    { href: "/taches", label: copy.nav.tasks, icon: CheckCircle2 },
  ];

  const moreItems = [
    { href: "/indicateurs", label: copy.nav.metrics, icon: BarChart3 },
    { href: "/profil", label: copy.nav.profile, icon: User },
    ...(isPlanner
      ? [{ href: "/equipe", label: copy.nav.team, icon: Users2 }]
      : []),
    { href: "/a-propos", label: copy.nav.about, icon: Info },
  ];

  const isMoreActive = moreItems.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <>
      {/* Barre d'onglets fixe en bas (Mobile uniquement) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-border px-2 py-1 shadow-2"
        aria-label="Navigation principale mobile"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {primaryTabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] rounded-lg transition-colors touch-target-min select-none",
                  isActive ? "text-primary font-semibold" : "text-text-muted hover:text-primary"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-0.5", isActive ? "stroke-[2.5]" : "stroke-2")} />
                <span className="text-[11px] leading-tight tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* Bouton Plus */}
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] rounded-lg transition-colors touch-target-min select-none",
              isMoreActive || isSheetOpen
                ? "text-primary font-semibold"
                : "text-text-muted hover:text-primary"
            )}
            aria-expanded={isSheetOpen}
            aria-label="Afficher plus de rubriques"
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight tracking-tight">{copy.nav.more}</span>
          </button>
        </div>
      </nav>

      {/* Feuille inférieure (Bottom Sheet) pour « Plus » */}
      {isSheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-fade-in-up"
          onClick={() => setIsSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-lg border-t border-border p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-display font-bold text-lg text-primary">
                {copy.nav.more}
              </span>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="p-2 rounded-full text-text-muted hover:text-text touch-target-min"
                aria-label={copy.nav.closeMenu}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {moreItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 px-4 py-3.5 rounded-pill text-sm font-medium transition-all touch-target-min select-none",
                      isActive
                        ? "bg-primary text-white shadow-1"
                        : "text-text hover:bg-surface-muted"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
