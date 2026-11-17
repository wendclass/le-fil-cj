"use client";

import React, { useState } from "react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

export default function ConnexionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = createClient();

      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      const redirectTo = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Erreur d'authentification Google :", error.message);
        setErrorMessage(copy.app.errorNetwork);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
      setErrorMessage(copy.app.errorGeneric);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Motif panafricain supérieur */}
      <PatternBand height={48} className="w-full" />

      {/* Contenu centré */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card className="text-center py-10 px-6 sm:px-8 space-y-8 shadow-2 border-border/80">
            {/* Logo du Club CJ dans sa pastille blanche */}
            <div className="flex justify-center">
              <Logo variant="full" priority />
            </div>

            {/* Titre et sous-titre */}
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
                {copy.login.title}
              </h1>
              <p className="font-body text-base text-text-muted">
                {copy.login.subtitle}
              </p>
            </div>

            {/* Message d'erreur éventuel */}
            {errorMessage && (
              <div
                className="bg-alert/10 border border-alert/30 text-alert p-3 rounded-sm text-sm font-medium animate-fade-in-up"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {/* Bouton pilule unique : Continuer avec Google */}
            <div className="space-y-4">
              <Button
                variant="primary"
                onClick={handleGoogleSignIn}
                isLoading={isLoading}
                className="w-full text-base font-semibold shadow-1 hover:shadow-2"
                aria-label={copy.login.ariaButton}
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? copy.login.connecting : copy.login.googleButton}</span>
              </Button>

              {/* Ligne discrète obligatoire */}
              <p className="text-xs text-text-muted leading-relaxed">
                {copy.login.restrictedNotice}
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Motif panafricain inférieur */}
      <PatternBand height={36} className="w-full" />
    </div>
  );
}
