# 称量台 · 天平找伪币逻辑推理挑战

> 用一台虚拟天平，在最少次数内从一堆硬币中揪出重量异常的那一枚，并实时告诉你还剩多少种可能。

纯前端静态应用（Next.js App Router + TypeScript + Tailwind + zustand + framer-motion），
**无后端、无数据库**，进度存 localStorage，`output: 'export'` 静态导出，可直接部署 GitHub Pages。

---

## 功能

- **关卡系统**：8 / 9 / 12 / 13 / 27 球 × 已知轻重 / 未知轻重，共 9 关
  - 未知轻重：每枚硬币有「偏轻 / 偏重」两种伪币可能
  - 已知轻重：只嫌疑一个方向（更简单）
  - 理论最优次数经 solver 验证：8/9/12 未知 = 3 次，13 未知 = 4 次（26 ≤ 3³ 却仍需 4 次的陷阱题），27 未知 = 4 次；已知档 8/9 = 2 次、12 = 3 次、27 = 3 次
- **交互称量**：点击多选硬币放入左右盘，或直接拖拽；两盘数量必须相等，**差额可用已排除的正常币配平**（经典 12 币题的关键技巧，UI 有一键配平按钮）
- **天平动画**：SVG 横梁 + 双托盘 + 吊线 + 表盘指针，framer-motion 弹簧倾斜，托盘沿弧线平移且保持水平
- **剩余可能实时展示**：当前候选状态数、至少还需几次、称量预算进度；超出剩余称量的分辨能力立即判负
- **可能集可视化**：每枚硬币一格，偏轻（青玉）/ 偏重（朱砂）/ 皆有可能（绛紫）/ 已排除（灰）
- **solver 提示**：极小化极大搜索跑在 **Web Worker**，返回「最坏情况下剩余最少」的称法，可一键应用；最坏情况 < 20ms
- **复盘回放**：结束后逐步重演整局推理路径（自动播放 / 单步）
- **提交判定**：点「我这枚就是伪币」选择硬币（未知档还要选轻重），猜错即揭晓真值
- **进度持久化**：关卡成绩（最佳次数 / 通关数）与进行中的对局都存 localStorage，刷新可续局

## 核心模型

```
每枚硬币 roles ∈ { [], [L], [H], [L,H] }   // L=偏轻 H=偏重，[]=已排除
剩余可能数 = Σ |roles|                        // 还能区分出的候选状态总数
```

一次称量 (left[], right[])（两盘等数）按结果更新：

| 结果 | 左盘硬币 | 右盘硬币 | 盘外硬币 |
| --- | --- | --- | --- |
| 平衡 | 全部洗清（正常） | 全部洗清 | 不变 |
| 左倾 | 只可能偏重 | 只可能偏轻 | 全部洗清 |
| 右倾 | 只可能偏轻 | 只可能偏重 | 全部洗清 |

**solver**（`src/game/solver.ts`）把 roles 相同的硬币归组，状态压缩为 `(L, H, B, G)` 四元组
（G = 已确定正常的硬币数，可作配重），称量方案只需记录每组上左右盘的数量。
极小化极大搜索配五重剪枝：L/H 规范化、盘面对调去重、轻重镜像去重、
信息论下界提前退出（`⌈log₃ total⌉` 达到即最优）、不可行状态直接返回最不坏称法；
外加记忆化与节点预算兜底。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
```

## 测试

```bash
npm test           # Node 跑引擎 + solver 单元/性质测试（约 1070 项断言）
npm run build      # 生产构建 + 静态导出到 out/
```

浏览器端回归探针：构建后访问 `/selftest/`，会在真实环境里跑
**151 项检查**（九关最优次数、最优策略全分支推演、随机对局引擎一致性、
Web Worker 回环、驱动真实 store 的完整对局 E2E），页面标题变为 `SELFTEST-OK`。

无头验证：

```bash
cd out && python3 -m http.server 8899 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --no-sandbox --virtual-time-budget=120000 \
  --dump-dom http://localhost:8899/selftest/ | grep -o "<title>[^<]*</title>"
```

## 部署到 GitHub Pages

仓库已附 `.github/workflows/deploy.yml`（Actions 自动构建发布）：

1. 推送代码到 GitHub 仓库
2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**（只需一次）
3. 推送即自动部署

**子路径站点**（`https://<用户名>.github.io/<仓库名>/`）无需改代码——workflow 会自动注入
`NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}`。

**根站点 / 自定义域名**（`<用户名>.github.io`）也无需改动，basePath 默认为空。

本地验证子路径构建：

```bash
NEXT_PUBLIC_BASE_PATH=/coin-balance npm run build
```

## 目录结构

```
src/
├── app/
│   ├── page.tsx            # 主界面（拖拽管理 + 布局 + 回放 + 提示装配）
│   ├── selftest/page.tsx   # 回归探针（151 项检查）
│   └── globals.css         # 设计令牌：宣纸·墨·鎏金·青玉·朱砂
├── components/
│   ├── BalanceScale.tsx    # SVG 天平（横梁/托盘/吊线/表盘 + 弹簧动画 + 拖拽分区）
│   ├── CoinChip.tsx        # 硬币（待选区 / 可能集小格）
│   ├── Sidebar.tsx         # 剩余可能 / 预算 / 可能集 / 推理路径
│   ├── LevelSelect.tsx     # 关卡选择
│   ├── SubmitDialog.tsx    # 提交判定
│   ├── GameOverModal.tsx   # 结算
│   ├── ReplayBar.tsx       # 复盘回放控制
│   └── RulesPanel.tsx      # 玩法说明
├── game/
│   ├── types.ts / levels.ts / engine.ts   # 状态模型 / 关卡 / 称量引擎
│   ├── solver.ts / solver.worker.ts       # 极小化极大搜索 + Worker
│   ├── solverClient.ts / hint.ts          # Worker 客户端 / 提示入口
└── store/gameStore.ts      # zustand + localStorage 持久化
tests/solver.test.ts        # Node 测试（esbuild 打包后运行）
```

## 二期规划

自定义球数与已知正币数量、随机出题模式、AI 出题你来猜的对战模式、成绩分享卡与班级本地排行榜、
教师版（投影大屏模式、批量出题 PDF 与答案）。
