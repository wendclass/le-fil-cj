import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<{ profile: Profile | null; user: any }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { profile: profile as Profile | null, user };
}

export async function requireAuth(): Promise<{ profile: Profile; user: any }> {
  const { profile, user } = await getCurrentProfile();

  if (!user) {
    redirect("/connexion");
  }

  if (!profile) {
    redirect("/acces-refuse");
  }

  return { profile, user };
}

export async function requirePlanner(): Promise<{ profile: Profile; user: any }> {
  const { profile, user } = await requireAuth();

  if (profile.role !== "planner") {
    redirect("/");
  }

  return { profile, user };
}
