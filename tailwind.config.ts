import type { Config } from "tailwindcss";

export default {
  content: [
    "./apps/web/src/**/*.{ts,tsx}",
    "./packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        ocean: "#2f80ed",
        candy: "#f25f8c",
        mint: "#27ae60",
        sun: "#f2994a"
      },
      boxShadow: {
        glass: "0 24px 60px rgba(18, 38, 63, 0.35)",
        dock: "0 18px 44px rgba(18, 38, 63, 0.30)"
      },
      fontFamily: {
        display: ["Trebuchet MS", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
