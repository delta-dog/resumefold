"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFocusStore } from "@/lib/focus";

type Common = {
  label?: string;
  hint?: string;
  /** data-field path on the preview sheet to spotlight while focused */
  spot?: string;
};

export function TextField({
  label,
  hint,
  spot,
  className = "",
  onFocus,
  onBlur,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const setFocus = useFocusStore((s) => s.set);
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        id={id}
        className="field"
        onFocus={(e) => {
          if (spot) setFocus(spot);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(null);
          onBlur?.(e);
        }}
        {...rest}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  spot,
  className = "",
  onFocus,
  onBlur,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const setFocus = useFocusStore((s) => s.set);
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="field"
        onFocus={(e) => {
          if (spot) setFocus(spot);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(null);
          onBlur?.(e);
        }}
        {...rest}
      />
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Month picker that stores "YYYY-MM". */
export function MonthField({
  label,
  value,
  onChange,
  spot,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  spot?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TextField
      label={label}
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spot={spot}
      disabled={disabled}
      className={className}
    />
  );
}

/** Bullets edited as one-per-line text; stored as string[]. */
export function BulletsField({
  label = "Bullets",
  value,
  onChange,
  spot,
  placeholder,
  hint,
}: {
  label?: string;
  value: string[];
  onChange: (v: string[]) => void;
  spot?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <TextArea
      label={label}
      spot={spot}
      value={value.join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n"))}
      onBlur={() => onChange(value.map((b) => b.trim()).filter(Boolean))}
      placeholder={placeholder}
      hint={hint ?? "One bullet per line. Lead with a verb, end with a number."}
      rows={5}
    />
  );
}
