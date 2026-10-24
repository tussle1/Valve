import React from "react";
import { cn } from "../../utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = "default", size = "sm", className, dot }: BadgeProps) {
  const variantClasses = {
    default: "bg-valve-border text-valve-text-secondary",
    accent: "bg-valve-accent/10 text-valve-accent",
    success: "bg-valve-success/10 text-valve-success",
    warning: "bg-valve-warning/10 text-valve-warning",
    error: "bg-valve-error/10 text-valve-error",
    info: "bg-blue-500/10 text-blue-400",
  };
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
  };
  
  return (
    <span className={cn("valve-badge inline-flex items-center gap-1", variantClasses[variant], sizeClasses[size], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", variant === "default" && "bg-valve-text-muted", variant === "accent" && "bg-valve-accent", variant === "success" && "bg-valve-success", variant === "warning" && "bg-valve-warning", variant === "error" && "bg-valve-error", variant === "info" && "bg-blue-500")} />}
      {children}
    </span>
  );
}