import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // สำคัญมากสำหรับ GitHub Pages เพื่อให้หาไฟล์เจอใน Sub-directory
  build: {
    outDir: 'dist',
  },
});