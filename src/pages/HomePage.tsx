import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from 'antd-mobile';
import { authAPI } from '../services/auth';
import type { User } from '../services/auth';

const HomePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // 取得使用者資訊
        authAPI
            .getMe()
            .then((response) => setUser(response.user))
            .catch(() => {
                alert('無法取得使用者資訊');
            });
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (!user) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h1>歡迎，{user.displayName}！</h1>

            <Card title="使用者資訊" style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', lineHeight: '2' }}>
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>帳號:</strong> {user.username}</p>
                    <p><strong>暱稱:</strong> {user.displayName}</p>
                    <p><strong>角色:</strong> {user.role === 'ADMIN' ? '管理員' : '一般使用者'}</p>
                    <p><strong>註冊時間:</strong> {new Date(user.createdAt).toLocaleString('zh-TW')}</p>
                    <p><strong>最後更新:</strong> {new Date(user.updatedAt).toLocaleString('zh-TW')}</p>
                </div>
            </Card>

            <Card title="財務資訊" style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', lineHeight: '2' }}>
                    <p><strong>現金:</strong> ${user.cash.toFixed(2)}</p>
                    <p><strong>股票:</strong> {user.stocks} 股</p>
                    <p><strong>負債:</strong> ${user.debt.toFixed(2)}</p>
                    <p><strong>首次登入:</strong> {user.firstSignIn ? '是' : '否'}</p>
                </div>
            </Card>

            <Button block color="danger" onClick={handleLogout} style={{ marginTop: '20px' }}>
                登出
            </Button>
        </div>
    );
};

export default HomePage;
