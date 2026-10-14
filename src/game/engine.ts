import type { Coin, Dir, Outcome, Truth, Weighing } from "./types";

/**
 * 称量引擎：给定真实伪币 (coin, dir) 与两盘硬币，推出天平结果。
 * 前提：两盘硬币数相等（ unequal 称量在经典模型中无意义，UI 层强制）。
 */
export function classifyOutcome(
  truth: Truth,
  left: number[],
  right: number[]
): Outcome {
  if (truth.coin === -1) return "balance"; // 未设真值（纯推演模式）
  if (left.includes(truth.coin)) return truth.dir === "H" ? "left" : "right";
  if (right.includes(truth.coin)) return truth.dir === "H" ? "right" : "left";
  return "balance";
}

/**
 * 用一次称量结果更新所有硬币的候选状态（纯函数，返回新数组）。
 *
 * 规则（两盘等数）：
 *  - 平衡：盘上硬币皆正常 → 置空；盘外不变
 *  - 左倾：左盘只可能偏重伪币，右盘只可能偏轻伪币，盘外皆正常 → 置空
 *  - 右倾：左盘只可能偏轻伪币，右盘只可能偏重伪币，盘外置空
 */
export function applyWeighing(
  coins: Coin[],
  left: number[],
  right: number[],
  result: Outcome
): Coin[] {
  const onLeft = new Set(left);
  const onRight = new Set(right);
  return coins.map((c) => {
    let roles: Dir[];
    if (result === "balance") {
      roles = onLeft.has(c.id) || onRight.has(c.id) ? [] : c.roles;
    } else if (result === "left") {
      if (onLeft.has(c.id)) roles = c.roles.includes("H") ? ["H"] : [];
      else if (onRight.has(c.id)) roles = c.roles.includes("L") ? ["L"] : [];
      else roles = [];
    } else {
      if (onLeft.has(c.id)) roles = c.roles.includes("L") ? ["L"] : [];
      else if (onRight.has(c.id)) roles = c.roles.includes("H") ? ["H"] : [];
      else roles = [];
    }
    return roles.length === c.roles.length &&
      roles.every((r) => c.roles.includes(r))
      ? c
      : { ...c, roles };
  });
}

/** 当前还能区分出的候选状态总数 */
export function totalPossibilities(coins: Coin[]): number {
  let n = 0;
  for (const c of coins) n += c.roles.length;
  return n;
}

/** 生成一局初始硬币（known 模式每枚只有单一方向） */
export function createCoins(count: number, known: Dir | null): Coin[] {
  const roles: Dir[] = known ? [known] : ["L", "H"];
  return Array.from({ length: count }, (_, i) => ({ id: i, roles }));
}

/** 随机真值 */
export function randomTruth(count: number, known: Dir | null): Truth {
  const dir: Dir = known ?? (Math.random() < 0.5 ? "L" : "H");
  return { coin: Math.floor(Math.random() * count), dir };
}

export function outcomeLabel(o: Outcome): string {
  return o === "left" ? "左倾" : o === "right" ? "右倾" : "平衡";
}

/** 构造一条称量记录 */
export function makeWeighing(
  index: number,
  left: number[],
  right: number[],
  result: Outcome,
  coinsAfter: Coin[]
): Weighing {
  const rolesAfter: Record<number, Dir[]> = {};
  for (const c of coinsAfter) rolesAfter[c.id] = c.roles;
  return {
    index,
    left,
    right,
    result,
    rolesAfter,
    possibilitiesAfter: totalPossibilities(coinsAfter),
  };
}
