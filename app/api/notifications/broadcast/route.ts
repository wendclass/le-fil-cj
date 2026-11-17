import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationToUser, sendNotificationToAllMembers } from "@/lib/push";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { event, data } = body;

  try {
    if (event === "meeting_created") {
      // Convocation : tous les membres
      await sendNotificationToAllMembers({
        kind: "meeting_convocation",
        title: "Nouvelle réunion",
        body: `${data.title}, ${data.dateTimeStr}`,
        link: `/reunions/${data.id}`,
      });
    } else if (event === "meeting_live") {
      // Réunion en direct : tous les membres
      await sendNotificationToAllMembers({
        kind: "meeting_live",
        title: "La réunion commence",
        body: data.title,
        link: `/reunions/${data.id}`,
      });
    } else if (event === "decisions_published") {
      // Décisions publiées : tous les membres
      await sendNotificationToAllMembers({
        kind: "decisions_published",
        title: `${data.count} décision${data.count > 1 ? "s" : ""} à valider`,
        body: "Il te reste 48 h",
        link: "/decisions",
      });
    } else if (event === "task_assigned") {
      // Tâche assignée : responsable
      await sendNotificationToUser(data.assigneeId, {
        kind: "task_assigned",
        title: "Nouvelle tâche",
        body: `${data.title}, pour le ${data.dueDateStr}`,
        link: `/taches/${data.id}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
