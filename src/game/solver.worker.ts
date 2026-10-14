/// <reference lib="webworker" />
import { solveForCoins } from "./solver";
import type { Coin } from "./types";

export interface SolveRequest {
  id: number;
  coins: Coin[];
  depth: number;
}

export interface SolveResponse {
  id: number;
  result: { left: number[]; right: number[]; cost: number } | null;
}

self.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { id, coins, depth } = e.data;
  const result = solveForCoins(coins, depth);
  const res: SolveResponse = { id, result };
  (self as unknown as Worker).postMessage(res);
};
