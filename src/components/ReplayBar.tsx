"use client";

import { Button } from "./ui";

/** 复盘回放控制条 */
export function ReplayBar({
  total,
  step,
  playing,
  onGoto,
  onToggle,
  onExit,
}: {
  total: number;
  step: number;
  playing: boolean;
  onGoto: (step: number) => void;
  onToggle: () => void;
  onExit: () => void;
}) {
  const label = step < 0 ? "开局布阵" : `第 ${step + 1} / ${total} 次称量`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--gold)] bg-[#f9f0d8] px-3 py-2">
      <span className="font-song text-sm font-bold text-[#7a5a0e]">复盘回放</span>
      <span className="tabnum text-xs text-[#7a5a0e]">{label}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGoto(step - 1)}
          disabled={step < 0}
          title="上一步"
        >
          ⏮
        </Button>
        <Button size="sm" variant="gold" onClick={onToggle} className="w-16">
          {playing ? "⏸ 暂停" : "▶ 播放"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGoto(step + 1)}
          disabled={step >= total - 1}
          title="下一步"
        >
          ⏭
        </Button>
        <Button size="sm" variant="ghost" onClick={onExit}>
          退出
        </Button>
      </div>
    </div>
  );
}
