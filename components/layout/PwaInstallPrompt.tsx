"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const PwaInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Vérifier si l'application est déjà en mode autonome (PWA installée)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isStandalone) return;

    // Vérifier si le message a déjà été fermé
    const isDismissed = localStorage.getItem("club_cj_install_prompt_dismissed");
    if (isDismissed) return;

    // Compteur de visites
    const rawCount = localStorage.getItem("club_cj_visit_count");
    const count = rawCount ? parseInt(rawCount, 10) + 1 : 1;
    localStorage.setItem("club_cj_visit_count", String(count));

    // Afficher uniquement à partir de la 2e visite
    if (count >= 2) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("club_cj_install_prompt_dismissed", "true");
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      role="complementary"
      aria-label="Invitation à installer l’application"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 max-w-sm w-full bg-[#232D6B] text-white p-4 rounded-lg border border-white/20 shadow-3 animate-fade-in-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-white/10 text-accent shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs sm:text-sm text-white">
              Installer Le Fil
            </h3>
            <p className="text-[11px] text-white/80 leading-snug">
              Accède au fil en plein écran et sans barre d’adresse.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 touch-target-min flex items-center justify-center shrink-0"
          aria-label="Fermer la suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={handleDismiss}
          className="text-xs text-white/80 hover:text-white hover:bg-white/10 min-h-[32px] py-1 px-2.5"
        >
          Plus tard
        </Button>
        <Link href="/installer">
          <Button
            variant="primary"
            onClick={handleDismiss}
            className="text-xs bg-accent text-[#232D6B] hover:bg-[#c99514] font-bold min-h-[32px] py-1 px-3"
          >
            Installer
          </Button>
        </Link>
      </div>
    </div>
  );
};
