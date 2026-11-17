"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#FAF8F5] text-[#1E293B] font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-[#FFF3C4] border-[1.5px] border-[#232D6B] text-[#232D6B] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-extrabold text-2xl text-[#232D6B]">
              Une erreur critique est survenue
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              L’application a rencontré un problème inattendu. Clique sur le bouton ci-dessous pour recharger.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#232D6B] hover:bg-[#1C2456] text-white font-semibold text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Réessayer</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
