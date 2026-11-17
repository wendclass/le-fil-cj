"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark" | "responsive";
  priority?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  variant = "responsive",
  priority = false,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [markError, setMarkError] = useState(false);

  // Logo complet ou mark
  // /brand/club-cj-logo.png et /brand/club-cj-mark.png
  const showMarkOnMobile = variant === "responsive";
  const forceMark = variant === "mark";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center bg-white rounded-pill border border-border shadow-1 px-3 py-1.5 transition-shadow select-none",
        className
      )}
      role="img"
      aria-label="Logo Club CJ"
    >
      {/* Pictogramme mark seul si demandé ou sur mobile */}
      {(forceMark || showMarkOnMobile) && !markError && (
        <div
          className={cn(
            "relative items-center justify-center h-8 w-8",
            forceMark ? "flex" : "flex md:hidden"
          )}
        >
          <Image
            src="/brand/club-cj-mark.png"
            alt="Club CJ"
            width={32}
            height={32}
            className="object-contain max-h-8 w-auto"
            onError={() => setMarkError(true)}
            priority={priority}
          />
        </div>
      )}

      {/* Logo complet pour desktop ou fallback si mark indisponible */}
      {(!forceMark || markError) && !logoError && (
        <div
          className={cn(
            "relative items-center justify-center h-8",
            showMarkOnMobile && !markError ? "hidden md:flex" : "flex"
          )}
        >
          <Image
            src="/brand/club-cj-logo.png"
            alt="Club CJ"
            width={120}
            height={32}
            className="object-contain max-h-8 w-auto"
            onError={() => setLogoError(true)}
            priority={priority}
          />
        </div>
      )}

      {/* Emplacement vide nommé « Logo Club CJ » si le fichier est absent */}
      {logoError && (
        <span className="text-primary font-display font-bold text-xs tracking-wide uppercase px-1">
          {copy.app.logoPlaceholder}
        </span>
      )}
    </div>
  );
};
