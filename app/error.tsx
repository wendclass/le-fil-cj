"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { copy } from "@/lib/copy";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error boundary caught:", error);
  }, [error]);

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
          <div className="w-16 h-16 rounded-full bg-alert/10 text-alert flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">
              {copy.errors.serverErrorTitle}
            </h1>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              {copy.errors.serverErrorDesc}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={reset} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>{copy.errors.retryButton}</span>
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
