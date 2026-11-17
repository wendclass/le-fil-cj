import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotificationToUser } from "@/lib/push";
import { formatOuagaTime, formatOuagaDate, OUAGA_TIMEZONE } from "@/lib/date";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  return handleReminders(request);
}

export async function POST(request: Request) {
  return handleReminders(request);
}

async function handleReminders(request: Request) {
  const supabase = getAdminClient();
  const now = new Date();

  // Obtenir la date et l'heure courante dans le fuseau Africa/Ouagadougou
  const nowOuagaStr = now.toLocaleString("en-US", { timeZone: OUAGA_TIMEZONE });
  const nowOuaga = new Date(nowOuagaStr);
  const currentHour = nowOuaga.getHours();
  const currentMinute = nowOuaga.getMinutes();

  let sentCount = 0;

  // Récupérer tous les membres
  const { data: profiles } = await supabase.from("profiles").select("id");
  const allUserIds = (profiles || []).map((p) => p.id);

  // 1. RAPPEL VEILLE DE RÉUNION (à 18h00 la veille)
  // Réunions prévues démarrant demain
  const tomorrowStart = new Date(nowOuaga);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Vérifier si l'heure est proche de 18h00 (ou dans la fenêtre de tolérance de 30 min)
  if (currentHour === 18 && currentMinute <= 35) {
    const { data: upcomingTomorrow } = await supabase
      .from("meetings")
      .select("*, attendance(user_id, rsvp)")
      .eq("status", "planned")
      .gte("starts_at", tomorrowStart.toISOString())
      .lte("starts_at", tomorrowEnd.toISOString());

    if (upcomingTomorrow) {
      for (const meeting of upcomingTomorrow) {
        const declinedUserIds = new Set(
          (meeting.attendance as { user_id: string; rsvp: string }[])
            ?.filter((a) => a.rsvp === "no")
            .map((a) => a.user_id) || []
        );

        for (const userId of allUserIds) {
          if (declinedUserIds.has(userId)) continue;

          // Vérifier reminder_log
          const { data: exists } = await supabase
            .from("reminder_log")
            .select("user_id")
            .eq("user_id", userId)
            .eq("kind", "meeting_eve")
            .eq("ref_id", meeting.id)
            .maybeSingle();

          if (!exists) {
            await supabase.from("reminder_log").insert({
              user_id: userId,
              kind: "meeting_eve",
              ref_id: meeting.id,
              sent_at: now.toISOString(),
            });

            await sendNotificationToUser(userId, {
              kind: "meeting_eve",
              title: "C’est demain",
              body: `${meeting.title} à ${formatOuagaTime(meeting.starts_at)}`,
              link: `/reunions/${meeting.id}`,
            });
            sentCount++;
          }
        }
      }
    }
  }

  // 2. RAPPEL 2 HEURES AVANT LE DÉBUT DE LA RÉUNION
  // Réunions prévues démarrant entre dans 1h30 et 2h30
  const in90Min = new Date(now.getTime() + 90 * 60 * 1000).toISOString();
  const in150Min = new Date(now.getTime() + 150 * 60 * 1000).toISOString();

  const { data: upcoming2h } = await supabase
    .from("meetings")
    .select("*, attendance(user_id, rsvp)")
    .eq("status", "planned")
    .gte("starts_at", in90Min)
    .lte("starts_at", in150Min);

  if (upcoming2h) {
    for (const meeting of upcoming2h) {
      const declinedUserIds = new Set(
        (meeting.attendance as { user_id: string; rsvp: string }[])
          ?.filter((a) => a.rsvp === "no")
          .map((a) => a.user_id) || []
      );

      for (const userId of allUserIds) {
        if (declinedUserIds.has(userId)) continue;

        const { data: exists } = await supabase
          .from("reminder_log")
          .select("user_id")
          .eq("user_id", userId)
          .eq("kind", "meeting_2h")
          .eq("ref_id", meeting.id)
          .maybeSingle();

        if (!exists) {
          await supabase.from("reminder_log").insert({
            user_id: userId,
            kind: "meeting_2h",
            ref_id: meeting.id,
            sent_at: now.toISOString(),
          });

          await sendNotificationToUser(userId, {
            kind: "meeting_2h",
            title: "Dans 2 heures",
            body: `${meeting.title}, ${meeting.location || "Club CJ"}`,
            link: `/reunions/${meeting.id}`,
          });
          sentCount++;
        }
      }
    }
  }

  // 3. RAPPELS DE TÂCHES : ÉCHÉANCE DANS 2 JOURS (à 9h00 Ouaga)
  if (currentHour === 9 && currentMinute <= 35) {
    const in2DaysDate = new Date(nowOuaga);
    in2DaysDate.setDate(in2DaysDate.getDate() + 2);
    const in2DaysStr = in2DaysDate.toISOString().split("T")[0];

    const { data: tasksIn2Days } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .eq("due_date", in2DaysStr);

    if (tasksIn2Days) {
      for (const task of tasksIn2Days) {
        const { data: exists } = await supabase
          .from("reminder_log")
          .select("user_id")
          .eq("user_id", task.assignee_id)
          .eq("kind", "task_due_2d")
          .eq("ref_id", task.id)
          .maybeSingle();

        if (!exists) {
          await supabase.from("reminder_log").insert({
            user_id: task.assignee_id,
            kind: "task_due_2d",
            ref_id: task.id,
            sent_at: now.toISOString(),
          });

          await sendNotificationToUser(task.assignee_id, {
            kind: "task_due_2d",
            title: "Échéance dans 2 jours",
            body: task.title,
            link: `/taches/${task.id}`,
          });
          sentCount++;
        }
      }
    }
  }

  // 4. RAPPELS DE TÂCHES : ÉCHÉANCE AUJOURD'HUI (à 8h00 Ouaga)
  if (currentHour === 8 && currentMinute <= 35) {
    const todayStr = nowOuaga.toISOString().split("T")[0];

    const { data: tasksToday } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .eq("due_date", todayStr);

    if (tasksToday) {
      for (const task of tasksToday) {
        const { data: exists } = await supabase
          .from("reminder_log")
          .select("user_id")
          .eq("user_id", task.assignee_id)
          .eq("kind", "task_due_today")
          .eq("ref_id", task.id)
          .maybeSingle();

        if (!exists) {
          await supabase.from("reminder_log").insert({
            user_id: task.assignee_id,
            kind: "task_due_today",
            ref_id: task.id,
            sent_at: now.toISOString(),
          });

          await sendNotificationToUser(task.assignee_id, {
            kind: "task_due_today",
            title: "C’est pour aujourd’hui",
            body: task.title,
            link: `/taches/${task.id}`,
          });
          sentCount++;
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent_reminders: sentCount,
    executed_at: now.toISOString(),
  });
}
