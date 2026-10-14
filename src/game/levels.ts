import type { LevelDef } from "./types";

/**
 * 关卡表：8/9/12/13/27 球 × 已知/未知轻重。
 * optimal = 理论上限（信息论下界 ⌈log3(候选数)⌉，且经 solver 验证可达）：
 *  - 未知轻重：候选数 = 2N。8→16(3次) 9→18(3) 12→24(3) 13→26(4) 27→54(4)
 *  - 已知轻重：候选数 = N。   8→2次 9→2次 12→3次 27→3次
 * 注：13 球未知轻重看似 26 ≤ 3³=27，但首次称量 k∷k 的三个分支
 * (2k, 2k, 2(13−2k)) 无法同时 ≤ 9，故实际需要 4 次。
 */
export const LEVELS: LevelDef[] = [
  {
    id: "u8",
    name: "8 球 · 未知轻重",
    coins: 8,
    known: null,
    optimal: 3,
    blurb: "入门：16 种候选，3 次称出",
  },
  {
    id: "u9",
    name: "9 球 · 未知轻重",
    coins: 9,
    known: null,
    optimal: 3,
    blurb: "18 种候选，3 次称出",
  },
  {
    id: "u12",
    name: "12 球 · 未知轻重",
    coins: 12,
    known: null,
    optimal: 3,
    blurb: "经典面试题：24 种候选，3 次称出",
  },
  {
    id: "u13",
    name: "13 球 · 未知轻重",
    coins: 13,
    known: null,
    optimal: 4,
    blurb: "陷阱题：26 ≤ 3³ 却仍需 4 次",
  },
  {
    id: "u27",
    name: "27 球 · 未知轻重",
    coins: 27,
    known: null,
    optimal: 4,
    blurb: "终极：54 种候选，4 次称出",
  },
  {
    id: "k8",
    name: "8 球 · 已知轻重",
    coins: 8,
    known: "L",
    optimal: 2,
    blurb: "已知伪币偏轻，2 次称出",
  },
  {
    id: "k9",
    name: "9 球 · 已知轻重",
    coins: 9,
    known: "H",
    optimal: 2,
    blurb: "已知伪币偏重，2 次称出",
  },
  {
    id: "k12",
    name: "12 球 · 已知轻重",
    coins: 12,
    known: "L",
    optimal: 3,
    blurb: "已知伪币偏轻，3 次称出",
  },
  {
    id: "k27",
    name: "27 球 · 已知轻重",
    coins: 27,
    known: "H",
    optimal: 3,
    blurb: "已知伪币偏重，3 次称出（三分天下）",
  },
];

export function getLevel(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

/** 按 ⌈log3(n)⌉ 求区分 n 种候选所需的最少称量次数（整数运算，避免浮点误差） */
export function minWeighings(n: number): number {
  let k = 0;
  let p = 1;
  while (p < n) {
    p *= 3;
    k++;
  }
  return k;
}
