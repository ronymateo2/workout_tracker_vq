"use client";

import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[14px] font-medium text-[var(--label-secondary)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx("ios-input", className)}
        {...props}
      />
    </div>
  );
}
