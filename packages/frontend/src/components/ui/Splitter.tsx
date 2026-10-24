import React, { useRef, useEffect, useState } from "react";
import { cn } from "../../utils";

interface SplitterProps {
  direction: "horizontal" | "vertical";
  minSize?: number;
  maxSize?: number;
  onDrag?: (size: number) => void;
  className?: string;
  children: [React.ReactNode, React.ReactNode];
}

export function Splitter({ direction, minSize = 100, maxSize, onDrag, className, children }: SplitterProps) {
  const [dragging, setDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, size: 0 });
  
  useEffect(() => {
    if (dragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const delta = direction === "horizontal" ? e.clientX - startPos.current.x : e.clientY - startPos.current.y;
        let newSize = startPos.current.size + delta;
        newSize = Math.max(minSize, newSize);
        if (maxSize) newSize = Math.min(maxSize, newSize);
        onDrag?.(newSize);
      };
      
      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [dragging, direction, minSize, maxSize, onDrag]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      size: 0, // Will be set by parent
    };
  };
  
  return (
    <div className={cn("flex", direction === "horizontal" ? "flex-row" : "flex-col", className)}>
      <div className={cn("flex-1 min-w-0 min-h-0", direction === "horizontal" ? "flex-col" : "flex-row")}>
        {children[0]}
      </div>
      <div
        ref={splitterRef}
        className={cn(
          "valve-splitter flex-shrink-0 z-10",
          direction === "horizontal" ? "valve-splitter-vertical w-1 cursor-col-resize" : "valve-splitter-horizontal h-1 cursor-row-resize"
        )}
        onMouseDown={handleMouseDown}
        aria-label={direction === "horizontal" ? "Resize horizontally" : "Resize vertically"}
        role="separator"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            // Could add keyboard resizing here
          }
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {direction === "horizontal" ? (
            <div className="w-px h-6 bg-valve-border/50" />
          ) : (
            <div className="h-px w-6 bg-valve-border/50" />
          )}
        </div>
      </div>
      <div className={cn("flex-1 min-w-0 min-h-0", direction === "horizontal" ? "flex-col" : "flex-row")}>
        {children[1]}
      </div>
    </div>
  );
}