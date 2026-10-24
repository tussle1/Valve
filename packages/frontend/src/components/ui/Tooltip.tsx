import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLElement>(null);
  
  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };
  
  const clone = React.cloneElement(children, {
    ref: childRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });
  
  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {clone}
      {visible && (
        <div
          ref={tooltipRef}
          className={cn(
            "valve-tooltip",
            position === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
            position === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
            position === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
            position === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-4 border-transparent",
              position === "top" && "top-full left-1/2 -translate-x-1/2 border-t-valve-border",
              position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 border-b-valve-border",
              position === "left" && "left-full top-1/2 -translate-y-1/2 border-l-valve-border",
              position === "right" && "right-full top-1/2 -translate-y-1/2 border-r-valve-border"
            )}
          />
        </div>
      )}
    </div>
  );
}