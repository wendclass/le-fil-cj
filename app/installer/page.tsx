"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { copy } from "@/lib/copy";

export default function InstallerPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Détection iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);

    // Détection application déjà installée / mode standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;
    if (standalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <header className="w-full bg-white border-b border-border py-3 px-4 sm:px-8">
        <div className="max-w-content mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo variant="responsive" />
            <span className="font-display font-bold text-lg text-primary hidden sm:inline">
              {copy.app.name}
            </span>
          </Link>
          <Link href="/">
            <Button variant="secondary" className="text-xs min-h-[36px] py-1 px-3">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Retour</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Application mobile
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.install.title}
          </h1>
          <p className="font-body text-sm sm:text-base text-text-muted">
            {copy.install.subtitle}
          </p>
        </div>

        {/* Bouton d'installation native Android/Desktop si disponible */}
        {deferredPrompt && !isInstalled && (
          <Card className="p-6 bg-[#232D6B] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="p-2.5 rounded-full bg-white/10 text-accent shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-white">
                  Installer en un clic
                </h2>
                <p className="text-xs text-white/80">
                  Accède directement au fil depuis ton écran d’accueil.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleInstallClick}
              className="w-full sm:w-auto bg-accent text-[#232D6B] hover:bg-[#c99514] font-bold text-xs"
            >
              <span>{copy.install.installButton}</span>
            </Button>
          </Card>
        )}

        {isInstalled && (
          <div className="p-4 rounded-md bg-success/10 border border-success/30 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{copy.install.alreadyInstalled}</span>
          </div>
        )}

        {/* Guide Android */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="w-5 h-5 text-accent" />
            <h2 className="font-display font-bold text-base text-text">
              {copy.install.androidTitle}
            </h2>
          </div>

          <ol className="text-xs text-text space-y-2.5 list-decimal list-inside pl-1 font-medium leading-relaxed">
            <li>{copy.install.androidStep1}</li>
            <li>{copy.install.androidStep2}</li>
            <li>{copy.install.androidStep3}</li>
          </ol>
        </Card>

        {/* Guide iOS */}
        <Card className="p-6 space-y-4 bg-white border border-border">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-base text-text">
              {copy.install.iosTitle}
            </h2>
          </div>

          <ol className="text-xs text-text space-y-3 font-medium leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">1.</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>{copy.install.iosStep1}</span>
                <Share className="w-4 h-4 text-primary shrink-0" />
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">2.</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>{copy.install.iosStep2}</span>
                <PlusSquare className="w-4 h-4 text-primary shrink-0" />
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">3.</span>
              <span>{copy.install.iosStep3}</span>
            </li>
          </ol>
        </Card>
      </main>

      <PatternBand height={36} opacity={0.12} className="w-full" />
    </div>
  );
}
