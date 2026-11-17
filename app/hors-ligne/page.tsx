"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { copy } from "@/lib/copy";

export default function HorsLignePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
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
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2">
          <div className="w-16 h-16 rounded-full bg-[#FFF3C4] border-[1.5px] border-primary text-primary flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">
              {copy.offline.title}
            </h1>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              {copy.offline.body}
            </p>
          </div>

          <div className="p-3 rounded-md bg-surface-muted text-xs text-text-muted border border-border">
            <span>{copy.offline.offlineBannerText}</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={handleRetry} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>{copy.offline.retryButton}</span>
            </Button>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                <span>Accueil</span>
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <PatternBand height={36} opacity={0.12} className="w-full" />
    </div>
  );
}
