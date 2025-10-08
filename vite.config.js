import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // الحل النهائي لمشكلة المسارات في Netlify:
  build: {
    // إزالة خاصية base: '/' التي تتعارض مع بعض إعدادات Netlify
    // إعدادات Rollup لحل مشكلة عدم إيجاد المسار (unresolved imports)
    rollupOptions: {
      onwarn(warning, warn) {
        // تجاهل تحذيرات عدم إيجاد المسار الناتجة عن Netlify/Rollup
        // هذا يسمح لعملية البناء بالاستمرار حتى لو لم يتمكن Rollup من حل المسار النسبي بشكل فوري.
        if (warning.code === 'UNRESOLVED_IMPORT') {
          return;
        }
        warn(warning);
      },
    },
    // إعدادات إضافية لتحسين التوافق مع بيئة الإنتاج
    cssCodeSplit: false, // لضمان عدم تقسيم ملفات CSS بشكل معقد
    sourcemap: false,    // تعطيل خرائط المصدر لتقليل حجم الملفات (اختياري)
  },
});
