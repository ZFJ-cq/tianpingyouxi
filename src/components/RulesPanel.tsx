"use client";

import { Button, Modal } from "./ui";

export function RulesPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy="rules-title">
      <h3 id="rules-title" className="font-song mb-3 text-lg font-bold">
        玩法 · 称量台
      </h3>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--foreground)]">
        <section>
          <p className="font-song font-bold">规则</p>
          <ol className="mt-1 list-decimal pl-5 text-[13px] text-[var(--muted-foreground)]">
            <li>一堆硬币中恰有一枚伪币，「未知轻重」关它偏轻或偏重，「已知轻重」关只嫌疑一个方向。</li>
            <li>把硬币放上左右托盘（可点选多枚后按按钮放入，或直接拖拽；两盘硬币数必须相等，差额可用已排除的正常币配平）。</li>
            <li>点击「称量」，天平给出 左倾 / 右倾 / 平衡，候选状态随之收缩。</li>
            <li>在预算次数内点「我这枚就是伪币」提交判定；猜错或候选数超出剩余称量的分辨能力即失败。</li>
          </ol>
        </section>
        <section>
          <p className="font-song font-bold">理论次数</p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            n 种候选至少需要 ⌈log₃n⌉ 次称量（天平有三种结果）。12 球未知轻重是经典面试题：24
            种候选、3 次称出；13 球虽是 26 ≤ 3³，首次称量却无法把三个分支都压进 9，实际需要 4
            次——本台的 solver 会告诉你每一局的真实最优解。
          </p>
        </section>
        <section>
          <p className="font-song font-bold">小技巧</p>
          <ul className="mt-1 list-disc pl-5 text-[13px] text-[var(--muted-foreground)]">
            <li>平衡时盘上硬币全部洗清，盘外不变；倾斜时盘外全部洗清，盘上按方向收窄。</li>
            <li>拿不准时点「提示」：solver 用极小化极大搜索算出最坏情况下剩余最少的称法，一键应用。</li>
            <li>结算后可「复盘回放」逐步重演整局推理。</li>
          </ul>
        </section>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          开始推理
        </Button>
      </div>
    </Modal>
  );
}
