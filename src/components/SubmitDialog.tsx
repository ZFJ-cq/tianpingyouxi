"use client";

import * as React from "react";
import type { Coin, Dir } from "@/game/types";
import { Button, Modal } from "./ui";
import { PossCell, roleDot, ROLE_LABEL, DIR_LABEL, roleOf } from "./CoinChip";
import { cn } from "@/lib/utils";

/** 「我这枚就是伪币」提交判定弹窗 */
export function SubmitDialog({
  open,
  coins,
  known,
  onClose,
  onSubmit,
}: {
  open: boolean;
  coins: Coin[];
  known: Dir | null;
  onClose: () => void;
  onSubmit: (coinId: number, dir: Dir) => void;
}) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const [dir, setDir] = React.useState<Dir | null>(null);

  React.useEffect(() => {
    if (open) {
      setPicked(null);
      setDir(null);
    }
  }, [open]);

  const candidates = coins.filter((c) => c.roles.length > 0);
  const pickedCoin = coins.find((c) => c.id === picked) ?? null;
  const needDir = !!pickedCoin && pickedCoin.roles.length === 2;
  const canSubmit = picked !== null && (!needDir || dir !== null);

  const submit = () => {
    if (picked === null || !canSubmit) return;
    const d: Dir = needDir ? (dir as Dir) : (pickedCoin!.roles[0] as Dir);
    onSubmit(picked, d);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="submit-title">
      <h3 id="submit-title" className="font-song mb-1 text-lg font-bold">
        我这枚就是伪币
      </h3>
      <p className="mb-3 text-xs text-[var(--muted-foreground)]">
        从仍是候选的硬币中点一枚提交{known ? "（本关已知伪币" + (known === "L" ? "偏轻" : "偏重") + "）" : "，并指明它偏轻还是偏重"}。
      </p>

      <div className="mb-3 flex max-h-[38vh] flex-wrap gap-1.5 overflow-y-auto">
        {candidates.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">已无候选硬币——推理出现矛盾了。</p>
        )}
        {candidates.map((c) => (
          <PossCell
            key={c.id}
            coin={c}
            active={picked === c.id}
            onClick={() => {
              setPicked(c.id);
              if (c.roles.length === 1) setDir(c.roles[0]);
              else setDir(null);
            }}
          />
        ))}
      </div>

      {needDir && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs text-[var(--muted-foreground)]">
            这枚硬币轻重皆有可能，请选择：
          </p>
          <div className="flex gap-2">
            {(["L", "H"] as Dir[]).map((d) => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  dir === d
                    ? "border-[var(--gold)] bg-[#f9f0d8] font-bold"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
                )}
              >
                {roleDot(d === "L" ? "light" : "heavy")}
                {DIR_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {pickedCoin && !needDir && (
        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          将提交：{pickedCoin.id} 号 · {ROLE_LABEL[roleOf(pickedCoin)]}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          再想想
        </Button>
        <Button variant="primary" disabled={!canSubmit} onClick={submit}>
          提交判定
        </Button>
      </div>
    </Modal>
  );
}
