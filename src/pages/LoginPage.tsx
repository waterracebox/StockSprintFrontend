import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button } from 'antd-mobile';
import { message } from 'antd';
import RegisterModal from '../components/RegisterModal';
import { authAPI } from '../services/auth';
import type { LoginCredentials } from '../services/auth';

interface LoginPageProps {
    isAdmin?: boolean; // 判斷是否為管理員登入頁
}

const LoginPage: React.FC<LoginPageProps> = ({ isAdmin = false }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [messageApi, contextHolder] = message.useMessage();

    // 檢查使用者是否已登入，若已登入則自動導向主頁
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // 驗證 Token 是否有效
            authAPI
                .getMe()
                .then(() => {
                    // Token 有效，導向主頁
                    navigate('/home', { replace: true });
                })
                .catch(() => {
                    // Token 無效，清除並留在登入頁
                    localStorage.removeItem('token');
                });
        }
    }, [navigate]);

    const handleLogin = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const credentials: LoginCredentials = {
                username: values.username,
                password: values.password,
            };

            const response = await authAPI.login(credentials);

            // 儲存 Token
            localStorage.setItem('token', response.token);

            // 導航至主頁
            navigate('/home');
        } catch (error: any) {
            const msg = error.response?.data?.error || '登入失敗，請檢查帳號密碼';
            messageApi.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
            {contextHolder}
            {/* 標題 */}
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
                {isAdmin ? '管理員登入' : 'XXX 交易所'}
            </h1>

            {/* 登入表單 */}
            <Form
                form={form}
                layout="vertical"
                footer={
                    <Button
                        block
                        type="submit"
                        color="primary"
                        loading={loading}
                        onClick={handleLogin}
                    >
                        登入
                    </Button>
                }
            >
                <Form.Item
                    name="username"
                    label="帳號"
                    rules={[{ required: true, message: '請輸入帳號' }]}
                >
                    <Input placeholder="請輸入帳號" autoComplete="username" />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="密碼"
                    rules={[{ required: true, message: '請輸入密碼' }]}
                >
                    <Input type="password" placeholder="請輸入密碼" autoComplete="current-password" />
                </Form.Item>
            </Form>

            {/* 註冊按鈕（觸發浮動視窗） */}
            <div style={{ textAlign: 'center' }}>
                <RegisterModal isAdmin={isAdmin} />
            </div>

            {/* 僅在管理員登入頁顯示返回連結 */}
            {isAdmin && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <a href="/login">一般使用者登入</a>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
