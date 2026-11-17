import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const supabase = await createClient();

  // Échange du code d'authentification pour obtenir la session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Erreur exchangeCodeForSession :", exchangeError.message);
    return NextResponse.redirect(new URL("/connexion?error=auth_error", request.url));
  }

  // Appel de la fonction claim_invitation() (security definer)
  // qui vérifie l'existence de l'e-mail dans invitations et crée le profil
  const { data: claimResult, error: claimError } = await supabase.rpc("claim_invitation");

  if (claimError) {
    console.error("Erreur lors de claim_invitation :", claimError.message);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/acces-refuse", request.url));
  }

  if (!claimResult || !claimResult.success) {
    // Adresse e-mail non invitée : déconnexion immédiate et redirection
    console.warn("Connexion refusée : compte non invité.");
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/acces-refuse", request.url));
  }

  // Redirection selon première connexion ou retour habituel
  if (claimResult.first_login) {
    return NextResponse.redirect(new URL("/mon-nom?from=bienvenue", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
