"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Tu confirmes ?",
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 bg-[#101437]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <Card className="max-w-md w-full p-6 space-y-6 shadow-2 border border-border animate-fade-in-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-[#FFF3C4] text-[#232D6B] border border-[#F2B705] shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3
              id="confirm-modal-title"
              className="font-display font-extrabold text-lg text-primary tracking-tight"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface-muted touch-target-min flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-text-muted font-body leading-relaxed">
          {message}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm min-h-[44px]"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto text-sm min-h-[44px] border-2 border-primary text-primary hover:bg-primary hover:text-white"
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};
