import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-body font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            "w-full min-h-[44px] px-4 py-2.5 bg-white text-text placeholder:text-text-muted/60 text-base rounded-sm border-[1.5px] border-border transition-colors duration-fast focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-45 disabled:pointer-events-none touch-target-min",
            error && "border-primary bg-[#FFF3C4]/30 focus-visible:border-primary focus-visible:ring-primary/30",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-semibold text-primary animate-fade-in-up flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
