/**
 * Utilitaires de formatage de dates et d'heures.
 * Fuseau horaire : Africa/Ouagadougou partout.
 * Format français : 24 h (ex : « mar. 17 nov., 14 h 30 »).
 */

export const OUAGA_TIMEZONE = "Africa/Ouagadougou";

/**
 * Formate une date et heure dans le fuseau Africa/Ouagadougou.
 * Exemple de sortie : « mar. 17 nov., 14 h 30 »
 */
export function formatOuagaDateTime(dateInput: string | Date | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: OUAGA_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value.replace(".", "") || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value.replace(".", "") || "";
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "";

  return `${weekday}. ${day} ${month}., ${hour} h ${minute}`;
}

/**
 * Formate une date simple (ex : « 17 nov. 2026 »).
 */
export function formatOuagaDate(dateInput: string | Date | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: OUAGA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formatter.format(date);
}

/**
 * Formate uniquement l'heure (ex : « 14 h 30 »).
 */
export function formatOuagaTime(dateInput: string | Date | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: OUAGA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "";

  return `${hour} h ${minute}`;
}

/**
 * Calcule le compte à rebours jusqu'à une date future (ex : « dans 2 j 4 h » ou « dans 45 min »).
 */
export function formatCountdown(targetInput: string | Date): string {
  const target = typeof targetInput === "string" ? new Date(targetInput) : targetInput;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "En cours ou passée";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    const remHours = diffHours % 24;
    return remHours > 0 ? `dans ${diffDays} j ${remHours} h` : `dans ${diffDays} j`;
  }

  if (diffHours >= 1) {
    const remMinutes = diffMinutes % 60;
    return remMinutes > 0 ? `dans ${diffHours} h ${remMinutes} min` : `dans ${diffHours} h`;
  }

  return `dans ${Math.max(1, diffMinutes)} min`;
}

/**
 * Calcule le délai restant pour valider une décision (ex : « il te reste 31 h » ou « Délai dépassé »).
 */
export function formatValidationRemaining(deadlineInput: string | Date | null): string {
  if (!deadlineInput) return "";
  const deadline = typeof deadlineInput === "string" ? new Date(deadlineInput) : deadlineInput;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Délai dépassé";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `il te reste ${Math.max(1, diffMinutes)} min`;
  }

  return `il te reste ${diffHours} h`;
}

/**
 * Calcule le nombre de jours restants dans le mois courant en fuseau Africa/Ouagadougou.
 */
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();

  return Math.max(0, lastDay - currentDay);
}

/**
 * Évalue l'urgence d'une échéance de tâche.
 */
export function getDueDateUrgency(dueDateStr: string): "overdue" | "urgent" | "normal" {
  if (!dueDateStr) return "normal";
  const now = new Date();
  const dueDateEnd = new Date(`${dueDateStr}T23:59:59Z`);

  const diffMs = dueDateEnd.getTime() - now.getTime();
  if (diffMs < 0) {
    return "overdue";
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) {
    return "urgent";
  }

  return "normal";
}

/**
 * Calcule le nombre de jours de retard pour une tâche.
 * Exemple : « En retard de 3 jours »
 */
export function getDaysOverdue(dueDateStr: string): string {
  if (!dueDateStr) return "";
  const now = new Date();
  const dueDateEnd = new Date(`${dueDateStr}T23:59:59Z`);
  const diffMs = now.getTime() - dueDateEnd.getTime();

  if (diffMs <= 0) return "";

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `En retard de ${days} jour${days > 1 ? "s" : ""}`;
}

/**
 * Temps relatif pour les notifications (ex : « il y a 2 h » ou « à l’instant »).
 */
export function formatRelativeTime(dateInput: string | Date | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) {
    return "à l’instant";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) {
    return `il y a ${hours} h`;
  }

  const days = Math.floor(diffMs / 86400000);
  return `il y a ${days} j`;
}
