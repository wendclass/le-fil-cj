"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, User, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { PatternBand } from "@/components/ui/PatternBand";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface NameConfirmationFormProps {
  profile: Profile;
  fromBienvenue?: boolean;
  returnUrl?: string;
}

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž'\s-]+$/;

export const NameConfirmationForm: React.FC<NameConfirmationFormProps> = ({
  profile,
  fromBienvenue = false,
  returnUrl,
}) => {
  const router = useRouter();
  const { showToast } = useToast();

  // Initialisation du prénom et nom
  const initialFirstName =
    profile.first_name ||
    (profile.full_name ? profile.full_name.split(" ")[0] : "");
  const initialLastName =
    profile.last_name ||
    (profile.full_name
      ? profile.full_name.substring(initialFirstName.length).trim()
      : "");

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    setFirstNameError(null);
    setLastNameError(null);
    setGeneralError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    // Validation Prénom
    if (!trimmedFirst) {
      setFirstNameError(copy.names.errorFirstName);
      isValid = false;
    } else if (trimmedFirst.length < 2 || trimmedFirst.length > 40) {
      setFirstNameError(copy.names.errorFirstName);
      isValid = false;
    } else if (!NAME_REGEX.test(trimmedFirst)) {
      setFirstNameError(copy.names.errorCharacters);
      isValid = false;
    }

    // Validation Nom
    if (!trimmedLast) {
      setLastNameError(copy.names.errorLastName);
      isValid = false;
    } else if (trimmedLast.length < 2 || trimmedLast.length > 40) {
      setLastNameError(copy.names.errorLastName);
      isValid = false;
    } else if (!NAME_REGEX.test(trimmedLast)) {
      setLastNameError(copy.names.errorCharacters);
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const supabase = createClient();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = `${trimmedFirst} ${trimmedLast}`;

    try {
      // 1. Tenter l'appel RPC sécurisé confirm_my_name
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "confirm_my_name",
        {
          p_first_name: trimmedFirst,
          p_last_name: trimmedLast,
        }
      );

      if (rpcError) {
        // En cas de RPC non encore déployée, fallback update direct sur profiles
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: trimmedFirst,
            last_name: trimmedLast,
            full_name: fullName,
            name_confirmed_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (updateError) {
          throw updateError;
        }
      } else if (rpcData && !rpcData.success) {
        setGeneralError(rpcData.error || "Impossible d’enregistrer ce nom.");
        setIsLoading(false);
        return;
      }

      showToast(copy.names.successUpdated, "success");

      // Redirection selon le parcours
      if (returnUrl) {
        router.push(returnUrl);
      } else if (fromBienvenue) {
        router.push("/bienvenue");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setGeneralError(
        err.message || "Une erreur est survenue lors de l’enregistrement."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <PatternBand height={40} opacity={0.12} className="w-full" />

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2 border border-border">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo variant="responsive" />
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
              {copy.names.title}
            </h1>
            <p className="font-body text-sm sm:text-base text-text-muted leading-relaxed">
              {copy.names.subtitle}
            </p>
          </div>

          {generalError && (
            <div
              role="alert"
              className="p-3.5 rounded-md bg-[#FFF3C4] border-[1.5px] border-[#232D6B] text-[#232D6B] text-xs font-semibold flex items-center gap-2.5 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#232D6B]" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Prénom */}
            <div className="space-y-1.5">
              <label
                htmlFor="first_name"
                className="block font-body text-xs font-bold uppercase tracking-wider text-text"
              >
                {copy.names.firstNameLabel} <span className="text-[#232D6B]">*</span>
              </label>
              <div className="relative">
                <Input
                  id="first_name"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (firstNameError) setFirstNameError(null);
                  }}
                  placeholder={copy.names.firstNamePlaceholder}
                  maxLength={40}
                  required
                  autoFocus
                  className="pl-10"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {firstNameError && (
                <div
                  role="alert"
                  className="mt-1.5 p-2.5 rounded-md bg-[#FFF3C4] border-[1.5px] border-[#232D6B] text-[#232D6B] text-xs font-semibold flex items-center gap-2 animate-fade-in"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#232D6B]" />
                  <span>{firstNameError}</span>
                </div>
              )}
            </div>

            {/* Nom */}
            <div className="space-y-1.5">
              <label
                htmlFor="last_name"
                className="block font-body text-xs font-bold uppercase tracking-wider text-text"
              >
                {copy.names.lastNameLabel} <span className="text-[#232D6B]">*</span>
              </label>
              <div className="relative">
                <Input
                  id="last_name"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (lastNameError) setLastNameError(null);
                  }}
                  placeholder={copy.names.lastNamePlaceholder}
                  maxLength={40}
                  required
                  className="pl-10"
                />
                <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {lastNameError && (
                <div
                  role="alert"
                  className="mt-1.5 p-2.5 rounded-md bg-[#FFF3C4] border-[1.5px] border-[#232D6B] text-[#232D6B] text-xs font-semibold flex items-center gap-2 animate-fade-in"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#232D6B]" />
                  <span>{lastNameError}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full justify-center text-base"
              >
                <span>{copy.names.submitButton}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        </Card>
      </main>

      <PatternBand height={40} opacity={0.12} className="w-full" />
    </div>
  );
};
