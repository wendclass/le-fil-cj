"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { copy } from "@/lib/copy";

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-success text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow-sm animate-fade-in transition-all z-50"
      >
        <Wifi className="w-4 h-4 shrink-0" />
        <span>Connexion rétablie. Données synchronisées.</span>
      </aside>
    );
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="w-full bg-[#232D6B] text-white text-xs font-medium py-2.5 px-4 flex items-center justify-center gap-2 shadow-md animate-fade-in z-50 border-b border-white/20"
    >
      <WifiOff className="w-4 h-4 text-accent shrink-0" />
      <span>{copy.offline.offlineBannerText}</span>
    </aside>
  );
};
