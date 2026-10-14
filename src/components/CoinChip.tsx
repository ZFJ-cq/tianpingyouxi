"use client";

import * as React from "react";
import type { Coin, Dir } from "@/game/types";
import { cn } from "@/lib/utils";

export type CoinRole = "dead" | "light" | "heavy" | "unknown";

export function roleOf(coin: Coin | undefined): CoinRole {
  if (!coin) return "dead";
  if (coin.roles.length === 0) return "dead";
  if (coin.roles.length === 2) return "unknown";
  return coin.roles[0] === "L" ? "light" : "heavy";
}

export const ROLE_LABEL: Record<CoinRole, string> = {
  dead: "已排除",
  light: "可能偏轻",
  heavy: "可能偏重",
  unknown: "轻重皆有可能",
};

export const ROLE_CLASS: Record<CoinRole, string> = {
  unknown: "coin-unknown",
  light: "coin-light",
  heavy: "coin-heavy",
  dead: "coin-dead",
};

/** 待选区硬币（可多选、可拖拽） */
export function CoinChip({
  coin,
  selected,
  hinted,
  assigned,
  onDragStart,
  onTap,
}: {
  coin: Coin;
  selected?: boolean;
  hinted?: boolean;
  assigned?: "L" | "R" | null;
  onDragStart: (id: number, from: "pool" | "L" | "R", e: React.PointerEvent) => void;
  onTap: (id: number) => void;
}) {
  const role = roleOf(coin);
  return (
    <button
      type="button"
      className={cn(
        "coin-base h-10 w-10 text-[13px] sm:h-9 sm:w-9 sm:text-[12.5px]",
        ROLE_CLASS[role],
        selected && "ring-2 ring-offset-1 ring-[var(--gold)] ring-offset-[var(--card)]",
        hinted && "hint-glow",
        assigned && "opacity-45"
      )}
      style={{ touchAction: "none" }}
      title={`${coin.id} 号 · ${ROLE_LABEL[role]}${assigned ? (assigned === "L" ? " · 在左盘" : " · 在右盘") : ""}`}
      onPointerDown={(e) => onDragStart(coin.id, "pool", e)}
    >
      {coin.id}
      {assigned && (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--card)] border border-[var(--border)] px-1 text-[9px] leading-[13px] text-[var(--muted-foreground)]">
          {assigned === "L" ? "左" : "右"}
        </span>
      )}
    </button>
  );
}

/** 侧栏「可能集」小格 */
export function PossCell({
  coin,
  active,
  onClick,
}: {
  coin: Coin;
  active?: boolean;
  onClick?: () => void;
}) {
  const role = roleOf(coin);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "coin-base h-7 w-7 text-[11px]",
        ROLE_CLASS[role],
        active && "ring-2 ring-offset-1 ring-[var(--gold)] ring-offset-[var(--card)]"
      )}
      title={`${coin.id} 号 · ${ROLE_LABEL[role]}`}
    >
      {coin.id}
    </button>
  );
}

export function roleDot(role: CoinRole) {
  const color =
    role === "light"
      ? "var(--jade)"
      : role === "heavy"
        ? "var(--cinnabar)"
        : role === "unknown"
          ? "var(--plum)"
          : "var(--ash)";
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: color }}
    />
  );
}

export const DIR_LABEL: Record<Dir, string> = { L: "偏轻", H: "偏重" };
