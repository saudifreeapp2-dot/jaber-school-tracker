import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // إضافة مسار "base: '/'" ليعمل مع المسار المطلق في index.html 
  // هذا يعالج مشكلة المسارات في وضع التطوير والإنتاج.
  base: '/',
  build: {
    // تحديد مجلد الإخراج (dist)
    outDir: 'dist', 
    // هذا الإعداد هو الحل الأكثر شيوعًا للمسار مع Netlify
    assetsDir: '', 
    rollupOptions: {
      input: 'index.html',
    },
    // تحديد ما يجب أن يفعله Rollup عندما يجد مسارًا غير معروف (مثل المسار المطلق في index.html)
    // نطلب منه أن يعتبرها خارجيًا ولا يسبب فشل البناء.
    onwarn(warning, warn) {
      if (warning.code === 'ROLLUP_RESOLVE_URL') {
        return; 
      }
      warn(warning);
    },
  },
})
