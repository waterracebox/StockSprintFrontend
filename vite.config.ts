import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 繁體中文: Vite 配置檔，包含 API 代理設定
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''), // 移除 /api 前綴
            },
        },
    },
});
