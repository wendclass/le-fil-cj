"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface MarkAsReadProps {
  entityType: "task" | "decision" | "meeting";
  entityId: string;
  userId: string;
}

export const MarkAsRead: React.FC<MarkAsReadProps> = ({
  entityType,
  entityId,
  userId,
}) => {
  useEffect(() => {
    if (!entityId || !userId) return;

    const supabase = createClient();
    supabase
      .from("reads")
      .upsert(
        {
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
          first_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entity_type,entity_id" }
      )
      .then(({ error }) => {
        if (error) {
          console.warn("Erreur accusé de lecture :", error.message);
        }
      });
  }, [entityType, entityId, userId]);

  return null;
};
