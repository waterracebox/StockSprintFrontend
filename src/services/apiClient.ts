import axios from 'axios';

// 根據環境變數決定 baseURL
// 生產環境：使用 VITE_API_URL (Render 後端 URL)
// 本地開發：使用 /api (透過 Vite Proxy 轉發)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 請求攔截器：自動附加 JWT Token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;
