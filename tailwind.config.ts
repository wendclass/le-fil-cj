import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-surface-muted)",
        },
        border: "var(--color-border)",
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          foreground: "var(--color-on-primary)",
        },
        yellow: {
          DEFAULT: "var(--color-yellow)",
          foreground: "var(--color-on-yellow)",
          soft: "var(--color-yellow-soft)",
        },
        green: {
          DEFAULT: "var(--color-green)",
          foreground: "var(--color-on-green)",
          bright: "var(--color-green-bright)",
          soft: "var(--color-green-soft)",
          ink: "var(--color-green-ink)",
        },
        accent: {
          DEFAULT: "var(--color-yellow)",
          foreground: "var(--color-on-yellow)",
        },
        success: {
          DEFAULT: "var(--color-green)",
          foreground: "var(--color-on-green)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Sora", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
      },
      transitionTimingFunction: {
        "out-custom": "var(--ease-out)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
