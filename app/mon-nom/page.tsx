import { requireAuth } from "@/lib/auth";
import { NameConfirmationForm } from "@/components/auth/NameConfirmationForm";

export const dynamic = "force-dynamic";

export default async function MonNomPage({
  searchParams,
}: {
  searchParams?: { from?: string; returnUrl?: string };
}) {
  // allowUnconfirmedName permet d'accéder à cette page sans boucle de redirection
  const { profile } = await requireAuth({ allowUnconfirmedName: true });

  return (
    <NameConfirmationForm
      profile={profile}
      fromBienvenue={searchParams?.from === "bienvenue"}
      returnUrl={searchParams?.returnUrl}
    />
  );
}
