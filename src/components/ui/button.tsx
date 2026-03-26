"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "flex w-full items-center justify-center gap-2 font-semibold transition active:opacity-80 tap-highlight-transparent",
        {
          "bg-[var(--accent)] text-white": variant === "primary",
          "bg-[var(--fill-tertiary)] text-[var(--foreground)]":
            variant === "secondary",
          "bg-[var(--danger)] text-white": variant === "danger",
        },
        {
          "rounded-[10px] px-3 py-2 text-[14px]": size === "sm",
          "rounded-[14px] px-4 py-3 text-[15px]": size === "md",
          "rounded-[14px] px-5 py-4 text-[16px]": size === "lg",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
