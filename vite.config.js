// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚙️ إعداد المشروع لـ Netlify
export default defineConfig({
  plugins: [react()],
  root: ".", // يحدد أن index.html في الجذر الرئيسي
  build: {
    outDir: "dist", // هذا مجلد الإخراج اللي يرفعه Netlify
    emptyOutDir: true, // يحذف أي إصدار سابق قبل البناء
  },
  server: {
    port: 5173, // فقط أثناء التطوير المحلي
    open: true,
  },
});
