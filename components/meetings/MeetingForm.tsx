"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Calendar, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import type { Profile } from "@/types/database";

interface MeetingFormProps {
  profile: Profile;
}

export const MeetingForm: React.FC<MeetingFormProps> = ({ profile }) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [duration, setDuration] = useState(45); // 45 par défaut, jamais plus de 45 !
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Le titre de la réunion est obligatoire.");
      return;
    }

    if (!dateTime) {
      setErrorMessage("Veuillez sélectionner la date et l’heure.");
      return;
    }

    const meetingDate = new Date(dateTime);
    if (meetingDate.getTime() <= Date.now()) {
      setErrorMessage(copy.meetings.create.futureDateRequired);
      return;
    }

    // Sécurité stricte sur la durée : entre 10 et 45 min
    const safeDuration = Math.min(Math.max(duration, 10), 45);

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          starts_at: meetingDate.toISOString(),
          planned_minutes: safeDuration,
          location: location.trim() || null,
          status: "planned",
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      showToast("Réunion planifiée avec succès.", "success");
      router.push(`/reunions/${data.id}?created=true`);
    } catch {
      setErrorMessage(copy.app.errorGeneric);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Link
          href="/reunions"
          className="p-2 rounded-full hover:bg-surface-muted text-text-muted hover:text-text transition-colors touch-target-min"
          aria-label="Retour à la liste des réunions"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.meetings.create.title}
          </h1>
          <p className="font-body text-base text-text-muted mt-0.5">
            {copy.meetings.create.subtitle}
          </p>
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        {errorMessage && (
          <div
            className="mb-6 p-4 rounded-sm bg-alert/10 border border-alert/30 text-alert text-sm font-medium animate-fade-in-up"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titre */}
          <div className="space-y-1.5">
            <label htmlFor="meeting-title" className="block text-sm font-medium text-text">
              {copy.meetings.create.titleLabel} *
            </label>
            <Input
              id="meeting-title"
              type="text"
              required
              placeholder={copy.meetings.create.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="meeting-desc" className="block text-sm font-medium text-text">
              {copy.meetings.create.descLabel}
            </label>
            <textarea
              id="meeting-desc"
              rows={3}
              placeholder={copy.meetings.create.descPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 bg-white text-text text-base rounded-sm border-[1.5px] border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
            />
          </div>

          {/* Date et Heure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="meeting-datetime" className="block text-sm font-medium text-text">
                {copy.meetings.create.dateLabel} *
              </label>
              <Input
                id="meeting-datetime"
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Lieu ou Lien */}
            <div className="space-y-1.5">
              <label htmlFor="meeting-location" className="block text-sm font-medium text-text">
                {copy.meetings.create.locationLabel}
              </label>
              <Input
                id="meeting-location"
                type="text"
                placeholder={copy.meetings.create.locationPlaceholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Durée prévue (curseur 10 à 45 minutes, 45 max) */}
          <div className="space-y-2 p-4 rounded-md bg-surface-muted border border-border">
            <div className="flex items-center justify-between">
              <label htmlFor="meeting-duration" className="block text-sm font-medium text-text">
                {copy.meetings.create.durationLabel}
              </label>
              <span className="font-display font-bold text-primary text-base tabular-nums">
                {duration} minutes
              </span>
            </div>

            <input
              id="meeting-duration"
              type="range"
              min={10}
              max={45} // Jamais plus de 45 !
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full h-2 bg-white rounded-pill accent-primary cursor-pointer"
            />

            <p className="text-xs text-text-muted">
              {copy.meetings.create.durationHint}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/reunions">
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Annuler
              </Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isSubmitting ? copy.meetings.create.creating : copy.meetings.create.submitButton}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
