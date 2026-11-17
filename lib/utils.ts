import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise une adresse e-mail en minuscules et sans espaces superflus.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
