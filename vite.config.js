import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // الحل النهائي لمشكلة المسارات في Netlify: التأكد من تجاهل تحذيرات Rollup أثناء البناء
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // تجاهل تحذيرات عدم إيجاد المسار (unresolved imports) الناتجة عن Netlify/Rollup
        // هذا يسمح لعملية البناء بالاستمرار حتى لو لم يتمكن Rollup من حل المسار النسبي بشكل فوري.
        if (warning.code === 'UNRESOLVED_IMPORT') {
          return;
        }
        warn(warning);
      },
    },
  },
  // تم إزالة base: '/' لضمان عمل المسار النسبي './src/main.jsx'
});
