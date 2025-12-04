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
        terminal: {
          bg: "#0a0a0a",
          text: "#00ff00",
          border: "#00ff00",
          dim: "#008800",
        },
      },
      fontFamily: {
        mono: ["Courier New", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
