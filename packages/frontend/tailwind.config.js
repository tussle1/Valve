/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        valve: {
          bg: "#101114",
          sidebar: "#141519",
          editor: "#101114",
          panel: "#191B20",
          hover: "#22252C",
          border: "#2A2D35",
          text: "#F1F2F5",
          "text-secondary": "#A0A4B0",
          "text-muted": "#707582",
          accent: "#8B5CF6",
          "accent-hover": "#7C3AED",
          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "xs": ["0.7rem", { lineHeight: "1.4" }],
        "sm": ["0.8125rem", { lineHeight: "1.5" }],
        "base": ["0.875rem", { lineHeight: "1.6" }],
        "lg": ["1rem", { lineHeight: "1.6" }],
      },
      spacing: {
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
      },
      borderRadius: {
        "none": "0",
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
      },
      boxShadow: {
        "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      transitionDuration: {
        "fast": "100ms",
        "normal": "150ms",
        "slow": "200ms",
      },
      zIndex: {
        "dropdown": "100",
        "modal": "200",
        "popover": "300",
        "tooltip": "400",
      },
    },
  },
  plugins: [],
};