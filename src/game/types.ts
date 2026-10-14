/**
 * 称量台 · 核心类型定义
 *
 * 世界观：N 枚硬币中恰好有一枚伪币。
 *  - known 模式（已知轻重）：玩家被告知伪币偏轻或偏重，每枚硬币 ∈ {正常, 伪币}
 *  - unknown 模式（未知轻重）：每枚硬币可能是伪币且偏轻，也可能是伪币且偏重
 *
 * 状态模型：每枚硬币维护一个 roles 集合（还剩下的「伪币身份」可能）：
 *  - []            已排除（确定是正常币）
 *  - ['L']         只可能是偏轻的伪币
 *  - ['H']         只可能是偏重的伪币
 *  - ['L','H']     轻重皆有可能
 *
 * 「剩余可能数」= 所有硬币 roles 数量之和，即还能区分出的候选状态总数。
 */

/** 伪币方向：L=偏轻(light)，H=偏重(heavy) */
export type Dir = "L" | "H";

/** 称量结果：left=左盘下沉(左倾)，right=右盘下沉(右倾)，balance=平衡 */
export type Outcome = "left" | "right" | "balance";

export interface Coin {
  id: number;
  /** 该硬币仍可能的伪币方向 */
  roles: Dir[];
}

export interface Truth {
  coin: number;
  dir: Dir;
}

export interface Weighing {
  /** 第几次称量（从 1 开始） */
  index: number;
  left: number[];
  right: number[];
  result: Outcome;
  /** 称量后的候选状态快照（用于复盘与可能性曲线） */
  rolesAfter: Record<number, Dir[]>;
  possibilitiesAfter: number;
}

export type GameStatus = "idle" | "playing" | "won" | "lost";

export type LoseReason =
  | "wrong-guess"
  | "impossible"
  | null;

export interface LevelDef {
  id: string;
  name: string;
  coins: number;
  /** null = 未知轻重；'L' | 'H' = 已知伪币偏轻/偏重 */
  known: Dir | null;
  /** 理论最优称量次数（信息论下界，且对本组关卡可达） */
  optimal: number;
  blurb: string;
}

/** solver 的分组状态：把 roles 相同的硬币归组，组内硬币完全可互换 */
export interface Groups {
  L: number; // 只可能偏轻的硬币数
  H: number; // 只可能偏重的硬币数
  B: number; // 轻重皆有可能的硬币数
  G: number; // 已确定正常的硬币数（可作配重，经典解法关键）
}

/** solver 的一次称量建议：各类型硬币放左/右盘的数量 */
export interface Move {
  L: [number, number];
  H: [number, number];
  B: [number, number];
}
