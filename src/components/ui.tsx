"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ============ 按钮 ============ */
interface ButtonOwnProps {
  variant?: "primary" | "gold" | "outline" | "ghost";
  size?: "sm" | "md";
}
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonOwnProps
>(({ className, variant = "outline", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "btn",
      variant === "primary" && "btn-primary",
      variant === "gold" && "btn-gold",
      variant === "outline" && "btn-outline",
      variant === "ghost" && "btn-ghost",
      size === "sm" && "px-2.5 py-1.5 text-xs",
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

/* ============ 卡片 ============ */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-song text-[15px] font-bold tracking-wide text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
}

/* ============ 徽标 ============ */
export function Badge({
  className,
  tone = "ink",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "ink" | "gold" | "jade" | "cinnabar" | "plum" | "ash";
}) {
  const tones: Record<string, string> = {
    ink: "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent",
    gold: "bg-[#f6e7bd] text-[#7a5a0e] border-[var(--gold-soft)]",
    jade: "bg-[#dff0ea] text-[#2c5a4e] border-[#a9d2c6]",
    cinnabar: "bg-[#f7e0dc] text-[#7e2f27] border-[#e0a79e]",
    plum: "bg-[#e9e3f4] text-[#4e3f6d] border-[#c3b5e0]",
    ash: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
  };
  return <span className={cn("chip", tones[tone], className)} {...props} />;
}

/* ============ 模态框 ============ */
export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(43,42,38,0.45)] p-4 fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "card w-full max-w-md p-5 shadow-pop rise",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ============ 小天平图标（Logo） ============ */
export function ScaleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} fill="none">
      <path
        d="M12 3v3m0 0-7 1.5M12 6l7 1.5M5 7.5 3 13h4L5 7.5Zm14 0-2 5.5h4L19 7.5ZM12 9v3m-3 0h6l-3 9-3-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" />
    </svg>
  );
}
