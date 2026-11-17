import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function IndicateursPage() {
  const { profile } = await requireAuth();

  return (
    <AppShell profile={profile}>
      <PlaceholderPage
        title={copy.nav.metrics}
        description="Les indicateurs de ponctualité, d'assiduité et la série de suivi arrivent en Phase 3."
      />
    </AppShell>
  );
}
