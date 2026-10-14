"use client";

import * as React from "react";
import type { Coin, LevelDef, Weighing } from "@/game/types";
import { minWeighings } from "@/game/levels";
import { totalPossibilities } from "@/game/engine";
import { Badge, Card, CardTitle } from "./ui";
import { PossCell, roleDot } from "./CoinChip";
import { cn } from "@/lib/utils";

export function Sidebar({
  coins,
  used,
  allowed,
  weighings,
  level,
  replayStep,
  onReplayTo,
  onPickForGuess,
}: {
  coins: Coin[];
  used: number;
  allowed: number;
  weighings: Weighing[];
  level: LevelDef;
  replayStep: number | null;
  onReplayTo?: (step: number) => void;
  onPickForGuess?: (id: number) => void;
}) {
  const poss = totalPossibilities(coins);
  const remaining = allowed - used;
  const need = minWeighings(poss);
  const impossible = poss > Math.pow(3, remaining) && poss > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* 剩余可能（桌面侧栏展示；窄屏由页面顶部状态条承担，此处隐藏避免重复） */}
      <Card className="hidden p-4 lg:block">
        <CardTitle className="mb-2 flex items-center justify-between">
          <span>剩余可能</span>
          <span className="text-[11px] font-normal text-[var(--muted-foreground)]">
            {level.name}
          </span>
        </CardTitle>
        <div className="flex items-end gap-2">
          <span
            className={cn(
              "tabnum text-4xl font-bold leading-none",
              impossible ? "text-[var(--cinnabar)]" : "text-[var(--foreground)]"
            )}
          >
            {poss}
          </span>
          <span className="pb-1 text-sm text-[var(--muted-foreground)]">种候选状态</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {poss === 1 ? (
            <Badge tone="gold">已锁定 · 可以提交答案</Badge>
          ) : (
            <Badge tone={impossible ? "cinnabar" : "ink"}>至少还需 {need} 次</Badge>
          )}
          {impossible && (
            <Badge tone="cinnabar">
              仅剩 {remaining} 次（最多区分 {Math.pow(3, remaining)} 种）
            </Badge>
          )}
        </div>

        {/* 称量预算 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">称量预算</span>
          <div className="flex gap-1">
            {Array.from({ length: allowed }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-5 rounded-sm border",
                  i < used
                    ? "bg-[var(--primary)] border-[var(--primary)]"
                    : "bg-transparent border-[var(--border)]"
                )}
              />
            ))}
          </div>
          <span className="tabnum text-xs text-[var(--muted-foreground)]">
            已用 {used}/{allowed}
          </span>
        </div>
      </Card>

      {/* 可能集可视化 */}
      <Card className="p-4">
        <CardTitle className="mb-2">可能集</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {coins.map((c) => (
            <PossCell
              key={c.id}
              coin={c}
              onClick={() => c.roles.length > 0 && onPickForGuess?.(c.id)}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">{roleDot("light")}偏轻</span>
          <span className="flex items-center gap-1">{roleDot("heavy")}偏重</span>
          <span className="flex items-center gap-1">{roleDot("unknown")}皆有可能</span>
          <span className="flex items-center gap-1">{roleDot("dead")}已排除</span>
        </div>
      </Card>

      {/* 推理路径 */}
      <Card className="p-4">
        <CardTitle className="mb-2">推理路径</CardTitle>
        {weighings.length === 0 ? (
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            还没有称量记录。把硬币放上托盘后点击「称量」，这里会记录每一次推理。
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {weighings.map((w) => {
              const active = replayStep === w.index - 1;
              return (
                <li key={w.index}>
                  <button
                    onClick={() => onReplayTo?.(w.index - 1)}
                    className={cn(
                      "w-full break-words rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                      active
                        ? "border-[var(--gold)] bg-[#f9f0d8]"
                        : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
                    )}
                  >
                    <span className="tabnum font-bold">第 {w.index} 次</span>
                    <span className="mx-1 text-[var(--muted-foreground)]">·</span>
                    <span className="tabnum">
                      [{w.left.join(",")}] vs [{w.right.join(",")}]
                    </span>
                    <span className="mx-1 text-[var(--muted-foreground)]">→</span>
                    <span
                      className={cn(
                        "font-bold",
                        w.result === "left" && "text-[var(--cinnabar)]",
                        w.result === "right" && "text-[var(--jade)]"
                      )}
                    >
                      {w.result === "left" ? "左倾" : w.result === "right" ? "右倾" : "平衡"}
                    </span>
                    <span className="ml-1 tabnum text-[var(--muted-foreground)]">
                      剩 {w.possibilitiesAfter} 种
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
