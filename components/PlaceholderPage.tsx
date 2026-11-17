import React from "react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { copy } from "@/lib/copy";
import { Sparkles } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = copy.app.soonDescription,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-text">
          {title}
        </h1>
      </div>

      <Card className="text-center py-12 md:py-16 space-y-6 overflow-hidden relative">
        <PatternBand height={44} className="mb-2" />

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>

        <div className="max-w-md mx-auto space-y-2 px-4">
          <h2 className="font-display font-bold text-xl text-primary">
            {copy.app.soonAvailable}
          </h2>
          <p className="text-text-muted text-base leading-relaxed">
            {description}
          </p>
        </div>

        <PatternBand height={44} className="mt-4" />
      </Card>
    </div>
  );
};
