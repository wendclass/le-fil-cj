import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Charger .env.local ou .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function seedPlanners() {
  console.log("--------------------------------------------------");
  console.log("Le Fil du bureau CJ : Amorçage des planificateurs");
  console.log("--------------------------------------------------");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawEmails = process.env.INITIAL_PLANNER_EMAILS;

  if (!supabaseUrl) {
    console.error("Erreur : NEXT_PUBLIC_SUPABASE_URL n'est pas configuré.");
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error("Erreur : SUPABASE_SERVICE_ROLE_KEY n'est pas configuré.");
    console.error("Cette clé serveur est indispensable pour insérer les planificateurs initiaux.");
    process.exit(1);
  }

  if (!rawEmails || rawEmails.trim() === "") {
    console.error("Erreur : INITIAL_PLANNER_EMAILS n'est pas configuré.");
    console.error("Format attendu : INITIAL_PLANNER_EMAILS=\"planificateur1@gmail.com,planificateur2@gmail.com\"");
    process.exit(1);
  }

  const emails = rawEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    console.error("Erreur : Aucune adresse e-mail valide trouvée dans INITIAL_PLANNER_EMAILS.");
    process.exit(1);
  }

  console.log(`Initialisation avec Supabase URL : ${supabaseUrl}`);
  console.log(`Adresses à enregistrer (${emails.length}) :`, emails);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const email of emails) {
    const { data, error } = await supabase
      .from("invitations")
      .upsert(
        {
          email,
          role: "planner",
        },
        { onConflict: "email" }
      )
      .select();

    if (error) {
      console.error(`Échec pour l'adresse ${email} :`, error.message);
    } else {
      console.log(`Succès : ${email} a été enregistré avec le rôle "planner".`);
    }
  }

  console.log("--------------------------------------------------");
  console.log("Amorçage terminé avec succès.");
  console.log("--------------------------------------------------");
}

seedPlanners().catch((err) => {
  console.error("Exception lors de l'exécution de l'amorçage :", err);
  process.exit(1);
});
