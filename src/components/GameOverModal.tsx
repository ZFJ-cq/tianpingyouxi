"use client";

import * as React from "react";
import type { Dir, LevelDef, LoseReason } from "@/game/types";
import { Button, Modal } from "./ui";
import { Badge } from "./ui";
import { DIR_LABEL } from "./CoinChip";

/** 结算弹窗：胜利 / 失败（猜错 / 已不可能） */
export function GameOverModal({
  status,
  loseReason,
  used,
  allowed,
  optimal,
  level,
  truth,
  hintUsed,
  onReplay,
  onRestart,
  onClose,
}: {
  status: "won" | "lost";
  loseReason: LoseReason;
  used: number;
  allowed: number;
  optimal: number | null;
  level: LevelDef;
  truth: { coin: number; dir: Dir } | null;
  hintUsed: number;
  onReplay: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const won = status === "won";
  return (
    <Modal open onClose={onClose} className="max-w-sm" labelledBy="over-title">
      <div className="text-center">
        <div
          className={
            "mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl " +
            (won ? "bg-[#f6e7bd] text-[var(--gold)]" : "bg-[#f7e0dc] text-[var(--cinnabar)]")
          }
        >
          {won ? "◎" : "✕"}
        </div>
        <h3 id="over-title" className="font-song text-xl font-bold">
          {won ? "揪出伪币！" : loseReason === "wrong-guess" ? "猜错了" : "已无法完成"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {won ? (
            <>
              你用 <b className="tabnum text-[var(--foreground)]">{used}</b> 次称量找出了{" "}
              <b className="tabnum text-[var(--foreground)]">{truth?.coin}</b> 号伪币（
              {truth ? DIR_LABEL[truth.dir] : ""}）。
              {optimal !== null && (
                <>
                  {used <= optimal ? (
                    <>这正是本关最优解（{optimal} 次）。</>
                  ) : (
                    <>
                      本关最优为 <b className="tabnum">{optimal}</b> 次，看看复盘差在哪一步？
                    </>
                  )}
                </>
              )}
            </>
          ) : loseReason === "wrong-guess" ? (
            <>
              真正的伪币是{" "}
              <b className="tabnum text-[var(--foreground)]">{truth?.coin}</b> 号，且
              {truth ? DIR_LABEL[truth.dir] : ""}。
            </>
          ) : (
            <>剩余候选已超出剩余称量的分辨能力，这一局已无解。复盘看看哪一步走偏了。</>
          )}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Badge tone="ink">
            {level.name}
          </Badge>
          <Badge tone="ash">
            称量 {used}/{allowed}
          </Badge>
          {hintUsed > 0 && <Badge tone="gold">提示 {hintUsed} 次</Badge>}
          {optimal !== null && <Badge tone="jade">最优 {optimal} 次</Badge>}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            看看棋盘
          </Button>
          <Button variant="outline" onClick={onReplay}>
            复盘回放
          </Button>
          <Button variant="primary" onClick={onRestart}>
            再玩一次
          </Button>
        </div>
      </div>
    </Modal>
  );
}
