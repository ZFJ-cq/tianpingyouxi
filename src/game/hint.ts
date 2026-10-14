"use client";

import { requestSolve } from "./solverClient";
import { createCoins } from "./engine";
import { useGameStore } from "@/store/gameStore";

/** 请求一次最优称法提示（在 Web Worker 中计算） */
export async function askHint() {
  const s = useGameStore.getState();
  if (s.hintLoading) return;
  s.setHintLoading(true);
  try {
    const depth = Math.max(0, s.allowed - s.used);
    const result = await requestSolve(s.coins, depth);
    s.setHint(result);
  } catch {
    s.setHint(null);
  }
}

/** 结算时计算本关初始状态的最优称量次数（用于实力对比） */
export async function askOptimal(): Promise<number | null> {
  const s = useGameStore.getState();
  const initial = createCoins(s.level.coins, s.known);
  const result = await requestSolve(initial, s.allowed);
  return result && result.cost >= 0 ? result.cost : null;
}
