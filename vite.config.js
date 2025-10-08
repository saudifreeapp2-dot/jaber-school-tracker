import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // الإعداد الحاسم لحل مشكلات Netlify
  // يفرض على Vite استخدام المسار النسبي (./) كمسار أساسي لملفات الإنتاج
  base: './', 

  build: {
    // إعدادات إضافية لجعل Rollup أكثر تسامحًا مع المسارات (اختياري لكن مفيد)
    rollupOptions: {
      onwarn(warning, warn) {
        // تجاهل تحذير 'vite: Rollup failed to resolve import "./src/main.jsx"'
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.source.endsWith('./src/main.jsx')) {
          return;
        }
        warn(warning);
      },
    },
    // إيقاف خرائط مصدر CSS للمزيد من التسامح (اختياري)
    cssCodeSplit: false,
    sourcemap: false
  }
})
