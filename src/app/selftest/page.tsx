"use client";

/**
 * /selftest — 回归探针：在真实静态产物里跑引擎 + solver 全链路。
 * 结果写入 <title> 与 #result，headless Chrome 抓取即可判定。
 */
import * as React from "react";
import { LEVELS } from "@/game/levels";
import {
  applyWeighing,
  classifyOutcome,
  createCoins,
  randomTruth,
  totalPossibilities,
} from "@/game/engine";
import { coinGroupsOf, groupsOf, solveForCoins, totalHyp } from "@/game/solver";
import { askHint } from "@/game/hint";
import { pansOf, useGameStore } from "@/store/gameStore";
import type { Coin, Dir, Truth } from "@/game/types";

interface Line {
  name: string;
  ok: boolean;
  info?: string;
}

const TRACE: string[] = [];
function mark(m: string) {
  TRACE.push(m);
}

function runAll(): Line[] {
  const lines: Line[] = [];
  const push = (name: string, ok: boolean, info?: string) =>
    lines.push({ name, ok, info });

  // 1. 九关最优次数
  for (const lv of LEVELS) {
    const coins = createCoins(lv.coins, lv.known);
    const r = solveForCoins(coins, lv.optimal);
    push(`关卡 ${lv.id} 最优=${lv.optimal}`, !!r && r.cost === lv.optimal, r ? `solver=${r.cost}` : "null");
  }

  // 2. 沿最优称法全分支推演
  function play(coins: Coin[], depth: number, truth: Truth, path: string): number {
    const hint = solveForCoins(coins, depth);
    if (!hint) return 0;
    const result = classifyOutcome(truth, hint.left, hint.right);
    const next = applyWeighing(coins, hint.left, hint.right, result);
    const t = next.find((c) => c.id === truth.coin)!;
    if (!t.roles.includes(truth.dir)) {
      push(`真值保留 ${path}`, false, `roles=${t.roles.join("/")}`);
    }
    return 1 + play(next, depth - 1, truth, path + "/" + result[0]);
  }
  for (const lv of LEVELS) {
    for (let i = 0; i < 6; i++) {
      const truth = randomTruth(lv.coins, lv.known);
      const used = play(createCoins(lv.coins, lv.known), lv.optimal, truth, lv.id);
      push(`${lv.id} 推演#${i} ≤ ${lv.optimal}`, used <= lv.optimal, `实际 ${used}`);
    }
  }

  // 3. 引擎一致性：候选数 == 与历史一致的假设数
  let seed = 987654321;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  for (const lv of LEVELS) {
    const n = lv.coins;
    const truth = randomTruth(n, lv.known);
    let coins = createCoins(n, lv.known);
    const history: Array<{ left: number[]; right: number[]; result: string }> = [];
    for (let step = 0; step < lv.optimal + 1; step++) {
      const dirs: Dir[] = lv.known ? [lv.known] : ["L", "H"];
      let theory = 0;
      for (let c = 0; c < n; c++) {
        for (const d of dirs) {
          if (
            history.every(
              (h) =>
                classifyOutcome({ coin: c, dir: d }, h.left, h.right) === h.result
            )
          )
            theory++;
        }
      }
      const actual = totalPossibilities(coins);
      push(`${lv.id} 随机局#${step} 候选一致`, theory === actual, `引擎=${actual} 理论=${theory}`);
      const cg = coinGroupsOf(coins);
      push(
        `${lv.id} 随机局#${step} solver 口径一致`,
        totalHyp(groupsOf(cg, n)) === actual,
        `solver=${totalHyp(groupsOf(cg, n))}`
      );
      const k = 1 + rnd(Math.min(5, Math.floor(n / 2)));
      const pool = [...Array(n).keys()];
      const left: number[] = [];
      const right: number[] = [];
      for (let i = 0; i < k; i++) {
        left.push(pool.splice(rnd(pool.length), 1)[0]);
        right.push(pool.splice(rnd(pool.length), 1)[0]);
      }
      const result = classifyOutcome(truth, left, right);
      history.push({ left, right, result });
      coins = applyWeighing(coins, left, right, result);
      if (totalPossibilities(coins) <= 1) break;
    }
  }
  return lines;
}

