import React from "react";
import { cn } from "../../utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

export function Tabs({ tabs, activeTab, onChange, className, variant = "default" }: TabsProps) {
  const variantClasses = {
    default: "border-b border-valve-border",
    pills: "gap-1 bg-valve-panel/50 p-1 rounded-lg",
    underline: "border-b border-valve-border",
  };
  
  const tabClasses = {
    default: "valve-tab",
    pills: "px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-fast",
    underline: "valve-tab -mb-px",
  };
  
  const activeClasses = {
    default: "valve-tab-active",
    pills: "bg-valve-editor text-valve-text shadow-sm",
    underline: "valve-tab-active",
  };
  
  const inactiveClasses = {
    default: "valve-tab-inactive",
    pills: "text-valve-text-secondary hover:bg-valve-hover hover:text-valve-text",
    underline: "valve-tab-inactive",
  };
  
  return (
    <div className={cn("flex", variantClasses[variant], className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-tab`}
          className={cn(
            tabClasses[variant],
            activeTab === tab.id ? activeClasses[variant] : inactiveClasses[variant],
            tab.disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          {tab.icon && <span className="flex-shrink-0 mr-1.5">{tab.icon}</span>}
          {tab.label}
          {tab.badge && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full bg-valve-accent/10 text-valve-accent">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, active, children, className }: TabPanelProps) {
  if (!active) return null;
  
  return (
    <div
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={`${id}-tab`}
      className={cn("animate-in fade-in", className)}
    >
      {children}
    </div>
  );
}