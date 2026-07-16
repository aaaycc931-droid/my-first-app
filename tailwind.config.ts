import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./mobile/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#f8fafc",
      },
      boxShadow: {
        soft: "0 20px 70px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
