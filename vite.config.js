import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // هذا التعديل ضروري: يحدد المسار الأساسي للمشروع كنقطة نسبية (./) 
  // لحل مشكلة Rollup/Resolve أثناء عملية البناء على Netlify.
  base: './', 
  build: {
    // تحديد مجلد الإخراج (dist)
    outDir: 'dist', 
    // تحديد نقطة الدخول (للتأكد من أن Vite تبدأ من index.html)
    rollupOptions: {
      input: 'index.html',
    },
  },
})
