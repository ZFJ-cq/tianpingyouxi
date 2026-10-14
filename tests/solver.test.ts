/* eslint-disable */
// 运行：node tests/run.mjs（由 esbuild 打包本文件后执行）
import { LEVELS, minWeighings } from "../src/game/levels.ts";
import {
  applyWeighing,
  classifyOutcome,
  createCoins,
  randomTruth,
  totalPossibilities,
} from "../src/game/engine.ts";
import {
  coinGroupsOf,
  groupsOf,
  solveForCoins,
  solveGroups,
  totalHyp,
} from "../src/game/solver.ts";
import type { Coin, Dir, Outcome, Truth } from "../src/game/types.ts";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(`${name} ${extra}`);
    console.log(`  ✗ ${name} ${extra}`);
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(name, actual === expected, `→ 实际 ${actual}，期望 ${expected}`);
}

// ---------- 1. 信息论下界 ----------
console.log("【1】minWeighings 下界");
eq("12 未知 → 3", minWeighings(24), 3);
eq("13 未知信息论下界 3（但不可达，实际需 4）", minWeighings(26), 3);
eq("27 未知 → 4", minWeighings(54), 4);
eq("27 已知 → 3", minWeighings(27), 3);

// ---------- 2. 各关卡 solver 最优代价 ----------
console.log("【2】九关最优称量次数");
for (const lv of LEVELS) {
  const coins = createCoins(lv.coins, lv.known);
  const res = solveForCoins(coins, lv.optimal);
  const ok = !!res && res.cost === lv.optimal;
  check(`关卡 ${lv.id} 最优=${lv.optimal}`, ok, res ? `solver=${res.cost}` : "solver=null");
}

// ---------- 3. 沿 solver 称法完整推演：所有分支都应在最优次数内定案 ----------
console.log("【3】最优策略全分支推演");

function playOptimal(coins: Coin[], depth: number, truth: Truth, path: string): number {
  // 返回从当前状态定案还需几次（含本次）
  const hint = solveForCoins(coins, depth);
  if (!hint) return 0; // 已锁定
  const result = classifyOutcome(truth, hint.left, hint.right);
  const next = applyWeighing(coins, hint.left, hint.right, result);
  // 真值假设必须仍在候选集中
  const t = next.find((c) => c.id === truth.coin)!;
  check(
    `真值保留 ${path}`,
    t.roles.includes(truth.dir),
    `roles=${JSON.stringify(t.roles)}`
  );
  return 1 + playOptimal(next, depth - 1, truth, `${path}/${result[0]}`);
}

for (const lv of LEVELS) {
  for (let trial = 0; trial < 12; trial++) {
    const coins = createCoins(lv.coins, lv.known);
    const truth = randomTruth(lv.coins, lv.known);
    const used = playOptimal(coins, lv.optimal, truth, lv.id);
    check(`${lv.id}  Trial${trial} 定案次数 ≤ ${lv.optimal}`, used <= lv.optimal, `实际 ${used}`);
  }
}

// ---------- 4. 引擎不变量：候选集 == 与全部历史一致的假设集 ----------
console.log("【4】随机对局引擎一致性");

function consistentHypotheses(history: Array<{ left: number[]; right: number[]; result: Outcome }>, n: number, known: Dir | null): Set<string> {
  const dirs: Dir[] = known ? [known] : ["L", "H"];
  const out = new Set<string>();
  for (let c = 0; c < n; c++) {
    for (const d of dirs) {
      const ok = history.every((h) => classifyOutcome({ coin: c, dir: d }, h.left, h.right) === h.result);
      if (ok) out.add(`${c}:${d}`);
    }
  }
  return out;
}

let rng = 123456789;
function rnd(n: number) {
  rng = (rng * 1103515245 + 12345) & 0x7fffffff;
  return rng % n;
}

