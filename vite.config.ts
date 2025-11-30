import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置檔，包含 API 代理設定
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                // 不需要 rewrite，因為後端路由就是 /api/auth/*
            },
        },
    },
});
