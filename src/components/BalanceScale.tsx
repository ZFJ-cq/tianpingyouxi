"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Coin, Outcome } from "@/game/types";
import { cn } from "@/lib/utils";

/* ============ 几何常量 ============ */
const VIEW_W = 680;
const VIEW_H = 352;
const CX = 340; // 支点横坐标
const CY = 118; // 横梁高度
const BEAM = 205; // 横梁半长
const STRING = 56; // 吊线长度
const PAN_RX = 88; // 托盘半径
const PAN_RY = 11;
const MAX_ANGLE = 0.15; // 最大倾角 ~8.6°
const DIAL_Y = 176; // 表盘圆心

export type DropTarget = "L" | "R" | "pool";

export interface BalanceScaleProps {
  coins: Coin[];
  left: number[];
  right: number[];
  tilt: Outcome | null;
  highlight?: { left: number[]; right: number[] } | null;
  interactive?: boolean;
  leftZoneRef?: React.RefObject<SVGGElement>;
  rightZoneRef?: React.RefObject<SVGGElement>;
  onDragStart?: (id: number, from: DropTarget, e: React.PointerEvent) => void;
}

/* 硬币角色 → 配色 */
function roleOf(coin: Coin | undefined): "dead" | "light" | "heavy" | "unknown" {
  if (!coin) return "dead";
  if (coin.roles.length === 0) return "dead";
  if (coin.roles.length === 2) return "unknown";
  return coin.roles[0] === "L" ? "light" : "heavy";
}

const FILL: Record<string, string> = {
  unknown: "url(#gUnknown)",
  light: "url(#gLight)",
  heavy: "url(#gHeavy)",
  dead: "url(#gDead)",
};
const TEXT_FILL: Record<string, string> = {
  unknown: "#ffffff",
  light: "#ffffff",
  heavy: "#ffffff",
  dead: "#5d574c",
};

/** 托盘内硬币网格排布 */
function panLayout(ids: number[]) {
  const n = ids.length;
  if (n === 0) return [];
  const cols = Math.min(5, n);
  const rows = Math.ceil(n / cols);
  const stepX = 30;
  const stepY = 26;
  return ids.map((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { id, x: (col - (cols - 1) / 2) * stepX, y: (row - (rows - 1) / 2) * stepY + 2 };
  });
}

