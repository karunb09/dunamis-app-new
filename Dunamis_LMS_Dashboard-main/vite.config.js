import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["dashboard.dunamisindia.co.in", "http://localhost:3000", "http://localhost:5173", "http://localhost:3003"],
  },
});
