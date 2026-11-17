import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowLeft, Home } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { copy } from "@/lib/copy";

export default function NotFound() {
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
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto font-display font-black text-2xl">
            404
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">
              {copy.errors.notFoundTitle}
            </h1>
            <p className="font-body text-sm text-text-muted leading-relaxed">
              {copy.errors.notFoundDesc}
            </p>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button variant="primary" className="w-full justify-center">
                <Home className="w-4 h-4 mr-2" />
                <span>{copy.errors.backHomeButton}</span>
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <PatternBand height={36} opacity={0.12} className="w-full" />
    </div>
  );
}
