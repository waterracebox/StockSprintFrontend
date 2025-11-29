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
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    // 定義環境變數，用於生產環境 API 端點
    define: {
        'import.meta.env.VITE_API_URL': JSON.stringify(
            process.env.VITE_API_URL || 'http://127.0.0.1:8000'
        ),
    },
});
