"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckSquare,
  Eye,
  Bell,
  ArrowRight,
  Check,
  Smartphone,
  Share,
  PlusSquare,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function BienvenuePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFinishing, setIsFinishing] = useState(false);

  // Push notifications state
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isIosNonStandalone, setIsIosNonStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isIos && !isStandalone) {
      setIsIosNonStandalone(true);
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setIsPushSubscribed(true);
      } else if (Notification.permission === "denied") {
        setPermissionDenied(true);
      }
    }
  }, []);

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else handleFinish();
  };

  const handleFinish = () => {
    setIsFinishing(true);
    router.push("/");
  };

  const handleActivatePush = async () => {
    try {
      setIsSubscribing(true);

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        showToast("Les notifications ne sont pas prises en charge par ce navigateur.", "error");
        setIsSubscribing(false);
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPermissionDenied(true);
        showToast("Tu pourras les activer plus tard dans les paramètres.", "info");
        setIsSubscribing(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setIsPushSubscribed(true);
        setIsSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setIsPushSubscribed(true);
      showToast("Notifications activées avec succès !", "success");
    } catch (err: any) {
      console.warn("Erreur activation push :", err);
      showToast("Impossible d’activer les notifications sur cet appareil.", "error");
    } finally {
      setIsSubscribing(false);
    }
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

                  <div className="flex items-start gap-3.5 p-3.5 rounded-md bg-accent/20 text-[#232D6B] border border-accent/40">
                    <div className="p-2 rounded-full bg-white/60 text-[#232D6B] shrink-0 mt-0.5">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-[#232D6B]">
                        {copy.welcome.step2.badges[1].title}
                      </h2>
                      <p className="text-xs text-[#232D6B]/80 mt-0.5">
                        {copy.welcome.step2.badges[1].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3.5 rounded-md bg-success/15 text-success border border-success/30">
                    <div className="p-2 rounded-full bg-white text-success shrink-0 mt-0.5">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-success">
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

            {/* Écran 3 : Notifications & Entrée */}
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

                {/* Cas iOS non-standalone */}
                {isIosNonStandalone ? (
                  <div className="p-4 rounded-md border border-accent/40 bg-[#F7E7C4]/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-display font-semibold text-xs">
                      <Smartphone className="w-4 h-4 text-accent" />
                      <span>Sur iPhone/iPad : ajoute à l’écran d’accueil</span>
                    </div>
                    <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside pl-1">
                      <li>Touche Partager dans Safari</li>
                      <li>Choisis « Sur l’écran d’accueil »</li>
                      <li>Ouvre Le Fil pour activer les alertes</li>
                    </ol>
                  </div>
                ) : isPushSubscribed ? (
                  /* Déjà abonné */
                  <div className="p-4 rounded-md bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-semibold">
                      Notifications activées sur cet appareil. Tu recevras les convocations et échéances.
                    </span>
                  </div>
                ) : permissionDenied ? (
                  /* Refusé dans le navigateur */
                  <div className="p-4 rounded-md bg-surface-muted border border-border text-xs space-y-1">
                    <div className="flex items-center gap-2 text-text font-semibold">
                      <AlertTriangle className="w-4 h-4 text-alert" />
                      <span>Notifications non autorisées</span>
                    </div>
                    <p className="text-text-muted">
                      Tu pourras les autoriser plus tard depuis les réglages de ton navigateur ou dans la section Paramètres.
                    </p>
                  </div>
                ) : (
                  /* Bouton d'activation push */
                  <div className="p-4 rounded-md border border-border bg-surface-muted/60 space-y-3">
                    <div className="flex items-center gap-2 text-primary font-display font-semibold text-xs">
                      <Bell className="w-4 h-4 text-accent" />
                      <span>Ne rate aucune convocation ni échéance</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Active les alertes pour être prévenu dès qu’une réunion est programmée ou qu’une décision attend ta validation.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleActivatePush}
                      isLoading={isSubscribing}
                      className="w-full text-xs min-h-[38px] py-1.5"
                    >
                      <Bell className="w-4 h-4 mr-1.5" />
                      <span>Activer les notifications</span>
                    </Button>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    variant={isPushSubscribed ? "primary" : "secondary"}
                    onClick={handleFinish}
                    isLoading={isFinishing}
                    className="w-full justify-center order-2 sm:order-1"
                  >
                    <span>{isPushSubscribed ? "Entrer sur Le Fil" : "Plus tard"}</span>
                  </Button>

                  {!isPushSubscribed && !permissionDenied && !isIosNonStandalone && (
                    <Button
                      variant="primary"
                      onClick={handleFinish}
                      className="w-full justify-center order-1 sm:order-2"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      <span>{copy.welcome.step3.enterButton}</span>
                    </Button>
                  )}
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