/** 驱动真实 store 的完整对局 E2E：放币 → 称量 → 提示 → 应用 → 提交 → 复盘 */
async function runGameE2E(): Promise<Line[]> {
  const out: Line[] = [];
  const push = (name: string, ok: boolean, info?: string) =>
    out.push({ name, ok, info });
  const st = () => useGameStore.getState();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // ---- A. 最优提示驱动通关（12 未知）----
  st().startLevel("u12");
  push("E2E 开局 12 候选", totalPossibilities(st().coins) === 24, `${totalPossibilities(st().coins)}`);
  let guard = 0;
  while (st().status === "playing" && guard++ < 8) {
    mark("e2e-loop:" + guard);
    await askHint();
    mark("e2e-hint:" + guard + ":" + (st().hint ? "ok" : "null"));
    const h = st().hint;
    if (!h) break;
    st().applyHint();
    const pans = pansOf(st());
    const ok =
      pans.left.length > 0 &&
      pans.left.length === pans.right.length &&
      pans.left.every((c) => !pans.right.includes(c));
    push(`E2E 第${st().used + 1}次 应用提示后布阵合法`, ok, `L=${pans.left.length} R=${pans.right.length}`);
    st().weigh();
    mark("e2e-weighed:" + st().used);
    // 引擎一致性：候选 == 与历史一致的假设数
    const truth = st().truth;
    const dirs: Dir[] = ["L", "H"];
    let theory = 0;
    for (let c = 0; c < 12; c++) {
      for (const d of dirs) {
        if (
          st().weighings.every(
            (w) => classifyOutcome({ coin: c, dir: d }, w.left, w.right) === w.result
          )
        )
          theory++;
      }
    }
    push(`E2E 第${st().used}次后 候选一致`, theory === totalPossibilities(st().coins), `引擎=${totalPossibilities(st().coins)} 理论=${theory}`);
    mark("e2e-sleep:" + st().used);
    await sleep(30);
    mark("e2e-woke:" + st().used);
  }
  const possEnd = totalPossibilities(st().coins);
  push("E2E 提示驱动后锁定 1 候选", possEnd === 1, `${possEnd}`);
  push("E2E 未超预算", st().used <= st().allowed, `${st().used}/${st().allowed}`);
  const truth = st().truth;
  st().submit(truth.coin, truth.dir);
  push("E2E 提交正确答案 → 胜利", st().status === "won", st().status);
  push("E2E 成绩已记录", (st().records["u12"]?.wins ?? 0) >= 1);

  // ---- B. 猜错 → 失败 ----
  st().restart();
  const t2 = st().truth;
  const wrong = (t2.coin + 1) % 12;
  st().submit(wrong, t2.dir);
  push("E2E 猜错 → 失败", st().status === "lost" && st().loseReason === "wrong-guess", `${st().status}/${st().loseReason}`);

  // ---- C. 复盘回放 ----
  st().startLevel("u8");
  st().setSelected([0, 1, 2]);
  st().assignSelected("L");
  st().setSelected([3, 4, 5]);
  st().assignSelected("R");
  st().weigh();
  await sleep(50);
  const w1 = st().weighings[0];
  push("E2E 复盘前置：已产生称量记录", !!w1 && w1.left.length === 3 && w1.right.length === 3);
  st().submit(st().truth.coin, st().truth.dir); // 结束对局以开启复盘
  push("E2E 对局已结束", st().status !== "playing");
  st().startReplay();
  push("E2E 复盘开启", !!st().replay);
  st().replayGoto(0);
  const rv = st().replay;
  push("E2E 复盘跳到第 1 步", rv?.step === 0);
  st().replayToggle();
  push("E2E 回放播放中", st().replay?.playing === true);
  st().exitReplay();
  push("E2E 退出复盘", st().replay === null);

  // ---- D. 已知轻重关（solver 驱动第二步）+ 正常币配平 ----
  st().startLevel("k27");
  push("E2E 27 已知开局 27 候选", totalPossibilities(st().coins) === 27, `${totalPossibilities(st().coins)}`);
  st().setSelected(Array.from({ length: 9 }, (_, i) => i));
  st().assignSelected("L");
  st().setSelected(Array.from({ length: 9 }, (_, i) => i + 9));
  st().assignSelected("R");
  st().weigh();
  push("E2E 27 已知 9v9 后可继续", st().status === "playing" && st().used === 1, `${st().status} used=${st().used}`);
  // 第二步交给 solver，保证可解
  await askHint();
  const h2 = st().hint;
  push("E2E 27 已知第二步有提示", !!h2);
  st().applyHint();
  const p2 = pansOf(st());
  push(
    "E2E 27 已知第二步布阵合法",
    p2.left.length > 0 && p2.left.length === p2.right.length,
    `L=${p2.left.length} R=${p2.right.length}`
  );
  st().weigh();
  push("E2E 27 已知第二步后仍在局中", st().status === "playing", `${st().status} used=${st().used}`);

  // ---- E. 正常币配平：u9 称一次 3v3 后，「2 疑币 vs 1 疑币 + 1 正常币」任何结果都安全 ----
  st().startLevel("u9");
  st().setSelected([0, 1, 2]);
  st().assignSelected("L");
  st().setSelected([3, 4, 5]);
  st().assignSelected("R");
  st().weigh();
  const sus = st().coins.filter((c) => c.roles.length > 0);
  push("E2E u9 一称后剩 6 或 3 枚疑币", sus.length === 6 || sus.length === 3, `${sus.length}`);
  push("E2E u9 一称后已攒下正常币", st().coins.some((c) => c.roles.length === 0));
  st().clearPans();
  st().setSelected(sus.slice(0, 2).map((c) => c.id));
  st().assignSelected("L");
  st().setSelected([sus[2].id]);
  st().assignSelected("R");
  st().fillPanWithGoods();
  const p = pansOf(st());
  push("E2E 配平两盘相等", p.left.length === 2 && p.right.length === 2, `L=${p.left.length} R=${p.right.length}`);
  const goodUsed = [...p.left, ...p.right].filter(
    (id) => st().coins.find((c) => c.id === id)?.roles.length === 0
  ).length;
  push("E2E 配平恰好用 1 枚正常币", goodUsed === 1, `${goodUsed}`);
  st().weigh();
  push(
    "E2E 配平称量后仍在局中",
    st().status === "playing" && st().used === 2,
    `${st().status} used=${st().used} poss=${totalPossibilities(st().coins)}`
  );

  return out;
}

