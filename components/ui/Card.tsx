import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  staggerIndex?: number;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = true, staggerIndex, children, ...props }, ref) => {
    const staggerClass =
      staggerIndex !== undefined && staggerIndex >= 1 && staggerIndex <= 6
        ? `delay-${staggerIndex}`
        : "";

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-md border border-border shadow-1 p-5 md:p-6 transition-all duration-base ease-out-custom animate-fade-in-up",
          hoverable && "md:hover:-translate-y-0.5 md:hover:shadow-2",
          staggerClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
