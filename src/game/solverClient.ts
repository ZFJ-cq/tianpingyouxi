/**
 * solverClient — 在 Web Worker 中运行极小化极大搜索，避免阻塞 UI。
 * 带超时降级：worker 异常时回退到主线程同步计算（本问题规模下 <20ms）。
 */
import { solveForCoins } from "./solver";
import type { Coin } from "./types";
import type { SolveRequest, SolveResponse } from "./solver.worker";

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, (r: SolveResponse["result"]) => void>();

function ensureWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./solver.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<SolveResponse>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data.result);
      }
    };
    worker.onerror = () => {
      workerBroken = true;
      worker = null;
      // 降级：把挂起的请求同步算掉
      for (const [id, cb] of pending) {
        pending.delete(id);
        cb(null);
      }
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

export function requestSolve(
  coins: Coin[],
  depth: number
): Promise<{ left: number[]; right: number[]; cost: number } | null> {
  const w = ensureWorker();
  if (!w) return Promise.resolve(solveForCoins(coins, depth));
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve(solveForCoins(coins, depth)); // 超时降级
      }
    }, 6000);
    pending.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    const req: SolveRequest = { id, coins, depth };
    w.postMessage(req);
  });
}
