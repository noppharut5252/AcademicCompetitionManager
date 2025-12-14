import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ใช้ './' เพื่อให้ path ของ assets เป็นแบบ relative (เช่น src="assets/...")
  // ซึ่งจำเป็นสำหรับ GitHub Pages ที่ไม่ได้รันที่ root domain
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // ช่วยแก้ปัญหาการ import path ในบาง environment
      '@': '/src',
    },
  },
});