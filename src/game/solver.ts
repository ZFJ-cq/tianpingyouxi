import type { Coin, Groups, Move } from "./types";
import { minWeighings } from "./levels";

/**
 * solver.ts — 找伪币问题的极小化极大搜索
 *
 * 状态：把「剩余候选」相同的硬币归组。组内硬币完全可互换，因此一个称量方案
 * 只需记录「每组各有几枚上左盘、几枚上右盘」，状态被压缩到四元组 (L, H, B, G)：
 *  - L 组：只可能偏轻；H 组：只可能偏重；B 组：轻重皆有可能（2 个假设/枚）
 *  - G：已确定正常的硬币数。正常币可作配重——经典 12 币题的第二步
 *    「2 疑币 vs 1 疑币 + 1 正常币」正是靠它把 8 种候选劈成 3/3/2。
 *  - 候选总数 total = L + H + 2B（G 不贡献候选）
 *
 * 目标：minimax——最小化「最坏情况下还需几次称量」。
 * 剪枝：
 *  1. 状态规范化：交换 L/H 组使 L ≥ H（轻/重是世界镜像，代价不变）
 *  2. 称量去重：左右盘整体对调是对称的；L===H 时轻重对调也是对称的
 *  3. 信息论下界提前退出：一旦某称法代价 ≤ ⌈log3(total)⌉ 即最优，停止搜索
 *  4. 不可行剪枝：total > 3^depth 时直接返回「最坏剩余最少」的贪心称法
 *  5. 记忆化（状态|深度 → 最优解）+ 节点预算兜底
 */

const INF = 1e9;
const OUTCOMES = ["left", "right", "balance"] as const;
const NODE_BUDGET = 200000;

export interface CoinGroups {
  L: number[];
  H: number[];
  B: number[];
}

export function coinGroupsOf(coins: Coin[]): CoinGroups {
  const cg: CoinGroups = { L: [], H: [], B: [] };
  for (const c of coins) {
    if (c.roles.length === 2) cg.B.push(c.id);
    else if (c.roles[0] === "L") cg.L.push(c.id);
    else if (c.roles[0] === "H") cg.H.push(c.id);
  }
  return cg;
}

/** 由硬币分组 + 总币数求 solver 状态（G = 已排除的正常币） */
export function groupsOf(cg: CoinGroups, totalCoins: number): Groups {
  const suspects = cg.L.length + cg.H.length + cg.B.length;
  return {
    L: cg.L.length,
    H: cg.H.length,
    B: cg.B.length,
    G: Math.max(0, totalCoins - suspects),
  };
}

export function totalHyp(g: Groups): number {
  return g.L + g.H + 2 * g.B;
}

/** 一个称量在三种结果下各自能剩下多少假设（正常币不影响结果） */
export function outcomeSizes(g: Groups, m: Move): [number, number, number] {
  const [lL, rL] = m.L;
  const [lH, rH] = m.H;
  const [lB, rB] = m.B;
  const lt = lH + rL + lB + rB; // 左倾：左盘重伪币 / 右盘轻伪币 / B组左右各贡献一重一轻
  const rt = rH + lL + lB + rB;
  const bal = g.L - lL - rL + (g.H - lH - rH) + 2 * (g.B - lB - rB);
  return [lt, rt, bal];
}

/** 某结果成立后的新分组（被排除的疑币转化为正常币，G 增加） */
export function childGroups(
  g: Groups,
  m: Move,
  outcome: (typeof OUTCOMES)[number]
): Groups {
  const [lL, rL] = m.L;
  const [lH, rH] = m.H;
  const [lB, rB] = m.B;
  if (outcome === "left") {
    // 左倾：左盘只可能重、右盘只可能轻、盘外皆正常
    const off = g.L - lL - rL + (g.H - lH - rH) + (g.B - lB - rB);
    return { L: rL + rB, H: lH + lB, B: 0, G: g.G + off };
  }
  if (outcome === "right") {
    const off = g.L - lL - rL + (g.H - lH - rH) + (g.B - lB - rB);
    return { L: lL + lB, H: rH + rB, B: 0, G: g.G + off };
  }
  // 平衡：盘上皆正常、盘外不变
  const on = lL + rL + lH + rH + lB + rB;
  return {
    L: g.L - lL - rL,
    H: g.H - lH - rH,
    B: g.B - lB - rB,
    G: g.G + on,
  };
}

type Tuple = [number, number, number, number, number, number];

function moveTuple(m: Move): Tuple {
  return [m.L[0], m.L[1], m.H[0], m.H[1], m.B[0], m.B[1]];
}

function mirrorTuple(t: Tuple): Tuple {
  return [t[1], t[0], t[3], t[2], t[5], t[4]];
}

function swapTuple(t: Tuple): Tuple {
  // L 组 ↔ H 组（世界镜像：轻 ↔ 重）
  return [t[2], t[3], t[0], t[1], t[4], t[5]];
}

