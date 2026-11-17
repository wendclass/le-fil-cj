import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Configuration des clés VAPID côté serveur
const vapidPublicKey =
  process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@club-cj.org";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Client Supabase serveur sécurisé
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Envoie une notification à un utilisateur :
 * 1) Crée l'entrée dans la table `notifications` (visible dans l'application)
 * 2) Envoie une notification Web Push sur tous ses appareils abonnés
 */
export async function sendNotificationToUser(
  userId: string,
  data: {
    kind: string;
    title: string;
    body: string;
    link?: string;
  }
) {
  const supabase = getAdminSupabase();

  // 1. Insertion dans la base de données
  const { error: notifError } = await supabase.from("notifications").insert({
    user_id: userId,
    kind: data.kind,
    title: data.title.slice(0, 40), // Limite stricte 40 caractères
    body: data.body.slice(0, 90),   // Limite stricte 90 caractères
    link: data.link || "/",
  });

  if (notifError) {
    console.warn("Échec insertion notification DB :", notifError.message);
  }

  // 2. Récupérer les souscriptions push de cet utilisateur
  if (!vapidPublicKey || !vapidPrivateKey) {
    return;
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const payloadString = JSON.stringify({
    title: data.title.slice(0, 40),
    body: data.body.slice(0, 90),
    url: data.link || "/",
  });

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, payloadString);
    } catch (err: any) {
      // Si la souscription est expirée (404 Not Found ou 410 Gone), la supprimer
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`Suppression souscription expirée : ${sub.id}`);
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.warn("Erreur envoi Web Push :", err.message);
      }
    }
  }
}

/**
 * Envoie une notification à tous les membres du club
 */
export async function sendNotificationToAllMembers(data: {
  kind: string;
  title: string;
  body: string;
  link?: string;
}) {
  const supabase = getAdminSupabase();
  const { data: profiles } = await supabase.from("profiles").select("id");

  if (!profiles) return;

  for (const p of profiles) {
    await sendNotificationToUser(p.id, data);
  }
}
