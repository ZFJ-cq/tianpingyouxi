import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 宣纸 · 墨 · 鎏金 · 青玉 · 朱砂（shadcn 风格 CSS 变量令牌）
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        ring: "var(--ring)",
        gold: "var(--gold)",
        jade: "var(--jade)",
        cinnabar: "var(--cinnabar)",
        plum: "var(--plum)",
        ash: "var(--ash)",
      },
      fontFamily: {
        serif: [
          '"Songti SC"',
          '"STSong"',
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"SimSun"',
          "serif",
        ],
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        mono: ['"SF Mono"', '"Menlo"', '"Consolas"', "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(43,42,38,.05), 0 8px 24px -12px rgba(43,42,38,.18)",
        pop: "0 12px 40px -12px rgba(43,42,38,.35)",
        coin: "inset 0 1px 0 rgba(255,255,255,.55), 0 1px 3px rgba(43,42,38,.35)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
