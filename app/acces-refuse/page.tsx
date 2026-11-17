"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

export default function AccesRefusePage() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  const handleRetryWithAnotherAccount = async () => {
    try {
      setIsResetting(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/connexion");
    } catch {
      router.push("/connexion");
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <PatternBand height={48} className="w-full" />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card className="text-center py-10 px-6 sm:px-8 space-y-8 shadow-2">
            <div className="flex justify-center">
              <Logo variant="full" />
            </div>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF3C4] border-[1.5px] border-primary text-primary mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-text leading-snug">
                {copy.accessDenied.title}
              </h1>
              <p className="font-body text-base text-text-muted leading-relaxed">
                {copy.accessDenied.description}
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={handleRetryWithAnotherAccount}
                isLoading={isResetting}
                className="w-full"
              >
                {copy.accessDenied.switchAccount}
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <PatternBand height={36} className="w-full" />
    </div>
  );
}
