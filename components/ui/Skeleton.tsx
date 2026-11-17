import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "pill" | "full";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  rounded = "md",
  ...props
}) => {
  const roundedStyles = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    pill: "rounded-pill",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-surface-muted/80",
        roundedStyles[rounded],
        className
      )}
      {...props}
    />
  );
};
