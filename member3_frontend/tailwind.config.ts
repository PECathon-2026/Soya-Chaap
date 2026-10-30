import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090C",
        card: "#0F1117",
        sidebar: "#0B0C10",
        border: "#1E222D",
        accent: {
          crimson: "#E11D48",
          vermilion: "#F43F5E",
          gold: "#F59E0B",
          amber: "#D97706",
          emerald: "#10B981",
          cyan: "#06B6D4",
          violet: "#8B5CF6",
          slate: "#94A3B8",
        },
        agent: {
          shogun: "#F59E0B",
          samurai: "#E11D48",
          sentinel: "#10B981",
          shadow: "#8B5CF6",
          orchestrator: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(225, 29, 72, 0.3)",
        goldGlow: "0 0 20px -5px rgba(245, 158, 11, 0.3)",
        emeraldGlow: "0 0 20px -5px rgba(16, 185, 129, 0.3)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
