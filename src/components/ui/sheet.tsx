"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Track visual viewport to keep sheet above keyboard on iOS.
  // keyboard height = window.innerHeight - vv.height
  // (do NOT subtract vv.offsetTop — that is document scroll, irrelevant for fixed elements)
  useEffect(() => {
    if (!open) {
      setKeyboardHeight(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setKeyboardHeight(Math.max(0, window.innerHeight - vv.height));
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKeyboardHeight(0);
    };
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
            style={{ bottom: keyboardHeight }}
            className="fixed inset-x-0 top-[8dvh] z-[61] flex flex-col rounded-t-[20px] bg-[var(--background-secondary)]"
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
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
