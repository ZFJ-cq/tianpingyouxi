"use client";

import * as React from "react";
import {
  useGameStore,
  pansOf,
  type LevelRecord,
} from "@/store/gameStore";
import { LEVELS, minWeighings } from "@/game/levels";
import { createCoins, totalPossibilities } from "@/game/engine";
import type { DropTarget } from "@/components/BalanceScale";
import { askHint, askOptimal } from "@/game/hint";
import { BalanceScale } from "@/components/BalanceScale";
import { CoinChip, ROLE_CLASS, roleOf } from "@/components/CoinChip";
import { Sidebar } from "@/components/Sidebar";
import { LevelSelect } from "@/components/LevelSelect";
import { SubmitDialog } from "@/components/SubmitDialog";
import { GameOverModal } from "@/components/GameOverModal";
import { ReplayBar } from "@/components/ReplayBar";
import { RulesPanel } from "@/components/RulesPanel";
import { Badge, Button, Card, ScaleMark } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Page() {
  /* ---- 水合门控：localStorage 状态只在客户端可用 ---- */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const s = useGameStore();
  const {
    level,
    levelId,
    coins,
    truth,
    weighings,
    used,
    allowed,
    known,
    status,
    lastResult,
    loseReason,
    assignment,
    selected,
    hint,
    hintLoading,
    hintUsed,
    replay,
    records,
  } = s;

  /* ---- 本地 UI 状态 ---- */
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [levelsOpen, setLevelsOpen] = React.useState(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [overDismissed, setOverDismissed] = React.useState(false);
  const [optimal, setOptimal] = React.useState<number | null>(null);

  /* ---- 结算时计算最优解 ---- */
  React.useEffect(() => {
    if (status === "playing") {
      setOverDismissed(false);
      setOptimal(null);
      return;
    }
    let alive = true;
    askOptimal().then((v) => {
      if (alive && v !== null) setOptimal(v);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, levelId]);

  /* ---- 回放视图派生 ---- */
  const replayView = React.useMemo(() => {
    if (!replay) return null;
    const { step } = replay;
    if (step < 0) {
      const initial = createCoins(level.coins, known);
      return {
        left: [] as number[],
        right: [] as number[],
        tilt: null,
        coins: initial,
        used: 0,
      };
    }
    const w = weighings[step];
    if (!w) return null;
    return {
      left: w.left,
      right: w.right,
      tilt: w.result,
      coins: coins.map((c) => ({ id: c.id, roles: w.rolesAfter[c.id] ?? [] })),
      used: w.index,
    };
  }, [replay, weighings, coins, level.coins, known]);

  /* ---- 回放自动播放 ---- */
  React.useEffect(() => {
    if (!replay?.playing) return;
    const last = weighings.length - 1;
    if (replay.step >= last) {
      useGameStore.setState({ replay: { step: last, playing: false } });
      return;
    }
    const t = setTimeout(() => {
      useGameStore.getState().replayGoto(replay.step + 1);
    }, 1600);
    return () => clearTimeout(t);
  }, [replay?.playing, replay?.step, weighings.length]);

  /* ---- 拖拽管理 ---- */
  const leftZone = React.useRef<SVGGElement>(null);
  const rightZone = React.useRef<SVGGElement>(null);
  const poolZone = React.useRef<HTMLDivElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = React.useState<number | null>(null);

  const inRect = (el: Element | null, x: number, y: number) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  const hitTest = (x: number, y: number): DropTarget | null => {
    if (inRect(leftZone.current, x, y)) return "L";
    if (inRect(rightZone.current, x, y)) return "R";
    if (inRect(poolZone.current, x, y)) return "pool";
    return null;
  };

  const handleDragStart = React.useCallback(
    (id: number, from: DropTarget, e: React.PointerEvent) => {
      const sx = e.clientX;
      const sy = e.clientY;
      let moved = false;
      let over: DropTarget | null = null;
      const setZone = (t: DropTarget | null) => {
        leftZone.current?.classList.toggle("zone-active", t === "L");
        rightZone.current?.classList.toggle("zone-active", t === "R");
        poolZone.current?.classList.toggle("zone-active", t === "pool");
      };
      const onMove = (ev: PointerEvent) => {
        if (!moved) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
          moved = true;
          setDragId(id);
        }
        if (ghostRef.current) {
          ghostRef.current.style.opacity = "1";
          ghostRef.current.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%,-50%) scale(1.12)`;
        }
        const t = hitTest(ev.clientX, ev.clientY);
        if (t !== over) {
          over = t;
          setZone(t);
        }
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setZone(null);
        setDragId(null);
        const st = useGameStore.getState();
        if (st.replay || st.status !== "playing") return;
        if (!moved) {
          if (from === "pool") st.toggleSelect(id);
          else st.unassign(id);
          return;
        }
        const t = hitTest(ev.clientX, ev.clientY);
        if (!t) return;
        if (t === "pool") {
          st.unassign(id);
        } else {
          useGameStore.setState({ assignment: { ...st.assignment, [id]: t } });
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    []
  );

  /* ---- 视图数据（回放时显示历史快照） ---- */
  const view = replayView ?? {
    left: pansOf(s).left,
    right: pansOf(s).right,
    tilt: lastResult,
    coins,
    used,
  };
  const interactive = !replay && status === "playing";
  const poss = totalPossibilities(view.coins);
  const canWeigh =
    interactive && view.left.length > 0 && view.left.length === view.right.length;
  const deficit = view.left.length - view.right.length;

  const hintSet = React.useMemo(() => {
    const l = new Set(hint?.left ?? []);
    const r = new Set(hint?.right ?? []);
    return { left: l, right: r };
  }, [hint]);

  if (!mounted) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
          <ScaleMark className="h-10 w-10 animate-pulse" />
          <p className="font-song text-sm">称量台加载中…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 overflow-x-hidden p-3 sm:p-4 lg:p-6">
      {/* ============ 顶栏 ============ */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[var(--gold-soft)]">
            <ScaleMark className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-song text-xl font-bold leading-tight">称量台</h1>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">
              天平找伪币 · 逻辑推理挑战
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <Badge tone={known ? "jade" : "cinnabar"}>{level.name}</Badge>
          <Badge tone="ink">
            {known ? `伪币已知${known === "L" ? "偏轻" : "偏重"}` : "伪币轻重未知"}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setRulesOpen(true)}>
            玩法
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLevelsOpen(true)}>
            关卡
          </Button>
          <Button size="sm" variant="outline" onClick={() => s.restart()}>
            重开
          </Button>
        </div>
      </header>

      {/* ============ 移动端状态条（窄屏显示，桌面由侧栏承担） ============ */}
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Card className="flex flex-col justify-center p-3">
          <span className="text-[11px] text-[var(--muted-foreground)]">剩余可能</span>
          <span
            className={cn(
              "tabnum text-3xl font-bold leading-none",
              poss > Math.pow(3, allowed - view.used) && poss > 1
                ? "text-[var(--cinnabar)]"
                : "text-[var(--foreground)]"
            )}
          >
            {poss}
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--muted-foreground)]">种候选</span>
            {poss === 1 ? (
              <Badge tone="gold">已锁定</Badge>
            ) : (
              <Badge tone={minWeighings(poss) > allowed - view.used ? "cinnabar" : "ink"}>
                至少还需 {minWeighings(poss)} 次
              </Badge>
            )}
          </div>
        </Card>
        <Card className="flex flex-col justify-center p-3">
          <span className="text-[11px] text-[var(--muted-foreground)]">称量预算</span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 gap-1">
              {Array.from({ length: allowed }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2.5 min-w-0 flex-1 rounded-sm border",
                    i < view.used
                      ? "bg-[var(--primary)] border-[var(--primary)]"
                      : "bg-transparent border-[var(--border)]"
                  )}
                />
              ))}
            </div>
          </div>
          <span className="tabnum mt-1.5 text-[11px] text-[var(--muted-foreground)]">
            已用 {view.used}/{allowed}
          </span>
        </Card>
      </div>

      {/* ============ 主体 ============ */}
      <div className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {/* 天平舞台 */}
          <Card className="relative overflow-hidden p-3">
            <BalanceScale
              coins={view.coins}
              left={view.left}
              right={view.right}
              tilt={view.tilt}
              highlight={interactive ? { left: [...hintSet.left], right: [...hintSet.right] } : null}
              interactive={interactive}
              leftZoneRef={leftZone}
              rightZoneRef={rightZone}
              onDragStart={handleDragStart}
            />
            {/* 结果横幅 */}
            {lastResult && !replay && (
              <div className="rise absolute left-1/2 top-3 -translate-x-1/2">
                <Badge tone={lastResult === "balance" ? "ash" : lastResult === "left" ? "cinnabar" : "jade"}>
                  第 {used} 次称量：
                  {lastResult === "left" ? "左盘下沉" : lastResult === "right" ? "右盘下沉" : "平衡"}
                </Badge>
              </div>
            )}
            {replay && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2">
                <Badge tone="gold">
                  回放中 · {replay.step < 0 ? "开局布阵" : `第 ${replay.step + 1} 次称量结果`}
                </Badge>
              </div>
            )}
          </Card>

          {/* 回放控制条 */}
          {replay && (
            <ReplayBar
              total={weighings.length}
              step={replay.step}
              playing={replay.playing}
              onGoto={(step) => s.replayGoto(step)}
              onToggle={() => s.replayToggle()}
              onExit={() => s.exitReplay()}
            />
          )}

          {/* 待选硬币区 */}
          <Card className="p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="font-song text-[15px] font-bold">待选硬币</h2>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                点击多选 · 拖拽入盘 · 盘上硬币点一下可取回
              </span>
              <span className="ml-auto tabnum text-[11px] text-[var(--muted-foreground)]">
                左盘 {view.left.length} · 右盘 {view.right.length}
              </span>
            </div>
            <div id="pool-zone" ref={poolZone} className="flex flex-wrap gap-2 rounded-xl p-1">
              {coins.map((c) => (
                <CoinChip
                  key={c.id}
                  coin={c}
                  selected={selected.includes(c.id)}
                  hinted={hintSet.left.has(c.id) || hintSet.right.has(c.id)}
                  assigned={assignment[c.id] ?? null}
                  onDragStart={handleDragStart}
                  onTap={(id) => s.toggleSelect(id)}
                />
              ))}
            </div>
            {/* 布阵操作 */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                size="sm"
                variant="outline"
                disabled={!interactive || selected.length === 0}
                onClick={() => s.assignSelected("L")}
                className="min-h-[40px] sm:min-w-[150px] sm:flex-1"
              >
                选中 {selected.length || ""} 枚 → 左盘
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!interactive || selected.length === 0}
                onClick={() => s.assignSelected("R")}
                className="min-h-[40px] sm:min-w-[150px] sm:flex-1"
              >
                选中 {selected.length || ""} 枚 → 右盘
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!interactive || Object.keys(assignment).length === 0}
                onClick={() => s.clearPans()}
                className="col-span-2 min-h-[40px] sm:col-auto"
              >
                全部取下
              </Button>
              {deficit !== 0 && view.left.length + view.right.length > 0 && (
                <Button
                  size="sm"
                  variant="gold"
                  disabled={!interactive}
                  onClick={() => s.fillPanWithGoods()}
                  title="用已排除的正常币把少的一侧配平（经典解法常用）"
                  className="col-span-2 min-h-[40px] sm:col-auto sm:flex-1"
                >
                  差额 {Math.abs(deficit)} 枚 · 用正常币配平
                </Button>
              )}
            </div>
          </Card>

          {/* 主操作 */}
          <Card className="grid grid-cols-2 gap-2 p-3 md:flex md:flex-wrap md:items-center">
            <Button
              variant="primary"
              disabled={!canWeigh}
              onClick={() => s.weigh()}
              className="col-span-2 min-h-[44px] md:col-auto md:min-w-[120px] md:flex-1"
            >
              称 量
            </Button>
            <Button
              variant="gold"
              disabled={!interactive || hintLoading || poss <= 1}
              onClick={() => askHint()}
              className="min-h-[44px] md:min-w-[120px] md:flex-1"
            >
              {hintLoading ? "搜索中…" : "提 示"}
            </Button>
            <Button
              variant="outline"
              disabled={!interactive || poss <= 0}
              onClick={() => setSubmitOpen(true)}
              className={cn("min-h-[44px] md:min-w-[130px] md:flex-1", poss === 1 && "hint-glow")}
            >
              我这枚就是伪币
            </Button>
            {status !== "playing" && (
              <Button
                variant="outline"
                onClick={() => s.startReplay()}
                className="col-span-2 min-h-[44px] md:col-auto md:min-w-[120px] md:flex-1"
              >
                复盘回放
              </Button>
            )}
          </Card>

          {/* 提示横幅 */}
          {hint && interactive && (
            <Card className="rise border-[var(--gold)] bg-[#f9f0d8] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-song text-sm font-bold text-[#7a5a0e]">solver 建议</span>
                <span className="tabnum text-xs text-[#7a5a0e]">
                  左盘 [{hint.left.join(",")}] vs 右盘 [{hint.right.join(",")}]
                  {hint.left.length !== hint.right.length && (
                    <span className="ml-1">（差额 {Math.abs(hint.left.length - hint.right.length)} 枚由正常币补足）</span>
                  )}
                </span>
                <Badge tone={hint.cost >= 0 ? "jade" : "cinnabar"}>
                  {hint.cost >= 0 ? `最坏情况还需 ${hint.cost} 次` : "剩余预算内已无必胜称法"}
                </Badge>
                <Button size="sm" variant="gold" className="ml-auto" onClick={() => s.applyHint()}>
                  应用这一称法
                </Button>
              </div>
            </Card>
          )}

          {/* 失败警告（未结束但已无望） */}
          {status === "playing" && !replay && poss > 1 && poss > Math.pow(3, allowed - used) && (
            <Card className="border-[var(--cinnabar)] bg-[#f7e0dc] p-3 text-xs text-[#7e2f27]">
              剩余 {poss} 种候选，仅剩 {allowed - used} 次称量（最多区分{" "}
              {Math.pow(3, allowed - used)} 种）——这一局已经不可能完成了，可以重开或复盘思路。
            </Card>
          )}
        </div>

        {/* ============ 侧栏 ============ */}
        <Sidebar
          coins={view.coins}
          used={view.used}
          allowed={allowed}
          weighings={weighings}
          level={level}
          replayStep={replay ? replay.step : null}
          onReplayTo={(step) => {
            if (!replay) s.startReplay();
            useGameStore.getState().replayGoto(step);
          }}
          onPickForGuess={(id) => {
            if (interactive) {
              s.setSelected([id]);
              setSubmitOpen(true);
            }
          }}
        />
      </div>

      {/* ============ 弹层 ============ */}
      <SubmitDialog
        open={submitOpen}
        coins={view.coins}
        known={known}
        onClose={() => setSubmitOpen(false)}
        onSubmit={(coinId, dir) => {
          setSubmitOpen(false);
          s.submit(coinId, dir);
        }}
      />
      <LevelSelect
        open={levelsOpen}
        currentId={levelId}
        records={records as Record<string, LevelRecord>}
        onPick={(id) => s.startLevel(id)}
        onClose={() => setLevelsOpen(false)}
      />
      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {status !== "playing" && !overDismissed && !replay && (
        <GameOverModal
          status={status === "won" ? "won" : "lost"}
          loseReason={loseReason}
          used={used}
          allowed={allowed}
          optimal={optimal}
          level={level}
          truth={truth}
          hintUsed={hintUsed}
          onReplay={() => {
            setOverDismissed(true);
            s.startReplay();
          }}
          onRestart={() => {
            setOverDismissed(true);
            s.restart();
          }}
          onClose={() => setOverDismissed(true)}
        />
      )}

      {/* 拖拽幽灵 */}
      {dragId !== null && (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed left-0 top-0 z-[60] opacity-0"
        >
          <div className={cn("coin-base h-9 w-9 text-[12.5px]", ROLE_CLASS[roleOf(coins.find((c) => c.id === dragId))])}>
            {dragId}
          </div>
        </div>
      )}

      <footer className="pb-2 text-center text-[11px] text-[var(--muted-foreground)]">
        称量台 · 纯前端静态应用 · solver 跑在 Web Worker 中的极小化极大搜索 · 进度保存在本地
        localStorage
      </footer>
    </main>
  );
}
