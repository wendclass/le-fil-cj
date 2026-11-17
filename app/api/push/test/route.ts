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
