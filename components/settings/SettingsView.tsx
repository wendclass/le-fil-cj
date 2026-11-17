"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Send,
  Info,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Share,
  PlusSquare,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface SettingsViewProps {
  profile: Profile;
}

// Convertit la clé publique VAPID en Uint8Array pour le navigateur
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

export const SettingsView: React.FC<SettingsViewProps> = ({ profile }) => {
  const { showToast } = useToast();

  const [isSupported, setIsSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // Détection iOS non-standalone
  const [isIosNonStandalone, setIsIosNonStandalone] = useState(false);

  useEffect(() => {
    // Vérification de compatibilité
    if (typeof window === "undefined") return;

    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;

    if (isIos && !isStandalone) {
      setIsIosNonStandalone(true);
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Vérifier l'état de souscription actuel
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
        setIsLoading(false);
      });
    });
  }, []);

  const handleTogglePush = async () => {
    if (!isSupported) {
      showToast("Les notifications push ne sont pas supportées par ce navigateur.", "error");
      return;
    }

    try {
      setIsLoading(true);
      const reg = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        // Désabonnement
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setIsSubscribed(false);
        showToast("Notifications désactivées sur cet appareil.", "info");
      } else {
        // Demande d'autorisation explicite
        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== "granted") {
          showToast(
            "Autorisation refusée. Tu peux la réactiver dans les paramètres de ton navigateur.",
            "error"
          );
          setIsLoading(false);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          showToast("Clé publique VAPID non configurée sur le serveur.", "error");
          setIsLoading(false);
          return;
        }

        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        // Enregistrer la souscription en base
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: newSub.toJSON() }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          showToast(errData?.error || "Erreur lors de l’enregistrement de l’abonnement.", "error");
          setIsLoading(false);
          return;
        }

        setIsSubscribed(true);
        showToast("Notifications activées avec succès !", "success");
      }
    } catch (err: any) {
      showToast(`Erreur : ${err.message || "Impossible de modifier l’abonnement"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      const res = await fetch("/api/push/test", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || copy.settings.testErrorToast, "error");
      } else {
        showToast(copy.settings.testSuccessToast, "success");
      }
    } catch {
      showToast(copy.settings.testErrorToast, "error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      {/* En-tête */}
      <div className="space-y-1">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
          {copy.settings.title}
        </h1>
        <p className="font-body text-base text-text-muted">
          {copy.settings.subtitle}
        </p>
      </div>

      {/* Guide iOS non-standalone si nécessaire */}
      {isIosNonStandalone && (
        <Card className="p-5 border-l-4 border-l-accent space-y-3 bg-[#F7E7C4]/20">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-sm">
            <Smartphone className="w-5 h-5 text-accent" />
            <span>Sur iPhone ou iPad : installe l’application</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Pour recevoir les notifications push sur iOS, Apple exige que Le Fil soit ajouté à ton écran d’accueil :
          </p>
          <ol className="text-xs text-text space-y-1.5 list-decimal list-inside pl-1 font-medium">
            <li className="flex items-center gap-1.5">
              <Share className="w-4 h-4 text-primary shrink-0" />
              <span>Appuie sur le bouton Partager en bas de Safari</span>
            </li>
            <li className="flex items-center gap-1.5">
              <PlusSquare className="w-4 h-4 text-primary shrink-0" />
              <span>Choisis « Sur l’écran d’accueil »</span>
            </li>
            <li>Ouvre ensuite Le Fil depuis ton écran d’accueil pour activer les alertes.</li>
          </ol>
        </Card>
      )}

      {/* Carte d'activation des notifications */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-text">
                {copy.settings.pushToggleLabel}
              </h2>
              <Badge variant={isSubscribed ? "success" : "neutral"}>
                {isSubscribed ? "Activé" : "Désactivé"}
              </Badge>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-md">
              {copy.settings.pushToggleDesc}
            </p>
          </div>

          <Button
            variant={isSubscribed ? "secondary" : "primary"}
            onClick={handleTogglePush}
            isLoading={isLoading}
            className="shrink-0"
          >
            {isSubscribed ? (
              <>
                <BellOff className="w-4 h-4 mr-1.5" />
                <span>Désactiver</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-1.5" />
                <span>Activer les notifications</span>
              </>
            )}
          </Button>
        </div>

        {/* Bouton de test */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm text-text">
              Tester la réception
            </h3>
            <p className="text-xs text-text-muted">
              Envoie une notification immédiate pour vérifier que ton appareil la reçoit bien.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={handleTestNotification}
            isLoading={isTesting}
            disabled={!isSubscribed}
            className="shrink-0 text-xs min-h-[38px]"
          >
            <Send className="w-4 h-4 mr-1.5 text-primary" />
            <span>{copy.settings.testButton}</span>
          </Button>
        </div>

        {permission === "denied" && (
          <div className="p-3.5 rounded-md bg-alert/10 border border-alert/30 text-alert text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Les notifications sont bloquées dans les paramètres de ton navigateur. Modifie les autorisations du site pour les réactiver.
            </span>
          </div>
        )}
      </Card>

      {/* Détail des types de notifications */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-bold text-lg text-primary">
            {copy.settings.typesSectionTitle}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {copy.settings.typesHint}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {copy.settings.types.map((type, idx) => (
            <Card key={idx} className="p-4 space-y-1 bg-surface-muted border-border/80">
              <h3 className="font-semibold text-sm text-text">
                {type.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {type.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