export default function SelfTest() {
  const [lines, setLines] = React.useState<Line[] | null>(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      let out: Line[];
      try {
        out = runAll();
      } catch (e) {
        out = [{ name: "运行异常", ok: false, info: String(e) }];
      }
      mark("sync-done:" + out.length);
      // Web Worker 端到端回环（真实浏览器环境下验证 worker 装配）
      try {
        const { requestSolve } = await import("@/game/solverClient");
        mark("worker-imported");
        const t0 = performance.now();
        const r = await requestSolve(createCoins(12, null), 3);
        mark("worker-1:" + (r ? r.cost : "null"));
        out.push({
          name: "Worker 回环 12 未知 → 3 次",
          ok: !!r && r.cost === 3 && r.left.length === 4 && r.right.length === 4,
          info: r ? `cost=${r.cost} L=${r.left.length} R=${r.right.length} ${(performance.now() - t0).toFixed(0)}ms` : "null",
        });
        const r2 = await requestSolve(createCoins(27, null), 4);
        out.push({
          name: "Worker 回环 27 未知 → 4 次",
          ok: !!r2 && r2.cost === 4,
          info: r2 ? `cost=${r2.cost} ${(performance.now() - t0).toFixed(0)}ms` : "null",
        });
      } catch (e) {
        out.push({ name: "Worker 回环", ok: false, info: String(e) });
      }

      // 完整对局 E2E（驱动真实 store）
      try {
        mark("e2e-start");
        const e2e = await runGameE2E();
        mark("e2e-done:" + e2e.length);
        out.push(...e2e);
      } catch (e) {
        mark("e2e-throw:" + String(e));
        out.push({ name: "E2E 运行异常", ok: false, info: String(e) });
      }
      if (!alive) return;
      setLines(out);
      const fail = out.filter((l) => !l.ok).length;
      document.title = fail === 0 ? "SELFTEST-OK" : `SELFTEST-FAIL(${fail})`;
    })();
    return () => {
      alive = false;
    };
  }, []);
  const fail = lines?.filter((l) => !l.ok).length ?? -1;
  return (
    <main className="mx-auto max-w-3xl p-6 font-mono text-sm">
      <h1 className="mb-2 text-lg font-bold">称量台 · 自检</h1>
      <p id="result">
        {lines === null
          ? "running…"
          : fail === 0
            ? `OK · ${lines.length} 项全部通过`
            : `FAIL · ${fail}/${lines.length} 项失败`}
      </p>
      <p id="trace" className="text-xs text-gray-500">
        {TRACE.join(" | ")}
      </p>
      <ul className="mt-4 space-y-0.5">
        {lines
          ?.filter((l) => !l.ok)
          .map((l, i) => (
            <li key={i} className="text-red-600">
              ✗ {l.name} {l.info}
            </li>
          ))}
      </ul>
    </main>
  );
}
