import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // إزالة 'base: "./"'
  // وإلغاء تحذيرات المسار لحل مشكلة Rollup على Netlify
  build: {
    // تحديد مجلد الإخراج (dist)
    outDir: 'dist', 
    // التأكد من أن Rollup لا يفشل عند وجود المسار المطلق في index.html
    rollupOptions: {
      input: 'index.html',
    },
    // هذا الإعداد هو الحل الأكثر شيوعًا للمسار مع Netlify/GitHub Pages
    assetsDir: '', 
  },
})
