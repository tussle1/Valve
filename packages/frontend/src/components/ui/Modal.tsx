import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils";
import { Button } from "./Button";
import { useOnClickOutside } from "../../hooks";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  useOnClickOutside(modalRef, (e) => {
    if (closeOnOverlayClick && e.target === modalRef.current) {
      onClose();
    }
  });
  
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };
  
  const modalContent = (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in"
        onClick={() => closeOnOverlayClick && onClose()}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className={cn(
          "valve-panel relative w-full animate-in slide-in-from-bottom",
          sizeClasses[size]
        )}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between p-4 border-b border-valve-border">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-valve-text">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-1 text-sm text-valve-text-secondary">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="valve-icon-btn ml-4 flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-valve-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-valve-text-secondary">{message}</p>
    </Modal>
  );
}

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "password";
  confirmLabel?: string;
  cancelLabel?: string;
  validation?: (value: string) => string | null;
}

export function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  placeholder,
  defaultValue = "",
  type = "text",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  validation,
}: InputModalProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);
  
  const handleConfirm = () => {
    if (validation) {
      const err = validation(value);
      if (err) {
        setError(err);
        return;
      }
    }
    onConfirm(value);
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label htmlFor="modal-input" className="block text-sm font-medium text-valve-text-secondary">
          {label}
        </label>
        <input
          ref={inputRef}
          id="modal-input"
          type={type}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onClose();
          }}
          placeholder={placeholder}
          className="valve-input"
          autoFocus
        />
        {error && <p className="text-sm text-valve-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}