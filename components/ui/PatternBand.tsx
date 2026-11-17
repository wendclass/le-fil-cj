import React from "react";
import { cn } from "@/lib/utils";

interface PatternBandProps {
  className?: string;
  height?: number;
  opacity?: number; // Plafonnée à 12% (0.12)
}

/**
 * Frise géométrique abstraite inspirée des textiles d'Afrique de l'Ouest
 * (losanges, chevrons, triangles, lignes brisées)
 * Trait fin ocre (#D99A1E) et bleu marine (#232D6B), opacité max 12%.
 */
export const PatternBand: React.FC<PatternBandProps> = ({
  className,
  height = 40,
  opacity = 0.1,
}) => {
  // Garantir que l'opacité ne dépasse jamais 12% conformément à la règle stricte
  const safeOpacity = Math.min(Math.max(opacity, 0), 0.12);

  return (
    <div
      className={cn("w-full overflow-hidden select-none pointer-events-none", className)}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="repeat-x"
        style={{ opacity: safeOpacity }}
      >
        <defs>
          <pattern
            id="african-geometric-pattern"
            width="80"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            {/* Lignes structurelles bleu marine */}
            <path
              d="M 0 20 L 20 0 L 40 20 L 60 0 L 80 20 L 60 40 L 40 20 L 20 40 Z"
              fill="none"
              stroke="#232D6B"
              strokeWidth="1.25"
            />
            {/* Losange intérieur ocre */}
            <path
              d="M 20 20 L 30 10 L 40 20 L 30 30 Z"
              fill="none"
              stroke="#D99A1E"
              strokeWidth="1.25"
            />
            <path
              d="M 60 20 L 70 10 L 80 20 L 70 30 Z"
              fill="none"
              stroke="#D99A1E"
              strokeWidth="1.25"
            />
            {/* Chevrons et triangles géométriques */}
            <path
              d="M 10 10 L 20 20 L 10 30"
              fill="none"
              stroke="#232D6B"
              strokeWidth="1"
            />
            <path
              d="M 50 10 L 60 20 L 50 30"
              fill="none"
              stroke="#232D6B"
              strokeWidth="1"
            />
            {/* Ligne brisée ocre de séparation */}
            <path
              d="M 0 20 H 10 M 30 20 H 50 M 70 20 H 80"
              stroke="#D99A1E"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#african-geometric-pattern)" />
      </svg>
    </div>
  );
};
