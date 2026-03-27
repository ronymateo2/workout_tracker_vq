"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
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
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)] safe-top"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-[var(--line)] px-4 pb-3.5 pt-2">
            {title ? (
              <h2 className="text-[18px] font-semibold">{title}</h2>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-[var(--fill-tertiary)] tap-highlight-transparent active:opacity-60"
            >
              <X className="size-5 text-[var(--label-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
