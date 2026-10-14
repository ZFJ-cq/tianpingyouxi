"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Coin,
  Dir,
  GameStatus,
  LevelDef,
  LoseReason,
  Outcome,
  Truth,
  Weighing,
} from "@/game/types";
import { getLevel, LEVELS } from "@/game/levels";
import {
  applyWeighing,
  classifyOutcome,
  createCoins,
  makeWeighing,
  randomTruth,
  totalPossibilities,
} from "@/game/engine";

export interface LevelRecord {
  best: number; // 最少称量次数
  wins: number;
  plays: number;
}

export interface GameState {
  /* ---- 关卡与对局 ---- */
  levelId: string;
  level: LevelDef;
  coins: Coin[];
  truth: Truth;
  weighings: Weighing[];
  used: number;
  allowed: number;
  known: Dir | null;
  status: GameStatus;
  lastResult: Outcome | null;
  loseReason: LoseReason;

  /* ---- 当前布阵 ---- */
  assignment: Record<number, "L" | "R">;
  selected: number[];

  /* ---- 提示 ---- */
  hint: { left: number[]; right: number[]; cost: number } | null;
  hintLoading: boolean;
  hintUsed: number;

  /* ---- 复盘回放 ---- */
  replay: { step: number; playing: boolean } | null;

  /* ---- 成绩 ---- */
  records: Record<string, LevelRecord>;

  /* ---- 动作 ---- */
  startLevel: (id: string) => void;
  restart: () => void;
  toggleSelect: (id: number) => void;
  setSelected: (ids: number[]) => void;
  assignSelected: (pan: "L" | "R") => void;
  unassign: (id: number) => void;
  clearPans: () => void;
  fillPanWithGoods: () => void;
  weigh: () => void;
  submit: (coinId: number, dir: Dir) => void;
  setHint: (hint: { left: number[]; right: number[]; cost: number } | null) => void;
  setHintLoading: (v: boolean) => void;
  applyHint: () => void;
  startReplay: () => void;
  replayGoto: (step: number) => void;
  replayToggle: () => void;
  exitReplay: () => void;
}

