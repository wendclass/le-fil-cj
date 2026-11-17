import React from "react";
import { AppHeader } from "./AppHeader";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileTabBar } from "./MobileTabBar";
import type { Profile } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  profile?: Profile | null;
}

export const AppShell: React.FC<AppShellProps> = ({ children, profile }) => {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <AppHeader profile={profile} />

      <div className="flex-1 flex w-full">
        <DesktopSidebar profile={profile} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-28 md:pb-12">
          <div className="max-w-content mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <MobileTabBar profile={profile} />
    </div>
  );
};
