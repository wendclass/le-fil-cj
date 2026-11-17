"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "green";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-pill min-h-[48px] px-6 py-3 font-body font-semibold text-base transition-all duration-fast select-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 touch-target-min";

    const variantStyles = {
      primary:
        "bg-primary text-white shadow-1 hover:bg-primary-hover hover:shadow-2",
      secondary:
        "bg-white text-primary border-2 border-primary shadow-1 hover:bg-surface-muted hover:shadow-2",
      danger:
        "bg-white text-primary border-2 border-primary shadow-1 hover:bg-surface-muted hover:shadow-2",
      green:
        "bg-[#187A4C] text-white shadow-1 hover:bg-[#125c39] hover:shadow-2",
      ghost:
        "bg-transparent text-primary hover:bg-surface-muted/60 active:scale-[0.98]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
