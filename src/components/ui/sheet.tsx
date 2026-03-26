"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[92vh] flex-col rounded-t-[20px] bg-[var(--background-secondary)]"
          >
            {/* Handle */}
            <div className="flex shrink-0 justify-center pt-2 pb-1">
              <div className="h-1 w-9 rounded-full bg-[var(--fill)]" />
            </div>

            {/* Header */}
            {title && (
              <div className="shrink-0 border-b border-[var(--line)] px-4 pb-3">
                <h2 className="text-center text-[17px] font-semibold">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
