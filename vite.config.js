import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// هذا هو ملف إعدادات Vite، وهو ضروري لـ:
// 1. تفعيل دعم React/JSX.
// 2. تجميع ملفاتك المتعددة في مجلد "dist" للنشر على Netlify.

export default defineConfig({
  plugins: [react()],
});