for (const lv of LEVELS) {
  for (let trial = 0; trial < 8; trial++) {
    const n = lv.coins;
    const truth = randomTruth(n, lv.known);
    let coins = createCoins(n, lv.known);
    const history: Array<{ left: number[]; right: number[]; result: Outcome }> = [];
    const maxW = lv.optimal + 2;
    for (let step = 0; step < maxW; step++) {
      const hyp = consistentHypotheses(history, n, lv.known);
      // 引擎候选数 vs 理论候选集大小
      check(
        `${lv.id} T${trial} 第${step}步 候选数一致`,
        totalPossibilities(coins) === hyp.size,
        `引擎=${totalPossibilities(coins)} 理论=${hyp.size}`
      );
      // 每枚硬币的 roles 与理论候选集逐枚吻合
      let rolesOk = true;
      for (const c of coins) {
        const expected = [...hyp].filter((h) => h.startsWith(`${c.id}:`)).map((h) => h.split(":")[1] as Dir).sort();
        const actual = [...c.roles].sort();
        if (expected.join() !== actual.join()) rolesOk = false;
      }
      check(`${lv.id} T${trial} 第${step}步 roles 一致`, rolesOk);
      // 随机走一步（可能非最优）
      const k = 1 + rnd(Math.min(6, Math.floor(n / 2)));
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
}

// ---------- 5. 经典首称法 ----------
console.log("【5】经典首称法");
{
  const coins = createCoins(12, null);
  const hint = solveForCoins(coins, 3)!;
  check("12 未知首称 4∷4", hint.left.length === 4 && hint.right.length === 4, `L=${hint.left.length} R=${hint.right.length}`);
  check("12 未知首称不重叠", hint.left.every((c) => !hint.right.includes(c)));
}
{
  const coins = createCoins(27, "H");
  const hint = solveForCoins(coins, 3)!;
  check("27 已知首称 9∷9", hint.left.length === 9 && hint.right.length === 9, `L=${hint.left.length} R=${hint.right.length}`);
}
{
  const coins = createCoins(8, null);
  const hint = solveForCoins(coins, 3)!;
  // 2∷2 与 3∷3 均为 8 球未知轻重的最优首称（代价均为 3）
  check("8 未知首称代价 3", hint.cost === 3, `cost=${hint.cost}`);
  check(
    "8 未知首称为 2∷2 或 3∷3",
    (hint.left.length === 2 && hint.right.length === 2) ||
      (hint.left.length === 3 && hint.right.length === 3),
    `L=${hint.left.length} R=${hint.right.length}`
  );
  check("8 未知首称不重叠", hint.left.every((c) => !hint.right.includes(c)));
}

// ---------- 6. 状态规范化不变量 ----------
console.log("【6】对称与规范化");
{
  const a = solveGroups({ L: 9, H: 9, B: 0, G: 0 }, 3).cost;
  const b = solveGroups({ L: 9, H: 9, B: 0, G: 0 }, 3).cost;
  eq("L/H 对称状态代价稳定", a, b);
  const c1 = solveGroups({ L: 5, H: 2, B: 0, G: 3 }, 3).cost;
  const c2 = solveGroups({ L: 2, H: 5, B: 0, G: 3 }, 3).cost;
  eq("L/H 互换代价相同", c1, c2);
  const d = solveGroups({ L: 3, H: 3, B: 3, G: 2 }, 3);
  check("深状态有解", d.cost >= 1 && d.cost < 1e9, `cost=${d.cost}`);
}

// ---------- 7. 已锁定状态 ----------
console.log("【7】终局状态");
{
  const cs0 = createCoins(4, "L");
  // （cs0 仅作构造说明，不修改）
  // 构造：4 枚已知轻，称 1∷1 平衡 → 伪币在余下两枚
  let cs = createCoins(4, "L");
  cs = applyWeighing(cs, [0], [1], "balance");
  eq("平衡后剩余 2 候选", totalPossibilities(cs), 2);
  const hint = solveForCoins(cs, 1);
  check("1 次可定案", !!hint && hint.cost === 1, hint ? `cost=${hint.cost}` : "null");
  cs = applyWeighing(cs, [2], [0], "right"); // 2 号偏轻且在左盘 → 右倾
  eq("定案", totalPossibilities(cs), 1);
  eq("锁定后无提示", solveForCoins(cs, 1), null);
}

// ---------- 8. 正常币配重（经典 12 币题第二步） ----------
console.log("【8】正常币配重");
{
  // 12 未知：首称 4∷4 平衡 → 余 4 枚疑币 + 8 枚正常币
  let cs = createCoins(12, null);
  cs = applyWeighing(cs, [0, 1, 2, 3], [4, 5, 6, 7], "balance");
  eq("平衡后 8 候选", totalPossibilities(cs), 8);
  const hint = solveForCoins(cs, 2)!;
  check("第二步存在", !!hint);
  check("第二步 2 次可定案", hint.cost === 2, `cost=${hint.cost}`);
  // 最优第二步应利用正常币：两盘疑币数不等（差额由正常币补）
  check(
    "第二步动用正常币配重",
    hint.left.length !== hint.right.length,
    `L=${hint.left.length} R=${hint.right.length}`
  );
  check("第二步不重叠", hint.left.every((c) => !hint.right.includes(c)));
  // 该称法下所有可能真值都应保留在候选集中
  for (const dir of ["L", "H"] as Dir[]) {
    for (const fake of hint.left.concat(hint.right, [8, 9, 10, 11])) {
      const truth: Truth = { coin: fake, dir };
      const r = classifyOutcome(truth, hint.left, hint.right);
      const next = applyWeighing(cs, hint.left, hint.right, r);
      const t = next.find((c) => c.id === fake)!;
      check(`配重分支保留真值 ${fake}${dir}`, t.roles.includes(dir));
    }
  }
}

// ---------- 9. 13 球陷阱 ----------
console.log("【9】13 球未知轻重需 4 次");
{
  const coins = createCoins(13, null);
  const hint = solveForCoins(coins, 4)!;
  check("13 未知 4 次有解", hint.cost === 4, `cost=${hint.cost}`);
  const hint3 = solveForCoins(coins, 3)!;
  check("13 未知 3 次无解", hint3.cost === -1, `cost=${hint3.cost}`);
}

console.log(`\n========== 结果：${pass} 通过 / ${fail} 失败 ==========`);
if (fail > 0) {
  console.log(failures.slice(0, 30).join("\n"));
  process.exit(1);
}
