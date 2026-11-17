"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckSquare, Eye, Bell, ArrowRight, Check } from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copy } from "@/lib/copy";

export default function BienvenuePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else handleFinish();
  };

  const handleFinish = () => {
    setIsFinishing(true);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <PatternBand height={48} className="w-full" />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg mx-auto space-y-6">
          <Card className="py-8 px-6 sm:px-10 space-y-8 shadow-2">
            {/* Logo */}
            <div className="flex justify-between items-center">
              <Logo variant="responsive" />
              {/* Indicateur de progression en points */}
              <div className="flex items-center gap-2" aria-label={`Étape ${step} sur 3`}>
                {[1, 2, 3].map((dot) => (
                  <div
                    key={dot}
                    className={`h-2.5 rounded-pill transition-all duration-base ${
                      dot === step
                        ? "w-8 bg-primary"
                        : dot < step
                        ? "w-2.5 bg-primary/40"
                        : "w-2.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Écran 1 : Bienvenue */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent font-display">
                    {copy.welcome.step1.stepNumber}
                  </span>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary leading-tight">
                    {copy.welcome.step1.title}
                  </h1>
                  <p className="font-body text-base sm:text-lg text-text-muted leading-relaxed">
                    {copy.welcome.step1.body}
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className="w-full justify-between"
                  >
                    <span>{copy.welcome.step1.nextButton}</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Écran 2 : Comment ça marche */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent font-display">
                    {copy.welcome.step2.stepNumber}
                  </span>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary leading-tight">
                    {copy.welcome.step2.title}
                  </h1>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3.5 p-3.5 rounded-md bg-surface-muted border border-border">
                    <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-text">
                        {copy.welcome.step2.badges[0].title}
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        {copy.welcome.step2.badges[0].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-md bg-surface-muted border border-border">
                    <div className="p-2 rounded-full bg-accent/20 text-[#232D6B] shrink-0 mt-0.5">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-text">
                        {copy.welcome.step2.badges[1].title}
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        {copy.welcome.step2.badges[1].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-md bg-surface-muted border border-border">
                    <div className="p-2 rounded-full bg-success/15 text-success shrink-0 mt-0.5">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-text">
                        {copy.welcome.step2.badges[2].title}
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        {copy.welcome.step2.badges[2].description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className="w-full justify-between"
                  >
                    <span>{copy.welcome.step2.nextButton}</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Écran 3 : Prêt ? */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent font-display">
                    {copy.welcome.step3.stepNumber}
                  </span>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary leading-tight">
                    {copy.welcome.step3.title}
                  </h1>
                  <p className="font-body text-base text-text-muted leading-relaxed">
                    {copy.welcome.step3.body}
                  </p>
                </div>

                {/* Emplacement réservé pour l'activation des notifications en Phase 3 */}
                <div className="p-4 rounded-md border border-dashed border-border bg-surface-muted/50 space-y-1.5">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Bell className="w-4 h-4 text-accent" />
                    <span className="text-xs font-display font-semibold text-text">
                      {copy.welcome.step3.pushNoticeTitle}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {copy.welcome.step3.pushNoticeBody}
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    onClick={handleFinish}
                    isLoading={isFinishing}
                    className="w-full justify-center"
                  >
                    <Check className="w-5 h-5 mr-1" />
                    <span>{copy.welcome.step3.enterButton}</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <PatternBand height={36} className="w-full" />
    </div>
  );
}