function freshGame(id: string) {
  const level = getLevel(id);
  const coins = createCoins(level.coins, level.known);
  const truth = randomTruth(level.coins, level.known);
  return {
    levelId: level.id,
    level,
    coins,
    truth,
    weighings: [] as Weighing[],
    used: 0,
    allowed: level.optimal,
    known: level.known,
    status: "playing" as GameStatus,
    lastResult: null as Outcome | null,
    loseReason: null as LoseReason,
    assignment: {} as Record<number, "L" | "R">,
    selected: [] as number[],
    hint: null,
    hintLoading: false,
    hintUsed: 0,
    replay: null,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshGame(LEVELS[0].id),
      records: {},

      startLevel: (id) =>
        set((s) => ({
          ...freshGame(id),
          records: {
            ...s.records,
            [id]: { ...(s.records[id] ?? { best: 99, wins: 0, plays: 0 }), plays: (s.records[id]?.plays ?? 0) + 1 },
          },
        })),

      restart: () =>
        set((s) => ({
          ...freshGame(s.levelId),
          records: {
            ...s.records,
            [s.levelId]: { ...(s.records[s.levelId] ?? { best: 99, wins: 0, plays: 0 }), plays: (s.records[s.levelId]?.plays ?? 0) + 1 },
          },
        })),

      toggleSelect: (id) =>
        set((s) => ({
          selected: s.selected.includes(id)
            ? s.selected.filter((x) => x !== id)
            : [...s.selected, id],
        })),

      setSelected: (ids) => set({ selected: ids }),

      assignSelected: (pan) =>
        set((s) => {
          const assignment = { ...s.assignment };
          for (const id of s.selected) assignment[id] = pan;
          return { assignment, selected: [] };
        }),

      unassign: (id) =>
        set((s) => {
          const assignment = { ...s.assignment };
          delete assignment[id];
          return { assignment };
        }),

      clearPans: () => set({ assignment: {} }),

      /** 两盘疑币数不等时，用正常币把少的一侧配平（经典解法常用技巧） */
      fillPanWithGoods: () =>
        set((s) => {
          const assignment = { ...s.assignment };
          const left = Object.entries(assignment)
            .filter(([, p]) => p === "L")
            .map(([id]) => Number(id));
          const right = Object.entries(assignment)
            .filter(([, p]) => p === "R")
            .map(([id]) => Number(id));
          if (left.length === right.length) return {};
          const goodCoins = s.coins.filter((c) => c.roles.length === 0).map((c) => c.id);
          const need = Math.abs(left.length - right.length);
          const target = left.length < right.length ? "L" : "R";
          let added = 0;
          for (const id of goodCoins) {
            if (added >= need) break;
            if (!assignment[id]) {
              assignment[id] = target;
              added++;
            }
          }
          return { assignment };
        }),

      weigh: () =>
        set((s) => {
          if (s.status !== "playing" || s.replay) return {};
          const left = Object.entries(s.assignment)
            .filter(([, p]) => p === "L")
            .map(([id]) => Number(id))
            .sort((a, b) => a - b);
          const right = Object.entries(s.assignment)
            .filter(([, p]) => p === "R")
            .map(([id]) => Number(id))
            .sort((a, b) => a - b);
          if (left.length === 0 || left.length !== right.length) return {};
          const result = classifyOutcome(s.truth, left, right);
          const nextCoins = applyWeighing(s.coins, left, right, result);
          const w = makeWeighing(s.used + 1, left, right, result, nextCoins);
          const used = s.used + 1;
          const poss = totalPossibilities(nextCoins);
          const remaining = s.allowed - used;
          const impossible = poss > Math.pow(3, remaining);
          return {
            coins: nextCoins,
            weighings: [...s.weighings, w],
            used,
            lastResult: result,
            assignment: {},
            selected: [],
            hint: null,
            status: impossible ? "lost" : "playing",
            loseReason: impossible ? "impossible" : null,
          };
        }),

      submit: (coinId, dir) =>
        set((s) => {
          if (s.status !== "playing" || s.replay) return {};
          const ok = coinId === s.truth.coin && dir === s.truth.dir;
          if (ok) {
            const rec = s.records[s.levelId] ?? { best: 99, wins: 0, plays: 0 };
            return {
              status: "won",
              lastResult: s.lastResult,
              records: {
                ...s.records,
                [s.levelId]: {
                  best: Math.min(rec.best, s.used),
                  wins: rec.wins + 1,
                  plays: rec.plays,
                },
              },
            };
          }
          return { status: "lost", loseReason: "wrong-guess" };
        }),

      setHint: (hint) => set({ hint, hintLoading: false }),
      setHintLoading: (v) => set({ hintLoading: v }),

      applyHint: () =>
        set((s) => {
          if (!s.hint) return {};
          const assignment: Record<number, "L" | "R"> = {};
          for (const id of s.hint.left) assignment[id] = "L";
          for (const id of s.hint.right) assignment[id] = "R";
          // 差额用正常币补足，保证两盘等数
          const diff = s.hint.left.length - s.hint.right.length;
          if (diff !== 0) {
            const target: "L" | "R" = diff > 0 ? "R" : "L";
            const goodCoins = s.coins
              .filter((c) => c.roles.length === 0 && !assignment[c.id])
              .map((c) => c.id);
            for (let i = 0; i < Math.abs(diff) && i < goodCoins.length; i++) {
              assignment[goodCoins[i]] = target;
            }
          }
          return { assignment, selected: [], hintUsed: s.hintUsed + 1 };
        }),

      startReplay: () =>
        set((s) =>
          s.weighings.length > 0 && s.status !== "playing"
            ? { replay: { step: -1, playing: false } }
            : {}
        ),
      replayGoto: (step) =>
        set((s) => (s.replay ? { replay: { ...s.replay, step } } : {})),
      replayToggle: () =>
        set((s) =>
          s.replay
            ? {
                replay: {
                  ...s.replay,
                  playing: !s.replay.playing,
                },
              }
            : {}
        ),
      exitReplay: () => set({ replay: null }),
    }),
    {
      name: "chengzantai.v1",
      partialize: (s) => ({
        levelId: s.levelId,
        coins: s.coins,
        truth: s.truth,
        weighings: s.weighings,
        used: s.used,
        allowed: s.allowed,
        known: s.known,
        status: s.status === "playing" ? "playing" : s.status,
        lastResult: s.lastResult,
        loseReason: s.loseReason,
        assignment: s.assignment,
        hintUsed: s.hintUsed,
        records: s.records,
      }),
    }
  )
);

/** 派生：当前布阵的左右盘 */
export function pansOf(state: GameState): { left: number[]; right: number[] } {
  const left: number[] = [];
  const right: number[] = [];
  for (const [id, pan] of Object.entries(state.assignment)) {
    (pan === "L" ? left : right).push(Number(id));
  }
  left.sort((a, b) => a - b);
  right.sort((a, b) => a - b);
  return { left, right };
}
