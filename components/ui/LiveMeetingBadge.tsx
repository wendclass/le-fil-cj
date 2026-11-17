"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface LiveMeetingBadgeProps {
  className?: string;
}

export const LiveMeetingBadge: React.FC<LiveMeetingBadgeProps> = ({ className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-alert text-white text-xs font-body font-semibold tracking-wide shadow-1 select-none",
        className
      )}
      role="status"
      aria-label={copy.meetings.liveBadge}
    >
      <span
        className="w-2 h-2 rounded-full bg-white transition-opacity motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]"
        style={{
          animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
        }}
        aria-hidden="true"
      />
      <span>{copy.meetings.liveBadge}</span>
    </span>
  );
};
