import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
  define: {
    // web3.js needs these for browser compatibility
    "process.env": {},
    global: "globalThis",
  },
});