export function BalanceScale({
  coins,
  left,
  right,
  tilt,
  highlight,
  interactive = true,
  leftZoneRef,
  rightZoneRef,
  onDragStart,
}: BalanceScaleProps) {
  const angle = useMotionValue(0);
  const coinMap = React.useMemo(() => new Map(coins.map((c) => [c.id, c])), [coins]);

  React.useEffect(() => {
    const target = tilt === "left" ? MAX_ANGLE : tilt === "right" ? -MAX_ANGLE : 0;
    const controls = animate(angle, target, {
      type: "spring",
      stiffness: 130,
      damping: 11,
      mass: 1.1,
    });
    return () => controls.stop();
  }, [tilt, angle]);

  /* 由倾角推导两端坐标（吊盘随弧线平移且保持水平，符合真实天平） */
  const lx = useTransform(angle, (a) => CX - BEAM * Math.cos(a));
  const ly = useTransform(angle, (a) => CY + BEAM * Math.sin(a));
  const rx = useTransform(angle, (a) => CX + BEAM * Math.cos(a));
  const ry = useTransform(angle, (a) => CY - BEAM * Math.sin(a));
  const needleX = useTransform(angle, (a) => CX - 34 * Math.sin(a));
  const needleY = useTransform(angle, (a) => CY + 34 * Math.cos(a));

  const renderPan = (
    ids: number[],
    zoneRef?: React.RefObject<SVGGElement>,
    side?: "L" | "R"
  ) => {
    const layout = panLayout(ids);
    const hl = new Set(
      side === "L" ? highlight?.left ?? [] : side === "R" ? highlight?.right ?? [] : []
    );
    return (
      <motion.g
        ref={zoneRef}
        style={{ x: side === "L" ? lx : rx, y: side === "L" ? ly : ry }}
      >
        {/* 吊线（V 形） */}
        <line x1={0} y1={1} x2={-PAN_RX * 0.78} y2={0} stroke="#8a8272" strokeWidth={1.4} />
        <line x1={0} y1={1} x2={PAN_RX * 0.78} y2={0} stroke="#8a8272" strokeWidth={1.4} />
        {/* 托盘（浅碗） */}
        <path
          className="pan-bowl"
          d={`M ${-PAN_RX} 0 Q 0 ${PAN_RY + 17} ${PAN_RX} 0 Z`}
          fill="url(#gPan)"
          stroke="#a89e86"
          strokeWidth={1.3}
        />
        <ellipse
          cx={0}
          cy={0}
          rx={PAN_RX}
          ry={PAN_RY}
          fill="rgba(253,250,241,0.28)"
          stroke="#a89e86"
          strokeWidth={1.3}
        />
        {/* 硬币 */}
        {layout.map((c) => {
          const coin = coinMap.get(c.id);
          const role = roleOf(coin);
          return (
            <g
              key={c.id}
              transform={`translate(${c.x}, ${c.y})`}
              style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}
              onPointerDown={(e) => {
                if (!interactive) return;
                onDragStart?.(c.id, side === "L" ? "L" : "R", e);
              }}
            >
              {hl.has(c.id) && (
                <circle className="hint-ring" r={17} fill="none" stroke="#b98a1f" strokeWidth={2.4} />
              )}
              <circle r={13} fill={FILL[role]} stroke="rgba(43,42,38,.35)" strokeWidth={0.8} />
              <circle r={13} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={0.7} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10.5}
                fontWeight={600}
                fill={TEXT_FILL[role]}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {c.id}
              </text>
            </g>
          );
        })}
      </motion.g>
    );
  };

  /* 表盘刻度 */
  const ticks = [];
  for (let i = -2; i <= 2; i++) {
    const a = (i * 12 * Math.PI) / 180;
    const r1 = i === 0 ? 15 : 18;
    const r2 = 27;
    ticks.push(
      <line
        key={i}
        x1={CX + r1 * Math.sin(a)}
        y1={DIAL_Y + r1 * Math.cos(a)}
        x2={CX + r2 * Math.sin(a)}
        y2={DIAL_Y + r2 * Math.cos(a)}
        stroke={i === 0 ? "#b98a1f" : "#a89e86"}
        strokeWidth={i === 0 ? 2 : 1.2}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full max-h-[34vh] sm:max-h-[42vh] lg:max-h-[46vh]"
      style={{ userSelect: "none" }}
    >
      <defs>
        <radialGradient id="gUnknown" cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#a58fc4" />
          <stop offset="55%" stopColor="#6f5a93" />
          <stop offset="100%" stopColor="#4e3f6d" />
        </radialGradient>
        <radialGradient id="gLight" cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#8fc0b2" />
          <stop offset="55%" stopColor="#3f7d6d" />
          <stop offset="100%" stopColor="#2c5a4e" />
        </radialGradient>
        <radialGradient id="gHeavy" cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#e0978c" />
          <stop offset="55%" stopColor="#b0453a" />
          <stop offset="100%" stopColor="#7e2f27" />
        </radialGradient>
        <radialGradient id="gDead" cx="34%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#d9d3c4" />
          <stop offset="55%" stopColor="#b3ab99" />
          <stop offset="100%" stopColor="#8f897c" />
        </radialGradient>
        <linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8cfb8" />
          <stop offset="45%" stopColor="#8f8672" />
          <stop offset="100%" stopColor="#5d564a" />
        </linearGradient>
        <linearGradient id="gPan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9dfc6" />
          <stop offset="100%" stopColor="#b9ad90" />
        </linearGradient>
        <linearGradient id="gPedestal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8f8672" />
          <stop offset="45%" stopColor="#c9bfa6" />
          <stop offset="100%" stopColor="#7d7462" />
        </linearGradient>
      </defs>

      {/* 舞台底面 */}
      <rect
        x={8}
        y={8}
        width={VIEW_W - 16}
        height={VIEW_H - 16}
        rx={22}
        fill="rgba(255,252,244,0.55)"
        stroke="#dccfb2"
        strokeWidth={1.2}
      />
      {/* 地影 */}
      <ellipse cx={CX} cy={336} rx={150} ry={10} fill="rgba(43,42,38,0.08)" />

      {/* 表盘 */}
      <path
        d={`M ${CX - 27} ${DIAL_Y - 4} A 27 27 0 0 0 ${CX + 27} ${DIAL_Y - 4}`}
        fill="none"
        stroke="#a89e86"
        strokeWidth={1.2}
      />
      {ticks}

      {/* 底座 */}
      <rect x={CX - 74} y={306} width={148} height={22} rx={8} fill="url(#gPedestal)" stroke="#7d7462" strokeWidth={1} />
      <path
        d={`M ${CX - 22} 306 L ${CX + 22} 306 L ${CX + 8} 196 L ${CX - 8} 196 Z`}
        fill="url(#gPedestal)"
        stroke="#7d7462"
        strokeWidth={1}
      />
      <circle cx={CX} cy={196} r={5} fill="#b98a1f" stroke="#8a6a14" strokeWidth={1} />

      {/* 横梁 */}
      <motion.line
        x1={lx}
        y1={ly}
        x2={rx}
        y2={ry}
        stroke="url(#gBeam)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* 梁心与坠珠 */}
      <circle cx={CX} cy={CY} r={7.5} fill="#b98a1f" stroke="#8a6a14" strokeWidth={1.2} />
      <motion.circle cx={lx} cy={ly} r={4.6} fill="#b98a1f" stroke="#8a6a14" strokeWidth={1} />
      <motion.circle cx={rx} cy={ry} r={4.6} fill="#b98a1f" stroke="#8a6a14" strokeWidth={1} />
      {/* 指针 */}
      <motion.line
        x1={CX}
        y1={CY}
        x2={needleX}
        y2={needleY}
        stroke="#b0453a"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <motion.circle cx={needleX} cy={needleY} r={3} fill="#b0453a" />

      {/* 两托盘 */}
      {renderPan(left, leftZoneRef, "L")}
      {renderPan(right, rightZoneRef, "R")}
    </svg>
  );
}
