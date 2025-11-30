import apiClient from './apiClient';

// ==================== 型別定義 ====================

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    password: string;
    displayName?: string;
}

export interface RegisterAdminData extends RegisterData {
    adminSecret: string;
}

/**
 * User 介面 - 完整版（符合後端 Prisma Schema）
 * 包含所有欄位以確保型別安全
 */
export interface User {
    id: number;
    username: string;
    displayName: string;
    cash: number;
    stocks: number;
    debt: number; // 負債金額
    role: 'USER' | 'ADMIN';
    firstSignIn: boolean; // 是否為首次登入
    createdAt: string; // ISO 8601 日期字串
    updatedAt: string; // ISO 8601 日期字串
}

/**
 * 登入回應（簡化版 User）
 */
export interface AuthResponse {
    message: string;
    token: string;
    user: {
        id: number;
        username: string;
        displayName: string;
        role: 'USER' | 'ADMIN';
    };
}

/**
 * 註冊回應
 */
export interface RegisterResponse {
    message: string;
    user: {
        id: number;
        username: string;
        displayName: string;
        cash: number;
        stocks: number;
        role: 'USER' | 'ADMIN';
        createdAt: string;
    };
}

// ==================== API 函數 ====================

export const authAPI = {
    /**
     * 使用者登入
     * POST /api/auth/login
     */
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },

    /**
     * 使用者註冊
     * POST /api/auth/register
     */
    register: async (data: RegisterData): Promise<RegisterResponse> => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },

    /**
     * 管理員註冊
     * POST /api/auth/register-admin
     */
    registerAdmin: async (data: RegisterAdminData): Promise<RegisterResponse> => {
        const response = await apiClient.post('/auth/register-admin', data);
        return response.data;
    },

    /**
     * 取得當前使用者資訊（完整版）
     * GET /api/auth/me
     * 需要驗證 (Protected Route)
     */
    getMe: async (): Promise<{ user: User }> => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
};