function tupleLT(a: Tuple, b: Tuple): boolean {
  for (let i = 0; i < 6; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

function tupleToMove(t: Tuple): Move {
  return { L: [t[0], t[1]], H: [t[2], t[3]], B: [t[4], t[5]] };
}

/**
 * 枚举所有合法称量：
 *  - 两盘总数相等（差额用正常币配重），至少称 1 枚疑币
 *  - |Σ左 − Σ右| ≤ G，亏额由正常币补足
 * 过去重后按「最坏分支剩余」升序排列
 */
export function enumerateMoves(g: Groups): Move[] {
  const counts = [g.L, g.H, g.B];
  const out: Tuple[] = [];

  const rec = (i: number, acc: number[], sumL: number, sumR: number) => {
    if (i === counts.length) {
      if (sumL + sumR < 1) return; // 至少称一枚疑币
      if (Math.abs(sumL - sumR) > g.G) return; // 正常币不够配重
      const t = acc.slice() as Tuple; // 必须拷贝：acc 会被回溯复用
      if (tupleLT(mirrorTuple(t), t)) return; // 左右盘对调去重
      if (g.L === g.H && tupleLT(swapTuple(t), t)) return; // 轻重镜像去重
      out.push(t);
      return;
    }
    const n = counts[i];
    for (let l = 0; l <= n; l++) {
      for (let r = 0; l + r <= n; r++) {
        acc.push(l, r);
        rec(i + 1, acc, sumL + l, sumR + r);
        acc.pop();
        acc.pop();
      }
    }
  };
  rec(0, [], 0, 0);

  // 排序：最坏分支剩余假设数升序 → 用币数降序 → 字典序，让「均衡称法」优先被尝试
  out.sort((a, b) => {
    const ma = Math.max(...outcomeSizes(g, tupleToMove(a)));
    const mb = Math.max(...outcomeSizes(g, tupleToMove(b)));
    if (ma !== mb) return ma - mb;
    const ua = a[0] + a[1] + a[2] + a[3] + a[4] + a[5];
    const ub = b[0] + b[1] + b[2] + b[3] + b[4] + b[5];
    if (ua !== ub) return ub - ua;
    for (let i = 0; i < 6; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return out.map(tupleToMove);
}

const memo = new Map<string, { cost: number; move: Move | null }>();
let budget = NODE_BUDGET;

function solveCanon(g: Groups, depth: number): { cost: number; move: Move | null } {
  const total = totalHyp(g);
  if (total <= 1) return { cost: 0, move: null };
  if (depth <= 0) return { cost: INF, move: null };
  // 不可行剪枝：候选数已超出剩余称量的分辨能力
  if (total > Math.pow(3, depth)) {
    const moves = enumerateMoves(g);
    return { cost: INF, move: moves[0] ?? null };
  }
  const key = `${g.L},${g.H},${g.B},${g.G}|${depth}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const lb = minWeighings(total); // 信息论下界：达到即最优
  const moves = enumerateMoves(g);
  let best: { cost: number; move: Move | null } = { cost: INF, move: null };

  for (const m of moves) {
    if (budget-- <= 0) break;
    const sizes = outcomeSizes(g, m);
    let worst = 0;
    let feasible = true;
    for (let i = 0; i < 3; i++) {
      if (sizes[i] === 0) continue;
      const child = childGroups(g, m, OUTCOMES[i]);
      const c = solveCanon(child, depth - 1).cost;
      if (c >= INF) {
        feasible = false;
        break;
      }
      if (c > worst) worst = c;
    }
    const cost = feasible ? 1 + worst : INF;
    if (cost < best.cost) {
      best = { cost, move: m };
      if (best.cost <= lb) break;
    }
  }
  if (!best.move) best = { cost: INF, move: moves[0] ?? null };
  memo.set(key, best);
  return best;
}

export interface SolveResult {
  /** 最坏情况下还需几次称量；-1 表示剩余预算内已无解 */
  cost: number;
  move: Move | null;
}

/** 对外入口：给定分组求最优称量（自动处理 L/H 规范化） */
export function solveGroups(groups: Groups, depth: number): SolveResult {
  budget = NODE_BUDGET;
  const swapped = groups.L < groups.H;
  const g = swapped
    ? { L: groups.H, H: groups.L, B: groups.B, G: groups.G }
    : groups;
  const res = solveCanon(g, depth);
  if (swapped && res.move) {
    const t = moveTuple(res.move);
    return { cost: res.cost, move: tupleToMove(swapTuple(t)) };
  }
  return res;
}

/** 把「数量称法」翻译成具体硬币编号（左右盘从各组中依次取币，互不重叠） */
export function moveToIds(
  move: Move,
  cg: CoinGroups
): { left: number[]; right: number[] } {
  const take = (arr: number[], from: number, n: number) =>
    arr.slice(from, from + n);
  const left = [
    ...take(cg.L, 0, move.L[0]),
    ...take(cg.H, 0, move.H[0]),
    ...take(cg.B, 0, move.B[0]),
  ].sort((a, b) => a - b);
  const right = [
    ...take(cg.L, move.L[0], move.L[1]),
    ...take(cg.H, move.H[0], move.H[1]),
    ...take(cg.B, move.B[0], move.B[1]),
  ].sort((a, b) => a - b);
  return { left, right };
}

/** 便捷入口：直接由硬币状态求提示称法 */
export function solveForCoins(
  coins: Coin[],
  depth: number
): { left: number[]; right: number[]; cost: number } | null {
  const cg = coinGroupsOf(coins);
  const g = groupsOf(cg, coins.length);
  if (totalHyp(g) <= 1) return null;
  const res = solveGroups(g, depth);
  if (!res.move) return null;
  const { left, right } = moveToIds(res.move, cg);
  return { left, right, cost: res.cost >= INF ? -1 : res.cost };
}
