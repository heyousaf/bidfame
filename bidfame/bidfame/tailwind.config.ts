import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0713",
        surface: "#140f24",
        surfaceAlt: "#1c1530",
        border: "#2a2140",
        gold: "#f5c451",
        violet: "#8b5cf6",
        violetDeep: "#6d28d9",
        magenta: "#c026d3"
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(139, 92, 246, 0.55)",
        goldGlow: "0 0 40px -8px rgba(245, 196, 81, 0.6)"
      },
      backgroundImage: {
        "leader-gradient":
          "radial-gradient(circle at top, rgba(139,92,246,0.35), transparent 60%), linear-gradient(180deg, #1c1530 0%, #0a0713 100%)"
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
