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
  const [vp, setVp] = useState({ top: 0, height: 0 });

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Track visual viewport — handles keyboard on iOS
  useEffect(() => {
    const vv = window.visualViewport;
    const getState = () => ({
      top: vv ? vv.offsetTop : 0,
      height: vv ? vv.height : window.innerHeight,
    });

    if (!open) {
      setVp(getState());
      return;
    }

    const update = () => setVp(getState());
    setVp(getState());

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      return () => {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        // Container follows the visual viewport so keyboard doesn't push content
        <div
          className="fixed inset-x-0 z-[60]"
          style={{ top: vp.top, height: vp.height }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Sheet — slides up from bottom of visual viewport */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-[1] flex flex-col rounded-t-[20px] bg-[var(--background-secondary)]"
            style={{ maxHeight: "92%" }}
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
        </div>
      )}
    </AnimatePresence>
  );
}
