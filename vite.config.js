import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// إعداد Vite للمشروع
export default defineConfig({
  plugins: [react()],
  base: "./", // يضمن أن الموارد تُحمّل بشكل صحيح على نتفلاي
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
