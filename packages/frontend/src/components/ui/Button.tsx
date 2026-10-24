import React from "react";
import { cn } from "../../utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, icon, iconPosition = "left", children, disabled, ...props }, ref) => {
    const baseClasses = "valve-btn inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-valve-accent focus-visible:ring-offset-2 focus-visible:ring-offset-valve-bg disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
      primary: "bg-valve-accent text-white hover:bg-valve-accent-hover active:bg-valve-accent/90",
      secondary: "bg-valve-panel text-valve-text hover:bg-valve-hover active:bg-valve-border",
      ghost: "bg-transparent text-valve-text-secondary hover:bg-valve-hover hover:text-valve-text active:bg-valve-border",
      danger: "bg-valve-error/10 text-valve-error hover:bg-valve-error/20 active:bg-valve-error/30",
    };
    
    const sizeClasses = {
      sm: "px-2.5 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    };
    
    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {icon && iconPosition === "left" && !loading && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
        {icon && iconPosition === "right" && !loading && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";