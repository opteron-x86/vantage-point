import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Distinctive UI chrome: Inter Display isn't "Inter" — tighter, more editorial
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        // Monospace for all tabular data: prices, volumes, percentages
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Nord palette — exposed as Tailwind utilities for rare one-off use.
        // Prefer semantic tokens (bg-surface, text-fg, etc.) defined below.
        nord: {
          0: "#2e3440",   // polar-night (darkest)
          1: "#3b4252",
          2: "#434c5e",
          3: "#4c566a",
          4: "#d8dee9",   // snow-storm
          5: "#e5e9f0",
          6: "#eceff4",
          7: "#8fbcbb",   // frost
          8: "#88c0d0",
          9: "#81a1c1",
          10: "#5e81ac",
          11: "#bf616a",  // aurora red
          12: "#d08770",  // aurora orange
          13: "#ebcb8b",  // aurora yellow
          14: "#a3be8c",  // aurora green
          15: "#b48ead",  // aurora purple
        },
        // Semantic tokens — use these in components
        bg: {
          DEFAULT: "var(--bg)",
          raised: "var(--bg-raised)",
          sunken: "var(--bg-sunken)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          hover: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          cyan:  "var(--accent-cyan)",
          blue:  "var(--accent-blue)",
        },
        signal: {
          up:   "var(--signal-up)",
          down: "var(--signal-down)",
          warn: "var(--signal-warn)",
        },
      },
      boxShadow: {
        raised: "0 1px 0 0 var(--border-subtle), 0 0 0 1px var(--border-subtle)",
        overlay: "0 10px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px var(--border-subtle)",
      },
    },
  },
  plugins: [],
};

export default config;
