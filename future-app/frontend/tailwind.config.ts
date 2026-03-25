import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ring colors
        retirement: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dark: "#4f46e5",
          bg: "#eef2ff",
          border: "#c7d2fe",
        },
        security: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
          bg: "#ecfdf5",
          border: "#a7f3d0",
        },
        growth: {
          DEFAULT: "#f59e0b",
          light: "#fcd34d",
          dark: "#d97706",
          bg: "#fffbeb",
          border: "#fde68a",
        },
        // UI
        surface: "#0f1117",
        "surface-2": "#1a1d27",
        "surface-3": "#22263a",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
        "text-muted": "#475569",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        ring: "0 0 40px rgba(99, 102, 241, 0.15)",
        glow: "0 0 20px rgba(99, 102, 241, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
