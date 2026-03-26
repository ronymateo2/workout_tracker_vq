"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface AlertDialogAction {
  label: string;
  variant?: "default" | "danger" | "cancel";
  onClick: () => void;
}

interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  actions: AlertDialogAction[];
}

export function AlertDialog({
  open,
  title,
  description,
  actions,
}: AlertDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] bg-black/50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[81] flex items-center justify-center px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-[#2C2C2E]"
            >
              {/* Text */}
              <div className="px-4 pt-5 pb-4 text-center">
                <p className="text-[17px] font-semibold text-[var(--foreground)]">
                  {title}
                </p>
                {description && (
                  <p className="mt-1 text-[13px] text-[var(--label-secondary)]">
                    {description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-[var(--line)]">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={action.onClick}
                    className={`flex w-full items-center justify-center border-t border-[var(--line)] py-[11px] text-[17px] transition active:bg-white/10 first:border-t-0 ${
                      action.variant === "danger"
                        ? "text-[var(--danger)]"
                        : action.variant === "cancel"
                          ? "font-semibold text-[var(--accent)]"
                          : "text-[var(--accent)]"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
