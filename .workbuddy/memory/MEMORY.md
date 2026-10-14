# 硬币天平（称量台）· 项目长期记忆

## 项目概况

- 目录：`/Users/macbook/前端项目/硬币天平/`
- 产品：称量台·天平找伪币逻辑推理挑战（纯静态网页小游戏，无后端）
- 技术栈：Next.js 14.2 App Router + TS + Tailwind 3.4 + zustand + framer-motion，`output:'export'`，localStorage 持久化（key: `chengzantai.v1`）
- 部署：GitHub Pages（workflow 已配 `.github/workflows/deploy.yml`，basePath 走 `NEXT_PUBLIC_BASE_PATH`）
- 审美：宣纸·墨·鎏金·青玉·朱砂古风（globals.css CSS 变量令牌）；硬币角色色：偏轻=青玉、偏重=朱砂、皆可=绛紫、已排除=灰

## 核心约定

- 状态模型：硬币 roles ∈ {[], [L], [H], [L,H]}；剩余可能 = Σ|roles|；称量要求两盘总数相等（差额用正常币配平）
- solver 状态四元组 (L,H,B,G)：G=已确定正常币数，**配重是经典解法关键，不可省**
- 关卡：u8/u9/u12(3次)、u13(4次)、u27(4次) 未知档；k8/k9(2次)、k12/k27(3次) 已知档
- 测试入口：`npm test`（Node，约1070断言）；浏览器探针 `/selftest/`（约147项，无头 Chrome 需 `--virtual-time-budget=120000`）
- 构建注意：`next build` 前 `env -u CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR -u CODEBUDDY_TOOL_CALL_ID`（沙箱 safe-delete）

## 用户偏好相关

- 用户重视 E2E 验证（assertions + 无头冒烟 + 截图），本项目按此标准交付
- 迭代方向：二期功能（自定义球数/随机出题/AI 对战/分享卡/教师版）待用户反馈后推进
