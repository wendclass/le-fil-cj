"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Users,
  Check,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { PatternBand } from "@/components/ui/PatternBand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LiveMeetingBadge } from "@/components/ui/LiveMeetingBadge";
import { ImprovisedBadge } from "@/components/ui/ImprovisedBadge";
import { copy } from "@/lib/copy";
import { formatOuagaDateTime, formatCountdown } from "@/lib/date";
import type { Profile, Meeting, RsvpStatus } from "@/types/database";

interface MeetingWithMeta extends Meeting {
  confirmed_count?: number;
  user_rsvp?: RsvpStatus | null;
}

interface MeetingsListProps {
  profile: Profile;
  initialMeetings: MeetingWithMeta[];
}

export const MeetingsList: React.FC<MeetingsListProps> = ({
  profile,
  initialMeetings,
}) => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const isPlanner = profile.role === "planner";

  const upcomingMeetings = initialMeetings.filter(
    (m) => m.status === "planned" || m.status === "live"
  );
  const pastMeetings = initialMeetings.filter(
    (m) => m.status === "done" || m.status === "cancelled"
  );

  const currentList = tab === "upcoming" ? upcomingMeetings : pastMeetings;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* En-tête avec bouton nouvelle réunion */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.meetings.title}
          </h1>
          <p className="font-body text-base text-text-muted mt-1">
            {copy.meetings.subtitle}
          </p>
        </div>

        {isPlanner && (
          <Link href="/reunions/nouvelle" className="shrink-0 focus-visible:outline-none">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>{copy.meetings.newMeetingButton}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Onglets À venir / Passées */}
      <div className="flex border-b border-border gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
          className={`py-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors touch-target-min ${
            tab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {copy.meetings.tabUpcoming}
          <span className="ml-2 text-xs font-normal tabular-nums">
            ({upcomingMeetings.length})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === "past"}
          onClick={() => setTab("past")}
          className={`py-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors touch-target-min ${
            tab === "past"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {copy.meetings.tabPast}
          <span className="ml-2 text-xs font-normal tabular-nums">
            ({pastMeetings.length})
          </span>
        </button>
      </div>

      {/* Liste des réunions */}
      {currentList.length === 0 ? (
        <Card className="text-center py-12 px-6 space-y-4 overflow-hidden relative border-dashed">
          <PatternBand height={36} opacity={0.1} />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            {tab === "upcoming" ? copy.meetings.emptyUpcoming : copy.meetings.emptyPast}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {currentList.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/reunions/${meeting.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            >
              <Card className="p-5 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-lg text-primary">
                      {meeting.title}
                    </h2>
                    {meeting.status === "live" && <LiveMeetingBadge />}
                    {meeting.is_improvised && <ImprovisedBadge />}
                    {meeting.status === "cancelled" && (
                      <Badge variant="alert">Annulée</Badge>
                    )}
                    {meeting.status === "done" && (
                      <Badge variant="success">Terminée</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatOuagaDateTime(meeting.starts_at)}
                    </span>
                    <span className="font-medium text-text">
                      {copy.meetings.durationLabel(meeting.planned_minutes)}
                    </span>
                    {meeting.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {meeting.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="flex items-center gap-2">
                    {meeting.status === "planned" && (
                      <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {copy.meetings.attendeesCount(meeting.confirmed_count || 0)}
                      </span>
                    )}

                    {meeting.user_rsvp && (
                      <Badge
                        variant={
                          meeting.user_rsvp === "yes"
                            ? "success"
                            : meeting.user_rsvp === "maybe"
                            ? "accent"
                            : "alert"
                        }
                      >
                        {meeting.user_rsvp === "yes"
                          ? "Tu viens"
                          : meeting.user_rsvp === "maybe"
                          ? "Peut-être"
                          : "Ne vient pas"}
                      </Badge>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
