import { getCurrentProfile } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PatternBand } from "@/components/ui/PatternBand";
import { ShieldCheck } from "lucide-react";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function AProposPage() {
  const { profile } = await getCurrentProfile();

  return (
    <AppShell profile={profile}>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.about.title}
          </h1>
          <p className="font-body text-base text-text-muted mt-1">
            {copy.about.subtitle}
          </p>
        </div>

        <Card className="p-6 sm:p-8 space-y-6 overflow-hidden">
          <PatternBand height={36} opacity={0.12} />

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0 mt-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-4">
              <p className="font-body text-base text-text leading-relaxed">
                {copy.about.body}
              </p>
              <p className="text-xs text-text-muted">
                {copy.about.clubDetails}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
