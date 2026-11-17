"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, User as UserIcon } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface AppHeaderProps {
  profile?: Profile | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ profile }) => {
  const [avatarError, setAvatarError] = React.useState(false);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CJ";

  return (
    <header className="sticky top-0 z-20 w-full bg-bg/90 backdrop-blur-md border-b border-border/80 px-4 md:px-8 py-3 transition-all">
      <div className="max-w-content mx-auto flex items-center justify-between gap-3">
        {/* Logo dans sa pastille blanche + Titre */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-pill"
          >
            <Logo variant="responsive" priority />
            <span className="font-display font-bold text-lg md:text-xl text-primary tracking-tight hidden sm:inline">
              {copy.app.name}
            </span>
          </Link>
        </div>

        {/* Actions utilisateur : cloche inactive + profil */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Cloche de notifications (inactive en Phase 1) */}
          <div className="relative">
            <button
              type="button"
              disabled
              title="Notifications (bientôt disponible en Phase 3)"
              aria-label="Notifications (bientôt disponible)"
              className="relative p-2.5 rounded-full text-text-muted hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary opacity-60 cursor-not-allowed touch-target-min flex items-center justify-center"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar utilisateur */}
          <Link
            href="/profil"
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-pill bg-white border border-border shadow-1 hover:shadow-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-target-min"
            title="Consulter mon profil"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-xs">
              {profile?.avatar_url && !avatarError ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <span className="text-sm font-medium text-text max-w-[100px] md:max-w-[140px] truncate hidden sm:inline">
              {profile?.full_name?.split(" ")[0] || "Mon compte"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
