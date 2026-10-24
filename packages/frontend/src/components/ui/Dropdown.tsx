import React, { useRef, useEffect, useState } from "react";
import { cn } from "../../utils";
import { useOnClickOutside } from "../../hooks";

interface DropdownItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  subItems?: DropdownItem[];
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  useOnClickOutside(dropdownRef, () => setOpen(false));
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };
  
  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled && !item.divider) {
      item.action();
      if (!item.subItems) setOpen(false);
    }
  };
  
  const renderItems = (items: DropdownItem[], level = 0) => (
    <div 
      className={cn(
        "valve-dropdown",
        level > 0 && "absolute left-full top-0 mt-1 ml-1"
      )}
      role="menu"
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className="border-t border-valve-border my-1" role="separator" />;
        }
        
        const hasSubmenu = item.subItems && item.subItems.length > 0;
        const [subOpen, setSubOpen] = useState(false);
        const subRef = useRef<HTMLDivElement>(null);
        
        useOnClickOutside(subRef, () => setSubOpen(false));
        
        return (
          <div key={item.label} className="relative" ref={subRef}>
            <button
              role="menuitem"
              className={cn(
                "valve-dropdown-item w-full text-left flex items-center gap-2",
                item.disabled && "opacity-50 cursor-not-allowed",
                item.danger && "text-valve-error hover:bg-valve-error/10",
                hasSubmenu && "pr-6"
              )}
              disabled={item.disabled}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => hasSubmenu && setSubOpen(true)}
              onMouseLeave={() => hasSubmenu && setSubOpen(false)}
              tabIndex={-1}
            >
              {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="text-xs text-valve-text-muted font-mono">{item.shortcut}</span>}
              {hasSubmenu && <span className="text-valve-text-muted">›</span>}
            </button>
            {hasSubmenu && subOpen && renderItems(item.subItems!, level + 1)}
          </div>
        );
      })}
    </div>
  );
  
  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className="valve-btn-ghost"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn("fixed z-dropdown animate-in", align === "right" ? "right-0" : "left-0")}
          style={{ top: triggerRef.current?.getBoundingClientRect().bottom }}
        >
          {renderItems(items)}
        </div>
      )}
    </div>
  );
}