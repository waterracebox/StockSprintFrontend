import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, NavBar, Badge } from 'antd-mobile';
import { io } from 'socket.io-client';
import { authAPI } from '../services/auth';
import type { User } from '../services/auth';
import AdminControlTab from '../components/AdminControlTab';
import AdminParamsTab from '../components/AdminParamsTab';
import AdminUsersTab from '../components/AdminUsersTab';
import AdminUserModals from '../components/AdminUserModals';
import MonitorModal from '../components/MonitorModal';
import AdminScriptTab from '../components/admin/AdminScriptTab';
import AdminMiniGameTab from '../components/admin/AdminMiniGameTab';

const AdminPage: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [onlineCount, setOnlineCount] = useState<number>(0);
    const [showMonitor, setShowMonitor] = useState<boolean>(false);
    const navigate = useNavigate();

    // 驗證 Admin 權限
    useEffect(() => {
        authAPI.getMe()
            .then((response) => {
                if (response.user.role !== 'ADMIN') {
                    navigate('/home');
                } else {
                    setUser(response.user);
                }
            })
            .catch(() => {
                navigate('/login');
            });
    }, [navigate]);

    // 建立 Socket 連接
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const newSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('[Admin] Socket 已連接');
        });

        newSocket.on('ONLINE_USERS_UPDATE', (payload: { count: number }) => {
            setOnlineCount(payload.count);
        });

        newSocket.on('disconnect', () => {
            console.log('[Admin] Socket 已斷開');
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // 監聽使用者列表刷新事件
    useEffect(() => {
        const handleRefresh = () => {
            console.log('[Admin] 使用者列表已刷新');
            // AdminUsersTab 會自動重新載入
        };

        window.addEventListener('user-list-refresh', handleRefresh);
        return () => window.removeEventListener('user-list-refresh', handleRefresh);
    }, []);

    if (!user) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', maxWidth: '100vw', overflow: 'hidden' }}>
            {/* 頂部導覽列 */}
            <NavBar
                onBack={() => navigate('/home')}
                style={{ backgroundColor: '#1677ff', color: '#fff', position: 'sticky', top: 0, zIndex: 1000 }}
                right={
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '0 8px'
                        }}
                        onClick={() => setShowMonitor(true)}
                    >
                        <span style={{ fontSize: '14px' }}>在線人數</span>
                        <Badge 
                            content={onlineCount} 
                            color='#52c41a'
                            style={{ '--right': '0px', '--top': '0px' }}
                        />
                    </div>
                }
            >
                Admin 後台
            </NavBar>

            {/* Tab 切換 */}
            <Tabs defaultActiveKey='control'>
                <Tabs.Tab title='遊戲控制' key='control'>
                    <AdminControlTab />
                </Tabs.Tab>
                <Tabs.Tab title='遊戲參數' key='params'>
                    <AdminParamsTab />
                </Tabs.Tab>
                <Tabs.Tab title='玩家管理' key='users'>
                    <AdminUsersTab />
                </Tabs.Tab>
                <Tabs.Tab title='遊戲劇本' key='script'>
                    <AdminScriptTab />
                </Tabs.Tab>
                <Tabs.Tab title='小遊戲' key='mini-game'>
                    <AdminMiniGameTab />
                </Tabs.Tab>
            </Tabs>

            {/* 監控模態框 */}
            <MonitorModal 
                isOpen={showMonitor}
                onClose={() => setShowMonitor(false)}
            />

            {/* 使用者編輯/刪除浮動視窗 */}
            <AdminUserModals />
        </div>
    );
};

export default AdminPage;
