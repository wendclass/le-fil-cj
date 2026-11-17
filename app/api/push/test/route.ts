import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationToUser } from "@/lib/push";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Vérification du débit : maximum 5 notifications de test par heure par utilisateur
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "test")
      .gte("created_at", oneHourAgo);

    if (count !== null && count >= 5) {
      return NextResponse.json(
        { error: "Limite atteinte : 5 notifications de test par heure au maximum." },
        { status: 429 }
      );
    }

    await sendNotificationToUser(user.id, {
      kind: "test",
      title: "Notification de test",
      body: "Bravo ! Les notifications fonctionnent sur cet appareil.",
      link: "/parametres",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
