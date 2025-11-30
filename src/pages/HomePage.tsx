import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Toast } from 'antd-mobile';
import { io, Socket } from 'socket.io-client';
import { authAPI } from '../services/auth';
import type { User } from '../services/auth';

const HomePage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // 取得使用者資訊
        authAPI
            .getMe()
            .then((response) => setUser(response.user))
            .catch(() => {
                Toast.show({ content: '無法取得使用者資訊', icon: 'fail' });
            });
    }, []);

    useEffect(() => {
        // 建立 Socket.io 連線
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('[Socket] 缺少 Token，無法建立連線');
            return;
        }

        // 決定 Socket.io 連線 URL
        // 生產環境：使用 VITE_API_URL（移除 /api 後綴）
        // 本地開發：使用代理或 localhost:8000
        let socketUrl: string;
        if (import.meta.env.PROD) {
            // 生產環境：從 VITE_API_URL 移除 /api 後綴
            const apiUrl = import.meta.env.VITE_API_URL || '';
            socketUrl = apiUrl.replace(/\/api$/, '');
        } else {
            // 本地開發：明確指定 backend 位址
            socketUrl = 'http://127.0.0.1:8000';
        }

        console.log(`[Socket] 正在連線至: ${socketUrl}`);

        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'], // 優先使用 WebSocket
        });

        // 連線成功
        newSocket.on('connect', () => {
            console.log(`[Socket] 連線成功 (Socket ID: ${newSocket.id})`);
            setIsSocketConnected(true);
            Toast.show({ content: 'WebSocket 連線成功', icon: 'success' });
        });

        // 連線錯誤
        newSocket.on('connect_error', (error) => {
            console.error('[Socket] 連線錯誤:', error.message);
            setIsSocketConnected(false);
            
            // 若為認證錯誤，導向登入頁
            if (error.message.includes('Authentication')) {
                Toast.show({ content: '認證失敗，請重新登入', icon: 'fail' });
                localStorage.removeItem('token');
                navigate('/login');
            }
        });

        // 斷線
        newSocket.on('disconnect', (reason) => {
            console.log(`[Socket] 已斷線 (原因: ${reason})`);
            setIsSocketConnected(false);
        });

        setSocket(newSocket);

        // 清理函數：元件卸載時斷開連線
        return () => {
            console.log('[Socket] 正在斷開連線...');
            newSocket.disconnect();
        };
    }, [navigate]);

    const handleLogout = () => {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (!user) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h1>歡迎，{user.displayName}！</h1>

            {/* WebSocket 連線狀態指示器 */}
            <Card 
                title="連線狀態" 
                style={{ 
                    marginBottom: '20px',
                    borderLeft: isSocketConnected ? '4px solid #00b578' : '4px solid #ff3141'
                }}
            >
                <div style={{ fontSize: '14px' }}>
                    <p>
                        <strong>WebSocket:</strong> 
                        <span style={{ color: isSocketConnected ? '#00b578' : '#ff3141', marginLeft: '8px' }}>
                            {isSocketConnected ? '已連線 ✓' : '未連線 ✗'}
                        </span>
                    </p>
                    {socket && isSocketConnected && (
                        <p><strong>Socket ID:</strong> {socket.id}</p>
                    )}
                </div>
            </Card>

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
