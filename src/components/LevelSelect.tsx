"use client";

import * as React from "react";
import { LEVELS } from "@/game/levels";
import type { LevelRecord } from "@/store/gameStore";
import { Badge, Button, Card, Modal } from "./ui";
import { cn } from "@/lib/utils";

export function LevelSelect({
  open,
  currentId,
  records,
  onPick,
  onClose,
}: {
  open: boolean;
  currentId: string;
  records: Record<string, LevelRecord>;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl" labelledBy="lv-title">
      <h3 id="lv-title" className="font-song mb-1 text-lg font-bold">
        选择关卡
      </h3>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        共 {LEVELS.length} 关。未知轻重每枚硬币有 2 种伪币可能；已知轻重只嫌疑一个方向，更简单。
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {LEVELS.map((lv) => {
          const rec = records[lv.id];
          const solved = rec && rec.wins > 0;
          const best = solved && rec.best < 90 ? rec.best : null;
          return (
            <button
              key={lv.id}
              onClick={() => {
                onPick(lv.id);
                onClose();
              }}
              className={cn(
                "rounded-xl border p-3 text-left transition-all hover:shadow-card",
                lv.id === currentId
                  ? "border-[var(--gold)] bg-[#f9f0d8]"
                  : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--gold-soft)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-song text-[15px] font-bold">{lv.name}</span>
                <Badge tone={lv.known ? "jade" : "cinnabar"}>
                  {lv.known ? "已知" : "未知"} · {lv.optimal} 次
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{lv.blurb}</p>
              <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                {best ? (
                  <span className="text-[var(--gold)]">★ 最佳 {best} 次</span>
                ) : solved ? (
                  <span className="text-[var(--jade)]">✓ 已通关</span>
                ) : (
                  <span>未通关</span>
                )}
                {rec && rec.plays > 0 && <span className="ml-2">尝试 {rec.plays} 次</span>}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          关闭
        </Button>
      </div>
    </Modal>
  );
}
